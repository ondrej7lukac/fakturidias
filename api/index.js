const https = require("https");
const zlib = require("zlib");
const { URL } = require("url");

// Environment variables will be set in Vercel dashboard
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Vercel serverless functions are stateless, so we use environment detection
const GOOGLE_REDIRECT_URI = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/auth/google/callback`
    : "https://ondrej7lukac-fakturidias.vercel.app/auth/google/callback";

const SCOPES = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/userinfo.email'
];

// In-memory token storage (resets per invocation on Vercel)
// For production, use a database or Vercel KV
let oAuth2Client = null;
let google = null;

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

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
            try {
                const parsed = JSON.parse(body || "{}");
                resolve(parsed);
            } catch (error) {
                reject(new Error("Invalid JSON body"));
            }
        });
    });
}
// #endregion

// Initialize Google OAuth if credentials are available
try {
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
        google = require('googleapis').google;
        oAuth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI
        );
    }
} catch (e) {
    console.warn("[Vercel] googleapis not installed or failed to load");
}

module.exports = async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const requestPath = decodeURIComponent(url.pathname || "/");
    console.log(`[API] ${req.method} ${requestPath}`);

    // Handle CORS preflight for all routes
    if (req.method === "OPTIONS") {
        return sendCors(res);
    }

    // --- ARES Search Route ---
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
                {
                    hostname: "ares.gov.cz",
                    path: "/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(payload),
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip, deflate",
                        "User-Agent": "InvoiceMaker/1.0"
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
                        "User-Agent": "InvoiceMaker/1.0"
                    }
                }
            ], payload, res);
        } catch (e) {
            return sendJson(res, 400, { error: "Invalid JSON body" });
        }
    }

    // --- ARES IČO Lookup Route ---
    if (requestPath.includes("/api/ares/ico") && req.method === "GET") {
        const ico = (url.searchParams.get("ico") || "").trim();
        if (!ico) {
            return sendJson(res, 400, { error: "Missing ico" });
        }

        return proxyJsonWithFallback([
            {
                hostname: "ares.gov.cz",
                path: `/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`,
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "User-Agent": "InvoiceMaker/1.0"
                }
            },
            {
                hostname: "ares.gov.cz",
                path: `/ekonomicke-subjekty/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`,
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "User-Agent": "InvoiceMaker/1.0"
                }
            }
        ], null, res);
    }

    // --- Google OAuth Routes ---
    if (requestPath === "/auth/google/url" && req.method === "GET") {
        if (!oAuth2Client) {
            return sendJson(res, 500, {
                error: "OAuth not configured",
                message: "Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel environment variables"
            });
        }

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent'
        });
        return sendJson(res, 200, { url: authUrl });
    }

    if (requestPath === "/auth/google/callback") {
        if (!oAuth2Client) {
            res.setHeader("Content-Type", "text/html");
            return res.end(`
                <html>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1 style="color: red;">OAuth Not Configured</h1>
                    <p>Please configure Google OAuth credentials in Vercel.</p>
                </body>
                </html>
            `);
        }

        const code = url.searchParams.get('code');
        if (code) {
            try {
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);

                // Extract email from ID token
                let userEmail = null;
                if (tokens.id_token) {
                    try {
                        const ticket = await oAuth2Client.verifyIdToken({
                            idToken: tokens.id_token,
                            audience: GOOGLE_CLIENT_ID
                        });
                        userEmail = ticket.getPayload().email;
                    } catch (e) {
                        console.warn('[OAuth] Could not decode ID token:', e.message);
                    }
                }

                // NOTE: On Vercel, we can't persist tokens to file system
                // You should save them to a database or Vercel KV
                // For now, display them to the user to copy

                res.setHeader("Content-Type", "text/html");
                res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
                return res.end(`
                    <html>
                    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1 style="color: orange;">⚠️ Important: Token Storage Required</h1>
                        <p>Google OAuth is connected, but Vercel serverless functions are stateless.</p>
                        <p><strong>Your email:</strong> ${userEmail || 'Not available'}</p>
                        <p style="color: red;">To persist tokens, you need to set up a database (MongoDB, Vercel KV, etc.)</p>
                        <p>For now, OAuth will work for this session only.</p>
                        <button onclick="window.close()">Close Window</button>
                        <script>
                            setTimeout(() => window.close(), 5000);
                        </script>
                    </body>
                    </html>
                `);
            } catch (error) {
                res.setHeader("Content-Type", "text/html");
                return res.end(`
                    <html>
                    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1 style="color: red;">Authentication Failed</h1>
                        <p>${error.message}</p>
                    </body>
                    </html>
                `);
            }
        }
    }

    if (requestPath === "/auth/google/status" && req.method === "GET") {
        // On Vercel, we can't check persistent status without a database
        return sendJson(res, 200, {
            connected: false,
            message: "Vercel deployment requires database for persistent OAuth tokens"
        });
    }

    if (requestPath === "/auth/google/disconnect" && req.method === "POST") {
        if (oAuth2Client) {
            oAuth2Client.setCredentials({});
        }
        return sendJson(res, 200, { success: true });
    }

    // --- Email Sending ---
    if (requestPath === "/api/email/send" && req.method === "POST") {
        return sendJson(res, 501, {
            error: "Email not configured for Vercel",
            message: "Gmail OAuth requires persistent token storage (database). Set up MongoDB or Vercel KV."
        });
    }

    // --- Data Routes (Placeholder) ---
    // NOTE: Vercel serverless functions have no file system persistence
    // Use MongoDB, Vercel KV, or another database
    if (requestPath.includes("/api/invoices")) {
        return sendJson(res, 501, {
            error: "Database not configured",
            message: "Set up MongoDB by adding MONGODB_URI to Vercel environment variables"
        });
    }

    if (requestPath.includes("/api/items")) {
        return sendJson(res, 501, {
            error: "Database not configured",
            message: "Set up MongoDB by adding MONGODB_URI to Vercel environment variables"
        });
    }

    // 404 for anything else
    sendJson(res, 404, { error: "Not Found", path: requestPath });
};
