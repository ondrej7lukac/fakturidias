const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const port = 5500;
const baseDir = __dirname;
const debugLogPath = path.join(baseDir, ".cursor", "debug.log");
const dataDir = path.join(baseDir, "data"); // User data storage

function logDebug(location, message, data, hypothesisId) {
  // #region agent log
  const payload = {
    location,
    message,
    data,
    timestamp: Date.now(),
    sessionId: "debug-session",
    runId: "post-fix",
    hypothesisId
  };
  if (globalThis.fetch) {
    fetch('http://127.0.0.1:7243/ingest/6ddf4ffa-f2d9-42ae-9315-d8b3c8b9efb8', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => { });
  } else {
    try {
      fs.appendFileSync(debugLogPath, `${JSON.stringify(payload)}\n`, "utf8");
    } catch (_) {
      // best-effort logging only
    }
  }
  // #endregion agent log
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};

function sendNotFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

function sendCors(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end();
}

function requestJson(options, body, maxRedirects = 2) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (proxyRes) => {
      const status = proxyRes.statusCode || 500;
      const location = proxyRes.headers.location;
      if (
        maxRedirects > 0 &&
        location &&
        status >= 300 &&
        status < 400
      ) {
        try {
          const redirectUrl = new URL(location, `https://${options.hostname}`);
          const redirectOptions = {
            ...options,
            hostname: redirectUrl.hostname,
            path: `${redirectUrl.pathname}${redirectUrl.search}`
          };
          resolve(requestJson(redirectOptions, body, maxRedirects - 1));
          return;
        } catch (error) {
          reject(error);
          return;
        }
      }
      const encoding = String(proxyRes.headers["content-encoding"] || "").toLowerCase();
      const stream =
        encoding === "gzip" || encoding === "deflate"
          ? proxyRes.pipe(zlib.createUnzip())
          : proxyRes;
      let data = "";
      stream.on("data", (chunk) => {
        data += chunk;
      });
      stream.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ ok: status >= 200 && status < 300, status, parsed });
        } catch (error) {
          resolve({
            ok: false,
            status,
            error: "Invalid JSON from ARES",
            snippet: data.slice(0, 200)
          });
        }
      });
    });
    req.on("error", (err) => {
      reject(err);
    });
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function proxyJsonWithFallback(optionsList, body, res) {
  let lastError = null;
  for (const options of optionsList) {
    try {
      const result = await requestJson(options, body);
      if (result.ok) {
        sendJson(res, result.status, result.parsed);
        return;
      }
      lastError = result;
      if (result.status === 404 || result.status === 410) {
        continue;
      }
      sendJson(res, result.status || 502, {
        error: result.parsed?.error || result.error || "ARES request failed",
        snippet: result.snippet
      });
      return;
    } catch (error) {
      lastError = { error: error.message };
    }
  }
  sendJson(res, 502, {
    error: "ARES request failed",
    details: lastError?.error
  });
}

function readJsonBody(req, callback) {
  let data = "";
  req.on("data", (chunk) => {
    data += chunk;
  });
  req.on("end", () => {
    try {
      const parsed = JSON.parse(data || "{}");
      callback(null, parsed);
    } catch (error) {
      callback(new Error("Invalid JSON body"));
    }
  });
}

// #region Google OAuth Setup
// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  console.error('CRITICAL: SESSION_SECRET is not set! Multi-user authentication will not work.');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}


// Vercel helper: Dynamic Redirect URI
const getRedirectUri = (req) => {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  return `${protocol}://${host}/auth/google/callback`;
};

const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/userinfo.email'
];
const TOKENS_PATH = path.join(baseDir, 'google_tokens.json');

let oAuth2Client;

try {
  const { google } = require('googleapis');
  oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    // Redirect URI will be set dynamically per request
    "http://localhost:5500/auth/google/callback"
  );
} catch (e) {
  console.warn("googleapis not installed or failed to load");
}

// #region MongoDB Schemas & Connection
let isConnected = false;

const InvoiceSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  id: { type: String, required: true, unique: true }, // UUID from frontend
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
// Create a compound index for unique items per user
ItemSchema.index({ userEmail: 1, name: 1 }, { unique: true });

const SettingsSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  defaultSupplier: Object,
  smtp: Object, // Although we use Google OAuth mainly now
  updatedAt: { type: Date, default: Date.now }
});

const TokenSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  tokens: Object,
  handoffCode: { type: String, index: true }, // One-time use code for session transfer
  handoffExpires: Date,
  updatedAt: { type: Date, default: Date.now }
});

let InvoiceModel, ItemModel, SettingsModel, TokenModel;

// Initialize models only once
if (mongoose.models.Invoice) {
  InvoiceModel = mongoose.model('Invoice');
  ItemModel = mongoose.model('Item');
  SettingsModel = mongoose.model('Settings');
  TokenModel = mongoose.model('Token');
} else {
  InvoiceModel = mongoose.model('Invoice', InvoiceSchema);
  ItemModel = mongoose.model('Item', ItemSchema);
  SettingsModel = mongoose.model('Settings', SettingsSchema);
  TokenModel = mongoose.model('Token', TokenSchema);
}

const connectDB = async () => {
  if (isConnected) return;
  if (!MONGODB_URI) {
    console.warn("[MongoDB] Missing MONGODB_URI, falling back to file system (Ephemeral on Vercel!)");
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
// #endregion

// #region Session Middleware Setup (CRITICAL FOR MULTI-USER)
let sessionMiddleware = null;

console.log('[Session Init] Starting session middleware initialization...');
console.log('[Session Init] SESSION_SECRET exists?', !!SESSION_SECRET);
console.log('[Session Init] MONGODB_URI exists?', !!MONGODB_URI);
console.log('[Session Init] NODE_ENV:', process.env.NODE_ENV);


// Note: This is a pure Node.js server (http.createServer), not Express.
// We cannot use app.set('trust proxy', 1).
// However, express-session with proxy: true option handles this!

// Initialize session middleware (async safe)
if (SESSION_SECRET && MONGODB_URI) {
  try {
    console.log('[Session Init] Creating session middleware...');
    sessionMiddleware = session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      proxy: true, // Trusted proxy for secure cookies (Essential for Vercel)
      store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        touchAfter: 24 * 3600, // lazy session update (seconds)
        crypto: {
          secret: SESSION_SECRET
        }
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        cookie: {
          secure: process.env.NODE_ENV === 'production', // HTTPS only in production
          httpOnly: true, // XSS protection
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          sameSite: 'lax' // Robust for same-domain (Vercel), doesn't fail hard if Secure flag is flaky
        },
        name: 'fakturidias.sid' // Custom cookie name
      });
    console.log('[Session Init] ✅ Session middleware initialized successfully');
    console.log('[Session Init] sessionMiddleware is:', typeof sessionMiddleware);
  } catch (error) {
    console.error('[Session Init] ❌ Failed to initialize middleware:', error);
  }
} else {
  console.error('[Session Init] ❌ Middleware NOT initialized - missing SESSION_SECRET or MONGODB_URI');
  console.error('[Session Init] This means multi-user authentication will NOT work!');
}
// #endregion

// Load saved tokens if exist (Local FS Fallback)
if (oAuth2Client && fs.existsSync(TOKENS_PATH)) {
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
    oAuth2Client.setCredentials(tokens);
    if (tokens.email) {
      oAuth2Client.credentials.email = tokens.email;
    }
    console.log(`[OAuth] Loaded saved Google tokens (FS)${tokens.email ? ' for ' + tokens.email : ''}`);
  } catch (e) {
    console.error("[OAuth] Failed to load saved tokens", e);
  }
}
// #endregion

// #region Invoice Storage Helper Functions
/**
 * Get the data file path for a specific user
 */
function getUserDataPath(userEmail) {
  if (!userEmail) return null;
  const safeEmail = userEmail.replace(/[^a-z0-9@._-]/gi, '_');
  const userDir = path.join(dataDir, safeEmail);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return path.join(userDir, 'invoices.json');
}

/**
 * Get all invoices for a user
 */
/**
 * Get all invoices for a user
 */
async function getUserInvoices(userEmail) {
  if (isConnected) {
    try {
      // MongoDB Fetch
      let invoices = await InvoiceModel.find({ userEmail }).lean();

      // Auto-Migration: If DB is empty but FS has data, import it once.
      if ((!invoices || invoices.length === 0) && userEmail) {
        const filePath = getUserDataPath(userEmail);
        if (filePath && fs.existsSync(filePath)) {
          try {
            const localData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (Array.isArray(localData) && localData.length > 0) {
              console.log(`[Storage] Migrating ${localData.length} invoices from FS to MongoDB for ${userEmail}`);
              // Add userEmail to each and prepare for bulk insert
              const toInsert = localData.map(inv => ({
                ...inv,
                userEmail,
                createdAt: inv.createdAt || new Date(),
                updatedAt: inv.updatedAt || new Date()
              }));

              // Use updateOne with upsert for safety, or insertMany
              // process serially to avoid errors
              for (const inv of toInsert) {
                await InvoiceModel.findOneAndUpdate(
                  { userEmail, id: inv.id },
                  inv,
                  { upsert: true, new: true }
                );
              }

              invoices = await InvoiceModel.find({ userEmail }).lean();
            }
          } catch (fsErr) {
            console.error('[Storage] Migration failed:', fsErr);
          }
        }
      }

      return invoices || [];
    } catch (e) {
      console.error('[MongoDB] Error fetching invoices:', e);
      return [];
    }
  }

  // FS Fallback
  const filePath = getUserDataPath(userEmail);
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('[Storage] Error reading user invoices:', e);
    return [];
  }
}

/**
 * Save invoices for a user
 * NOTE: For MongoDB, we shouldn't overwrite all. 
 * But the current API sends ONE invoice to save/update.
 * We need to adjust the API handler to call a different function or handle it here.
 * For now, let's keep this signature but we will REWRITE the API handler usage.
 */
// WARNING: This function signature was designed for bulk overwrite (array of invoices).
// We'll update the API handler to use `saveSingleInvoice` instead.
async function saveSingleInvoice(userEmail, invoice) {
  if (isConnected) {
    try {
      await InvoiceModel.findOneAndUpdate(
        { userEmail, id: invoice.id },
        { ...invoice, userEmail, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      return true;
    } catch (e) {
      console.error('[MongoDB] Error saving invoice:', e);
      return false;
    }
  }

  // FS Fallback (Old Logic: Load All, Find Index, Update, Save All)
  // We can't easily reuse the old bulk save logic here without loading everything.
  // So let's rely on the old saveUserInvoices for FS.
  return false; // Should not reach here if we update API handler correctly
}

function saveUserInvoices_FS(userEmail, invoices) {
  const filePath = getUserDataPath(userEmail);
  if (!filePath) return false;
  try {
    fs.writeFileSync(filePath, JSON.stringify(invoices, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[Storage] Error saving user invoices:', e);
    return false;
  }
}

/**
 * Get current user email from session
 */
/**
 * Get current user email from session
 * Updated to support Async retrieval potentially
 */
async function getCurrentUserEmail() {
  if (oAuth2Client?.credentials?.email) {
    return oAuth2Client.credentials.email;
  }

  // Try FS
  if (fs.existsSync(TOKENS_PATH)) {
    try {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
      if (tokens.email) return tokens.email;
    } catch (e) { }
  }

  // 3. Check MongoDB (Serverless / Vercel Persistence)
  // Since we don't have auth cookies/headers implemented yet, 
  // we assume Single-Tenant (Personal App) mode and grab the first available credential.
  if (isConnected) {
    try {
      const doc = await TokenModel.findOne({}).sort({ updatedAt: -1 }).lean();
      if (doc && doc.tokens) {
        const tokens = doc.tokens;
        oAuth2Client.setCredentials(tokens);
        // Ensure email is attached if missing in token object
        const email = doc.userEmail || tokens.email;
        if (email) {
          oAuth2Client.credentials.email = email;
          console.log(`[Auth] Restored User from MongoDB: ${email}`);
          return email;
        }
      }
    } catch (e) {
      console.error("[Auth] DB Restore Error:", e.message);
    }
  }

  console.log("[Auth] No credentials found in Memory, FS, or DB");
  return null;
}

/**
 * Get the items database file path for a specific user
 */
function getUserItemsPath(userEmail) {
  if (!userEmail) return null;
  const safeEmail = userEmail.replace(/[^a-z0-9@._-]/gi, '_');
  const userDir = path.join(dataDir, safeEmail);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return path.join(userDir, 'items.json');
}

/**
 * Get all items for a user
 */
/**
 * Get all items for a user
 */
async function getUserItems(userEmail) {
  if (isConnected) {
    try {
      let items = await ItemModel.find({ userEmail }).lean();

      // Auto-Migration: If DB is empty but FS has data, import it once.
      if ((!items || items.length === 0) && userEmail) {
        const filePath = getUserItemsPath(userEmail);
        if (filePath && fs.existsSync(filePath)) {
          try {
            const localData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (Array.isArray(localData) && localData.length > 0) {
              console.log(`[Storage] Migrating ${localData.length} items from FS to MongoDB for ${userEmail}`);
              const toInsert = localData.map(item => ({
                ...item,
                userEmail,
                lastUpdated: item.lastUpdated || new Date()
              }));

              for (const item of toInsert) {
                await ItemModel.findOneAndUpdate(
                  { userEmail, name: item.name },
                  item,
                  { upsert: true, new: true }
                );
              }
              items = await ItemModel.find({ userEmail }).lean();
            }
          } catch (fsErr) {
            console.error('[Storage] Items Migration failed:', fsErr);
          }
        }
      }

      return items || [];
    } catch (e) { return []; }
  }

  const filePath = getUserItemsPath(userEmail);
  if (!filePath || !fs.existsSync(filePath)) return [];
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) { return []; }
}

/**
 * Save or update an item in user's database
 */
async function saveUserItem(userEmail, item) {
  if (isConnected) {
    try {
      await ItemModel.findOneAndUpdate(
        { userEmail, name: item.name }, // Key by name
        { ...item, userEmail, lastUpdated: new Date() },
        { upsert: true, new: true }
      );
      return true;
    } catch (e) { return false; }
  }

  const filePath = getUserItemsPath(userEmail);
  if (!filePath) return false;

  try {
    // FS implementation: Load all, find, update/push, save
    const items = await getUserItems(userEmail); // Now async!
    const existingIndex = items.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase());

    if (existingIndex >= 0) {
      items[existingIndex] = { ...items[existingIndex], ...item, lastUpdated: Date.now() };
    } else {
      items.push({ ...item, lastUpdated: Date.now() });
    }

    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}
// #endregion

// #region Authentication Middleware
/**
 * Middleware to check if user is authenticated
 * Returns 401 if not authenticated
 */
function requireAuth(req, res, next) {
  if (req.session?.authenticated && req.session?.userEmail) {
    return next();
  }
  return sendJson(res, 401, { error: 'Not authenticated', requireLogin: true });
}
// #endregion

const requestHandler = async (req, res) => {
  await connectDB();
  const url = new URL(req.url, `http://${req.headers.host}`);
  let requestPath = decodeURIComponent(url.pathname || "/");

  // Normalize path: remove trailing slash if present (and not root)
  if (requestPath.length > 1 && requestPath.endsWith('/')) {
    requestPath = requestPath.slice(0, -1);
  }

  logDebug(
    "server.js:86",
    "incoming request",
    { method: req.method, path: requestPath },
    "H5"
  );

  if (requestPath === "/api/ares/search" && req.method === "OPTIONS") {
    logDebug("server.js:93", "ares search preflight", { path: requestPath }, "H5");
    return sendCors(res);
  }
  if (requestPath === "/api/ares/search" && req.method === "POST") {
    logDebug("server.js:97", "ares search handler", { path: requestPath }, "H5");
    return readJsonBody(req, (err, body) => {
      if (err) {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }
      const payload = JSON.stringify({
        obchodniJmeno: String(body.obchodniJmeno || "").trim(),
        ico: body.ico ? String(body.ico).trim() : undefined,
        pocet: body.pocet || 8,
        strana: body.strana || 1
      });
      return proxyJsonWithFallback(
        [
          {
            hostname: "ares.gov.cz",
            path: "/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
              "Accept": "application/json",
              "Accept-Encoding": "gzip, deflate",
              "User-Agent": "InvoiceMaker/1.0 (+http://localhost:5500)"
            }
          },
          {
            hostname: "ares.gov.cz",
            path: "/ekonomicke-subjekty/rest/ekonomicke-subjekty/vyhledat",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
              "Accept": "application/json",
              "Accept-Encoding": "gzip, deflate",
              "User-Agent": "InvoiceMaker/1.0 (+http://localhost:5500)"
            }
          }
        ],
        payload,
        res
      );
    });
  }

  if (requestPath === "/api/ares/ico" && req.method === "OPTIONS") {
    logDebug("server.js:123", "ares ico preflight", { path: requestPath }, "H5");
    return sendCors(res);
  }
  if (requestPath === "/api/ares/ico" && req.method === "GET") {
    logDebug("server.js:127", "ares ico handler", { path: requestPath }, "H5");
    const ico = (url.searchParams.get("ico") || "").trim();
    if (!ico) {
      return sendJson(res, 400, { error: "Missing ico" });
    }
    return proxyJsonWithFallback(
      [
        {
          hostname: "ares.gov.cz",
          path: `/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encodeURIComponent(
            ico
          )}`,
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "User-Agent": "InvoiceMaker/1.0 (+http://localhost:5500)"
          }
        },
        {
          hostname: "ares.gov.cz",
          path: `/ekonomicke-subjekty/rest/ekonomicke-subjekty/${encodeURIComponent(
            ico
          )}`,
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "User-Agent": "InvoiceMaker/1.0 (+http://localhost:5500)"
          }
        }
      ],
      null,
      res
    );
  }

  // #region Google OAuth Routes

  if (requestPath === "/auth/google/url" && req.method === "GET") {
    if (!oAuth2Client) return sendJson(res, 500, { error: "OAuth not initialized" });

    // Dynamic Redirect URI based on request host
    const redirectUri = getRedirectUri(req);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline', // Crucial for getting refresh_token
      scope: SCOPES,
      prompt: 'consent', // Force consent to ensure refresh_token is returned
      redirect_uri: redirectUri // Override default localhost
    });
    return sendJson(res, 200, { url: authUrl });
  }

  if (requestPath === "/auth/google/callback") {
    if (!oAuth2Client) return sendNotFound(res);
    const code = url.searchParams.get('code');
    if (code) {
      try {
        // Create a temporary client with the correct redirect URI for this specific request
        // This ensures the code exchange matches the redirect_uri sent in the auth URL
        const redirectUri = getRedirectUri(req);
        const { google } = require('googleapis');
        const tempClient = new google.auth.OAuth2(
          GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET,
          redirectUri
        );

        const { tokens } = await tempClient.getToken(code);

        // Update the global client as well for memory caching
        oAuth2Client.setCredentials(tokens);

        // Extract email from ID token (more reliable than API call)
        let userEmail = null;
        if (tokens.id_token) {
          try {
            // Decode the ID token to get email
            const ticket = await tempClient.verifyIdToken({
              idToken: tokens.id_token,
              audience: GOOGLE_CLIENT_ID
            });
            const payload = ticket.getPayload();
            userEmail = payload.email;
          } catch (e) {
            console.warn('[OAuth] Could not decode ID token:', e.message);
          }
        }

        const tokensToSave = { ...tokens, email: userEmail };

        // SAVE TOKENS LOCALLY (FS)
        try {
          fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokensToSave));
          console.log(`[OAuth] Tokens acquired${userEmail ? ' for ' + userEmail : ''}`);
        } catch (e) {
          console.error("[OAuth] Failed to save tokens to disk:", e.message);
        }

        // Ensure DB is connected before trying to save
        if (!isConnected) await connectDB();

        let savedToDb = false;
        // Generate a secure one-time handoff code
        const crypto = await import('crypto');
        const handoffCode = crypto.randomBytes(32).toString('hex');

        // Save to DB with expiration (2 minutes)
        if (isConnected) {
          try {
            await TokenModel.findOneAndUpdate(
              { userEmail },
              {
                $set: {
                  tokens,
                  updatedAt: new Date(),
                  handoffCode: handoffCode,
                  handoffExpires: new Date(Date.now() + 2 * 60 * 1000) // 2 mins
                }
              },
              { upsert: true, new: true }
            );
            savedToDb = true;
            console.log(`[OAuth Callback] ✅ Tokens and Handoff Code saved for user: ${userEmail}`);
          } catch (dbError) {
            console.error('[OAuth Callback] ❌ Database error:', dbError);
          }
        }

        // Create session in callback (for reliability, though main window will create its own)
        if (req.session) {
          req.session.authenticated = true;
          req.session.userEmail = userEmail;
          await new Promise((resolve) => req.session.save(resolve));
        }

        // Return the HTML with the HANDOFF CODE (not email)
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
        });

        const statusMessage = savedToDb
          ? '<h1 style="color: green;">Successfully Connected!</h1><p>Returning to app...</p>'
          : '<h1 style="color: orange;">Connected (Local Only)</h1><p>Warning: Could not save to Database.</p>';

        // Pass CODE instead of EMAIL
        const clientData = JSON.stringify({
          type: 'GOOGLE_LOGIN_SUCCESS',
          code: handoffCode // Send code, not email
        });

        res.end(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 40px;">
              ${statusMessage}
              <p>Closing window...</p>
              <script>
                // Notify the opener (React App)
                const data = ${clientData};
                
                // Method 1: IDB/LocalStorage (Same Origin Fallback)
                try {
                  // Save CODE to localStorage
                  localStorage.setItem('google_handoff_code', JSON.stringify({
                    code: data.code,
                    timestamp: Date.now()
                  }));
                  document.body.insertAdjacentHTML('beforeend', '<p style="color:blue">Saved Handoff Code to LocalStorage</p>');
                } catch (e) {
                  console.error('LocalStorage error:', e);
                }

                // Method 2: window.opener (Primary)
                try {
                  if (window.opener) {
                    window.opener.postMessage(data, '*');
                    document.body.insertAdjacentHTML('beforeend', '<p style="color:green">Code sent to main window!</p>');
                  }
                } catch (e) {
                  // Ignore opener errors
                }
                
                // Close shortly
                setTimeout(() => window.close(), 1500);
              </script>
            </body>
          </html>
        `);
        return;
      } catch (error) {
        console.error("[OAuth] Error getting tokens:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        return res.end("Authentication failed: " + error.message);
      }
    }
  }

  // Login Endpoint - SECURE HANDOFF
  if (requestPath === "/auth/login" && req.method === "POST") {
    return readJsonBody(req, async (err, body) => {
      if (err) return sendJson(res, 400, { error: "Invalid JSON" });

      const { code } = body;
      console.log('[Auth Login] Login request with code');

      if (!code) {
        return sendJson(res, 400, { error: "Code required" });
      }

      if (!isConnected) await connectDB();

      if (isConnected) {
        try {
          // Find user by valid handoff code
          const tokenDoc = await TokenModel.findOne({
            handoffCode: code,
            handoffExpires: { $gt: new Date() } // Must not be expired
          });

          if (!tokenDoc) {
            console.error('[Auth Login] Invalid or expired code');
            return sendJson(res, 401, { error: "Invalid login code. Please try again." });
          }

          const email = tokenDoc.userEmail;

          // INVALIDATE CODE IMMEDIATELY (One-time use)
          tokenDoc.handoffCode = undefined;
          tokenDoc.handoffExpires = undefined;
          await tokenDoc.save();

          console.log(`[Auth Login] Code validated for user: ${email}`);

          // Create session for this user
          if (req.session) {
            req.session.authenticated = true;
            req.session.userEmail = email;
            await new Promise((resolve) => req.session.save(resolve));
            console.log(`[Auth Login] ✅ Session created for user: ${email}`);
            return sendJson(res, 200, { success: true, email });
          } else {
            console.error('[Auth Login] req.session is undefined!');
            return sendJson(res, 500, { error: "Session not available" });
          }
        } catch (e) {
          console.error('[Auth Login] Database error:', e);
          return sendJson(res, 500, { error: "Database error" });
        }
      } else {
        console.error('[Auth Login] Database not connected');
        return sendJson(res, 500, { error: "Database not available" });
      }
    });
  }

  // Session Status Endpoint (NEW - Multi-User)
  if (requestPath === "/auth/session" && req.method === "GET") {
    console.log('[Session Check] Checking session status...');
    console.log('[Session Check] req.session exists?', !!req.session);
    console.log('[Session Check] req.session.authenticated:', req.session?.authenticated);
    console.log('[Session Check] req.session.userEmail:', req.session?.userEmail);
    console.log('[Session Check] Cookie header:', req.headers.cookie);

    if (req.session?.authenticated && req.session?.userEmail) {
      console.log('[Session Check] ✅ User is authenticated:', req.session.userEmail);
      return sendJson(res, 200, {
        authenticated: true,
        email: req.session.userEmail
      });
    } else {
      console.log('[Session Check] ❌ User is NOT authenticated');
      return sendJson(res, 200, {
        authenticated: false,
        email: null
      });
    }
  }

  // Legacy auth status endpoint for backward compatibility
  if (requestPath === "/auth/google/status" && req.method === "GET") {
    // Check session first, then fall back to old behaviour
    if (req.session?.authenticated && req.session?.userEmail) {
      return sendJson(res, 200, { connected: true, email: req.session.userEmail });
    }
    if (!oAuth2Client?.credentials?.refresh_token) {
      await getCurrentUserEmail(); // Try to restore
    }
    const isConnected = !!(oAuth2Client?.credentials?.refresh_token);
    return sendJson(res, 200, { connected: isConnected });
  }

  if (requestPath === "/auth/google/disconnect" && req.method === "POST") {
    // Get user email from session
    const userEmail = req.session?.userEmail || await getCurrentUserEmail();
    console.log(`[Auth] Disconnect requested for user: ${userEmail}`);

    // 1. Delete local file
    if (fs.existsSync(TOKENS_PATH)) {
      try {
        fs.unlinkSync(TOKENS_PATH);
        console.log("[Auth] Local tokens file deleted.");
      } catch (e) {
        console.error("[Auth] Failed to delete local tokens:", e);
      }
    }

    // 2. Clear InMemory
    if (oAuth2Client) {
      oAuth2Client.setCredentials({});
      console.log("[Auth] In-memory credentials cleared.");
    }

    // 3. Delete from MongoDB
    if (isConnected && userEmail) {
      try {
        const result = await TokenModel.deleteOne({ userEmail });
        console.log(`[Auth] DB Delete result for ${userEmail}:`, result);
      } catch (e) {
        console.error("[Auth] Failed to delete tokens from DB:", e);
      }
    }

    // 4. DESTROY SESSION (CRITICAL FOR MULTI-USER)
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("[Session] Error destroying session:", err);
          return sendJson(res, 500, { success: false, error: "Session destruction failed" });
        }
        console.log(`[Session] Session destroyed for user: ${userEmail}`);
        return sendJson(res, 200, { success: true, message: "Logged out successfully" });
      });
    } else {
      return sendJson(res, 200, { success: true, message: "Logged out (no session)" });
    }
    return; // Exit early since session.destroy has async callback
  }
  // #endregion

  // #region Invoice API Routes

  // GET /api/invoices - Get all invoices for current user
  if (requestPath === "/api/invoices" && req.method === "GET") {
    // Use requireAuth middleware pattern inline
    if (!req.session?.authenticated || !req.session?.userEmail) {
      return sendJson(res, 401, { error: "Not authenticated", requireLogin: true });
    }
    const userEmail = req.session.userEmail;
    const invoices = await getUserInvoices(userEmail);
    return sendJson(res, 200, { invoices });
  }

  // POST /api/invoices - Create or update invoice
  if (requestPath === "/api/invoices" && req.method === "OPTIONS") {
    return sendCors(res);
  }
  if (requestPath === "/api/invoices" && req.method === "POST") {
    return readJsonBody(req, async (err, body) => {
      if (err) return sendJson(res, 400, { error: "Invalid JSON body" });

      if (!req.session?.authenticated || !req.session?.userEmail) {
        return sendJson(res, 401, { error: "Not authenticated", requireLogin: true });
      }
      const userEmail = req.session.userEmail;

      const { invoice } = body;
      if (!invoice || !invoice.id) {
        return sendJson(res, 400, { error: "Invalid invoice data" });
      }

      let success = false;
      if (isConnected) {
        // MongoDB Single Save
        success = await saveSingleInvoice(userEmail, invoice);
      } else {
        // FS Legacy Bulk Save
        const invoices = await getUserInvoices(userEmail); // Fallback to FS
        const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);
        if (existingIndex >= 0) invoices[existingIndex] = invoice;
        else invoices.push(invoice);
        success = saveUserInvoices_FS(userEmail, invoices);
      }

      if (success) {
        console.log(`[Storage] Saved invoice ${invoice.invoiceNumber} for ${userEmail}`);
        return sendJson(res, 200, { success: true, invoice });
      } else {
        return sendJson(res, 500, { error: "Failed to save invoice" });
      }
    });
  }

  // DELETE /api/invoices/:id - Delete invoice
  if (requestPath.startsWith("/api/invoices/") && req.method === "DELETE") {
    const invoiceId = requestPath.split("/api/invoices/")[1];
    const userEmail = await getCurrentUserEmail();

    if (!userEmail) {
      return sendJson(res, 401, { error: "Not authenticated" });
    }

    if (isConnected) {
      try {
        await InvoiceModel.deleteOne({ userEmail, id: invoiceId });
        return sendJson(res, 200, { success: true });
      } catch (e) {
        return sendJson(res, 500, { error: "Failed to delete" });
      }
    } else {
      const invoices = await getUserInvoices(userEmail);
      const filteredInvoices = invoices.filter(inv => inv.id !== invoiceId);
      if (filteredInvoices.length === invoices.length) {
        return sendJson(res, 404, { error: "Invoice not found" });
      }
      const success = saveUserInvoices_FS(userEmail, filteredInvoices);
      return success ? sendJson(res, 200, { success: true }) : sendJson(res, 500, { error: "Failed to delete" });
    }
  }
  // #endregion

  // #region Items Database API Routes

  // GET /api/items - Get all items for current user
  if (requestPath === "/api/items" && req.method === "GET") {
    const userEmail = getCurrentUserEmail();
    if (!userEmail) {
      return sendJson(res, 401, { error: "Not authenticated. Please connect Google account." });
    }
    const items = getUserItems(userEmail);
    return sendJson(res, 200, { items });
  }

  // POST /api/items - Save or update item
  if (requestPath === "/api/items" && req.method === "OPTIONS") {
    return sendCors(res);
  }
  if (requestPath === "/api/items" && req.method === "POST") {
    return readJsonBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: "Invalid JSON body" });

      const userEmail = getCurrentUserEmail();
      if (!userEmail) {
        return sendJson(res, 401, { error: "Not authenticated" });
      }

      const { item } = body;
      if (!item || !item.name) {
        return sendJson(res, 400, { error: "Invalid item data" });
      }

      const success = saveUserItem(userEmail, item);
      if (success) {
        console.log(`[Storage] Saved item ${item.name} for ${userEmail}`);
        return sendJson(res, 200, { success: true, item });
      } else {
        return sendJson(res, 500, { error: "Failed to save item" });
      }
    });
  }
  // #endregion

  // #region Settings Storage Helper Functions
  /**
   * Get the settings file path for a specific user
   */
  function getUserSettingsPath(userEmail) {
    if (!userEmail) return null;
    const safeEmail = userEmail.replace(/[^a-z0-9@._-]/gi, '_');
    const userDir = path.join(dataDir, safeEmail);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return path.join(userDir, 'settings.json');
  }

  /**
   * Get settings for a user
   */
  /**
   * Get settings for a user
   */
  async function getUserSettings(userEmail) {
    if (isConnected) {
      try {
        let doc = await SettingsModel.findOne({ userEmail }).lean();

        // Auto-Migration: If DB is empty but FS has data, import it once.
        if (!doc && userEmail) {
          const filePath = getUserSettingsPath(userEmail);
          if (filePath && fs.existsSync(filePath)) {
            try {
              const localData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              if (localData && Object.keys(localData).length > 0) {
                console.log(`[Storage] Migrating settings from FS to MongoDB for ${userEmail}`);
                await SettingsModel.findOneAndUpdate(
                  { userEmail },
                  { ...localData, userEmail, updatedAt: new Date() },
                  { upsert: true, new: true }
                );
                doc = await SettingsModel.findOne({ userEmail }).lean();
              }
            } catch (fsErr) {
              console.error('[Storage] Settings Migration failed:', fsErr);
            }
          }
        }

        return doc || {};
      } catch (e) { return {}; }
    }

    const filePath = getUserSettingsPath(userEmail);
    if (!filePath || !fs.existsSync(filePath)) {
      return {};
    }
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }

  /**
   * Save settings for a user
   */
  async function saveUserSettings(userEmail, settings) {
    if (isConnected) {
      try {
        await SettingsModel.findOneAndUpdate(
          { userEmail },
          { ...settings, userEmail, updatedAt: new Date() },
          { upsert: true, new: true }
        );
        return true;
      } catch (e) { return false; }
    }

    const filePath = getUserSettingsPath(userEmail);
    if (!filePath) return false;
    try {
      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
      return true;
    } catch (e) {
      return false;
    }
  }
  // #endregion

  // #region Settings API Routes
  // GET /api/settings - Get settings for current user
  if (requestPath === "/api/settings" && req.method === "GET") {
    const userEmail = getCurrentUserEmail();
    if (!userEmail) {
      return sendJson(res, 401, { error: "Not authenticated" });
    }
    const settings = getUserSettings(userEmail);
    return sendJson(res, 200, { settings });
  }

  // POST /api/settings - Save settings
  if (requestPath === "/api/settings" && req.method === "OPTIONS") {
    return sendCors(res);
  }
  if (requestPath === "/api/settings" && req.method === "POST") {
    return readJsonBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: "Invalid JSON body" });

      const userEmail = getCurrentUserEmail();
      if (!userEmail) {
        return sendJson(res, 401, { error: "Not authenticated" });
      }

      const { settings } = body;
      if (!settings) {
        return sendJson(res, 400, { error: "Invalid settings data" });
      }

      const success = saveUserSettings(userEmail, settings);
      if (success) {
        console.log(`[Storage] Saved settings for ${userEmail}`);
        return sendJson(res, 200, { success: true, settings });
      } else {
        return sendJson(res, 500, { error: "Failed to save settings" });
      }
    });
  }
  // #endregion

  // #region Email Sending
  if (requestPath === "/api/email/send" && req.method === "OPTIONS") {
    return sendCors(res);
  }
  if (requestPath === "/api/email/send" && req.method === "POST") {
    return readJsonBody(req, async (err, body) => {
      if (err) return sendJson(res, 400, { error: "Invalid JSON body" });

      const { to, cc, subject, text, pdfBase64, filename, useGoogle } = body;
      console.log(`[Email] Request received to: ${to}, cc: ${cc}, subject: ${subject}, useGoogle: ${useGoogle}`);

      try {
        let nodemailer;
        try {
          nodemailer = require("nodemailer");
        } catch (e) {
          console.error("[Email] Nodemailer missing");
          return sendJson(res, 501, {
            error: "nodemailer not installed",
            message: "Run 'npm install nodemailer'"
          });
        }

        // Check if OAuth client is ready
        if (!oAuth2Client) {
          console.error("[Email] OAuth client not initialized (missing env vars?)");
          return sendJson(res, 401, { error: "Server authentication error. Google Client ID missing." });
        }

        // Reload tokens from disk to be sure
        if (fs.existsSync(TOKENS_PATH)) {
          try {
            const navTokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
            if (navTokens) {
              oAuth2Client.setCredentials(navTokens);
            }
          } catch (e) {
            console.warn("[Email] Failed to reload tokens from disk:", e);
          }
        }

        // 2. If no tokens in Memory/FS, Try restore from DB (Robustness for Serverless)
        if (!oAuth2Client.credentials || !oAuth2Client.credentials.refresh_token) {
          console.log("[Email] Tokens missing in memory/FS, attempting DB restore...");
          await getCurrentUserEmail();
        }

        if (!useGoogle || !oAuth2Client.credentials || !oAuth2Client.credentials.refresh_token) {
          console.log("[Email] Rejected: Google OAuth not connected or missing refresh token");
          return sendJson(res, 401, {
            error: "Google account not connected. Please connect in Settings."
          });
        }

        console.log("[Email] Using Google OAuth2. Token status: ", !!oAuth2Client.credentials.access_token ? "Has Access Token" : "Needs Refresh");

        let transporter;
        let userEmail = oAuth2Client.credentials.email;

        // Try to get email from tokens file if missing in memory
        if (!userEmail && fs.existsSync(TOKENS_PATH)) {
          try {
            const savedTokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
            userEmail = savedTokens.email;
          } catch (e) { }
        }

        try {
          // Force token refresh if needed
          const accessTokenResponse = await oAuth2Client.getAccessToken();
          const accessToken = accessTokenResponse.token;

          if (!accessToken) {
            throw new Error("Failed to generate access token");
          }

          console.log("[Email] Access token generated successfully");

          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              type: 'OAuth2',
              user: userEmail, // Can be undefined, Gmail might infer from token or throw
              clientId: GOOGLE_CLIENT_ID,
              clientSecret: GOOGLE_CLIENT_SECRET,
              refreshToken: oAuth2Client.credentials.refresh_token,
              accessToken: accessToken
            }
          });

        } catch (oauthError) {
          console.error("[Email] OAuth token refresh failed:", oauthError.message);
          return sendJson(res, 401, { error: "Google Auth expired or invalid. Please reconnect in Settings." });
        }

        const info = await transporter.sendMail({
          from: userEmail ? `"Invoice Maker" <${userEmail}>` : undefined,
          to,
          cc,
          subject,
          html: body.html || text, // Support html body if passed
          attachments: [
            {
              filename: filename || "invoice.pdf",
              content: pdfBase64.split("base64,")[1],
              encoding: "base64"
            }
          ]
        });

        console.log("[Email] Sent: %s", info.messageId);
        sendJson(res, 200, {
          success: true,
          message: "Email sent successfully"
        });

      } catch (error) {
        console.error("[Email] Sending Error:", error);
        // If it's an auth error from Gmail/Nodemailer, return 401 so frontend knows to re-auth
        if (error.code === 'EAUTH' || error.response?.includes('Authentication')) {
          return sendJson(res, 401, { error: "Authentication failed. Please reconnect Google account." });
        }
        sendJson(res, 500, { error: "Failed to send email", details: error.message });
      }
    });
  }
  // #endregion

  // Static file serving for React App (invoice-react/dist)
  const distDir = path.join(__dirname, "invoice-react", "dist");
  let filePath = path.join(distDir, requestPath);

  // Prevent directory traversal
  if (!filePath.startsWith(distDir)) {
    return sendNotFound(res);
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: Serve index.html for non-API routes
      if (!requestPath.startsWith("/api")) {
        const indexHtml = path.join(distDir, "index.html");
        fs.readFile(indexHtml, (err, content) => {
          if (err) {
            return sendNotFound(res);
          }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(content);
        });
        return;
      }
      // API 404
      console.log(`[Server] 404 Not Found for API path: ${requestPath}`);
      return sendJson(res, 404, { error: "Not Found", path: requestPath, note: "Handled by server.js fallback" });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon"
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    });
    fs.createReadStream(filePath).pipe(res);
  });
};

// #region Session Wrapper
// Wrapper to apply session middleware to request handler
const requestHandlerWithSession = (req, res) => {
  console.log('[Session Wrapper] Request:', req.method, req.url);
  console.log('[Session Wrapper] sessionMiddleware exists?', !!sessionMiddleware);

  if (sessionMiddleware) {
    console.log('[Session Wrapper] Applying session middleware...');
    // Shim for 'req.secure' which is required for secure cookies
    // formatting: off
    console.log('[Session Debug] NODE_ENV:', process.env.NODE_ENV);
    console.log('[Session Debug] x-forwarded-proto:', req.headers['x-forwarded-proto']);

    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] === 'https') {
      req.secure = true;
      console.log('[Session Debug] Manually set req.secure = true');
    }
    // formatting: on

    // Apply session middleware first
    sessionMiddleware(req, res, () => {
      // After session is processed, call main request handler
      console.log('[Session Wrapper] Session middleware applied');
      console.log('[Session Debug] Session ID:', req.session?.id);
      console.log('[Session Debug] Cookie Header:', req.headers.cookie);
      console.log('[Session Debug] User Authenticated:', req.session?.authenticated);
      console.log('[Session Debug] User Email:', req.session?.userEmail);

      requestHandler(req, res);
    });
  } else {
    console.warn('[Session Wrapper] ⚠️  NO SESSION MIDDLEWARE - falling back to direct handler');
    // Fallback without session
    requestHandler(req, res);
  }
};
// #endregion

// Start server if run directly (Local Dev)
if (require.main === module) {
  const server = http.createServer(requestHandlerWithSession);
  server.listen(port, () => {
    console.log(`Invoice app running at http://localhost:${port}/`);
    logDebug("server.js:162", "server listening", { port }, "H5");
  });
}

module.exports = requestHandlerWithSession;
