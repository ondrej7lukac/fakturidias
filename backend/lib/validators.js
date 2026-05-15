function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value, maxLen = 512) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLen
  );
}

function validateInvoice(invoice) {
  const errors = [];
  if (!isPlainObject(invoice)) {
    return { valid: false, errors: ['Invoice must be an object'] };
  }

  if (!isNonEmptyString(invoice.id, 128)) {
    errors.push('invoice.id is required and must be a string up to 128 chars');
  }

  if (
    invoice.invoiceNumber &&
    !isNonEmptyString(String(invoice.invoiceNumber), 64)
  ) {
    errors.push(
      'invoice.invoiceNumber must be a non-empty string up to 64 chars',
    );
  }

  if (!isPlainObject(invoice.client)) {
    errors.push('invoice.client must be an object');
  }

  if (!Array.isArray(invoice.items)) {
    errors.push('invoice.items must be an array');
  }

  if (Array.isArray(invoice.items) && invoice.items.length > 1000) {
    errors.push('invoice.items exceeds maximum allowed items (1000)');
  }

  if (invoice.amount != null && Number.isNaN(Number(invoice.amount))) {
    errors.push('invoice.amount must be numeric');
  }

  if (invoice.payment != null && !isPlainObject(invoice.payment)) {
    errors.push('invoice.payment must be an object when provided');
  }

  return { valid: errors.length === 0, errors };
}

function validateCustomer(customer) {
  const errors = [];
  if (!isPlainObject(customer)) {
    return { valid: false, errors: ['customer must be an object'] };
  }
  if (!isNonEmptyString(customer.name, 256)) {
    errors.push(
      'customer.name is required and must be a non-empty string up to 256 chars',
    );
  }
  if (customer.email != null && typeof customer.email !== 'string') {
    errors.push('customer.email must be a string');
  }
  return { valid: errors.length === 0, errors };
}

function validateItem(item) {
  const errors = [];
  if (!isPlainObject(item)) {
    return { valid: false, errors: ['item must be an object'] };
  }
  if (!isNonEmptyString(item.name, 256)) {
    errors.push(
      'item.name is required and must be a non-empty string up to 256 chars',
    );
  }
  if (item.price != null && Number.isNaN(Number(item.price))) {
    errors.push('item.price must be numeric when provided');
  }
  return { valid: errors.length === 0, errors };
}

function validateSettings(settings) {
  if (!isPlainObject(settings)) {
    return { valid: false, errors: ['settings must be an object'] };
  }
  return { valid: true, errors: [] };
}

function validateDriveBackupPayload(payload) {
  const errors = [];
  if (!isPlainObject(payload)) {
    return { valid: false, errors: ['body must be an object'] };
  }

  if (!isPlainObject(payload.invoice)) {
    errors.push('invoice is required and must be an object');
  }
  if (!isNonEmptyString(payload.pdfBase64, 30_000_000)) {
    errors.push('pdfBase64 is required and must be a non-empty string');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateInvoice,
  validateCustomer,
  validateItem,
  validateSettings,
  validateDriveBackupPayload,
};
