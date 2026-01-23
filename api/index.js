const https = require("https");
const zlib = require("zlib");
const { URL } = require("url");
const mongoose = require('mongoose');
const { gooogle } = require('googleapis'); // Typo fix below

// Environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

// Vercel serverless functions are stateless
const GOOGLE_REDIRECT_URI = "https://fakturidias.vercel.app/auth/google/callback";

const SCOPES = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/userinfo.email'
];

// function-scoped variables instead of global
const getOAuthClient = () => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;

    // Hardcoded production URL
    const redirectUri = "https://fakturidias.vercel.app/auth/google/callback";
    console.log("[OAuth] Using Redirect URI:", redirectUri);

    try {
        const { google } = require('googleapis');
        return new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            redirectUri
        );
    } catch (e) {
        console.error("Failed to load googleapis:", e);
        return null;
    }
};

// MongoDB Schemas
const tokenSchema = new mongoose.Schema({
    userId: String, // 'default' for single user or email
    tokens: Object,
    updatedAt: { type: Date, default: Date.now }
});
const Token = mongoose.models.Token || mongoose.model('Token', tokenSchema);

const invoiceSchema = new mongoose.Schema({
    id: String,
    data: Object,
    userId: String,
    createdAt: { type: Date, default: Date.now }
});
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

const itemSchema = new mongoose.Schema({
    id: String,
    name: String,
    price: Number,
    userId: String
});
const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);

// Connect to Database
let cachedDb = null;
async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    if (!MONGODB_URI) return null;

    try {
        const db = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        cachedDb = db;
        console.log("[MongoDB] Connected");
        return db;
    } catch (error) {
        console.error("[MongoDB] Connection Error:", error);
        return null;
    }
}

// #region Helper Functions
function sendJson(res, status, payload) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end(JSON.stringify(payload));
}

function sendCors(res) {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
}

function requestJson(options, body, maxRedirects = 2) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (proxyRes) => {
            const status = proxyRes.statusCode || 500;
            const location = proxyRes.headers.location;

            if (maxRedirects > 0 && location && status >= 300 && status < 400) {
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
                    reject(error); return;
                }
            }
            const encoding = String(proxyRes.headers["content-encoding"] || "").toLowerCase();
            const stream = encoding === "gzip" || encoding === "deflate"
                ? proxyRes.pipe(zlib.createUnzip()) : proxyRes;

            let data = "";
            stream.on("data", (chunk) => { data += chunk; });
            stream.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ ok: status >= 200 && status < 300, status, parsed });
                } catch (error) {
                    resolve({ ok: false, status, error: "Invalid JSON from ARES", snippet: data.slice(0, 200) });
                }
            });
        });
        req.on("error", (err) => reject(err));
        if (body) req.write(body);
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
            if (result.status === 404 || result.status === 410) continue;
            sendJson(res, result.status || 502, {
                error: result.parsed?.error || result.error || "ARES request failed",
                snippet: result.snippet
            });
            return;
        } catch (error) { lastError = { error: error.message }; }
    }
    sendJson(res, 502, { error: "ARES request failed", details: lastError?.error });
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
            try {
                const parsed = JSON.parse(body || "{}");
                resolve(parsed);
            } catch (error) { reject(new Error("Invalid JSON body")); }
        });
    });
}
// #endregion

module.exports = async (req, res) => {
    // Ensure DB is connected
    await connectToDatabase();

    const url = new URL(req.url, `http://${req.headers.host}`);
    const requestPath = decodeURIComponent(url.pathname || "/");
    console.log(`[API] ${req.method} ${requestPath}`);

    if (req.method === "OPTIONS") return sendCors(res);

    // --- ARES Search ---
    if (requestPath.endsWith("/api/ares/search") && req.method === "POST") {
        try {
            const parsedBody = await readJsonBody(req);
            const payload = JSON.stringify({
                obchodniJmeno: String(parsedBody.obchodniJmeno || "").trim(),
                ico: parsedBody.ico ? String(parsedBody.ico).trim() : undefined,
                pocet: parsedBody.pocet || 8,
                strana: parsedBody.strana || 1
            });
            return await proxyJsonWithFallback([
                { hostname: "ares.gov.cz", path: "/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), "Accept": "application/json", "Accept-Encoding": "gzip, deflate", "User-Agent": "InvoiceMaker/1.0" } },
                { hostname: "ares.gov.cz", path: "/ekonomicke-subjekty/rest/ekonomicke-subjekty/vyhledat", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), "Accept": "application/json", "Accept-Encoding": "gzip, deflate", "User-Agent": "InvoiceMaker/1.0" } }
            ], payload, res);
        } catch (e) { return sendJson(res, 400, { error: "Invalid JSON body" }); }
    }

    // --- ARES ICO ---
    if (requestPath.includes("/api/ares/ico") && req.method === "GET") {
        const ico = (url.searchParams.get("ico") || "").trim();
        if (!ico) return sendJson(res, 400, { error: "Missing ico" });
        return proxyJsonWithFallback([
            { hostname: "ares.gov.cz", path: `/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`, method: "GET", headers: { "Accept": "application/json", "Accept-Encoding": "gzip, deflate", "User-Agent": "InvoiceMaker/1.0" } },
            { hostname: "ares.gov.cz", path: `/ekonomicke-subjekty/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`, method: "GET", headers: { "Accept": "application/json", "Accept-Encoding": "gzip, deflate", "User-Agent": "InvoiceMaker/1.0" } }
        ], null, res);
    }

    // --- OAuth URL ---
    if (requestPath.includes("/auth/google/url")) {
        const oAuth2Client = getOAuthClient();
        if (!oAuth2Client) return sendJson(res, 500, { error: "OAuth not configured" });
        const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
        return sendJson(res, 200, { url: authUrl });
    }

    // --- OAuth Callback ---
    if (requestPath.includes("/auth/google/callback")) {
        const oAuth2Client = getOAuthClient();
        const code = url.searchParams.get('code');
        if (code && oAuth2Client) {
            try {
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);

                // Get User Info
                const ticket = await oAuth2Client.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID });
                const payload = ticket.getPayload();
                const userId = payload.email; // Use email as ID

                // Save to MongoDB
                await Token.findOneAndUpdate(
                    { userId: userId },
                    { userId: userId, tokens: tokens, updatedAt: new Date() },
                    { upsert: true, new: true }
                );

                res.setHeader("Content-Type", "text/html");
                return res.end(`<script>window.close();</script>`);
            } catch (error) {
                return sendJson(res, 500, { error: error.message });
            }
        }
    }

    // --- OAuth Status ---
    if (requestPath.includes("/auth/google/status")) {
        // In serverless, we don't have a persistent session in memory.
        // The frontend should ideally send a session token. 
        // For simplicity, we check if ANY token exists in DB (multi-user limitation)
        // Or we just return true if client-side has stored state. 
        // Real-world: Check session cookie -> lookup user -> check DB.

        // Mocking 'true' if we have DB access, assuming frontend handles login state locally
        return sendJson(res, 200, { connected: true, email: "User" });
    }

    // --- Invoices ---
    if (requestPath.includes("/api/invoices")) {
        // Ensure user is determined (mock 'default' for now)
        const userId = "default";

        if (req.method === "GET") {
            const invoiceId = requestPath.split('/').pop();
            // detailed fetch
            if (invoiceId && invoiceId !== 'invoices') {
                const inv = await Invoice.findOne({ id: invoiceId });
                if (!inv) return sendJson(res, 404, { error: "Invoice not found" });
                return sendJson(res, 200, inv.data);
            }
            // list fetch
            const invoices = await Invoice.find({}).sort({ createdAt: -1 });
            return sendJson(res, 200, { invoices: invoices.map(i => i.data || i) });
        }
        if (req.method === "POST") {
            const body = await readJsonBody(req);
            const { invoice } = body;
            await Invoice.findOneAndUpdate(
                { id: invoice.id },
                { id: invoice.id, data: invoice, userId: "default" },
                { upsert: true, new: true }
            );
            return sendJson(res, 200, { success: true });
        }
    }

    // --- Items ---
    if (requestPath.includes("/api/items")) {
        if (req.method === "GET") {
            const items = await Item.find({});
            return sendJson(res, 200, items);
        }
        if (req.method === "POST") {
            const item = await readJsonBody(req);
            // Deduplicate by name for simplicity or use specific ID
            await Item.findOneAndUpdate(
                { name: item.name },
                { ...item, userId: "default" },
                { upsert: true }
            );
            return sendJson(res, 200, { success: true });
        }
    }

    sendJson(res, 404, { error: "Not Found", path: requestPath });
};
