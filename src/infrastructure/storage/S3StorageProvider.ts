import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import type { IStorageProvider, StoredFile, UploadInput } from '../../providers/storage/IStorageProvider';

export interface S3StorageOptions {
  region: string;
  endpoint?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  publicBaseUrl?: string;
}

export class S3StorageProvider implements IStorageProvider {
  private readonly client: S3Client;

  constructor(private readonly options: S3StorageOptions) {
    const config: S3ClientConfig = {
      region: options.region,
      forcePathStyle: options.forcePathStyle,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
    };
    this.client = new S3Client(config);
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    await new Upload({
      client: this.client,
      params: {
        Bucket: this.options.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
      leavePartsOnError: false,
    }).done();
    return {
      key: input.key,
      provider: 's3',
      contentType: input.contentType,
      ...(input.access === 'public' && this.options.publicBaseUrl
        ? { publicUrl: `${this.options.publicBaseUrl.replace(/\/$/, '')}/${encodeURI(input.key)}` }
        : {}),
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }));
  }

  getDownloadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.options.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  async check(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.options.bucket }));
  }

  destroy(): void {
    this.client.destroy();
  }
}
