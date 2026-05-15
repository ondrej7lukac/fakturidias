const { getClientIp } = require('../lib/utils');

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 240);

const bucket = new Map();

function evaluateRateLimit(req) {
  const path = req.url || '/';
  if (!(path.startsWith('/api') || path.startsWith('/auth'))) {
    return { limited: false };
  }

  const ip = getClientIp(req);
  const key = `${ip}:${path.split('?')[0]}`;
  const now = Date.now();
  const current = bucket.get(key);

  if (!current || now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
    bucket.set(key, { count: 1, windowStart: now });
    return { limited: false };
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return {
      limited: true,
      retryAfterSec: Math.ceil(
        (RATE_LIMIT_WINDOW_MS - (now - current.windowStart)) / 1000,
      ),
    };
  }

  current.count += 1;
  bucket.set(key, current);
  return { limited: false };
}

module.exports = {
  evaluateRateLimit,
};
