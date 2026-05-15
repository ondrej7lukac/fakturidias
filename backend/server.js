const http = require('http');
require('dotenv').config();

const {
  ensureRequestId,
  sendJson,
  sendCors,
  logDebug,
} = require('./lib/utils');
const { evaluateRateLimit } = require('./middleware/rateLimit');
const { withSession } = require('./middleware/session');
const { handleHealthRoute } = require('./routes/health');
const { handleAresRoutes } = require('./routes/ares');
const { handleAuthRoutes } = require('./routes/auth');
const { handleApiRoutes } = require('./routes/api/index');
const { handleStaticRoutes } = require('./routes/static');

const port = process.env.PORT || 5500;

function normalizeRequestPath(rawPath) {
  let requestPath = decodeURIComponent(rawPath || '/');

  if (requestPath.startsWith('/api/v1/')) {
    requestPath = requestPath.replace('/api/v1/', '/api/');
  }

  if (requestPath.length > 1 && requestPath.endsWith('/')) {
    requestPath = requestPath.slice(0, -1);
  }

  return requestPath;
}

async function dispatchRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = normalizeRequestPath(url.pathname);

  logDebug(
    'backend/server.js',
    'incoming request',
    { method: req.method, path: requestPath },
    'modular-v2',
  );

  if (handleHealthRoute(req, res, requestPath)) return;
  if (handleAresRoutes(req, res, requestPath, url)) return;
  if (handleAuthRoutes(req, res, requestPath, url)) return;
  if (await handleApiRoutes(req, res, requestPath)) return;

  if (req.method === 'OPTIONS') {
    sendCors(res, req);
    return;
  }

  handleStaticRoutes(req, res, requestPath);
}

const requestHandler = async (req, res) => {
  ensureRequestId(req);

  const rateLimit = evaluateRateLimit(req);
  if (rateLimit.limited) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSec || 1));
    sendJson(res, 429, { error: 'Too many requests' }, req);
    return;
  }

  try {
    withSession(req, res, () => {
      Promise.resolve(dispatchRequest(req, res)).catch((err) => {
        console.error('Handler Error:', err);
        sendJson(
          res,
          500,
          {
            error: 'Internal Server Error',
            message: err.message,
            requestId: req.requestId,
          },
          req,
        );
      });
    });
  } catch (err) {
    console.error('Middleware Error:', err);
    sendJson(
      res,
      500,
      {
        error: 'Internal Server Error',
        message: err.message,
        requestId: req.requestId,
      },
      req,
    );
  }
};

if (require.main === module) {
  const server = http.createServer(requestHandler);
  server.listen(port, () =>
    console.log(`Modular server running at http://localhost:${port}/`),
  );
}

module.exports = requestHandler;
