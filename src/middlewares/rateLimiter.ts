import { rateLimit } from 'express-rate-limit';
import { config } from '../config/environment';
import { ErrorCode } from '../constants/errorCodes';

export const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  limit: config.RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.fail('Too many requests, please try again later', 429, ErrorCode.RATE_LIMITED);
  },
});
