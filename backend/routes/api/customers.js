const { getUserCustomers, saveUserCustomer } = require('../../lib/storage');
const { validateCustomer } = require('../../lib/validators');
const {
  sendJson,
  sendCors,
  sendMethodNotAllowed,
  readJsonBody,
} = require('../../lib/utils');
const { badJson, validationError } = require('./helpers');

async function handleCustomers(req, res, requestPath, userEmail) {
  if (requestPath !== '/api/customers') return false;

  if (req.method === 'OPTIONS') return (sendCors(res, req), true);

  if (req.method === 'GET') {
    const customers = await getUserCustomers(userEmail);
    sendJson(res, 200, { customers, requestId: req.requestId }, req);
    return true;
  }

  if (req.method === 'POST') {
    readJsonBody(
      req,
      async (err, body) => {
        if (err) return badJson(res, req);

        const { customer } = body;
        const validation = validateCustomer(customer);
        if (!validation.valid)
          return validationError(res, req, validation.errors);

        const success = await saveUserCustomer(userEmail, customer);
        success
          ? sendJson(
              res,
              200,
              { success: true, customer, requestId: req.requestId },
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
  handleCustomers,
};
