import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export interface RequestContext {
  requestId: string;
  startedAt: number;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const requestContext: RequestHandler = (req, res, next) => {
  const suppliedRequestId = req.header('x-request-id')?.trim();
  const requestId = suppliedRequestId && suppliedRequestId.length <= 128 ? suppliedRequestId : randomUUID();
  res.setHeader('x-request-id', requestId);
  res.locals.requestId = requestId;

  storage.run({ requestId, startedAt: Date.now() }, next);
};

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getRequestId(): string {
  return storage.getStore()?.requestId ?? 'outside-request';
}
