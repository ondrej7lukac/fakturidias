const http = require('http');

const requestHandler = require('./backend/server');

if (require.main === module) {
  const port = process.env.PORT || 5500;
  const server = http.createServer(requestHandler);
  server.listen(port, () =>
    console.log(`Modular server running at http://localhost:${port}/`),
  );
}

module.exports = requestHandler;
