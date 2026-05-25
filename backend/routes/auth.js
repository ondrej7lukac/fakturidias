'use strict';

const {
  handleAuthUrl,
  handleAuthCallback,
  handleAuthStatus,
  handleAuthDisconnect,
} = require('../lib/auth');

function attach(router) {
  router.add('GET', '/auth/google/url', async ({ req, res }) =>
    handleAuthUrl(req, res),
  );
  router.add('GET', '/auth/google/callback', async ({ req, res, url }) =>
    handleAuthCallback(req, res, url),
  );
  router.add('GET', '/auth/google/status', async ({ req, res }) =>
    handleAuthStatus(req, res),
  );
  router.add('POST', '/auth/google/disconnect', async ({ req, res }) =>
    handleAuthDisconnect(req, res),
  );
}

module.exports = { attach };
