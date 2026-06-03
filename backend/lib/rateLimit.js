"use strict";

// In-memory fixed-window rate limiter. Suitable for the single-instance
// Railway/Docker deployment. For a multi-instance setup, swap the Map store
// for a shared store (e.g. Redis) keyed the same way.

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function createRateLimiter({ windowMs, max }) {
  const hits = new Map(); // key -> { count, resetAt }

  function check(key) {
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    return {
      allowed: entry.count <= max,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  // Bound memory: drop expired entries once per window.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now >= entry.resetAt) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  return { check };
}

module.exports = { createRateLimiter, getClientIp };
