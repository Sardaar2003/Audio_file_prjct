const FilePair = require('../models/FilePair');
const asyncHandler = require('../utils/asyncHandler');
const { QA_TEAMS, ROLES } = require('../constants/roles');
const { downloadFromS3, getPresignedUrl } = require('../services/s3Service');

const canAccess = (user, filePair) => {
  if (!user || !filePair) return false;
  if (user.role === ROLES.ADMIN || user.role === ROLES.MONITOR) return true;
  if (QA_TEAMS.includes(user.role)) return true;
  return filePair.uploader.toString() === user.id.toString();
};

const streamBuffer = (res, buffer, contentType, filename, inline = true) => {
  res.setHeader('Content-Type', contentType);
  const disposition = inline ? 'inline' : 'attachment';
  if (filename) {
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  }
  res.send(buffer);
};

const getTextFile = asyncHandler(async (req, res) => {
  const { filePairId } = req.params;
  const filePair = await FilePair.findById(filePairId);

  if (!filePair) {
    res.status(404);
    throw new Error('File pair not found');
  }

  if (!canAccess(req.user, filePair)) {
    res.status(403);
    throw new Error('You are not allowed to access this file');
  }

  if (!filePair.textAvailable || !filePair.textS3Key || filePair.textS3Key === 'NA') {
    res.status(404);
    throw new Error('Text file not available in S3');
  }

  const textBuffer = await downloadFromS3(filePair.textS3Key);
  const filename = `${filePair.baseName}.txt`;
  streamBuffer(res, textBuffer, 'text/plain; charset=utf-8', filename, false);
});

const getAudioFile = asyncHandler(async (req, res) => {
  const { filePairId } = req.params;
  const filePair = await FilePair.findById(filePairId);

  if (!filePair) {
    res.status(404);
    throw new Error('File pair not found');
  }

  if (!canAccess(req.user, filePair)) {
    res.status(403);
    throw new Error('You are not allowed to access this file');
  }

  if (!filePair.audioAvailable || !filePair.audioS3Key || filePair.audioS3Key === 'NA') {
    res.status(404);
    throw new Error('Audio file not available in S3');
  }

  // For audio, we can use presigned URLs for better performance, or stream directly
  // Using direct download for now to match existing behavior
  const audioBuffer = await downloadFromS3(filePair.audioS3Key);
  const mime = filePair.audioMimeType || 'audio/mpeg';
  const filename = `${filePair.baseName}.mp3`;
  streamBuffer(res, audioBuffer, mime, filename, true);
});

// Alternative endpoint that returns presigned URL for audio (better for large files)
const getAudioUrl = asyncHandler(async (req, res) => {
  const { filePairId } = req.params;
  const filePair = await FilePair.findById(filePairId);

  if (!filePair) {
    res.status(404);
    throw new Error('File pair not found');
  }

  if (!canAccess(req.user, filePair)) {
    res.status(403);
    throw new Error('You are not allowed to access this file');
  }

  if (!filePair.audioS3Key) {
    res.status(404);
    throw new Error('Audio file not available in S3');
  }

  const presignedUrl = await getPresignedUrl(filePair.audioS3Key, 3600); // 1 hour expiry
  res.json({ success: true, url: presignedUrl });
});

/**
 * Unified route to generate presigned URL for any file (audio or text)
 * GET /file/:id?type=audio|text|review
 */
const generateFileUrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type = 'text' } = req.query; // type: 'audio', 'text', or 'review'

  console.log('🔗 [fileController] generateFileUrl called');
  console.log('🔗 [fileController] File ID:', id);
  console.log('🔗 [fileController] Type:', type);

  // Find file pair in MongoDB
  const filePair = await FilePair.findById(id);
  if (!filePair) {
    console.error('❌ [fileController] File pair not found:', id);
    res.status(404);
    throw new Error('File not found');
  }

  // Check access permissions
  if (!canAccess(req.user, filePair)) {
    console.error('❌ [fileController] Access denied for user:', req.user.id);
    res.status(403);
    throw new Error('You are not allowed to access this file');
  }

  // Determine S3 key based on type
  let s3Key;
  let filename;

  if (type === 'audio') {
    s3Key = filePair.audioS3Key;
    filename = `${filePair.baseName}.mp3`;
    if (!filePair.audioAvailable || !s3Key || s3Key === 'NA') {
      res.status(404);
      throw new Error('Audio file not available in S3');
    }
  } else if (type === 'review') {
    s3Key = filePair.reviewTextS3Key;
    filename = `${filePair.baseName}.F.txt`;
    if (!s3Key) {
      res.status(404);
      throw new Error('Review text file not available in S3');
    }
  } else {
    // Default to text
    s3Key = filePair.textS3Key;
    filename = `${filePair.baseName}.txt`;
    if (!filePair.textAvailable || !s3Key || s3Key === 'NA') {
      res.status(404);
      throw new Error('Text file not available in S3');
    }
  }

  console.log('🔗 [fileController] S3 Key:', s3Key);
  console.log('🔗 [fileController] Filename:', filename);

  try {
    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await getPresignedUrl(s3Key, 3600);
    console.log('✅ [fileController] Presigned URL generated successfully');

    res.json({
      success: true,
      url: presignedUrl,
      filename,
      type,
      expiresIn: 3600, // seconds
    });
  } catch (error) {
    console.error('❌ [fileController] Failed to generate presigned URL:', error.message);
    res.status(500);
    throw new Error(`Failed to generate file URL: ${error.message}`);
  }
});

module.exports = { getTextFile, getAudioFile, getAudioUrl, generateFileUrl };



