import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ScryptPasswordHasher } from '../src/infrastructure/auth/ScryptPasswordHasher';
import { InlineQueueProvider } from '../src/infrastructure/queue/InlineQueueProvider';
import { JobHandlerRegistry } from '../src/infrastructure/queue/JobHandlerRegistry';
import { LocalStorageProvider } from '../src/infrastructure/storage/LocalStorageProvider';
import { InMemoryRefreshSessionRepository } from '../src/repositories/InMemoryRefreshSessionRepository';
import { ConsoleEmailProvider } from '../src/infrastructure/email/ConsoleEmailProvider';
import { QueuedEmailProvider } from '../src/infrastructure/email/QueuedEmailProvider';
import pino from 'pino';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('default adapters', () => {
  it('hashes passwords without storing the original value', async () => {
    const hasher = new ScryptPasswordHasher(2 ** 14);
    const hash = await hasher.hash('correct horse battery staple');
    expect(hash).not.toContain('correct horse battery staple');
    await expect(hasher.compare('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(hasher.compare('wrong password', hash)).resolves.toBe(false);
  });

  it('runs jobs through the same registry used by the durable worker', async () => {
    const handled: string[] = [];
    const handlers = new JobHandlerRegistry();
    handlers.register<{ value: string }>('example', payload => {
      handled.push(payload.value);
      return Promise.resolve();
    });
    const queue = new InlineQueueProvider(handlers);
    await queue.enqueue({ type: 'example', payload: { value: 'processed' } });
    expect(handled).toEqual(['processed']);
    expect(() => handlers.register('example', () => Promise.resolve())).toThrow('already registered');
    await expect(handlers.process({ type: 'missing', payload: {} }, 'job-id')).rejects.toThrow('No handler');
    await expect(queue.enqueue({ type: 'example', payload: { value: 'late' }, availableAt: new Date(Date.now() + 60_000) }))
      .rejects.toThrow('does not support delayed jobs');
  });

  it('stores local development files while blocking path traversal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'backend-starter-storage-'));
    temporaryDirectories.push(root);
    const storage = new LocalStorageProvider(root);
    await storage.upload({ key: 'documents/example.txt', contentType: 'text/plain', body: Buffer.from('hello'), access: 'private' });
    await expect(readFile(join(root, 'documents/example.txt'), 'utf8')).resolves.toBe('hello');
    await storage.check();
    expect(await storage.getDownloadUrl('documents/example.txt')).toContain('example.txt');
    const stream = storage.createReadStream('documents/example.txt');
    expect(stream.readable).toBe(true);
    stream.destroy();
    await storage.delete('documents/example.txt');
    await expect(storage.upload({ key: '../escape.txt', contentType: 'text/plain', body: Buffer.from('bad'), access: 'private' }))
      .rejects.toThrow('Invalid storage key');
  });

  it('atomically consumes and revokes in-memory refresh sessions', async () => {
    const sessions = new InMemoryRefreshSessionRepository();
    const future = new Date(Date.now() + 60_000);
    await sessions.create({ id: 'one', userId: 'user-one', tokenHash: 'token-one', expiresAt: future });
    await expect(sessions.consume('token-one', new Date())).resolves.toBe(true);
    await expect(sessions.consume('token-one', new Date())).resolves.toBe(false);
    await sessions.create({ id: 'two', userId: 'user-one', tokenHash: 'token-two', expiresAt: future });
    await sessions.revokeAllForUser('user-one');
    await expect(sessions.consume('token-two', new Date())).resolves.toBe(false);
    await sessions.create({ id: 'expired', userId: 'user-two', tokenHash: 'expired', expiresAt: new Date(0) });
    await expect(sessions.deleteExpired(new Date())).resolves.toBe(1);
    await sessions.revoke('unknown');
  });

  it('keeps email callers independent from direct and queued delivery', async () => {
    const message = { to: { email: 'user@example.com' }, subject: 'Welcome', text: 'Hello' };
    const consoleProvider = new ConsoleEmailProvider(pino({ enabled: false }));
    await expect(consoleProvider.send(message)).resolves.toEqual({ messageId: expect.any(String) });

    const handlers = new JobHandlerRegistry();
    handlers.register('email.send', () => Promise.resolve());
    const queuedProvider = new QueuedEmailProvider(new InlineQueueProvider(handlers));
    await expect(queuedProvider.send(message)).resolves.toEqual({ messageId: expect.any(String) });
  });
});
