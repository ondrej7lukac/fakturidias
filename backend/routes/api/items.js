const { getUserItems, saveUserItem } = require('../../lib/storage');
const { validateItem } = require('../../lib/validators');
const {
  sendJson,
  sendCors,
  sendMethodNotAllowed,
  readJsonBody,
} = require('../../lib/utils');
const { badJson, validationError } = require('./helpers');

async function handleItems(req, res, requestPath, userEmail) {
  if (requestPath !== '/api/items') return false;

  if (req.method === 'OPTIONS') return (sendCors(res, req), true);

  if (req.method === 'GET') {
    const items = await getUserItems(userEmail);
    sendJson(res, 200, { items, requestId: req.requestId }, req);
    return true;
  }

  if (req.method === 'POST') {
    readJsonBody(
      req,
      async (err, body) => {
        if (err) return badJson(res, req);

        const { item } = body;
        const validation = validateItem(item);
        if (!validation.valid)
          return validationError(res, req, validation.errors);

        const success = await saveUserItem(userEmail, item);
        success
          ? sendJson(
              res,
              200,
              { success: true, item, requestId: req.requestId },
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
  handleItems,
};
