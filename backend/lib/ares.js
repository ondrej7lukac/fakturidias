const https = require('https');
const zlib = require('zlib');
const { sendJson } = require('./utils');

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
        } catch (error) { reject(error); return; }
      }
      const encoding = String(proxyRes.headers["content-encoding"] || "").toLowerCase();
      const stream = encoding === "gzip" || encoding === "deflate" ? proxyRes.pipe(zlib.createUnzip()) : proxyRes;
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
    req.on("error", (err) => { reject(err); });
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

async function handleAresSearch(req, res, body) {
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
    ],
    payload,
    res
  );
}

async function handleAresIco(req, res, url) {
  const ico = (url.searchParams.get("ico") || "").trim();
  if (!ico) return sendJson(res, 400, { error: "Missing ico" });
  return proxyJsonWithFallback(
    [
      {
        hostname: "ares.gov.cz",
        path: `/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`,
        method: "GET",
        headers: { "Accept": "application/json", "Accept-Encoding": "gzip, deflate", "User-Agent": "InvoiceMaker/1.0" }
      },
      {
        hostname: "ares.gov.cz",
        path: `/ekonomicke-subjekty/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`,
        method: "GET",
        headers: { "Accept": "application/json", "Accept-Encoding": "gzip, deflate", "User-Agent": "InvoiceMaker/1.0" }
      }
    ],
    null,
    res
  );
}

module.exports = {
  handleAresSearch,
  handleAresIco
};
