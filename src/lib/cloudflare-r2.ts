import { S3 } from 'aws-sdk';
import { cloudflareR2Config } from './cloudflare-r2-config';

const s3 = new S3({
  endpoint: `https://cf24db75743df6a26509046a992b46e6.r2.cloudflarestorage.com`,
  accessKeyId: cloudflareR2Config.accessKeyId,
  secretAccessKey: cloudflareR2Config.secretAccessKey,
  signatureVersion: 'v4',
});

export const getPublicUrl = (fileName: string) => `https://pub-a85df5aab2c3484bbdfd3e8aad94b066.r2.dev/${fileName}`;

export async function uploadToR2(file: Buffer, fileName: string): Promise<string> {
  const params = {
    Bucket: cloudflareR2Config.bucketName,
    Key: fileName,
    Body: file,
    ACL: 'public-read', 
  };

  await s3.upload(params).promise();
  return getPublicUrl(fileName);
}

export async function deleteFromR2(fileName: string): Promise<void> {
  const params = {
    Bucket: cloudflareR2Config.bucketName,
    Key: fileName,
  };

  await s3.deleteObject(params).promise();
}
