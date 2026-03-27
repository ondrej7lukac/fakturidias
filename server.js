const http = require("http");
const fs = require("fs");
const path = require("path");
const cookieSession = require('cookie-session');
require('dotenv').config();

// Load modular libraries
const { 
    logDebug, 
    sendJson, 
    sendCors, 
    sendNotFound, 
    readJsonBody 
} = require('./lib/utils');

const { 
    connectDB, 
    isConnected,
    getUserInvoices,
    saveSingleInvoice,
    saveUserInvoices_FS,
    getUserCustomers,
    saveUserCustomer,
    getUserItems,
    saveUserItem,
    getUserSettings,
    saveUserSettings,
    InvoiceModel
} = require('./lib/storage');

const {
    getCurrentUserEmail,
    handleAuthUrl,
    handleAuthCallback,
    handleAuthStatus,
    handleAuthDisconnect
} = require('./lib/auth');

const {
    handleAresSearch,
    handleAresIco
} = require('./lib/ares');

const { uploadInvoiceToDrive } = require('./lib/drive');

const port = process.env.PORT || 5500;

// Session Middleware Wrapper
const requestHandler = async (req, res) => {
    const isProd = process.env.NODE_ENV === 'production';
    const sessionMiddleware = cookieSession({
        name: 'session',
        keys: [
            process.env.SESSION_SECRET || (isProd ? null : 'dev_secret_1'), 
            process.env.SESSION_SECRET_2 || (isProd ? null : 'dev_secret_2')
        ],
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: isProd, // Only send over HTTPS in production
        httpOnly: true,
        sameSite: 'lax'
    });
    
    // Throw error if missing secrets in production
    if (isProd && (!process.env.SESSION_SECRET || !process.env.SESSION_SECRET_2)) {
        console.error("CRITICAL: SESSION_SECRET and SESSION_SECRET_2 must be set in production!");
        process.exit(1);
    }

    sessionMiddleware(req, res, async () => {
        await handleRequest(req, res);
    });
};

const handleRequest = async (req, res) => {
    await connectDB();
    const url = new URL(req.url, `http://${req.headers.host}`);
    let requestPath = decodeURIComponent(url.pathname || "/");

    if (requestPath.length > 1 && requestPath.endsWith('/')) {
        requestPath = requestPath.slice(0, -1);
    }

    logDebug("server.js", "incoming request", { method: req.method, path: requestPath }, "modular-v1");

    // --- ARES ROUTES ---
    if (requestPath === "/api/ares/search") {
        if (req.method === "OPTIONS") return sendCors(res);
        if (req.method === "POST") {
            return readJsonBody(req, (err, body) => {
                if (err) return sendJson(res, 400, { error: "Invalid JSON body" });
                return handleAresSearch(req, res, body);
            });
        }
    }

    if (requestPath === "/api/ares/ico") {
        if (req.method === "OPTIONS") return sendCors(res);
        if (req.method === "GET") return handleAresIco(req, res, url);
    }

    // --- AUTH ROUTES ---
    if (requestPath === "/auth/google/url" && req.method === "GET") {
        return handleAuthUrl(req, res);
    }

    if (requestPath === "/auth/google/callback") {
        return handleAuthCallback(req, res, url);
    }

    if (requestPath === "/auth/google/status" && req.method === "GET") {
        return handleAuthStatus(req, res);
    }

    if (requestPath === "/auth/google/disconnect" && req.method === "POST") {
        return handleAuthDisconnect(req, res);
    }

    // --- PROTECTED API ROUTES ---
    const userEmail = await getCurrentUserEmail(req);
    
    // Auth Check for /api routes (except ARES)
    if (requestPath.startsWith("/api") && !requestPath.startsWith("/api/ares")) {
        if (!userEmail) {
            return sendJson(res, 401, { error: "Not authenticated", requireLogin: true });
        }
    }

    // INVOICES
    if (requestPath === "/api/invoices") {
        if (req.method === "GET") {
            const invoices = await getUserInvoices(userEmail);
            return sendJson(res, 200, { invoices });
        }
        if (req.method === "POST") {
            return readJsonBody(req, async (err, body) => {
                if (err) return sendJson(res, 400, { error: "Invalid JSON body" });
                const { invoice } = body;
                if (!invoice || !invoice.id) return sendJson(res, 400, { error: "Invalid data" });
                
                let success = false;
                if (isConnected()) {
                    success = await saveSingleInvoice(userEmail, invoice);
                } else {
                    const invoices = await getUserInvoices(userEmail);
                    const idx = invoices.findIndex(inv => inv.id === invoice.id);
                    if (idx >= 0) invoices[idx] = invoice; else invoices.push(invoice);
                    success = saveUserInvoices_FS(userEmail, invoices);
                }
                return success ? sendJson(res, 200, { success: true, invoice }) : sendJson(res, 500, { error: "Failed to save" });
            });
        }
    }

    if (requestPath.startsWith("/api/invoices/") && req.method === "DELETE") {
        const id = requestPath.split("/api/invoices/")[1];
        if (isConnected()) {
            await InvoiceModel.deleteOne({ userEmail, id });
            return sendJson(res, 200, { success: true });
        } else {
            const invoices = await getUserInvoices(userEmail);
            const filtered = invoices.filter(inv => inv.id !== id);
            const success = saveUserInvoices_FS(userEmail, filtered);
            return success ? sendJson(res, 200, { success: true }) : sendJson(res, 500, { error: "Failed to delete" });
        }
    }

    // CUSTOMERS
    if (requestPath === "/api/customers") {
        if (req.method === "GET") {
            const customers = await getUserCustomers(userEmail);
            return sendJson(res, 200, { customers });
        }
        if (req.method === "POST") {
            return readJsonBody(req, async (err, body) => {
                if (err) return sendJson(res, 400, { error: "Invalid JSON body" });
                const { customer } = body;
                const success = await saveUserCustomer(userEmail, customer);
                return success ? sendJson(res, 200, { success: true, customer }) : sendJson(res, 500, { error: "Failed to save" });
            });
        }
    }

    // ITEMS
    if (requestPath === "/api/items") {
        if (req.method === "GET") {
            const items = await getUserItems(userEmail);
            return sendJson(res, 200, { items });
        }
        if (req.method === "POST") {
            return readJsonBody(req, async (err, body) => {
                if (err) return sendJson(res, 400, { error: "Invalid JSON body" });
                const { item } = body;
                const success = await saveUserItem(userEmail, item);
                return success ? sendJson(res, 200, { success: true, item }) : sendJson(res, 500, { error: "Failed to save" });
            });
        }
    }

    // SETTINGS
    if (requestPath === "/api/settings") {
        if (req.method === "GET") {
            const doc = await getUserSettings(userEmail);
            return sendJson(res, 200, { settings: doc });
        }
        if (req.method === "POST") {
            return readJsonBody(req, async (err, body) => {
                if (err) return sendJson(res, 400, { error: "Invalid JSON body" });
                const success = await saveUserSettings(userEmail, body.settings);
                return success ? sendJson(res, 200, { success: true, settings: body.settings }) : sendJson(res, 500, { error: "Failed to save" });
            });
        }
    }

    // DRIVE BACKUP (New Feature)
    if (requestPath === "/api/drive/backup" && req.method === "POST") {
        return readJsonBody(req, async (err, body) => {
            if (err) return sendJson(res, 400, { error: "Invalid JSON body" });
            const { invoice, pdfBase64 } = body;
            try {
                const fileId = await uploadInvoiceToDrive(userEmail, invoice, pdfBase64);
                return sendJson(res, 200, { success: true, fileId });
            } catch (err) {
                return sendJson(res, 500, { error: "Failed to backup to Drive", message: err.message });
            }
        });
    }

    // EMAIL SENDING (Temporarily Disabled for Production)
    if (requestPath === "/api/email/send") {
        return sendJson(res, 503, { error: "Email service temporarily unavailable" });
    }

    // --- STATIC CONTENT SERVING ---
    const distDir = path.join(__dirname, "invoice-react", "dist");
    let filePath = path.join(distDir, requestPath);
    if (!filePath.startsWith(distDir)) return sendNotFound(res);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            if (!requestPath.startsWith("/api")) {
                const indexHtml = path.join(distDir, "index.html");
                fs.readFile(indexHtml, (err, content) => {
                    if (err) return sendNotFound(res);
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(content);
                });
                return;
            }
            return sendJson(res, 404, { error: "Not Found", path: requestPath });
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimes = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
        res.writeHead(200, { "Content-Type": mimes[ext] || "application/octet-stream", "Cross-Origin-Opener-Policy": "same-origin-allow-popups" });
        fs.createReadStream(filePath).pipe(res);
    });
};

if (require.main === module) {
    const server = http.createServer(requestHandler);
    server.listen(port, () => console.log(`Modular server running at http://localhost:${port}/`));
}

module.exports = requestHandler;
