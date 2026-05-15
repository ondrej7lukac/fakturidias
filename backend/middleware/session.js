const cookieSession = require('cookie-session');

function withSession(req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  req.protocol = (req.headers['x-forwarded-proto'] || 'http').split(',')[0];

  const sessionMiddleware = cookieSession({
    name: 'session',
    keys: [
      process.env.SESSION_SECRET || (isProd ? null : 'dev_secret_1'),
      process.env.SESSION_SECRET_2 || (isProd ? null : 'dev_secret_2'),
    ],
    maxAge: 24 * 60 * 60 * 1000,
    secure: isProd,
    httpOnly: true,
    sameSite: 'lax',
    proxy: isProd,
  });

  if (
    isProd &&
    (!process.env.SESSION_SECRET || !process.env.SESSION_SECRET_2)
  ) {
    console.error(
      'CRITICAL: SESSION_SECRET and SESSION_SECRET_2 must be set in production!',
    );
  }

  sessionMiddleware(req, res, next);
}

module.exports = {
  withSession,
};
