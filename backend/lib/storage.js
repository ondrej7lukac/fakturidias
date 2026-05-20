'use strict';
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', '..');
const dataDir = path.join(baseDir, 'data');

const MONGODB_URI = process.env.MONGODB_URI;

let _isConnected = false;

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

const SubscriptionSchema = new mongoose.Schema({
    userEmail: { type: String, required: true, unique: true },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    plan: { type: String, default: 'free' },
    status: { type: String, default: 'inactive' },
    interval: String,
    currentPeriodEnd: Number,
    updatedAt: { type: Date, default: Date.now }
});

const InvoiceModel = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
const ItemModel = mongoose.models.Item || mongoose.model('Item', ItemSchema);
const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
const SettingsModel = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
const TokenModel = mongoose.models.Token || mongoose.model('Token', TokenSchema);
const SubscriptionModel = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);

const connectDB = async () => {
    if (_isConnected) return;
    if (!MONGODB_URI) {
        console.warn('[MongoDB] Missing MONGODB_URI, falling back to file system');
        return;
    }
    try {
        await mongoose.connect(MONGODB_URI);
        _isConnected = true;
        console.log('[MongoDB] Connected successfully');
    } catch (error) {
        console.error('[MongoDB] Connection error:', error.message);
    }
};

function getUserPath(userEmail, fileName) {
    if (!userEmail) return null;
    const safeEmail = userEmail.replace(/[^a-z0-9@._-]/gi, '_');
    const userDir = path.join(dataDir, safeEmail);
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
    return path.join(userDir, fileName);
}

async function getUserInvoices(userEmail) {
    if (_isConnected) {
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
        } catch { return []; }
    }
    const filePath = getUserPath(userEmail, 'invoices.json');
    if (!filePath || !fs.existsSync(filePath)) return [];
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return []; }
}

async function saveSingleInvoice(userEmail, invoice) {
    if (_isConnected) {
        try {
            await InvoiceModel.findOneAndUpdate(
                { userEmail, id: invoice.id },
                { ...invoice, userEmail, updatedAt: new Date() },
                { upsert: true }
            );
            return true;
        } catch { return false; }
    }
    return false;
}

function saveUserInvoices_FS(userEmail, invoices) {
    const filePath = getUserPath(userEmail, 'invoices.json');
    if (!filePath) return false;
    try {
        fs.writeFileSync(filePath, JSON.stringify(invoices, null, 2), 'utf8');
        return true;
    } catch { return false; }
}

async function getUserCustomers(userEmail) {
    if (_isConnected) {
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
        } catch { return []; }
    }
    const filePath = getUserPath(userEmail, 'customers.json');
    if (!filePath || !fs.existsSync(filePath)) return [];
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return []; }
}

async function saveUserCustomer(userEmail, customer) {
    if (_isConnected) {
        try {
            await CustomerModel.findOneAndUpdate(
                { userEmail, name: customer.name },
                { ...customer, userEmail, lastUpdated: new Date() },
                { upsert: true }
            );
            return true;
        } catch { return false; }
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
    } catch { return false; }
}

async function getUserItems(userEmail) {
    if (_isConnected) {
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
        } catch { return []; }
    }
    const filePath = getUserPath(userEmail, 'items.json');
    if (!filePath || !fs.existsSync(filePath)) return [];
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return []; }
}

async function saveUserItem(userEmail, item) {
    if (_isConnected) {
        try {
            await ItemModel.findOneAndUpdate(
                { userEmail, name: item.name },
                { ...item, userEmail, lastUpdated: new Date() },
                { upsert: true }
            );
            return true;
        } catch { return false; }
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
    } catch { return false; }
}

async function getUserSettings(userEmail) {
    if (_isConnected) {
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
        } catch { return {}; }
    }
    const filePath = getUserPath(userEmail, 'settings.json');
    if (!filePath || !fs.existsSync(filePath)) return {};
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return {}; }
}

async function saveUserSettings(userEmail, settings) {
    if (_isConnected) {
        try {
            await SettingsModel.findOneAndUpdate(
                { userEmail },
                { ...settings, userEmail, updatedAt: new Date() },
                { upsert: true }
            );
            return true;
        } catch { return false; }
    }
    const filePath = getUserPath(userEmail, 'settings.json');
    if (!filePath) return false;
    try {
        fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch { return false; }
}

async function getSubscription(userEmail) {
    if (_isConnected) {
        try {
            const doc = await SubscriptionModel.findOne({ userEmail }).lean();
            return doc || null;
        } catch { return null; }
    }
    const filePath = getUserPath(userEmail, 'subscription.json');
    if (!filePath || !fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

async function saveSubscription(userEmail, data) {
    if (_isConnected) {
        try {
            await SubscriptionModel.findOneAndUpdate(
                { userEmail },
                { ...data, userEmail, updatedAt: new Date() },
                { upsert: true }
            );
            return true;
        } catch { return false; }
    }
    const filePath = getUserPath(userEmail, 'subscription.json');
    if (!filePath) return false;
    try {
        fs.writeFileSync(filePath, JSON.stringify({ ...data, userEmail }, null, 2), 'utf8');
        return true;
    } catch { return false; }
}

async function getSubscriptionByCustomerId(stripeCustomerId) {
    if (!_isConnected) return null;
    try {
        const doc = await SubscriptionModel.findOne({ stripeCustomerId }).lean();
        return doc || null;
    } catch { return null; }
}

module.exports = {
    connectDB,
    InvoiceModel,
    ItemModel,
    CustomerModel,
    SettingsModel,
    TokenModel,
    SubscriptionModel,
    getUserInvoices,
    saveSingleInvoice,
    saveUserInvoices_FS,
    getUserCustomers,
    saveUserCustomer,
    getUserItems,
    saveUserItem,
    getUserSettings,
    saveUserSettings,
    getSubscription,
    saveSubscription,
    getSubscriptionByCustomerId,
    isConnected: () => _isConnected
};
