import https from 'https';
import zlib from 'zlib';
import { URL } from 'url';
import { Buffer } from 'buffer';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';

// #region Helper Functions
function sendJson(res, status, payload) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end(JSON.stringify(payload));
}

function sendCors(res) {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
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
                    reject(error);
                    return;
                }
            }

            const encoding = String(proxyRes.headers["content-encoding"] || "").toLowerCase();
            const stream = encoding === "gzip" || encoding === "deflate"
                ? proxyRes.pipe(zlib.createUnzip())
                : proxyRes;

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
        } catch (error) {
            lastError = { error: error.message };
        }
    }
    sendJson(res, 502, { error: "ARES request failed", details: lastError?.error });
}
// #endregion

// Google OAuth Config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/auth/google/callback`
    : "http://localhost:5173/auth/google/callback";

// NOTE: You might need to add https://[your-vercel-domain]/auth/google/callback to Google Cloud Console Allow list!


const SCOPES = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/userinfo.email'
];

import mongoose from 'mongoose';

// #region Helper Functions
function sendJson(res, status, payload) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end(JSON.stringify(payload));
}
// (keep other helpers: sendCors, requestJson, proxyJsonWithFallback)

// #region MongoDB Setup
let cachedDb = null;

const invoiceSchema = new mongoose.Schema({
    id: String,
    invoiceNumber: String,
    issueDate: String,
    dueDate: String,
    status: String,
    client: Object,
    items: Array,
    amount: Number,
    currency: String,
    createdAt: { type: Date, default: Date.now }
}, { strict: false });

const itemSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String
}, { strict: false });

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    if (!process.env.MONGODB_URI) {
        return null;
    }
    const opts = { bufferCommands: false };
    cachedDb = await mongoose.connect(process.env.MONGODB_URI, opts);
    return cachedDb;
}
// #endregion

// (keep Google Auth Config)

export default async function handler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const requestPath = decodeURIComponent(url.pathname || "/");
    console.log(`[API] Request: ${req.method} ${requestPath}`);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return sendCors(res);
    }

    // Connect DB first if available
    const db = await connectToDatabase();

    // ... (Keep ARES and Auth routes same as before, just pasting them back effectively) ...

    // --- Data Routes (MongoDB) ---
    if (requestPath.includes("/api/invoices")) {
        if (!db) return sendJson(res, 200, { invoices: [] }); // Fallback if no DB

        if (req.method === "GET") {
            try {
                const invoices = await Invoice.find({}).sort({ createdAt: -1 });
                return sendJson(res, 200, { invoices });
            } catch (e) { return sendJson(res, 500, { error: e.message }); }
        }

        if (req.method === "POST") {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            return new Promise(resolve => {
                req.on("end", async () => {
                    try {
                        const { invoice } = JSON.parse(body);
                        const existing = await Invoice.findOne({ id: invoice.id });
                        if (existing) {
                            await Invoice.updateOne({ id: invoice.id }, invoice);
                        } else {
                            await Invoice.create(invoice);
                        }
                        return sendJson(res, 200, { invoice, success: true });
                    } catch (e) {
                        sendJson(res, 500, { error: e.message });
                    }
                    resolve();
                });
            });
        }

        if (req.method === "DELETE") {
            const id = requestPath.split('/').pop();
            try {
                await Invoice.deleteOne({ id });
                return sendJson(res, 200, { success: true });
            } catch (e) { return sendJson(res, 500, { error: e.message }); }
        }
    }

    if (requestPath.includes("/api/items")) {
        if (!db) return sendJson(res, 200, { items: [] });

        if (req.method === "GET") {
            const items = await Item.find({});
            return sendJson(res, 200, { items });
        }
        if (req.method === "POST") {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            return new Promise(resolve => {
                req.on("end", async () => {
                    const { item } = JSON.parse(body);
                    await Item.create(item);
                    return sendJson(res, 200, { success: true });
                    resolve();
                });
            });
        }
    }

    // 404
    sendJson(res, 404, { error: "Not Found" });
}
