const { getCurrentUserEmail } = require('../../lib/auth');
const { sendJson } = require('../../lib/utils');

async function ensureApiAuth(req, res, requestPath) {
  if (!requestPath.startsWith('/api') || requestPath.startsWith('/api/ares')) {
    return { allowed: true, userEmail: null };
  }

  const userEmail = await getCurrentUserEmail(req);
  if (!userEmail) {
    sendJson(
      res,
      401,
      {
        error: 'Not authenticated',
        requireLogin: true,
        requestId: req.requestId,
      },
      req,
    );
    return { allowed: false, userEmail: null };
  }

  return { allowed: true, userEmail };
}

function badJson(res, req) {
  sendJson(
    res,
    400,
    { error: 'Invalid JSON body', requestId: req.requestId },
    req,
  );
}

function validationError(res, req, details) {
  sendJson(
    res,
    400,
    {
      error: 'Validation failed',
      details,
      requestId: req.requestId,
    },
    req,
  );
}

module.exports = {
  ensureApiAuth,
  badJson,
  validationError,
};
