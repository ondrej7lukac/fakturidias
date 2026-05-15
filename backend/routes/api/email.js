const { sendJson } = require('../../lib/utils');

function handleEmail(req, res, requestPath) {
  if (requestPath !== '/api/email/send') return false;

  sendJson(
    res,
    503,
    {
      error: 'Email service temporarily unavailable',
      requestId: req.requestId,
    },
    req,
  );

  return true;
}

module.exports = {
  handleEmail,
};
