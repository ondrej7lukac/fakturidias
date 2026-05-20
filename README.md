# Invoice Maker - Full Stack Application

A modern invoice management system with Google OAuth2 email integration, MongoDB storage, and Czech ARES integration.

## 🚨 IMPORTANT - Security Setup Required

**Before running this application**, you MUST set up your environment variables. See [SECURITY_FIX_GUIDE.md](./SECURITY_FIX_GUIDE.md) for detailed instructions.

## Features

- ✨ Create and manage invoices
- 🔍 Search Czech companies via ARES API
- 📧 Send invoices via email (Gmail OAuth2)
- 💾 MongoDB database integration
- 🔐 Secure Google OAuth2 authentication
- 📱 Generate EPC QR codes for SEPA payments
- 🌙 Dark mode support
- 📊 Filter and search invoices

## Quick Start

### Prerequisites

- Node.js 18+ installed
- A Google Cloud Project with OAuth2 credentials
- MongoDB database (optional, for cloud deployment)

### 1. Install Dependencies

```bash
npm install
cd invoice-react
npm install
cd ..
```

### 2. Configure Environment Variables

**Option A: Use the helper script (Windows)**
```bash
create-env.bat
```

**Option B: Manual setup**

Create a `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

See [SECURITY_FIX_GUIDE.md](./SECURITY_FIX_GUIDE.md) for how to get these credentials.

### 3. Run the Application

**Development Mode:**

```bash
# Terminal 1: Start the backend server
node server.js

# Terminal 2: Start the React dev server
cd invoice-react
npm run dev
```

- Backend API: http://localhost:5500
- Frontend: http://localhost:5173

### 4. Connect Your Google Account

1. Open the application in your browser
2. Go to **Settings**
3. Click **Connect Google Account**
4. Authorize the application
5. You can now send invoices via email!

## Project Structure

```
.
├── server.js                 # Main Express backend
├── invoice-react/            # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── utils/
│   │   └── App.jsx
├── Dockerfile                # Container build for Railway / self-hosting
├── railway.json              # Railway deployment config
├── .env                      # Environment variables (DO NOT COMMIT)
├── .env.example              # Template for environment variables
├── .gitignore                # Git ignore rules
└── SECURITY_FIX_GUIDE.md     # Security setup instructions
```

## Environment Variables

### Required for Local Development

- `GOOGLE_CLIENT_ID` - Your Google OAuth2 Client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth2 Client Secret

### Required for Production Deployment

- `GOOGLE_CLIENT_ID` - Your Google OAuth2 Client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth2 Client Secret
- `SESSION_SECRET` / `SESSION_SECRET_2` - Cookie session signing keys
- `MONGODB_URI` - MongoDB connection string (optional)
- `VITE_GA4_ID` / `VITE_CLARITY_ID` - frontend analytics (needed at build time)

## Deployment

### Railway Deployment

1. Push your code to GitHub (make sure `.env` is NOT committed!)
2. Create a new project in Railway and connect the repository.
   Railway uses the `Dockerfile` (declared in `railway.json`).
3. In the service **Variables** tab, add each environment variable as a
   **separate** key/value entry (plaintext values, never a multi-line blob):
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `SESSION_SECRET`, `SESSION_SECRET_2`
   - `MONGODB_URI` (if using MongoDB)
   - `GEMINI_API_KEY`, `RESEND_API_KEY`, `STRIPE_*`
   - `VITE_GA4_ID`, `VITE_CLARITY_ID` (consumed as Docker build args)
   - `ADMIN_EMAILS` (for the admin dashboard)
4. Railway sets `PORT` automatically — the server already reads it.
5. Deploy. Health checks hit `/health`.

**Important**: Update your Google Cloud Console OAuth2 redirect URI to include
your Railway URL:
```
https://your-app.up.railway.app/auth/google/callback
```

## API Endpoints

### ARES Integration
- `POST /api/ares/search` - Search Czech companies
- `GET /api/ares/ico?ico=<ico>` - Get company by ICO

### Google OAuth
- `GET /auth/google/url` - Get OAuth authorization URL
- `GET /auth/google/callback` - OAuth callback handler
- `GET /auth/google/status` - Check connection status
- `POST /auth/google/disconnect` - Disconnect Google account

### Invoice Management
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create/update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Email
- `POST /api/email/send` - Send invoice via email

## Security Best Practices

1. ✅ **Never commit `.env` to Git** - It's in `.gitignore`
2. ✅ **Rotate credentials regularly**
3. ✅ **Use environment variables for all secrets**
4. ✅ **Enable 2FA on Google Cloud account**
5. ✅ **Monitor your Google Cloud audit logs**

## Technologies Used

### Frontend
- React 18
- Vite
- qrcode.react
- i18next (internationalization)

### Backend
- Node.js
- Express
- nodemailer (email sending)
- googleapis (Google OAuth2)
- mongoose (MongoDB ORM)
- dotenv (environment variables)

## Troubleshooting

### "OAuth not initialized" error
- Make sure your `.env` file exists with valid credentials
- Restart the server after creating `.env`

### "Google account not connected" when sending email
- Go to Settings and click "Connect Google Account"
- Make sure you've authorized the application

### ARES search not working
- Make sure `server.js` is running on port 5500
- Check that Vite proxy is configured correctly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **Never commit secrets or credentials**
5. Submit a pull request

## License

MIT

---

**Need help with security setup?** See [SECURITY_FIX_GUIDE.md](./SECURITY_FIX_GUIDE.md)
