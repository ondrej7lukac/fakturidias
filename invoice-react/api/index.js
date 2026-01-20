import https from 'https';
import zlib from 'zlib';
import { URL } from 'url';
import { Buffer } from 'buffer';

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

    // --- Auth & Email (Mock/Placeholder for Serverless) ---
    if (requestPath.includes("/auth/google")) {
        return sendJson(res, 501, { error: "Google OAuth not supported on static Vercel deployment yet. Requires Database." });
    }

    if (requestPath.includes("/api/invoices") || requestPath.includes("/api/items")) {
        // Return empty lists for now so the frontend doesn't break
        if (req.method === "GET") return sendJson(res, 200, { invoices: [], items: [] });
        return sendJson(res, 200, { success: true });
    }

    if (requestPath.includes("/api/email/send")) {
        return sendJson(res, 501, { error: "Email sending not configured for Vercel." });
    }

    // 404 for anything else
    sendJson(res, 404, { error: "Not Found", path: requestPath });
}
