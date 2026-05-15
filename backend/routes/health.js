const { sendJson } = require('../lib/utils');
const { isConnected } = require('../lib/storage');

function handleHealthRoute(req, res, requestPath) {
  if (requestPath !== '/healthz') return false;

  if (req.method !== 'GET') {
    sendJson(
      res,
      405,
      {
        error: 'Method not allowed',
        allowedMethods: ['GET'],
        requestId: req.requestId,
      },
      req,
    );
    return true;
  }

  sendJson(
    res,
    200,
    {
      status: 'ok',
      uptimeSec: Math.round(process.uptime()),
      dbConnected: isConnected(),
      requestId: req.requestId,
    },
    req,
  );
  return true;
}

module.exports = {
  handleHealthRoute,
};
