const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { sendJson, sendNotFound } = require('./utils');
const { connectDB, TokenModel, isConnected } = require('./storage');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const baseDir = path.join(__dirname, '..');
const TOKENS_PATH = path.join(baseDir, 'google_tokens.json');

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email'
];

let oAuth2Client;
try {
  oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "http://localhost:5500/auth/google/callback"
  );
} catch (e) {
  console.warn("googleapis not installed or failed to load");
}

// Load saved tokens if exist (Local FS Fallback)
if (oAuth2Client && fs.existsSync(TOKENS_PATH)) {
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
    oAuth2Client.setCredentials(tokens);
  } catch (e) {
    console.error("[OAuth] Failed to load saved tokens", e);
  }
}

const getRedirectUri = (req) => {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  return `${protocol}://${host}/auth/google/callback`;
};

async function getCurrentUserEmail(req) {
  if (req && req.session && req.session.userEmail) {
    return req.session.userEmail;
  }
  return null;
}

async function handleAuthUrl(req, res) {
  if (!oAuth2Client) return sendJson(res, 500, { error: "OAuth not initialized" });
  const redirectUri = getRedirectUri(req);
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    redirect_uri: redirectUri
  });
  return sendJson(res, 200, { url: authUrl });
}

async function handleAuthCallback(req, res, url) {
  if (!oAuth2Client) return sendNotFound(res);
  const code = url.searchParams.get('code');
  if (!code) return sendJson(res, 400, { error: "Missing code" });

  try {
    const redirectUri = getRedirectUri(req);
    const tempClient = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);
    const { tokens } = await tempClient.getToken(code);
    oAuth2Client.setCredentials(tokens);

    let userEmail = null;
    if (tokens.id_token) {
      const ticket = await tempClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID
      });
      userEmail = ticket.getPayload().email;
    }

    const tokensToSave = { ...tokens, email: userEmail };

    if (!process.env.VERCEL) {
      try { fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokensToSave)); } catch (e) {}
    }

    await connectDB();
    let savedToDb = false;
    if (isConnected() && userEmail) {
      await TokenModel.findOneAndUpdate(
        { userEmail },
        { tokens: tokensToSave, userEmail, updatedAt: new Date() },
        { upsert: true }
      );
      savedToDb = true;
    }

    if (userEmail) {
      req.session.userEmail = userEmail;
    }

    const statusMessage = savedToDb
      ? '<h1 style="color: green;">Successfully Connected!</h1><p>Tokens saved to database.</p>'
      : '<h1 style="color: orange;">Connected (Local Only)</h1><p>Warning: Could not save to Database.</p>';

    const clientData = JSON.stringify({
      type: 'GOOGLE_LOGIN_SUCCESS',
      email: userEmail,
      tokens: { connected: true, note: "managed_by_session" }
    });

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          ${statusMessage}
          <p>Closing window...</p>
          <script>
            if (window.opener) {
              try { window.opener.postMessage(${clientData}, '*'); } catch(e) {}
            }
            try { localStorage.setItem('auth_success', JSON.stringify(${clientData})); } catch(e) {}
            setTimeout(() => window.close(), 1500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Authentication failed: " + error.message);
  }
}

async function handleAuthStatus(req, res) {
  const userEmail = await getCurrentUserEmail(req);
  return sendJson(res, 200, { connected: !!userEmail, user: userEmail });
}

async function handleAuthDisconnect(req, res) {
  const userEmail = await getCurrentUserEmail(req);
  req.session = null;

  if (isConnected() && userEmail) {
    await TokenModel.deleteOne({ userEmail });
  }

  return sendJson(res, 200, { success: true });
}

async function getAuthClient(userEmail) {
  if (!userEmail) return null;
  await connectDB();
  const tokenDoc = await TokenModel.findOne({ userEmail });
  if (tokenDoc && tokenDoc.tokens) {
    oAuth2Client.setCredentials(tokenDoc.tokens);
    return oAuth2Client;
  }
  return null;
}

module.exports = {
  oAuth2Client,
  getCurrentUserEmail,
  handleAuthUrl,
  handleAuthCallback,
  handleAuthStatus,
  handleAuthDisconnect,
  getAuthClient,
  TOKENS_PATH
};
