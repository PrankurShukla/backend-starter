import type { Readable } from 'node:stream';

export interface UploadInput {
  key: string;
  contentType: string;
  body: Buffer | Readable;
  access: 'public' | 'private';
}

export interface StoredFile {
  key: string;
  provider: string;
  contentType: string;
  size?: number;
  publicUrl?: string;
}

export interface IStorageProvider {
  upload(input: UploadInput): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  getDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
