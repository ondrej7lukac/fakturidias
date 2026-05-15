const { getAuthClient } = require('../../lib/auth');
const { uploadInvoiceToDrive } = require('../../lib/drive');
const { validateDriveBackupPayload } = require('../../lib/validators');
const {
  sendJson,
  sendMethodNotAllowed,
  readJsonBody,
} = require('../../lib/utils');
const { badJson, validationError } = require('./helpers');

async function handleDrive(req, res, requestPath, userEmail) {
  if (requestPath !== '/api/drive/backup') return false;

  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, req, ['POST']);
    return true;
  }

  readJsonBody(
    req,
    async (err, body) => {
      if (err) return badJson(res, req);

      const validation = validateDriveBackupPayload(body);
      if (!validation.valid)
        return validationError(res, req, validation.errors);

      const { invoice, pdfBase64 } = body;
      try {
        await getAuthClient(userEmail);
        const fileId = await uploadInvoiceToDrive(
          userEmail,
          invoice,
          pdfBase64,
        );
        sendJson(
          res,
          200,
          { success: true, fileId, requestId: req.requestId },
          req,
        );
      } catch (error) {
        sendJson(
          res,
          500,
          {
            error: 'Failed to backup to Drive',
            message: error.message,
            requestId: req.requestId,
          },
          req,
        );
      }
    },
    { maxBytes: 15 * 1024 * 1024 },
  );

  return true;
}

module.exports = {
  handleDrive,
};
