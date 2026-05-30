'use strict';
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', '..');
const dataDir = path.join(baseDir, 'data');

const {
  PRICING,
  GUEST_INVOICE_LIMIT,
  FREE_INVOICE_LIMIT,
  STANDARD_INVOICE_LIMIT,
} = require('./plan');

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
  updatedAt: { type: Date, default: Date.now },
});

const ItemSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  name: { type: String, required: true },
  price: Number,
  taxRate: String,
  lastUpdated: { type: Date, default: Date.now },
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
  country: String,
  lastUpdated: { type: Date, default: Date.now },
});
CustomerSchema.index({ userEmail: 1, name: 1 }, { unique: true });

const SettingsSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  defaultSupplier: Object,
  smtp: Object,
  bankSync: Object,
  updatedAt: { type: Date, default: Date.now },
});

const TokenSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  tokens: Object,
  updatedAt: { type: Date, default: Date.now },
});

const SubscriptionSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  plan: { type: String, default: 'free' },
  status: { type: String, default: 'inactive' },
  interval: String,
  currentPeriodEnd: Number,
  updatedAt: { type: Date, default: Date.now },
});

const PromoSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, default: '' },
  planGrant: { type: String, enum: ['standard', 'max', null], default: null },
  discountPercent: { type: Number, default: 0 },
  durationDays: { type: Number, default: 30 },
  maxUses: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  usedBy: { type: [String], default: [] },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const AuditLogSchema = new mongoose.Schema({
  adminEmail: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String, default: null },
  details: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
});

const AdminUserMetaSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  notes: { type: String, default: '' },
  suspended: { type: Boolean, default: false },
  suspendedAt: { type: Date, default: null },
  suspendedBy: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now },
});

const GlobalSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  guestInvoiceLimit: { type: Number, default: GUEST_INVOICE_LIMIT },
  freeInvoiceLimit: { type: Number, default: FREE_INVOICE_LIMIT },
  standardInvoiceLimit: { type: Number, default: STANDARD_INVOICE_LIMIT },
  updatedAt: { type: Date, default: Date.now },
});

const EmailTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subject: { type: String, default: '' },
  body: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const ScheduledEmailSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  message: { type: String, required: true },
  segment: { type: String, default: 'all' },
  sendAt: { type: Date, required: true, index: true },
  status: { type: String, default: 'pending' }, // pending|sending|sent|failed|canceled
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  sentAt: Date,
  result: Object,
});

const WebhookEventSchema = new mongoose.Schema({
  provider: { type: String, default: 'stripe' },
  eventId: { type: String, index: true },
  type: String,
  status: { type: String, default: 'received' }, // received|processed|failed|replayed
  error: { type: String, default: null },
  payload: Object,
  createdAt: { type: Date, default: Date.now, index: true },
});

const EmailBounceSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  type: { type: String, default: 'bounce' }, // bounce|complaint|delivery_delayed
  reason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Global registry mapping a generated inbound address (slug@domain) to one user.
const MailboxSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true, lowercase: true },
  slug: { type: String, required: true },
  userEmail: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

// A bill received by inbound email, awaiting the user's review/approval.
const ReceivedInvoiceSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  id: { type: String, required: true, unique: true },
  status: { type: String, default: 'pending' }, // pending|approved|rejected
  receivedAt: { type: Date, default: Date.now },
  from: String,
  fromName: String,
  to: String,
  subject: String,
  textPreview: String,
  attachments: { type: Array, default: [] }, // [{ filename, contentType, size, data(base64) }]
  parsed: { type: Object, default: null },
  parseStatus: { type: String, default: 'none' }, // none|pending|done|failed
  parseError: { type: String, default: null },
  approvedInvoiceId: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now },
});

const InvoiceModel =
  mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
const ItemModel = mongoose.models.Item || mongoose.model('Item', ItemSchema);
const CustomerModel =
  mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
const SettingsModel =
  mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
const TokenModel =
  mongoose.models.Token || mongoose.model('Token', TokenSchema);
const SubscriptionModel =
  mongoose.models.Subscription ||
  mongoose.model('Subscription', SubscriptionSchema);
const PromoModel =
  mongoose.models.Promo || mongoose.model('Promo', PromoSchema);
const AuditLogModel =
  mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
const AdminUserMetaModel =
  mongoose.models.AdminUserMeta ||
  mongoose.model('AdminUserMeta', AdminUserMetaSchema);
const GlobalSettingsModel =
  mongoose.models.GlobalSettings ||
  mongoose.model('GlobalSettings', GlobalSettingsSchema);
const EmailTemplateModel =
  mongoose.models.EmailTemplate ||
  mongoose.model('EmailTemplate', EmailTemplateSchema);
const ScheduledEmailModel =
  mongoose.models.ScheduledEmail ||
  mongoose.model('ScheduledEmail', ScheduledEmailSchema);
const WebhookEventModel =
  mongoose.models.WebhookEvent ||
  mongoose.model('WebhookEvent', WebhookEventSchema);
const EmailBounceModel =
  mongoose.models.EmailBounce ||
  mongoose.model('EmailBounce', EmailBounceSchema);
const MailboxModel =
  mongoose.models.Mailbox || mongoose.model('Mailbox', MailboxSchema);
const ReceivedInvoiceModel =
  mongoose.models.ReceivedInvoice ||
  mongoose.model('ReceivedInvoice', ReceivedInvoiceSchema);

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
              await InvoiceModel.findOneAndUpdate(
                { userEmail, id: inv.id },
                { ...inv, userEmail },
                { upsert: true },
              );
            }
            invoices = await InvoiceModel.find({ userEmail }).lean();
          }
        }
      }
      return invoices || [];
    } catch {
      return [];
    }
  }
  const filePath = getUserPath(userEmail, 'invoices.json');
  if (!filePath || !fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

async function saveSingleInvoice(userEmail, invoice) {
  if (_isConnected) {
    try {
      await InvoiceModel.findOneAndUpdate(
        { userEmail, id: invoice.id },
        { ...invoice, userEmail, updatedAt: new Date() },
        { upsert: true },
      );
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function saveUserInvoices_FS(userEmail, invoices) {
  const filePath = getUserPath(userEmail, 'invoices.json');
  if (!filePath) return false;
  try {
    fs.writeFileSync(filePath, JSON.stringify(invoices, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function saveInvoice(userEmail, invoice) {
  if (_isConnected) return saveSingleInvoice(userEmail, invoice);
  const invoices = await getUserInvoices(userEmail);
  const idx = invoices.findIndex((inv) => inv.id === invoice.id);
  if (idx >= 0) invoices[idx] = invoice;
  else invoices.push(invoice);
  return saveUserInvoices_FS(userEmail, invoices);
}

async function deleteInvoice(userEmail, id) {
  if (_isConnected) {
    try {
      await InvoiceModel.deleteOne({ userEmail, id });
      return true;
    } catch {
      return false;
    }
  }
  const invoices = await getUserInvoices(userEmail);
  return saveUserInvoices_FS(
    userEmail,
    invoices.filter((inv) => inv.id !== id),
  );
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
              await CustomerModel.findOneAndUpdate(
                { userEmail, name: c.name },
                { ...c, userEmail },
                { upsert: true },
              );
            }
            customers = await CustomerModel.find({ userEmail }).lean();
          }
        }
      }
      return customers || [];
    } catch {
      return [];
    }
  }
  const filePath = getUserPath(userEmail, 'customers.json');
  if (!filePath || !fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

async function saveUserCustomer(userEmail, customer) {
  if (_isConnected) {
    try {
      await CustomerModel.findOneAndUpdate(
        { userEmail, name: customer.name },
        { ...customer, userEmail, lastUpdated: new Date() },
        { upsert: true },
      );
      return true;
    } catch {
      return false;
    }
  }
  const filePath = getUserPath(userEmail, 'customers.json');
  if (!filePath) return false;
  try {
    const customers = await getUserCustomers(userEmail);
    const idx = customers.findIndex(
      (c) => c.name.toLowerCase() === customer.name.toLowerCase(),
    );
    if (idx >= 0)
      customers[idx] = {
        ...customers[idx],
        ...customer,
        lastUpdated: Date.now(),
      };
    else customers.push({ ...customer, lastUpdated: Date.now() });
    fs.writeFileSync(filePath, JSON.stringify(customers, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
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
              await ItemModel.findOneAndUpdate(
                { userEmail, name: item.name },
                { ...item, userEmail },
                { upsert: true },
              );
            }
            items = await ItemModel.find({ userEmail }).lean();
          }
        }
      }
      return items || [];
    } catch {
      return [];
    }
  }
  const filePath = getUserPath(userEmail, 'items.json');
  if (!filePath || !fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

async function saveUserItem(userEmail, item) {
  if (_isConnected) {
    try {
      await ItemModel.findOneAndUpdate(
        { userEmail, name: item.name },
        { ...item, userEmail, lastUpdated: new Date() },
        { upsert: true },
      );
      return true;
    } catch {
      return false;
    }
  }
  const filePath = getUserPath(userEmail, 'items.json');
  if (!filePath) return false;
  try {
    const items = await getUserItems(userEmail);
    const idx = items.findIndex(
      (i) => i.name.toLowerCase() === item.name.toLowerCase(),
    );
    if (idx >= 0)
      items[idx] = { ...items[idx], ...item, lastUpdated: Date.now() };
    else items.push({ ...item, lastUpdated: Date.now() });
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
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
            await SettingsModel.findOneAndUpdate(
              { userEmail },
              { ...localData, userEmail },
              { upsert: true },
            );
            doc = await SettingsModel.findOne({ userEmail }).lean();
          }
        }
      }
      return doc || {};
    } catch {
      return {};
    }
  }
  const filePath = getUserPath(userEmail, 'settings.json');
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

async function saveUserSettings(userEmail, settings) {
  if (_isConnected) {
    try {
      await SettingsModel.findOneAndUpdate(
        { userEmail },
        { $set: { ...settings, updatedAt: new Date() } },
        { upsert: true },
      );
      return true;
    } catch {
      return false;
    }
  }
  const filePath = getUserPath(userEmail, 'settings.json');
  if (!filePath) return false;
  try {
    let existing = {};
    if (fs.existsSync(filePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {
        existing = {};
      }
    }
    fs.writeFileSync(
      filePath,
      JSON.stringify({ ...existing, ...settings }, null, 2),
      'utf8',
    );
    return true;
  } catch {
    return false;
  }
}

async function getSubscription(userEmail) {
  if (_isConnected) {
    try {
      const doc = await SubscriptionModel.findOne({ userEmail }).lean();
      return doc || null;
    } catch {
      return null;
    }
  }
  const filePath = getUserPath(userEmail, 'subscription.json');
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function saveSubscription(userEmail, data) {
  if (_isConnected) {
    try {
      await SubscriptionModel.findOneAndUpdate(
        { userEmail },
        { ...data, userEmail, updatedAt: new Date() },
        { upsert: true },
      );
      return true;
    } catch {
      return false;
    }
  }
  const filePath = getUserPath(userEmail, 'subscription.json');
  if (!filePath) return false;
  try {
    fs.writeFileSync(
      filePath,
      JSON.stringify({ ...data, userEmail }, null, 2),
      'utf8',
    );
    return true;
  } catch {
    return false;
  }
}

async function getSubscriptionByCustomerId(stripeCustomerId) {
  if (!_isConnected) return null;
  try {
    const doc = await SubscriptionModel.findOne({ stripeCustomerId }).lean();
    return doc || null;
  } catch {
    return null;
  }
}

// ── Admin functions ───────────────────────────────────────────────────────────

async function getAllUsersWithStats() {
  if (!_isConnected) return [];
  try {
    const [subs, invoiceCounts, settingsDocs] = await Promise.all([
      SubscriptionModel.find({}).lean(),
      InvoiceModel.aggregate([
        {
          $group: {
            _id: '$userEmail',
            count: { $sum: 1 },
            lastInvoice: { $max: '$createdAt' },
          },
        },
      ]),
      SettingsModel.find({}, { userEmail: 1, updatedAt: 1 }).lean(),
    ]);

    const countMap = new Map(
      invoiceCounts.map((r) => [
        r._id,
        { count: r.count, lastInvoice: r.lastInvoice },
      ]),
    );
    const subMap = new Map(subs.map((s) => [s.userEmail, s]));
    const settingsMap = new Map(settingsDocs.map((s) => [s.userEmail, s]));

    const allEmails = new Set([
      ...subs.map((s) => s.userEmail),
      ...settingsDocs.map((s) => s.userEmail),
    ]);

    return Array.from(allEmails)
      .map((email) => {
        const sub = subMap.get(email) || {};
        const settings = settingsMap.get(email);
        const invStats = countMap.get(email) || {};
        return {
          email,
          plan: sub.plan || 'free',
          status: sub.status || 'inactive',
          stripeCustomerId: sub.stripeCustomerId || null,
          stripeSubscriptionId: sub.stripeSubscriptionId || null,
          currentPeriodEnd: sub.currentPeriodEnd || null,
          interval: sub.interval || null,
          invoiceCount: invStats.count || 0,
          lastInvoice: invStats.lastInvoice || null,
          lastActivity: sub.updatedAt || settings?.updatedAt || null,
        };
      })
      .sort(
        (a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0),
      );
  } catch (err) {
    console.error('[admin] getAllUsersWithStats error:', err.message);
    return [];
  }
}

async function setUserPlanOverride(userEmail, plan, durationDays) {
  const existing = (await getSubscription(userEmail)) || {};
  const currentPeriodEnd =
    plan === 'free'
      ? null
      : Math.floor(Date.now() / 1000) + (durationDays || 30) * 86400;
  return saveSubscription(userEmail, {
    stripeCustomerId: existing.stripeCustomerId || null,
    stripeSubscriptionId: existing.stripeSubscriptionId || null,
    plan,
    status: plan === 'free' ? 'inactive' : 'active',
    interval: existing.interval || 'manual',
    currentPeriodEnd,
  });
}

async function deleteUserAllData(userEmail) {
  if (!_isConnected) return false;
  try {
    await Promise.all([
      InvoiceModel.deleteMany({ userEmail }),
      CustomerModel.deleteMany({ userEmail }),
      ItemModel.deleteMany({ userEmail }),
      SettingsModel.deleteMany({ userEmail }),
      SubscriptionModel.deleteMany({ userEmail }),
      TokenModel.deleteMany({ userEmail }),
    ]);
    return true;
  } catch (err) {
    console.error('[admin] deleteUserAllData error:', err.message);
    return false;
  }
}

// Promo CRUD
async function getPromos() {
  if (!_isConnected) return [];
  try {
    return await PromoModel.find({}).sort({ createdAt: -1 }).lean();
  } catch {
    return [];
  }
}

async function getPromoByCode(code) {
  if (!_isConnected) return null;
  try {
    return await PromoModel.findOne({ code: code.toUpperCase() }).lean();
  } catch {
    return null;
  }
}

async function createPromo(data) {
  if (!_isConnected) return null;
  try {
    const doc = new PromoModel({ ...data, code: data.code.toUpperCase() });
    return (await doc.save()).toObject();
  } catch (err) {
    console.error('[admin] createPromo error:', err.message);
    return null;
  }
}

async function updatePromo(code, data) {
  if (!_isConnected) return null;
  try {
    return await PromoModel.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $set: data },
      { new: true, lean: true },
    );
  } catch {
    return null;
  }
}

async function deletePromo(code) {
  if (!_isConnected) return false;
  try {
    await PromoModel.deleteOne({ code: code.toUpperCase() });
    return true;
  } catch {
    return false;
  }
}

async function applyPromoToUser(code, userEmail) {
  if (!_isConnected) return { error: 'DB not connected' };
  const promo = await getPromoByCode(code);
  if (!promo) return { error: 'Promo not found' };
  if (!promo.active) return { error: 'Promo is inactive' };
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date())
    return { error: 'Promo expired' };
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses)
    return { error: 'Promo limit reached' };
  if (promo.usedBy.includes(userEmail))
    return { error: 'Already used by this user' };

  if (promo.planGrant) {
    await setUserPlanOverride(userEmail, promo.planGrant, promo.durationDays);
  }
  await PromoModel.updateOne(
    { code: code.toUpperCase() },
    { $inc: { usedCount: 1 }, $push: { usedBy: userEmail } },
  );
  return {
    success: true,
    planGranted: promo.planGrant,
    durationDays: promo.durationDays,
  };
}

// ── Audit log ──────────────────────────────────────────────────────────────

async function logAdminAction(adminEmail, action, target, details) {
  if (!_isConnected) return false;
  try {
    await AuditLogModel.create({
      adminEmail,
      action,
      target: target || null,
      details: details || {},
    });
    return true;
  } catch (err) {
    console.error('[admin] logAdminAction error:', err.message);
    return false;
  }
}

async function getAuditLog(limit = 200) {
  if (!_isConnected) return [];
  try {
    return await AuditLogModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch {
    return [];
  }
}

// ── User detail ────────────────────────────────────────────────────────────

async function getUserDetail(userEmail) {
  if (!_isConnected) return null;
  try {
    const [invoices, customers, items, settings, subscription] =
      await Promise.all([
        InvoiceModel.find({ userEmail }).sort({ createdAt: -1 }).lean(),
        CustomerModel.find({ userEmail }).lean(),
        ItemModel.find({ userEmail }).lean(),
        SettingsModel.findOne({ userEmail }).lean(),
        SubscriptionModel.findOne({ userEmail }).lean(),
      ]);
    return { invoices, customers, items, settings, subscription };
  } catch (err) {
    console.error('[admin] getUserDetail error:', err.message);
    return null;
  }
}

// ── Promo conversion stats ─────────────────────────────────────────────────

async function getPromoStats() {
  if (!_isConnected) return {};
  try {
    const [promos, paidSubs] = await Promise.all([
      PromoModel.find({}, { code: 1, usedBy: 1 }).lean(),
      SubscriptionModel.find(
        {
          status: { $in: ['active', 'trialing'] },
          plan: { $in: ['standard', 'max', 'pro'] },
        },
        { userEmail: 1 },
      ).lean(),
    ]);
    const paidSet = new Set(paidSubs.map((s) => s.userEmail));
    const stats = {};
    promos.forEach((p) => {
      const usedBy = p.usedBy || [];
      stats[p.code] = {
        used: usedBy.length,
        converted: usedBy.filter((e) => paidSet.has(e)).length,
      };
    });
    return stats;
  } catch {
    return {};
  }
}

// ── Revenue metrics (MRR / ARR / churn) ────────────────────────────────────

async function getRevenueMetrics() {
  if (!_isConnected) return null;
  try {
    const subs = await SubscriptionModel.find({}).lean();
    let mrr = 0;
    const byPlan = { standard: 0, max: 0 };
    let activePaid = 0;
    const now = Date.now();

    subs.forEach((s) => {
      const active =
        (s.status === 'active' || s.status === 'trialing') &&
        (!s.currentPeriodEnd || s.currentPeriodEnd * 1000 > now);
      if (!active) return;
      const plan = s.plan === 'pro' ? 'standard' : s.plan;
      if (plan !== 'standard' && plan !== 'max') return;
      activePaid++;
      byPlan[plan]++;
      // Manual admin overrides have no Stripe revenue.
      if (s.interval === 'manual') return;
      const interval = s.interval === 'year' ? 'annual' : 'monthly';
      const price = PRICING[`${plan}_${interval}`];
      if (price)
        mrr += interval === 'annual' ? price.amount / 12 : price.amount;
    });

    const churned30 = subs.filter(
      (s) =>
        s.status === 'canceled' &&
        s.updatedAt &&
        now - new Date(s.updatedAt).getTime() < 30 * 86400000,
    ).length;
    const churnBase = activePaid + churned30;

    return {
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      activePaid,
      byPlan,
      arpu: activePaid > 0 ? Math.round(mrr / activePaid) : 0,
      churned30,
      churnRate:
        churnBase > 0 ? Number(((churned30 / churnBase) * 100).toFixed(1)) : 0,
    };
  } catch (err) {
    console.error('[admin] getRevenueMetrics error:', err.message);
    return null;
  }
}

// ── Dunning (failed payments) ───────────────────────────────────────────────

async function getDunningUsers() {
  if (!_isConnected) return [];
  try {
    const subs = await SubscriptionModel.find({
      status: { $in: ['past_due', 'unpaid', 'incomplete'] },
    }).lean();
    return subs.map((s) => ({
      email: s.userEmail,
      plan: s.plan,
      status: s.status,
      stripeCustomerId: s.stripeCustomerId || null,
      stripeSubscriptionId: s.stripeSubscriptionId || null,
      currentPeriodEnd: s.currentPeriodEnd || null,
      updatedAt: s.updatedAt || null,
    }));
  } catch {
    return [];
  }
}

async function getAnalytics() {
  if (!_isConnected) return null;
  try {
    const [planCounts, monthlyInvoices, recentSignups] = await Promise.all([
      SubscriptionModel.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } },
      ]),
      InvoiceModel.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),
      SubscriptionModel.aggregate([
        { $sort: { updatedAt: -1 } },
        { $limit: 10 },
        { $project: { userEmail: 1, plan: 1, status: 1, updatedAt: 1 } },
      ]),
    ]);
    const plans = {};
    planCounts.forEach((p) => {
      plans[p._id || 'free'] = p.count;
    });
    return { plans, monthlyInvoices, recentSignups };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production')
      console.error('[getAnalytics]', err);
    return null;
  }
}

// ── Admin user meta (notes + suspension) ───────────────────────────────────

let _suspendedCache = new Set();
let _suspendedCacheAt = 0;

async function refreshSuspendedCache() {
  if (!_isConnected) {
    _suspendedCache = new Set();
    return;
  }
  try {
    const docs = await AdminUserMetaModel.find(
      { suspended: true },
      { userEmail: 1 },
    ).lean();
    _suspendedCache = new Set(
      docs.map((d) => String(d.userEmail).toLowerCase()),
    );
    _suspendedCacheAt = Date.now();
  } catch {
    /* keep stale cache */
  }
}

async function isUserSuspended(email) {
  if (!email || !_isConnected) return false;
  try {
    if (Date.now() - _suspendedCacheAt > 30000) await refreshSuspendedCache();
    return _suspendedCache.has(String(email).toLowerCase());
  } catch {
    return false;
  }
}

async function getUserMeta(userEmail) {
  if (!_isConnected) return null;
  try {
    return await AdminUserMetaModel.findOne({ userEmail }).lean();
  } catch {
    return null;
  }
}

async function setUserNotes(userEmail, notes) {
  if (!_isConnected) return false;
  try {
    await AdminUserMetaModel.findOneAndUpdate(
      { userEmail },
      { $set: { notes: String(notes || ''), updatedAt: new Date() } },
      { upsert: true },
    );
    return true;
  } catch {
    return false;
  }
}

async function setUserSuspended(userEmail, suspended, by) {
  if (!_isConnected) return false;
  try {
    await AdminUserMetaModel.findOneAndUpdate(
      { userEmail },
      {
        $set: {
          suspended: !!suspended,
          suspendedAt: suspended ? new Date() : null,
          suspendedBy: suspended ? by || null : null,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    const key = String(userEmail).toLowerCase();
    if (suspended) _suspendedCache.add(key);
    else _suspendedCache.delete(key);
    return true;
  } catch {
    return false;
  }
}

// ── Global settings (configurable limits) ──────────────────────────────────

let _globalSettingsCache = null;
let _globalSettingsCacheAt = 0;

function _defaultGlobalSettings() {
  return {
    guestInvoiceLimit: GUEST_INVOICE_LIMIT,
    freeInvoiceLimit: FREE_INVOICE_LIMIT,
    standardInvoiceLimit: STANDARD_INVOICE_LIMIT,
  };
}

async function getGlobalSettings() {
  const fallback = _defaultGlobalSettings();
  if (!_isConnected) return fallback;
  if (_globalSettingsCache && Date.now() - _globalSettingsCacheAt < 30000) {
    return _globalSettingsCache;
  }
  try {
    let doc = await GlobalSettingsModel.findOne({ key: 'global' }).lean();
    if (!doc)
      doc = (await GlobalSettingsModel.create({ key: 'global' })).toObject();
    _globalSettingsCache = { ...fallback, ...doc };
    _globalSettingsCacheAt = Date.now();
    return _globalSettingsCache;
  } catch {
    return fallback;
  }
}

async function updateGlobalSettings(patch) {
  if (!_isConnected) return null;
  try {
    const allowed = [
      'guestInvoiceLimit',
      'freeInvoiceLimit',
      'standardInvoiceLimit',
    ];
    const sanitized = { updatedAt: new Date() };
    allowed.forEach((k) => {
      if (patch[k] !== undefined) {
        const n = Number(patch[k]);
        if (Number.isFinite(n) && n >= 0) sanitized[k] = n;
      }
    });
    const doc = await GlobalSettingsModel.findOneAndUpdate(
      { key: 'global' },
      { $set: sanitized },
      { new: true, upsert: true, lean: true },
    );
    _globalSettingsCache = null;
    return doc;
  } catch (err) {
    console.error('[admin] updateGlobalSettings error:', err.message);
    return null;
  }
}

// ── Email templates ─────────────────────────────────────────────────────────

async function getEmailTemplates() {
  if (!_isConnected) return [];
  try {
    return await EmailTemplateModel.find({}).sort({ createdAt: -1 }).lean();
  } catch {
    return [];
  }
}

async function createEmailTemplate(data) {
  if (!_isConnected) return null;
  try {
    return (await EmailTemplateModel.create(data)).toObject();
  } catch {
    return null;
  }
}

async function deleteEmailTemplate(id) {
  if (!_isConnected) return false;
  try {
    await EmailTemplateModel.deleteOne({ _id: id });
    return true;
  } catch {
    return false;
  }
}

// ── Scheduled emails ────────────────────────────────────────────────────────

async function getScheduledEmails() {
  if (!_isConnected) return [];
  try {
    return await ScheduledEmailModel.find({})
      .sort({ sendAt: -1 })
      .limit(100)
      .lean();
  } catch {
    return [];
  }
}

async function createScheduledEmail(data) {
  if (!_isConnected) return null;
  try {
    return (await ScheduledEmailModel.create(data)).toObject();
  } catch {
    return null;
  }
}

async function cancelScheduledEmail(id) {
  if (!_isConnected) return false;
  try {
    const doc = await ScheduledEmailModel.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { $set: { status: 'canceled' } },
      { new: true },
    );
    return !!doc;
  } catch {
    return false;
  }
}

async function getDueScheduledEmails() {
  if (!_isConnected) return [];
  try {
    return await ScheduledEmailModel.find({
      status: 'pending',
      sendAt: { $lte: new Date() },
    }).lean();
  } catch {
    return [];
  }
}

// Atomically claim a scheduled email so the poller never double-sends.
async function claimScheduledEmail(id) {
  if (!_isConnected) return null;
  try {
    return await ScheduledEmailModel.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { $set: { status: 'sending' } },
      { new: true, lean: true },
    );
  } catch {
    return null;
  }
}

async function markScheduledEmail(id, status, result) {
  if (!_isConnected) return;
  try {
    await ScheduledEmailModel.updateOne(
      { _id: id },
      { $set: { status, result: result || null, sentAt: new Date() } },
    );
  } catch {
    /* ignore */
  }
}

// ── Webhook event log ───────────────────────────────────────────────────────

async function logWebhookEvent(data) {
  if (!_isConnected) return null;
  try {
    return (await WebhookEventModel.create(data)).toObject();
  } catch {
    return null;
  }
}

async function getWebhookEvents(limit = 100) {
  if (!_isConnected) return [];
  try {
    return await WebhookEventModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch {
    return [];
  }
}

async function getWebhookEvent(id) {
  if (!_isConnected) return null;
  try {
    return await WebhookEventModel.findById(id).lean();
  } catch {
    return null;
  }
}

async function markWebhookEvent(id, status, error) {
  if (!_isConnected) return;
  try {
    await WebhookEventModel.updateOne(
      { _id: id },
      { $set: { status, error: error || null } },
    );
  } catch {
    /* ignore */
  }
}

// ── Email bounces ───────────────────────────────────────────────────────────

async function recordBounce(email, type, reason) {
  if (!_isConnected) return false;
  try {
    await EmailBounceModel.create({
      email,
      type: type || 'bounce',
      reason: reason || '',
    });
    return true;
  } catch {
    return false;
  }
}

async function getBounces(limit = 100) {
  if (!_isConnected) return [];
  try {
    return await EmailBounceModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch {
    return [];
  }
}

// ── Inbound mailboxes & received invoices ────────────────────────────────────

// A global (not per-user) data file lives directly under data/.
function getGlobalPath(fileName) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, fileName);
}

const RESERVED_SLUGS = new Set([
  'admin',
  'noreply',
  'no-reply',
  'support',
  'info',
  'billing',
  'postmaster',
  'abuse',
  'hello',
  'mail',
  'invoices',
  'help',
  'contact',
  'security',
  'root',
  'webmaster',
]);

function normalizeSlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function _readMailboxFile() {
  const file = getGlobalPath('mailboxes.json');
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

async function getMailboxByUser(userEmail) {
  if (!userEmail) return null;
  if (_isConnected) {
    try {
      return await MailboxModel.findOne({ userEmail }).lean();
    } catch {
      return null;
    }
  }
  return _readMailboxFile().find((m) => m.userEmail === userEmail) || null;
}

async function getMailboxByAddress(address) {
  const addr = String(address || '')
    .toLowerCase()
    .trim();
  if (!addr) return null;
  if (_isConnected) {
    try {
      return await MailboxModel.findOne({ address: addr }).lean();
    } catch {
      return null;
    }
  }
  return _readMailboxFile().find((m) => m.address === addr) || null;
}

async function claimMailbox(userEmail, slug, domain) {
  const clean = normalizeSlug(slug);
  if (clean.length < 3) {
    return {
      ok: false,
      error:
        'Mailbox name must be at least 3 characters (letters, numbers, hyphens).',
    };
  }
  if (RESERVED_SLUGS.has(clean)) {
    return {
      ok: false,
      error: 'That mailbox name is reserved. Please choose another.',
    };
  }
  const address = `${clean}@${domain}`;

  if (_isConnected) {
    try {
      const existing = await MailboxModel.findOne({ address }).lean();
      if (existing && existing.userEmail !== userEmail) {
        return { ok: false, error: 'That mailbox name is already taken.' };
      }
      const doc = await MailboxModel.findOneAndUpdate(
        { userEmail },
        {
          $set: { address, slug: clean, userEmail },
          $setOnInsert: { createdAt: new Date() },
        },
        { new: true, upsert: true, lean: true },
      );
      return { ok: true, mailbox: doc };
    } catch (err) {
      if (err.code === 11000)
        return { ok: false, error: 'That mailbox name is already taken.' };
      return { ok: false, error: 'Failed to save mailbox.' };
    }
  }

  try {
    let list = _readMailboxFile();
    if (list.some((m) => m.address === address && m.userEmail !== userEmail)) {
      return { ok: false, error: 'That mailbox name is already taken.' };
    }
    list = list.filter((m) => m.userEmail !== userEmail);
    const mailbox = {
      address,
      slug: clean,
      userEmail,
      createdAt: new Date().toISOString(),
    };
    list.push(mailbox);
    fs.writeFileSync(
      getGlobalPath('mailboxes.json'),
      JSON.stringify(list, null, 2),
      'utf8',
    );
    return { ok: true, mailbox };
  } catch {
    return { ok: false, error: 'Failed to save mailbox.' };
  }
}

async function getReceivedInvoices(userEmail) {
  if (_isConnected) {
    try {
      return await ReceivedInvoiceModel.find({ userEmail })
        .sort({ receivedAt: -1 })
        .lean();
    } catch {
      return [];
    }
  }
  const filePath = getUserPath(userEmail, 'received.json');
  if (!filePath || !fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

async function getReceivedInvoice(userEmail, id) {
  if (_isConnected) {
    try {
      return await ReceivedInvoiceModel.findOne({ userEmail, id }).lean();
    } catch {
      return null;
    }
  }
  return (
    (await getReceivedInvoices(userEmail)).find((r) => r.id === id) || null
  );
}

async function saveReceivedInvoice(userEmail, doc) {
  if (_isConnected) {
    const record = { ...doc, userEmail, updatedAt: new Date() };
    try {
      await ReceivedInvoiceModel.findOneAndUpdate(
        { userEmail, id: doc.id },
        { $set: record },
        { upsert: true },
      );
      return record;
    } catch {
      return null;
    }
  }
  const filePath = getUserPath(userEmail, 'received.json');
  if (!filePath) return null;
  let list = [];
  if (fs.existsSync(filePath)) {
    try {
      list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      list = [];
    }
  }
  const stored = { ...doc, userEmail, updatedAt: new Date().toISOString() };
  if (stored.receivedAt instanceof Date)
    stored.receivedAt = stored.receivedAt.toISOString();
  const idx = list.findIndex((r) => r.id === doc.id);
  if (idx >= 0) list[idx] = stored;
  else list.unshift(stored);
  try {
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
    return stored;
  } catch {
    return null;
  }
}

async function deleteReceivedInvoice(userEmail, id) {
  if (_isConnected) {
    try {
      await ReceivedInvoiceModel.deleteOne({ userEmail, id });
      return true;
    } catch {
      return false;
    }
  }
  const filePath = getUserPath(userEmail, 'received.json');
  if (!filePath || !fs.existsSync(filePath)) return true;
  try {
    const list = JSON.parse(fs.readFileSync(filePath, 'utf8')).filter(
      (r) => r.id !== id,
    );
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  connectDB,
  InvoiceModel,
  ItemModel,
  CustomerModel,
  SettingsModel,
  TokenModel,
  SubscriptionModel,
  PromoModel,
  AuditLogModel,
  getUserInvoices,
  saveSingleInvoice,
  saveUserInvoices_FS,
  saveInvoice,
  deleteInvoice,
  getUserCustomers,
  saveUserCustomer,
  getUserItems,
  saveUserItem,
  getUserSettings,
  saveUserSettings,
  getSubscription,
  saveSubscription,
  getSubscriptionByCustomerId,
  getAllUsersWithStats,
  setUserPlanOverride,
  deleteUserAllData,
  getPromos,
  getPromoByCode,
  createPromo,
  updatePromo,
  deletePromo,
  applyPromoToUser,
  logAdminAction,
  getAuditLog,
  getUserDetail,
  getPromoStats,
  getRevenueMetrics,
  getDunningUsers,
  getAnalytics,
  isUserSuspended,
  getUserMeta,
  setUserNotes,
  setUserSuspended,
  getGlobalSettings,
  updateGlobalSettings,
  getEmailTemplates,
  createEmailTemplate,
  deleteEmailTemplate,
  getScheduledEmails,
  createScheduledEmail,
  cancelScheduledEmail,
  getDueScheduledEmails,
  claimScheduledEmail,
  markScheduledEmail,
  logWebhookEvent,
  getWebhookEvents,
  getWebhookEvent,
  markWebhookEvent,
  recordBounce,
  getBounces,
  AdminUserMetaModel,
  WebhookEventModel,
  MailboxModel,
  ReceivedInvoiceModel,
  getMailboxByUser,
  getMailboxByAddress,
  claimMailbox,
  getReceivedInvoices,
  getReceivedInvoice,
  saveReceivedInvoice,
  deleteReceivedInvoice,
  isConnected: () => _isConnected,
};
