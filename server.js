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

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = "http://localhost:5500/auth/google/callback";


const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/userinfo.email'
];
const TOKENS_PATH = path.join(baseDir, 'google_tokens.json');

let oAuth2Client;
let google;

try {
  google = require('googleapis').google;
  oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
} catch (e) {
  console.warn("googleapis not installed or failed to load");
}

// Load saved tokens if exist
if (oAuth2Client && fs.existsSync(TOKENS_PATH)) {
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
    oAuth2Client.setCredentials(tokens);
    // Store email separately since it's not part of standard OAuth credentials
    if (tokens.email) {
      oAuth2Client.credentials.email = tokens.email;
    }
    console.log(`[OAuth] Loaded saved Google tokens${tokens.email ? ' for ' + tokens.email : ''}`);
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
function getUserInvoices(userEmail) {
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
 */
function saveUserInvoices(userEmail, invoices) {
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
function getCurrentUserEmail() {
  if (oAuth2Client?.credentials?.email) {
    return oAuth2Client.credentials.email;
  }
  if (fs.existsSync(TOKENS_PATH)) {
    try {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
      return tokens.email;
    } catch (e) {
      return null;
    }
  }
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
function getUserItems(userEmail) {
  const filePath = getUserItemsPath(userEmail);
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('[Storage] Error reading user items:', e);
    return [];
  }
}

/**
 * Save or update an item in user's database
 */
function saveUserItem(userEmail, item) {
  const filePath = getUserItemsPath(userEmail);
  if (!filePath) return false;

  try {
    let items = getUserItems(userEmail);
    const existingIndex = items.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase());

    if (existingIndex >= 0) {
      // Update existing item with new price/tax
      items[existingIndex] = {
        ...items[existingIndex],
        ...item,
        lastUpdated: Date.now()
      };
    } else {
      // Add new item
      items.push({
        ...item,
        lastUpdated: Date.now()
      });
    }

    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[Storage] Error saving user item:', e);
    return false;
  }
}
// #endregion

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let requestPath = decodeURIComponent(url.pathname || "/");
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
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline', // Crucial for getting refresh_token
      scope: SCOPES,
      prompt: 'consent' // Force consent to ensure refresh_token is returned
    });
    return sendJson(res, 200, { url: authUrl });
  }

  if (requestPath === "/auth/google/callback") {
    if (!oAuth2Client) return sendNotFound(res);
    const code = url.searchParams.get('code');
    if (code) {
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Extract email from ID token (more reliable than API call)
        let userEmail = null;
        if (tokens.id_token) {
          try {
            // Decode the ID token to get email
            const ticket = await oAuth2Client.verifyIdToken({
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
        fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokensToSave));
        console.log(`[OAuth] Tokens acquired${userEmail ? ' for ' + userEmail : ''}`);

        // Return a simple HTML page that closes itself or redirects back to app
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
        });
        res.end(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: green;">Successfully Connected!</h1>
              <p>You can now close this window and go back to Invoice Maker.</p>
              <script>
                setTimeout(() => window.close(), 3000);
                // Try redirecting back to main app if window.close fails
                setTimeout(() => window.location.href = '/', 4000);
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

  if (requestPath === "/auth/google/status" && req.method === "GET") {
    const isConnected = !!(oAuth2Client?.credentials?.refresh_token);
    return sendJson(res, 200, { connected: isConnected });
  }

  if (requestPath === "/auth/google/disconnect" && req.method === "POST") {
    if (fs.existsSync(TOKENS_PATH)) {
      fs.unlinkSync(TOKENS_PATH);
    }
    if (oAuth2Client) {
      oAuth2Client.setCredentials({});
    }
    return sendJson(res, 200, { success: true });
  }
  // #endregion

  // #region Invoice API Routes

  // GET /api/invoices - Get all invoices for current user
  if (requestPath === "/api/invoices" && req.method === "GET") {
    const userEmail = getCurrentUserEmail();
    if (!userEmail) {
      return sendJson(res, 401, { error: "Not authenticated. Please connect Google account." });
    }
    const invoices = getUserInvoices(userEmail);
    return sendJson(res, 200, { invoices });
  }

  // POST /api/invoices - Create or update invoice
  if (requestPath === "/api/invoices" && req.method === "OPTIONS") {
    return sendCors(res);
  }
  if (requestPath === "/api/invoices" && req.method === "POST") {
    return readJsonBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: "Invalid JSON body" });

      const userEmail = getCurrentUserEmail();
      if (!userEmail) {
        return sendJson(res, 401, { error: "Not authenticated" });
      }

      const { invoice } = body;
      if (!invoice || !invoice.id) {
        return sendJson(res, 400, { error: "Invalid invoice data" });
      }

      const invoices = getUserInvoices(userEmail);
      const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);

      if (existingIndex >= 0) {
        // Update existing
        invoices[existingIndex] = invoice;
      } else {
        // Create new
        invoices.push(invoice);
      }

      const success = saveUserInvoices(userEmail, invoices);
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
    const userEmail = getCurrentUserEmail();

    if (!userEmail) {
      return sendJson(res, 401, { error: "Not authenticated" });
    }

    const invoices = getUserInvoices(userEmail);
    const filteredInvoices = invoices.filter(inv => inv.id !== invoiceId);

    if (filteredInvoices.length === invoices.length) {
      return sendJson(res, 404, { error: "Invoice not found" });
    }

    const success = saveUserInvoices(userEmail, filteredInvoices);
    if (success) {
      console.log(`[Storage] Deleted invoice ${invoiceId} for ${userEmail}`);
      return sendJson(res, 200, { success: true });
    } else {
      return sendJson(res, 500, { error: "Failed to delete invoice" });
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
  function getUserSettings(userEmail) {
    const filePath = getUserSettingsPath(userEmail);
    if (!filePath || !fs.existsSync(filePath)) {
      return {};
    }
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('[Storage] Error reading user settings:', e);
      return {};
    }
  }

  /**
   * Save settings for a user
   */
  function saveUserSettings(userEmail, settings) {
    const filePath = getUserSettingsPath(userEmail);
    if (!filePath) return false;
    try {
      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('[Storage] Error saving user settings:', e);
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
      console.log(`[Email] Request received to: ${to}, cc: ${cc}, subject: ${subject}`);

      try {
        let nodemailer;
        try {
          nodemailer = require("nodemailer");
        } catch (e) {
          return sendJson(res, 501, {
            error: "nodemailer not installed",
            message: "Run 'npm install nodemailer'"
          });
        }

        // ONLY Google OAuth - no fallbacks
        if (!useGoogle || !oAuth2Client?.credentials?.refresh_token) {
          console.log("[Email] Rejected: Google OAuth not connected");
          return sendJson(res, 403, {
            error: "Google account not connected. Please connect in Settings."
          });
        }

        console.log("[Email] Using Google OAuth2");
        let transporter;
        let userEmail; // Declare here, outside the try block

        try {
          // Get user email from saved tokens
          userEmail = oAuth2Client.credentials.email;
          if (!userEmail && fs.existsSync(TOKENS_PATH)) {
            const savedTokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
            userEmail = savedTokens.email;
            if (userEmail) {
              oAuth2Client.credentials.email = userEmail;
            }
          }

          const accessToken = await oAuth2Client.getAccessToken();
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              type: 'OAuth2',
              user: userEmail || 'me',
              clientId: GOOGLE_CLIENT_ID,
              clientSecret: GOOGLE_CLIENT_SECRET,
              refreshToken: oAuth2Client.credentials.refresh_token,
              accessToken: accessToken.token
            }
          });

        } catch (oauthError) {
          console.error("[Email] OAuth token refresh failed", oauthError);
          return sendJson(res, 403, { error: "Google Auth expired. Please reconnect in Settings." });
        }

        console.log("[Email] userEmail value:", userEmail); // Debug log
        const info = await transporter.sendMail({
          from: userEmail ? `"Invoice Maker" <${userEmail}>` : undefined,
          to,
          cc,
          subject,
          text,
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
          message: "Email sent successfully via Google"
        });

      } catch (error) {
        console.error("[Email] Error:", error);
        sendJson(res, 500, { error: "Failed to send", details: error.message });
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
      return sendNotFound(res);
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
});

server.listen(port, () => {
  console.log(`Invoice app running at http://localhost:${port}/`);
  logDebug("server.js:162", "server listening", { port }, "H5");
});

