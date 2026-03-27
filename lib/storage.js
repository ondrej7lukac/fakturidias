const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');
const dataDir = path.join(baseDir, "data");

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

// Schemas
const InvoiceSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  id: { type: String, required: true, unique: true },
  invoiceNumber: String,
  issueDate: String,
  dueDate: String,
  taxableSupplyDate: String,
  status: String,
  category: String,
  client: Object,
  items: Array,
  currency: String,
  amount: Number,
  payment: Object,
  supplier: Object,
  isVatPayer: Boolean,
  taxBase: String,
  taxRate: String,
  taxAmount: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ItemSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  name: { type: String, required: true },
  price: Number,
  taxRate: String,
  lastUpdated: { type: Date, default: Date.now }
});
ItemSchema.index({ userEmail: 1, name: 1 }, { unique: true });

const CustomerSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  name: { type: String, required: true },
  email: String,
  emailCopy: String,
  phone: String,
  ico: String,
  vat: String,
  address: String,
  area: String,
  lastUpdated: { type: Date, default: Date.now }
});
CustomerSchema.index({ userEmail: 1, name: 1 }, { unique: true });

const SettingsSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  defaultSupplier: Object,
  smtp: Object,
  updatedAt: { type: Date, default: Date.now }
});

const TokenSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  tokens: Object,
  updatedAt: { type: Date, default: Date.now }
});

// Models
const InvoiceModel = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
const ItemModel = mongoose.models.Item || mongoose.model('Item', ItemSchema);
const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
const SettingsModel = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
const TokenModel = mongoose.models.Token || mongoose.model('Token', TokenSchema);

const connectDB = async () => {
  if (isConnected) return;
  if (!MONGODB_URI) {
    console.warn("[MongoDB] Missing MONGODB_URI, falling back to file system");
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log("[MongoDB] Connected successfully");
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
  }
};

// --- Storage Helpers ---

function getUserPath(userEmail, fileName) {
    if (!userEmail) return null;
    const safeEmail = userEmail.replace(/[^a-z0-9@._-]/gi, '_');
    const userDir = path.join(dataDir, safeEmail);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return path.join(userDir, fileName);
}

// Invoices
async function getUserInvoices(userEmail) {
  if (isConnected) {
    try {
      let invoices = await InvoiceModel.find({ userEmail }).lean();
      if ((!invoices || invoices.length === 0) && userEmail) {
        const filePath = getUserPath(userEmail, 'invoices.json');
        if (filePath && fs.existsSync(filePath)) {
          const localData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (Array.isArray(localData) && localData.length > 0) {
            for (const inv of localData) {
              await InvoiceModel.findOneAndUpdate({ userEmail, id: inv.id }, { ...inv, userEmail }, { upsert: true });
            }
            invoices = await InvoiceModel.find({ userEmail }).lean();
          }
        }
      }
      return invoices || [];
    } catch (e) { return []; }
  }
  const filePath = getUserPath(userEmail, 'invoices.json');
  if (!filePath || !fs.existsSync(filePath)) return [];
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { return []; }
}

async function saveSingleInvoice(userEmail, invoice) {
  if (isConnected) {
    try {
      await InvoiceModel.findOneAndUpdate({ userEmail, id: invoice.id }, { ...invoice, userEmail, updatedAt: new Date() }, { upsert: true });
      return true;
    } catch (e) { return false; }
  }
  return false;
}

function saveUserInvoices_FS(userEmail, invoices) {
  const filePath = getUserPath(userEmail, 'invoices.json');
  if (!filePath) return false;
  try { fs.writeFileSync(filePath, JSON.stringify(invoices, null, 2), 'utf8'); return true; } catch (e) { return false; }
}

// Customers
async function getUserCustomers(userEmail) {
  if (isConnected) {
    try {
      let customers = await CustomerModel.find({ userEmail }).lean();
      if ((!customers || customers.length === 0) && userEmail) {
        const filePath = getUserPath(userEmail, 'customers.json');
        if (filePath && fs.existsSync(filePath)) {
          const localData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (Array.isArray(localData) && localData.length > 0) {
            for (const c of localData) {
              await CustomerModel.findOneAndUpdate({ userEmail, name: c.name }, { ...c, userEmail }, { upsert: true });
            }
            customers = await CustomerModel.find({ userEmail }).lean();
          }
        }
      }
      return customers || [];
    } catch (e) { return []; }
  }
  const filePath = getUserPath(userEmail, 'customers.json');
  if (!filePath || !fs.existsSync(filePath)) return [];
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { return []; }
}

async function saveUserCustomer(userEmail, customer) {
  if (isConnected) {
    try {
      await CustomerModel.findOneAndUpdate({ userEmail, name: customer.name }, { ...customer, userEmail, lastUpdated: new Date() }, { upsert: true });
      return true;
    } catch (e) { return false; }
  }
  const filePath = getUserPath(userEmail, 'customers.json');
  if (!filePath) return false;
  try {
    const customers = await getUserCustomers(userEmail);
    const idx = customers.findIndex(c => c.name.toLowerCase() === customer.name.toLowerCase());
    if (idx >= 0) customers[idx] = { ...customers[idx], ...customer, lastUpdated: Date.now() };
    else customers.push({ ...customer, lastUpdated: Date.now() });
    fs.writeFileSync(filePath, JSON.stringify(customers, null, 2), 'utf8');
    return true;
  } catch (e) { return false; }
}

// Items
async function getUserItems(userEmail) {
  if (isConnected) {
    try {
      let items = await ItemModel.find({ userEmail }).lean();
      if ((!items || items.length === 0) && userEmail) {
        const filePath = getUserPath(userEmail, 'items.json');
        if (filePath && fs.existsSync(filePath)) {
          const localData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (Array.isArray(localData) && localData.length > 0) {
            for (const item of localData) {
              await ItemModel.findOneAndUpdate({ userEmail, name: item.name }, { ...item, userEmail }, { upsert: true });
            }
            items = await ItemModel.find({ userEmail }).lean();
          }
        }
      }
      return items || [];
    } catch (e) { return []; }
  }
  const filePath = getUserPath(userEmail, 'items.json');
  if (!filePath || !fs.existsSync(filePath)) return [];
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { return []; }
}

async function saveUserItem(userEmail, item) {
  if (isConnected) {
    try {
      await ItemModel.findOneAndUpdate({ userEmail, name: item.name }, { ...item, userEmail, lastUpdated: new Date() }, { upsert: true });
      return true;
    } catch (e) { return false; }
  }
  const filePath = getUserPath(userEmail, 'items.json');
  if (!filePath) return false;
  try {
    const items = await getUserItems(userEmail);
    const idx = items.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase());
    if (idx >= 0) items[idx] = { ...items[idx], ...item, lastUpdated: Date.now() };
    else items.push({ ...item, lastUpdated: Date.now() });
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
    return true;
  } catch (e) { return false; }
}

// Settings
async function getUserSettings(userEmail) {
  if (isConnected) {
    try {
      let doc = await SettingsModel.findOne({ userEmail }).lean();
      if (!doc && userEmail) {
        const filePath = getUserPath(userEmail, 'settings.json');
        if (filePath && fs.existsSync(filePath)) {
          const localData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (localData && Object.keys(localData).length > 0) {
            await SettingsModel.findOneAndUpdate({ userEmail }, { ...localData, userEmail }, { upsert: true });
            doc = await SettingsModel.findOne({ userEmail }).lean();
          }
        }
      }
      return doc || {};
    } catch (e) { return {}; }
  }
  const filePath = getUserPath(userEmail, 'settings.json');
  if (!filePath || !fs.existsSync(filePath)) return {};
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) { return {}; }
}

async function saveUserSettings(userEmail, settings) {
  if (isConnected) {
    try {
      await SettingsModel.findOneAndUpdate({ userEmail }, { ...settings, userEmail, updatedAt: new Date() }, { upsert: true });
      return true;
    } catch (e) { return false; }
  }
  const filePath = getUserPath(userEmail, 'settings.json');
  if (!filePath) return false;
  try { fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8'); return true; } catch (e) { return false; }
}

module.exports = {
  connectDB,
  InvoiceModel,
  ItemModel,
  CustomerModel,
  SettingsModel,
  TokenModel,
  getUserInvoices,
  saveSingleInvoice,
  saveUserInvoices_FS,
  getUserCustomers,
  saveUserCustomer,
  getUserItems,
  saveUserItem,
  getUserSettings,
  saveUserSettings,
  isConnected: () => isConnected
};
