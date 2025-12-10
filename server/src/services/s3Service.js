let S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, getSignedUrl;
let s3Client;

console.log('🔧 [s3Service] Initializing AWS S3 service...');

// Initialize client lazily - will be created when first needed
// This allows env vars to be loaded after module initialization
const initializeS3Client = () => {
  if (s3Client) {
    return s3Client; // Already initialized
  }

  if (!S3Client) {
    throw new Error('AWS SDK not installed. Please run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner');
  }

  const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

  if (!BUCKET_NAME || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    console.warn('⚠️  [s3Service] AWS S3 not fully configured. Missing:', {
      bucket: !BUCKET_NAME ? 'AWS_S3_BUCKET_NAME' : null,
      accessKey: !AWS_ACCESS_KEY_ID ? 'AWS_ACCESS_KEY_ID' : null,
      secretKey: !AWS_SECRET_ACCESS_KEY ? 'AWS_SECRET_ACCESS_KEY' : null,
    });
    return null;
  }

  console.log('🔧 [s3Service] Creating S3Client instance...');
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
  console.log('✅ [s3Service] AWS S3 client initialized successfully');
  console.log('✅ [s3Service] Region:', process.env.AWS_REGION || 'us-east-1');
  return s3Client;
};

try {
  console.log('📦 [s3Service] Attempting to require @aws-sdk/client-s3...');
  const s3Module = require('@aws-sdk/client-s3');
  console.log('✅ [s3Service] @aws-sdk/client-s3 loaded successfully');
  
  console.log('📦 [s3Service] Attempting to require @aws-sdk/s3-request-presigner...');
  const presignerModule = require('@aws-sdk/s3-request-presigner');
  console.log('✅ [s3Service] @aws-sdk/s3-request-presigner loaded successfully');
  
  S3Client = s3Module.S3Client;
  PutObjectCommand = s3Module.PutObjectCommand;
  GetObjectCommand = s3Module.GetObjectCommand;
  DeleteObjectCommand = s3Module.DeleteObjectCommand;
  getSignedUrl = presignerModule.getSignedUrl;
  
  console.log('✅ [s3Service] All AWS SDK classes extracted');

  // Try to initialize now (in case env vars are already loaded)
  console.log('🔍 [s3Service] Checking AWS configuration...');
  const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
  
  console.log('🔍 [s3Service] BUCKET_NAME:', BUCKET_NAME ? '***set***' : 'MISSING');
  console.log('🔍 [s3Service] AWS_ACCESS_KEY_ID:', AWS_ACCESS_KEY_ID ? '***set***' : 'MISSING');
  console.log('🔍 [s3Service] AWS_SECRET_ACCESS_KEY:', AWS_SECRET_ACCESS_KEY ? '***set***' : 'MISSING');
  
  initializeS3Client();
} catch (error) {
  console.error('❌ [s3Service] Failed to load AWS SDK');
  console.error('❌ [s3Service] Error message:', error.message);
  console.error('❌ [s3Service] Error code:', error.code);
  console.error('❌ [s3Service] Error stack:', error.stack);
  console.error('❌ [s3Service] Please ensure packages are installed: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner');
  console.error('❌ [s3Service] Then restart your server');
}

/**
 * Upload a file buffer to S3
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} key - S3 object key (path)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} S3 object key
 */
const uploadToS3 = async (fileBuffer, key, contentType) => {
  console.log('☁️  [s3Service] uploadToS3 called');
  console.log('☁️  [s3Service] Key:', key);
  console.log('☁️  [s3Service] ContentType:', contentType);
  console.log('☁️  [s3Service] Buffer size:', fileBuffer.length, 'bytes');

  // Initialize client if not already done (lazy initialization)
  const client = initializeS3Client();
  if (!client) {
    const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
    const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET_NAME not configured in .env file');
    }
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
    }
    throw new Error('Failed to initialize S3 client. Check your AWS configuration.');
  }

  const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
  console.log('☁️  [s3Service] Bucket:', BUCKET_NAME);
  console.log('☁️  [s3Service] Region:', process.env.AWS_REGION || 'us-east-1');

  try {
    console.log('☁️  [s3Service] Creating PutObjectCommand...');
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    console.log('☁️  [s3Service] Sending to S3...');
    await client.send(command);
    console.log('✅ [s3Service] Upload successful:', key);
    return key;
  } catch (error) {
    console.error('❌ [s3Service] Upload error:', error.message);
    console.error('❌ [s3Service] Error code:', error.code);
    console.error('❌ [s3Service] Error name:', error.name);
    if (error.$metadata) {
      console.error('❌ [s3Service] Request ID:', error.$metadata.requestId);
      console.error('❌ [s3Service] HTTP Status:', error.$metadata.httpStatusCode);
    }
    throw new Error(`Failed to upload to S3: ${error.message}. Check your AWS credentials and bucket permissions.`);
  }
};

/**
 * Download a file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<Buffer>} File content as buffer
 */
const downloadFromS3 = async (key) => {
  const client = initializeS3Client();
  if (!client) {
    throw new Error('AWS S3 client not initialized. Check your AWS configuration.');
  }

  const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
  if (!BUCKET_NAME) {
    throw new Error('AWS S3 bucket not configured');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await client.send(command);
  const chunks = [];
  
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks);
};

/**
 * Get a presigned URL for temporary access (e.g., for audio playback)
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
const getPresignedUrl = async (key, expiresIn = 3600) => {
  console.log('🔗 [s3Service] getPresignedUrl called');
  console.log('🔗 [s3Service] Key:', key);
  console.log('🔗 [s3Service] Expires in:', expiresIn, 'seconds');

  const client = initializeS3Client();
  if (!client) {
    console.error('❌ [s3Service] S3 client not initialized');
    throw new Error('AWS S3 client not initialized. Check your AWS configuration.');
  }

  const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
  if (!BUCKET_NAME) {
    console.error('❌ [s3Service] BUCKET_NAME not configured');
    throw new Error('AWS S3 bucket not configured');
  }

  console.log('🔗 [s3Service] Bucket:', BUCKET_NAME);
  console.log('🔗 [s3Service] Creating GetObjectCommand...');

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    console.log('🔗 [s3Service] Generating presigned URL...');
    const url = await getSignedUrl(client, command, { expiresIn });
    console.log('✅ [s3Service] Presigned URL generated successfully');
    return url;
  } catch (error) {
    console.error('❌ [s3Service] Failed to generate presigned URL:', error.message);
    console.error('❌ [s3Service] Error code:', error.code);
    throw error;
  }
};

/**
 * Delete a file from S3
 * @param {string} key - S3 object key
 */
const deleteFromS3 = async (key) => {
  if (!key) {
    return;
  }

  const client = initializeS3Client();
  if (!client) {
    console.warn(`⚠️  [s3Service] Cannot delete ${key}: S3 client not initialized`);
    return;
  }

  const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
  if (!BUCKET_NAME) {
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await client.send(command);
  } catch (error) {
    console.error(`❌ [s3Service] Failed to delete S3 object ${key}:`, error.message);
  }
};

/**
 * Generate S3 key for a file
 * @param {string} userId - User ID
 * @param {string} baseName - Base filename
 * @param {string} extension - File extension (.mp3, .txt, .F.txt)
 * @returns {string} S3 key
 */
const generateS3Key = (userId, baseName, extension) => {
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  return `uploads/${userId}/${timestamp}-${sanitized}${extension}`;
};

module.exports = {
  uploadToS3,
  downloadFromS3,
  getPresignedUrl,
  deleteFromS3,
  generateS3Key,
};

