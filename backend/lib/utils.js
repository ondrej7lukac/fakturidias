const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const baseDir = path.join(__dirname, '..', '..');
const debugLogPath = path.join(baseDir, '.cursor', 'debug.log');

function logDebug(location, message, data, hypothesisId) {
  const payload = {
    location,
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'post-fix',
    hypothesisId,
  };
  if (globalThis.fetch) {
    fetch('http://127.0.0.1:7243/ingest/6ddf4ffa-f2d9-42ae-9315-d8b3c8b9efb8', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } else {
    try {
      if (!fs.existsSync(path.dirname(debugLogPath))) {
        fs.mkdirSync(path.dirname(debugLogPath), { recursive: true });
      }
      fs.appendFileSync(debugLogPath, `${JSON.stringify(payload)}\n`, 'utf8');
    } catch (_) {
      // best-effort logging only
    }
  }
}

function parseAllowedOrigins() {
  const raw = (process.env.CORS_ORIGINS || '').trim();
  if (!raw) return null;
  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length ? origins : null;
}

function getOriginForRequest(req) {
  const origin = req?.headers?.origin;
  const allowList = parseAllowedOrigins();
  if (!allowList) return '*';
  if (!origin) return allowList[0];
  return allowList.includes(origin) ? origin : 'null';
}

function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return (
    req?.socket?.remoteAddress || req?.connection?.remoteAddress || 'unknown'
  );
}

function ensureRequestId(req) {
  if (!req) return undefined;
  if (!req.requestId) {
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  }
  return req.requestId;
}

function writeSecurityHeaders(res, req) {
  const origin = getOriginForRequest(req);
  const requestId = ensureRequestId(req);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization,X-Requested-With,X-Request-Id',
  );
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
  if (requestId) {
    res.setHeader('X-Request-Id', requestId);
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
}

function sendJson(res, status, payload, req) {
  writeSecurityHeaders(res, req);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload));
}

function sendCors(res, req) {
  writeSecurityHeaders(res, req);
  res.writeHead(204, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end();
}

function sendNotFound(res, req) {
  return sendJson(res, 404, { error: 'Not found' }, req);
}

function sendMethodNotAllowed(res, req, methods = []) {
  if (methods.length) {
    res.setHeader('Allow', methods.join(','));
  }
  return sendJson(
    res,
    405,
    { error: 'Method not allowed', allowedMethods: methods },
    req,
  );
}

function readJsonBody(req, callback, options = {}) {
  const maxBytes = Number(
    options.maxBytes || process.env.MAX_BODY_BYTES || 1024 * 1024,
  );
  let data = '';
  let size = 0;
  let settled = false;
  req.on('data', (chunk) => {
    if (settled) return;
    size += chunk.length;
    if (size > maxBytes) {
      settled = true;
      callback(new Error('Body too large'));
      req.destroy();
      return;
    }
    data += chunk;
  });
  req.on('end', () => {
    if (settled) return;
    settled = true;
    try {
      const parsed = JSON.parse(data || '{}');
      callback(null, parsed);
    } catch (error) {
      callback(new Error('Invalid JSON body'));
    }
  });
  req.on('error', () => {
    if (settled) return;
    settled = true;
    callback(new Error('Failed to read request body'));
  });
}

module.exports = {
  logDebug,
  getClientIp,
  ensureRequestId,
  writeSecurityHeaders,
  sendJson,
  sendCors,
  sendNotFound,
  sendMethodNotAllowed,
  readJsonBody,
};
