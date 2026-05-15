const { handleAresSearch, handleAresIco } = require('../lib/ares');
const {
  sendJson,
  sendCors,
  sendMethodNotAllowed,
  readJsonBody,
} = require('../lib/utils');

function handleAresRoutes(req, res, requestPath, url) {
  if (requestPath === '/api/ares/search') {
    if (req.method === 'OPTIONS') {
      sendCors(res, req);
      return true;
    }

    if (req.method === 'POST') {
      readJsonBody(
        req,
        (err, body) => {
          if (err) {
            sendJson(
              res,
              400,
              { error: 'Invalid JSON body', requestId: req.requestId },
              req,
            );
            return;
          }
          handleAresSearch(req, res, body);
        },
        { maxBytes: 512 * 1024 },
      );
      return true;
    }

    sendMethodNotAllowed(res, req, ['OPTIONS', 'POST']);
    return true;
  }

  if (requestPath === '/api/ares/ico') {
    if (req.method === 'OPTIONS') {
      sendCors(res, req);
      return true;
    }

    if (req.method === 'GET') {
      handleAresIco(req, res, url);
      return true;
    }

    sendMethodNotAllowed(res, req, ['OPTIONS', 'GET']);
    return true;
  }

  return false;
}

module.exports = {
  handleAresRoutes,
};
