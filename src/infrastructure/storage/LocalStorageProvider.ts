import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import type { IStorageProvider, StoredFile, UploadInput } from '../../providers/storage/IStorageProvider';

export class LocalStorageProvider implements IStorageProvider {
  private readonly root: string;

  constructor(rootPath: string) {
    this.root = resolve(rootPath);
  }

  private target(key: string): string {
    const target = resolve(this.root, key);
    if (target !== this.root && !target.startsWith(`${this.root}${sep}`)) throw new Error('Invalid storage key');
    return target;
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    const target = this.target(input.key);
    await mkdir(dirname(target), { recursive: true });
    const source = Buffer.isBuffer(input.body) ? Readable.from(input.body) : input.body;
    await pipeline(source, createWriteStream(target, { flags: 'wx' }));
    const details = await stat(target);
    return {
      key: input.key,
      provider: 'local',
      contentType: input.contentType,
      size: details.size,
      ...(input.access === 'public' ? { publicUrl: pathToFileURL(target).toString() } : {}),
    };
  }

  async delete(key: string): Promise<void> {
    await rm(this.target(key), { force: true });
  }

  getDownloadUrl(key: string): Promise<string> {
    return Promise.resolve(pathToFileURL(this.target(key)).toString());
  }

  async check(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await access(this.root);
  }

  createReadStream(key: string): Readable {
    return createReadStream(this.target(key));
  }
}
