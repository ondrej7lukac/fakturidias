const { getUserSettings, saveUserSettings } = require('../../lib/storage');
const { validateSettings } = require('../../lib/validators');
const {
  sendJson,
  sendCors,
  sendMethodNotAllowed,
  readJsonBody,
} = require('../../lib/utils');
const { badJson, validationError } = require('./helpers');

async function handleSettings(req, res, requestPath, userEmail) {
  if (requestPath !== '/api/settings') return false;

  if (req.method === 'OPTIONS') return (sendCors(res, req), true);

  if (req.method === 'GET') {
    const settings = await getUserSettings(userEmail);
    sendJson(res, 200, { settings, requestId: req.requestId }, req);
    return true;
  }

  if (req.method === 'POST') {
    readJsonBody(
      req,
      async (err, body) => {
        if (err) return badJson(res, req);

        const validation = validateSettings(body.settings);
        if (!validation.valid)
          return validationError(res, req, validation.errors);

        const success = await saveUserSettings(userEmail, body.settings);
        success
          ? sendJson(
              res,
              200,
              {
                success: true,
                settings: body.settings,
                requestId: req.requestId,
              },
              req,
            )
          : sendJson(
              res,
              500,
              { error: 'Failed to save', requestId: req.requestId },
              req,
            );
      },
      { maxBytes: 512 * 1024 },
    );
    return true;
  }

  sendMethodNotAllowed(res, req, ['OPTIONS', 'GET', 'POST']);
  return true;
}

module.exports = {
  handleSettings,
};
