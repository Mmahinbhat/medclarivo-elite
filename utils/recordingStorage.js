// S3-compatible object storage for call recordings (Backblaze B2, Cloudflare R2, AWS S3…).
//
// Env vars (all required to turn recording on):
//   S3_ENDPOINT           e.g. https://s3.us-east-005.backblazeb2.com
//   S3_REGION             e.g. us-east-005   (the part after "s3." in the endpoint)
//   S3_BUCKET             e.g. medclarivo-call-recordings  (keep it PRIVATE)
//   S3_ACCESS_KEY_ID      Backblaze "keyID"
//   S3_SECRET_ACCESS_KEY  Backblaze "applicationKey"
const {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');

let client = null;

function isConfigured() {
  const e = process.env;
  return !!(e.S3_ENDPOINT && e.S3_REGION && e.S3_BUCKET && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY);
}

function s3() {
  if (!client) {
    client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
      // Backblaze B2 doesn't support the newer default checksum headers
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return client;
}

async function putObject(key, body, contentType) {
  await s3().send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType,
  }));
}

/** Returns a Node readable stream of the object. */
async function getObjectStream(key) {
  const out = await s3().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  return out.Body;
}

async function deleteObjects(keys) {
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    if (!batch.length) continue;
    await s3().send(new DeleteObjectsCommand({
      Bucket: process.env.S3_BUCKET,
      Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
    }));
  }
}

module.exports = { isConfigured, putObject, getObjectStream, deleteObjects };
