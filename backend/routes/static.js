const fs = require('fs');
const path = require('path');
const {
  sendJson,
  sendNotFound,
  writeSecurityHeaders,
} = require('../lib/utils');

function handleStaticRoutes(req, res, requestPath) {
  const distDir = path.join(__dirname, '..', '..', 'dist');
  const filePath = path.join(distDir, requestPath);

  if (!filePath.startsWith(distDir)) {
    sendNotFound(res, req);
    return true;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      if (!requestPath.startsWith('/api')) {
        const indexHtml = path.join(distDir, 'index.html');
        fs.readFile(indexHtml, (indexErr, content) => {
          if (indexErr) {
            sendNotFound(res, req);
            return;
          }
          writeSecurityHeaders(res, req);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        });
        return;
      }

      sendJson(
        res,
        404,
        { error: 'Not Found', path: requestPath, requestId: req.requestId },
        req,
      );
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    writeSecurityHeaders(res, req);
    res.writeHead(200, {
      'Content-Type': mimes[ext] || 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return true;
}

module.exports = {
  handleStaticRoutes,
};
