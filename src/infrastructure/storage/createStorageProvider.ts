import type { AppConfig } from '../../config/environment';
import type { IStorageProvider } from '../../providers/storage/IStorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { S3StorageProvider } from './S3StorageProvider';

export type ManagedStorageProvider = IStorageProvider & { check(): Promise<void>; destroy?: () => void };

export function createStorageProvider(config: AppConfig): ManagedStorageProvider {
  if (config.STORAGE_PROVIDER === 's3') {
    return new S3StorageProvider({
      region: config.S3_REGION,
      bucket: config.S3_BUCKET,
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      forcePathStyle: config.S3_FORCE_PATH_STYLE,
      ...(config.S3_ENDPOINT ? { endpoint: config.S3_ENDPOINT } : {}),
      ...(config.S3_PUBLIC_BASE_URL ? { publicBaseUrl: config.S3_PUBLIC_BASE_URL } : {}),
    });
  }
  return new LocalStorageProvider(config.LOCAL_STORAGE_PATH);
}
