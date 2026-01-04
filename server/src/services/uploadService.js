const fs = require('fs');
const path = require('path');
const FilePair = require('../models/FilePair');
const { FILE_STATUSES } = require('../constants/statuses');
const { uploadToS3, generateS3Key } = require('./s3Service');

const SUPPORTED_EXTENSIONS = ['.mp3', '.txt'];

const cleanupFileSafe = (filePath) => {
  if (!filePath) return;
  fs.promises
    .access(filePath)
    .then(() => fs.promises.unlink(filePath))
    .catch(() => { });
};

const buildPairs = (files) => {
  console.log('🔍 [uploadService] buildPairs called with', files.length, 'files');
  const pairMap = new Map();

  files.forEach((file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    console.log('🔍 [uploadService] Processing file:', file.originalname, 'ext:', ext);
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      console.log('⚠️  [uploadService] Unsupported extension, skipping:', file.originalname);
      cleanupFileSafe(file.path);
      return;
    }

    const baseName = path.basename(file.originalname, ext);
    if (!pairMap.has(baseName)) {
      pairMap.set(baseName, { baseName, audio: null, text: null });
    }

    if (ext === '.mp3') {
      pairMap.get(baseName).audio = file;
      console.log('🎵 [uploadService] Added audio for:', baseName);
    } else if (ext === '.txt') {
      pairMap.get(baseName).text = file;
      console.log('📄 [uploadService] Added text for:', baseName, 'Size:', file.size);
    }
  });

  const merged = Array.from(pairMap.values());
  console.log('✅ [uploadService] buildPairs completed. Unique basenames:', merged.length);
  return merged;
};

const persistPairs = async ({ uploader, uploaderName, pairs, soldStatus = 'Unsold', agentTag = '' }) => {
  console.log('💾 [uploadService] persistPairs called for', pairs.length, 'pairs');
  console.log('💾 [uploadService] Uploader:', uploader.toString(), uploaderName);
  console.log('💾 [uploadService] Sold Status:', soldStatus);
  console.log('💾 [uploadService] Agent Tag:', agentTag || '(none)');
  const saved = [];
  const duplicates = [];

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    console.log(`\n📦 [uploadService] Processing pair ${i + 1}/${pairs.length}:`, pair.baseName);

    console.log('🔍 [uploadService] Checking for duplicates...');
    const exists = await FilePair.findOne({ baseName: pair.baseName, uploader }).lean();
    if (exists) {
      console.log('⚠️  [uploadService] Duplicate found, skipping:', pair.baseName);
      duplicates.push(pair.baseName);
      cleanupFileSafe(pair.audio?.path);
      cleanupFileSafe(pair.text?.path);
      continue;
    }

    const hasAudio = !!pair.audio;
    const hasText = !!pair.text;
    let audioS3Key = 'NA';
    let textS3Key = 'NA';

    if (hasAudio) {
      console.log('📖 [uploadService] Reading audio from disk:', pair.audio.path);
    }
    if (hasText) {
      console.log('📖 [uploadService] Reading text from disk:', pair.text.path);
    }

    let audioBuffer;
    let textBuffer;
    if (hasAudio) {
      audioBuffer = await fs.promises.readFile(pair.audio.path);
      audioS3Key = generateS3Key(uploader.toString(), pair.baseName, '.mp3');
    }
    if (hasText) {
      textBuffer = await fs.promises.readFile(pair.text.path);
      textS3Key = generateS3Key(uploader.toString(), pair.baseName, '.txt');
    }

    if (hasAudio || hasText) {
      console.log('☁️  [uploadService] Uploading available assets to S3...');
      try {
        const uploads = [];
        if (hasAudio && audioBuffer) {
          uploads.push(uploadToS3(audioBuffer, audioS3Key, pair.audio.mimetype || 'audio/mpeg'));
        }
        if (hasText && textBuffer) {
          uploads.push(uploadToS3(Buffer.from(textBuffer), textS3Key, 'text/plain; charset=utf-8'));
        }
        await Promise.all(uploads);
        console.log('✅ [uploadService] S3 upload successful');
      } catch (error) {
        console.error('❌ [uploadService] S3 upload failed:', error.message);
        cleanupFileSafe(pair.audio?.path);
        cleanupFileSafe(pair.text?.path);
        throw new Error(`Failed to upload ${pair.baseName} to S3: ${error.message}`);
      }
    }

    // Store metadata in MongoDB with S3 keys (or NA if missing)
    console.log('💾 [uploadService] Saving to MongoDB...');
    console.log(
      '💾 [uploadService] Sizes - Audio:',
      pair.audio ? pair.audio.size : 'N/A',
      'Text:',
      pair.text ? pair.text.size : 'N/A'
    );
    const doc = await FilePair.create({
      baseName: pair.baseName,
      audioS3Key,
      textS3Key,
      audioAvailable: hasAudio,
      textAvailable: hasText,
      audioSize: pair.audio?.size || 0,
      textSize: pair.text?.size || 0,
      audioMimeType: pair.audio?.mimetype || 'audio/mpeg',
      uploader,
      uploaderName,
      agentTag,
      soldStatus,
      status: FILE_STATUSES.PROCESSING,
      uploadedAt: new Date(),
    });
    console.log('✅ [uploadService] MongoDB save successful. ID:', doc._id);

    // Clean up local temp files
    console.log('🧹 [uploadService] Cleaning up temp files...');
    cleanupFileSafe(pair.audio?.path);
    cleanupFileSafe(pair.text?.path);

    saved.push(doc);
    console.log('✅ [uploadService] Pair', pair.baseName, 'completed successfully');
  }

  console.log('✅ [uploadService] persistPairs completed. Saved:', saved.length, 'Duplicates:', duplicates.length);
  return { saved, duplicates };
};

const processUploadBatch = async ({ files, uploader, uploaderName, soldStatus = 'Unsold', agentTag = '' }) => {
  console.log('\n🚀 [uploadService] processUploadBatch started');
  console.log('🚀 [uploadService] Total files received:', files.length);
  console.log('🚀 [uploadService] Uploader ID:', uploader.toString());
  console.log('🚀 [uploadService] Uploader name:', uploaderName);
  console.log('🚀 [uploadService] Sold Status:', soldStatus);
  console.log('🚀 [uploadService] Agent Tag:', agentTag || '(none)');

  const pairs = buildPairs(files);
  if (!pairs.length) {
    console.log('⚠️  [uploadService] No valid files found after processing');
    return {
      saved: [],
      duplicates: [],
      summary: { totalFiles: files.length, uniqueFilenames: 0, uploadedRecords: 0, fullyMapped: 0, audioOnly: 0, textOnly: 0 },
    };
  }

  console.log('📊 [uploadService] Pairs to process (can include single assets):', pairs.length);
  const { saved, duplicates } = await persistPairs({ uploader, uploaderName, pairs, soldStatus, agentTag });

  const fullyMapped = saved.filter((doc) => doc.audioAvailable && doc.textAvailable).length;
  const audioOnly = saved.filter((doc) => doc.audioAvailable && !doc.textAvailable).length;
  const textOnly = saved.filter((doc) => !doc.audioAvailable && doc.textAvailable).length;
  const summary = {
    totalFiles: files.length,
    uniqueFilenames: new Set(saved.map((doc) => doc.baseName)).size,
    uploadedRecords: saved.length,
    fullyMapped,
    audioOnly,
    textOnly,
  };

  console.log('✅ [uploadService] processUploadBatch completed');
  console.log('📊 [uploadService] Final summary:', summary);
  console.log('📊 [uploadService] Duplicates skipped:', duplicates);

  return {
    saved,
    duplicates,
    summary,
  };
};

module.exports = { processUploadBatch };


