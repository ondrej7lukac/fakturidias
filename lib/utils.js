const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');
const debugLogPath = path.join(baseDir, '.cursor', 'debug.log');

function logDebug(location, message, data, hypothesisId) {
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
        fetch('http://127.0.0.1:7243/ingest/6ddf4ffa-f2d9-42ae-9315-d8b3c8b9efb8', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }).catch(() => { });
    } else {
        try {
            if (!fs.existsSync(path.dirname(debugLogPath))) {
                fs.mkdirSync(path.dirname(debugLogPath), { recursive: true });
            }
            fs.appendFileSync(debugLogPath, `${JSON.stringify(payload)}\n`, "utf8");
        } catch (_) {
            // best-effort logging only
        }
    }
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

function sendNotFound(res) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
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

module.exports = {
    logDebug,
    sendJson,
    sendCors,
    sendNotFound,
    readJsonBody
};
