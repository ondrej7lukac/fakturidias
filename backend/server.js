'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const cookieSession = require('cookie-session');
require('@dotenvx/dotenvx').config({ path: path.join(__dirname, '..', '.env') });

const { logDebug, sendJson, sendNotFound, SECURITY_HEADERS } = require('./lib/utils');
const { connectDB } = require('./lib/storage');
const { getCurrentUserEmail } = require('./lib/auth');
const { createRouter } = require('./routes/router');

const isProd = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5500;

if (isProd && (!process.env.SESSION_SECRET || !process.env.SESSION_SECRET_2)) {
    console.error('FATAL: SESSION_SECRET and SESSION_SECRET_2 must be set in production');
    process.exit(1);
}

const sessionMiddleware = cookieSession({
    name: 'session',
    keys: [
        process.env.SESSION_SECRET || 'dev_secret_1',
        process.env.SESSION_SECRET_2 || 'dev_secret_2'
    ],
    maxAge: 24 * 60 * 60 * 1000,
    secure: isProd,
    httpOnly: true,
    sameSite: 'lax',
    proxy: isProd
});

const rootDir = path.join(__dirname, '..');
const rootDist = path.join(rootDir, 'dist');
const subDist = path.join(rootDir, 'invoice-react', 'dist');

const STATIC_MIMES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.json': 'application/json'
};

// Build dispatch tables once at startup
const billing = require('./routes/billing');

const publicRouter = createRouter();
publicRouter.add('GET', '/health', ({ res }) => sendJson(res, 200, { status: 'ok' }));
require('./routes/ares').attach(publicRouter);
require('./routes/rpo').attach(publicRouter);
require('./routes/vat').attach(publicRouter);
require('./routes/exchangeRate').attach(publicRouter);
require('./routes/auth').attach(publicRouter);
billing.attachPublic(publicRouter);

const protectedRouter = createRouter();
require('./routes/invoices').attach(protectedRouter);
require('./routes/customers').attach(protectedRouter);
require('./routes/items').attach(protectedRouter);
require('./routes/settings').attach(protectedRouter);
require('./routes/drive').attach(protectedRouter);
require('./routes/export').attach(protectedRouter);
require('./routes/email').attach(protectedRouter);
require('./routes/ai').attach(protectedRouter);
require('./routes/admin').attach(protectedRouter);
billing.attachProtected(protectedRouter);

function serveStatic(req, res, requestPath) {
    const distDir = fs.existsSync(rootDist) ? rootDist : subDist;

    const filePath = path.resolve(distDir, '.' + requestPath);
    if (!filePath.startsWith(path.resolve(distDir) + path.sep) && filePath !== path.resolve(distDir)) {
        return sendNotFound(res);
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            if (!requestPath.startsWith('/api')) {
                const indexHtml = path.join(distDir, 'index.html');
                fs.readFile(indexHtml, (err, content) => {
                    if (err) return sendNotFound(res);
                    res.writeHead(200, {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
                        ...SECURITY_HEADERS
                    });
                    res.end(content);
                });
                return;
            }
            return sendJson(res, 404, { error: 'Not Found', path: requestPath });
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = STATIC_MIMES[ext] || 'application/octet-stream';
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
            ...SECURITY_HEADERS
        });
        fs.createReadStream(filePath).pipe(res);
    });
}

const handleRequest = async (req, res) => {
    await connectDB();
    const url = new URL(req.url, `http://${req.headers.host}`);
    let requestPath = decodeURIComponent(url.pathname || '/');

    if (requestPath.length > 1 && requestPath.endsWith('/')) {
        requestPath = requestPath.slice(0, -1);
    }

    logDebug('server', 'incoming request', { method: req.method, path: requestPath });

    const ctx = { req, res, url, requestPath, userEmail: null, params: {} };

    if (await publicRouter.dispatch(ctx)) return;

    if (requestPath.startsWith('/api/')) {
        const userEmail = await getCurrentUserEmail(req);
        if (!userEmail) {
            return sendJson(res, 401, { error: 'Not authenticated', requireLogin: true });
        }
        ctx.userEmail = userEmail;
    }

    if (await protectedRouter.dispatch(ctx)) return;

    serveStatic(req, res, requestPath);
};

const requestHandler = (req, res) => {
    req.protocol = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    sessionMiddleware(req, res, () => {
        handleRequest(req, res).catch((err) => {
            console.error('[server] Unhandled error:', err);
            if (!res.headersSent) {
                sendJson(res, 500, {
                    error: 'Internal Server Error',
                    ...(isProd ? {} : { message: err.message })
                });
            }
        });
    });
};

if (require.main === module) {
    const server = http.createServer(requestHandler);
    server.listen(port, '0.0.0.0', () =>
        console.log(`[server] Running at http://0.0.0.0:${port}/ (${isProd ? 'production' : 'development'})`)
    );
}

module.exports = requestHandler;
