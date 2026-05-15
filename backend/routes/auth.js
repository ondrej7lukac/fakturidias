const {
  handleAuthUrl,
  handleAuthCallback,
  handleAuthStatus,
  handleAuthDisconnect,
} = require('../lib/auth');
const { sendMethodNotAllowed } = require('../lib/utils');

function handleAuthRoutes(req, res, requestPath, url) {
  if (requestPath === '/auth/google/url') {
    if (req.method === 'GET') {
      handleAuthUrl(req, res);
      return true;
    }
    sendMethodNotAllowed(res, req, ['GET']);
    return true;
  }

  if (requestPath === '/auth/google/callback') {
    if (req.method === 'GET') {
      handleAuthCallback(req, res, url);
      return true;
    }
    sendMethodNotAllowed(res, req, ['GET']);
    return true;
  }

  if (requestPath === '/auth/google/status') {
    if (req.method === 'GET') {
      handleAuthStatus(req, res);
      return true;
    }
    sendMethodNotAllowed(res, req, ['GET']);
    return true;
  }

  if (requestPath === '/auth/google/disconnect') {
    if (req.method === 'POST') {
      handleAuthDisconnect(req, res);
      return true;
    }
    sendMethodNotAllowed(res, req, ['POST']);
    return true;
  }

  return false;
}

module.exports = {
  handleAuthRoutes,
};
