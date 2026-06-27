const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 30 * 1024 * 1024;

const uploadsDir = path.join(__dirname, '..', 'uploads');

function optionalRequire(packageName) {
  try {
    return require(packageName);
  } catch {
    return null;
  }
}

function extensionFor(mimeType) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };
  return extensions[mimeType] || 'bin';
}

function validateUpload(file) {
  if (!file) {
    throw new Error('Invalid file upload');
  }

  const isImage = IMAGE_TYPES.has(file.mimetype);
  const isVideo = VIDEO_TYPES.has(file.mimetype);

  if (!isImage && !isVideo) {
    throw new Error('Only JPG, PNG, WEBP, MP4, WEBM, and MOV uploads are allowed');
  }

  const limit = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (file.size > limit) {
    throw new Error(`${file.originalname} exceeds the ${isImage ? '5MB image' : '30MB video'} limit`);
  }

  return isImage ? 'image' : 'video';
}

async function compressImage(file) {
  const sharp = optionalRequire('sharp');
  if (!sharp) return file.buffer;

  return sharp(file.buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

async function uploadToS3({ buffer, key, mimeType }) {
  const sdk = optionalRequire('@aws-sdk/client-s3');
  const bucket = process.env.AWS_S3_BUCKET;
  if (!sdk || !bucket || !process.env.AWS_REGION) return null;

  const { S3Client, PutObjectCommand } = sdk;
  const client = new S3Client({ region: process.env.AWS_REGION });
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  const publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL;
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

async function saveLocal({ buffer, key }) {
  const absolutePath = path.join(uploadsDir, key);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return `/uploads/${key.replace(/\\/g, '/')}`;
}

async function storeUploadedFiles(files = []) {
  const imageUrls = [];
  const videoUrls = [];

  for (const file of files) {
    const kind = validateUpload(file);
    const storedBuffer = kind === 'image' ? await compressImage(file) : file.buffer;
    const extension = kind === 'image' && optionalRequire('sharp') ? 'jpg' : extensionFor(file.mimetype);
    const key = `${kind}s/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
    const mimeType = kind === 'image' && extension === 'jpg' ? 'image/jpeg' : file.mimetype;
    const url = await uploadToS3({ buffer: storedBuffer, key, mimeType })
      || await saveLocal({ buffer: storedBuffer, key });

    if (kind === 'image') imageUrls.push(url);
    if (kind === 'video') videoUrls.push(url);
  }

  return { imageUrls, videoUrls };
}

module.exports = {
  IMAGE_TYPES,
  VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  storeUploadedFiles,
  validateUpload,
};
