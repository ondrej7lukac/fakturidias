const { connectDB } = require('../../lib/storage');
const { ensureApiAuth } = require('./helpers');
const { handleInvoices } = require('./invoices');
const { handleCustomers } = require('./customers');
const { handleItems } = require('./items');
const { handleSettings } = require('./settings');
const { handleDrive } = require('./drive');
const { handleEmail } = require('./email');

async function handleApiRoutes(req, res, requestPath) {
  if (!requestPath.startsWith('/api')) return false;

  await connectDB();

  const auth = await ensureApiAuth(req, res, requestPath);
  if (!auth.allowed) return true;
  const userEmail = auth.userEmail;

  if (await handleInvoices(req, res, requestPath, userEmail)) return true;
  if (await handleCustomers(req, res, requestPath, userEmail)) return true;
  if (await handleItems(req, res, requestPath, userEmail)) return true;
  if (await handleSettings(req, res, requestPath, userEmail)) return true;
  if (await handleDrive(req, res, requestPath, userEmail)) return true;
  if (handleEmail(req, res, requestPath)) return true;

  return false;
}

module.exports = {
  handleApiRoutes,
};
