import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'content';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * List objects in the R2 bucket with a given prefix.
 */
export async function listR2Objects(prefix) {
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
  });
  return r2Client.send(command);
}

/**
 * Count .mp4 videos in a prefix and check if they follow the 1.mp4, 2.mp4 convention.
 */
export async function countR2Videos(prefix) {
  const data = await listR2Objects(prefix);
  if (!data.Contents) return { count: 0, hasFirst: false };

  const mp4Files = data.Contents.filter(item => item.Key.toLowerCase().endsWith('.mp4'));
  // Ensure we compare against full keys
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  const firstVideoKey = `${normalizedPrefix}1.mp4`;
  const hasFirst = mp4Files.some(f => f.Key === firstVideoKey);

  return {
    count: mp4Files.length,
    hasFirst
  };
}

/**
 * Generate a presigned PUT URL for uploading a file directly to R2.
 * @param {string} key - The object key (e.g., "username/3.mp4")
 * @param {string} contentType - MIME type (e.g., "video/mp4")
 * @param {number} expiresIn - URL validity in seconds (default 600 = 10 min)
 * @returns {Promise<string>} presigned URL
 */
export async function getPresignedUploadUrl(key, contentType = 'video/mp4', expiresIn = 600) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Generate a presigned GET URL for downloading a file directly from R2.
 * @param {string} key - The object key (e.g., "username/3.mp4")
 * @param {number} expiresIn - URL validity in seconds (default 3600 = 1 hour)
 * @returns {Promise<string>} presigned URL
 */
export async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get an object from R2 as a readable stream.
 * @param {string} key - The object key (e.g., "username/3.mp4")
 * @returns {Promise<{stream: ReadableStream, contentType: string, contentLength: number}>}
 */
export async function getR2Object(key) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  const response = await r2Client.send(command);
  return {
    stream: response.Body,
    contentType: response.ContentType || 'video/mp4',
    contentLength: response.ContentLength,
  };
}

