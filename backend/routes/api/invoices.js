const {
  isConnected,
  getUserInvoices,
  saveSingleInvoice,
  saveUserInvoices_FS,
  InvoiceModel,
} = require('../../lib/storage');
const { validateInvoice } = require('../../lib/validators');
const {
  sendJson,
  sendCors,
  sendMethodNotAllowed,
  readJsonBody,
} = require('../../lib/utils');
const { badJson, validationError } = require('./helpers');

async function handleInvoices(req, res, requestPath, userEmail) {
  if (requestPath === '/api/invoices') {
    if (req.method === 'OPTIONS') return (sendCors(res, req), true);

    if (req.method === 'GET') {
      const invoices = await getUserInvoices(userEmail);
      sendJson(res, 200, { invoices, requestId: req.requestId }, req);
      return true;
    }

    if (req.method === 'POST') {
      readJsonBody(
        req,
        async (err, body) => {
          if (err) return badJson(res, req);

          const { invoice } = body;
          const validation = validateInvoice(invoice);
          if (!validation.valid)
            return validationError(res, req, validation.errors);

          let success = false;
          if (isConnected()) {
            success = await saveSingleInvoice(userEmail, invoice);
          } else {
            const invoices = await getUserInvoices(userEmail);
            const idx = invoices.findIndex((inv) => inv.id === invoice.id);
            if (idx >= 0) invoices[idx] = invoice;
            else invoices.push(invoice);
            success = saveUserInvoices_FS(userEmail, invoices);
          }

          success
            ? sendJson(
                res,
                200,
                { success: true, invoice, requestId: req.requestId },
                req,
              )
            : sendJson(
                res,
                500,
                { error: 'Failed to save', requestId: req.requestId },
                req,
              );
        },
        { maxBytes: 2 * 1024 * 1024 },
      );
      return true;
    }

    sendMethodNotAllowed(res, req, ['OPTIONS', 'GET', 'POST']);
    return true;
  }

  if (requestPath.startsWith('/api/invoices/')) {
    if (req.method === 'DELETE') {
      const id = requestPath.split('/api/invoices/')[1];
      if (isConnected()) {
        await InvoiceModel.deleteOne({ userEmail, id });
        sendJson(res, 200, { success: true, requestId: req.requestId }, req);
        return true;
      }

      const invoices = await getUserInvoices(userEmail);
      const filtered = invoices.filter((inv) => inv.id !== id);
      const success = saveUserInvoices_FS(userEmail, filtered);
      success
        ? sendJson(res, 200, { success: true, requestId: req.requestId }, req)
        : sendJson(
            res,
            500,
            { error: 'Failed to delete', requestId: req.requestId },
            req,
          );
      return true;
    }

    sendMethodNotAllowed(res, req, ['DELETE']);
    return true;
  }

  return false;
}

module.exports = {
  handleInvoices,
};
