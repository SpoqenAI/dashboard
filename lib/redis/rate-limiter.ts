import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { createRedisClient } from './client';

const redis = createRedisClient();

/**
 * Fixed-window limiter factory.
 * @param prefix   Key namespace, e.g. "rl:emailcheck"
 * @param limit    Max requests in the window
 * @param window   Window length in Upstash time syntax (e.g. "60 s")
 */
export const makeFixedWindowLimiter = (
  prefix: string,
  limit = 10,
  window: Duration = '60 s'
) =>
  new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(limit, window),
    prefix,
    analytics: true,
  });

// Specific limiter for the email-existence endpoint: 10 req / minute / IP
export const emailCheckLimiter = makeFixedWindowLimiter(
  'rl:emailcheck',
  10,
  '60 s'
);
