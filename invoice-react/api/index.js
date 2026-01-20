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
const GOOGLE_CLIENT_ID = "1028031822016-6jqktqscqmksr0qjnp65ctcehq6etjrr.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";
const GOOGLE_REDIRECT_URI = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/auth/google/callback`
    : "http://localhost:5173/auth/google/callback";

// NOTE: You might need to add https://[your-vercel-domain]/auth/google/callback to Google Cloud Console Allow list!

const SCOPES = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/userinfo.email'
];

export default async function handler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const requestPath = decodeURIComponent(url.pathname || "/");
    console.log(`[API] Request: ${req.method} ${requestPath}`);

    // Handle CORS preflight for all routes
    if (req.method === "OPTIONS") {
        return sendCors(res);
    }

    // --- ARES Search Route ---
    if (requestPath.endsWith("/api/ares/search") && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });

        return new Promise((resolve) => {
            req.on("end", async () => {
                try {
                    const parsedBody = JSON.parse(body || "{}");
                    const payload = JSON.stringify({
                        obchodniJmeno: String(parsedBody.obchodniJmeno || "").trim(),
                        ico: parsedBody.ico ? String(parsedBody.ico).trim() : undefined,
                        pocet: parsedBody.pocet || 8,
                        strana: parsedBody.strana || 1
                    });

                    await proxyJsonWithFallback([
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
                    resolve();
                } catch (e) {
                    sendJson(res, 400, { error: "Invalid JSON body" });
                    resolve();
                }
            });
        });
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

    // --- Auth Routes ---
    if (requestPath.endsWith("/auth/google/url") && req.method === "GET") {
        const oAuth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            // Need to detect correct redirect URI based on Host header
            req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}/auth/google/callback` : `http://${req.headers.host}/auth/google/callback`
        );

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent'
        });
        return sendJson(res, 200, { url: authUrl });
    }

    if (requestPath.endsWith("/auth/google/callback")) {
        const code = url.searchParams.get('code');
        if (!code) {
            res.end('No code provided');
            return;
        }

        try {
            const oAuth2Client = new google.auth.OAuth2(
                GOOGLE_CLIENT_ID,
                GOOGLE_CLIENT_SECRET,
                req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}/auth/google/callback` : `http://${req.headers.host}/auth/google/callback`
            );
            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);

            // Get email
            const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
            const userInfo = await oauth2.userinfo.get();
            const email = userInfo.data.email;

            // Return HTML that passes tokens to opener
            res.setHeader("Content-Type", "text/html");
            res.end(`
          <html>
            <body>
              <script>
                // Send tokens to parent window
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'GOOGLE_LOGIN_SUCCESS',
                    tokens: ${JSON.stringify(tokens)},
                    email: '${email}'
                  }, '*');
                  window.close();
                } else {
                  document.write('Please close this window and return to the app.');
                }
              </script>
              <h1>Connected! Closing...</h1>
            </body>
          </html>
        `);
        } catch (e) {
            res.statusCode = 500;
            res.end('Auth failed: ' + e.message);
        }
        return;
    }

    if (requestPath.endsWith("/auth/google/status")) {
        // Stateless check - we can't really know status unless client calls us, 
        // but client-side logic should handle this. 
        // We'll return false here, forcing client to rely on localStorage.
        return sendJson(res, 200, { connected: false, mode: 'stateless' });
    }

    // --- Email Send Route ---
    if (requestPath.endsWith("/api/email/send") && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        return new Promise(resolve => {
            req.on("end", async () => {
                try {
                    const data = JSON.parse(body);
                    const { to, subject, text, pdfBase64, filename, tokens } = data;

                    if (!tokens || !tokens.refresh_token) {
                        sendJson(res, 401, { error: "Missing OAuth tokens. Please reconnect Google account." });
                        resolve();
                        return;
                    }

                    const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
                    oAuth2Client.setCredentials(tokens);

                    const accessToken = await oAuth2Client.getAccessToken();
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            type: 'OAuth2',
                            user: 'me', // handled by Access Token
                            clientId: GOOGLE_CLIENT_ID,
                            clientSecret: GOOGLE_CLIENT_SECRET,
                            refreshToken: tokens.refresh_token,
                            accessToken: accessToken.token
                        }
                    });

                    const info = await transporter.sendMail({
                        to,
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

                    sendJson(res, 200, { success: true, messageId: info.messageId });
                } catch (e) {
                    console.error("Email send failed", e);
                    sendJson(res, 500, { error: e.message });
                }
                resolve();
            });
        });
    }

    // Data routes return empty
    if (requestPath.includes("/api/invoices") || requestPath.includes("/api/items")) {
        if (req.method === "GET") return sendJson(res, 200, { invoices: [], items: [] });
        return sendJson(res, 200, { success: true });
    }

    // 404 for anything else
    sendJson(res, 404, { error: "Not Found", path: requestPath });
}
