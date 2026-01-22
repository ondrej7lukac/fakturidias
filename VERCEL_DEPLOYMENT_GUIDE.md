# 🚀 Vercel Deployment Guide for Invoice Maker

## 📋 Current Status

Your app is deployed at: **https://ondrej7lukac-fakturidias.vercel.app**

The code has been updated to use **secure environment variables** instead of hardcoded credentials.

## ⚙️ Step-by-Step Setup

### 1. Set Environment Variables in Vercel

Go to your Vercel dashboard and add these environment variables:

1. Open [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **ondrej7lukac-fakturidias**
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `GOOGLE_CLIENT_ID` | Your new Google Client ID | Production, Preview, Development |
| `GOOGLE_CLIENT_SECRET` | Your new Google Client Secret | Production, Preview, Development |

**Adding Environment Variables:**
```
Name: GOOGLE_CLIENT_ID
Value: your-new-client-id.apps.googleusercontent.com
Environments: ✅ Production ✅ Preview ✅ Development
[Save]

Name: GOOGLE_CLIENT_SECRET
Value: your-new-client-secret
Environments: ✅ Production ✅ Preview ✅ Development
[Save]
```

### 2. Update Google Cloud Console Redirect URIs

You need to add your Vercel URL to the authorized redirect URIs in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://ondrej7lukac-fakturidias.vercel.app/auth/google/callback
   ```
5. Click **Save**

### 3. Redeploy Your Application

After setting the environment variables:

#### Option A: Trigger Redeploy from Vercel Dashboard
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **...** (three dots) → **Redeploy**

#### Option B: Push to GitHub
```bash
git add .
git commit -m "feat: secure Google OAuth with environment variables"
git push origin main
```

Vercel will automatically redeploy with the new environment variables.

### 4. Test the Deployment

1. Visit https://ondrej7lukac-fakturidias.vercel.app
2. Test ARES search functionality
3. Try Google OAuth connection (Settings → Connect Google Account)

## ⚠️ Important Limitations on Vercel

Vercel serverless functions are **stateless**, which means:

### ❌ What Doesn't Work (Yet):
- **Persistent OAuth tokens** - Tokens don't persist between requests
- **File storage** - `google_tokens.json` and `data/` folder won't work
- **Invoice storage** - Local JSON file storage won't work

### ✅ What Works:
- ✅ ARES company search
- ✅ OAuth flow initiation
- ✅ Frontend functionality
- ✅ All client-side features (localStorage)

## 🔧 To Enable Full Functionality on Vercel

You have two options:

### Option 1: Use MongoDB (Recommended)

1. Create a free MongoDB Atlas account: https://cloud.mongodb.com/
2. Create a cluster and get your connection string
3. Add to Vercel environment variables:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/invoicemaker
   ```
4. The app already has MongoDB support built-in!

### Option 2: Use Vercel KV (Recommended for small data)

1. In your Vercel project, go to **Storage**
2. Create a **KV Database**
3. It will automatically add `KV_*` environment variables
4. Update the code to use Vercel KV for token storage

### Option 3: Keep Using Local Server

If you don't need cloud deployment:
- Keep using `node server.js` locally
- All features work perfectly on localhost
- Share via ngrok or similar if needed

## 📁 Current Project Structure

```
.
├── api/
│   └── index.js          ← Vercel serverless function (uses env vars)
├── invoice-react/
│   ├── dist/             ← Built frontend (served by Vercel)
│   └── src/              ← React source code
├── server.js             ← Local development server
├── .env                  ← Local environment variables (NOT on Vercel)
├── .env.example          ← Template
├── vercel.json           ← Vercel configuration
└── package.json
```

## 🔒 Security Checklist

- [x] Credentials moved to environment variables
- [ ] Set environment variables in Vercel dashboard
- [ ] Updated Google OAuth redirect URIs
- [ ] Redeployed application
- [ ] Verified ARES search works
- [ ] Tested OAuth flow

## 🐛 Troubleshooting

### "OAuth not configured" error
**Cause:** Environment variables not set in Vercel
**Fix:** Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel dashboard, then redeploy

### "redirect_uri_mismatch" error
**Cause:** Vercel URL not in Google Cloud Console
**Fix:** Add `https://ondrej7lukac-fakturidias.vercel.app/auth/google/callback` to authorized redirect URIs

### ARES search returns 404
**Cause:** Route mismatch
**Fix:** Check `vercel.json` routes configuration

### Changes not showing on Vercel
**Cause:** Cached deployment
**Fix:** Hard redeploy from Vercel dashboard or clear browser cache

## 📊 Deployment Flow

```mermaid
graph LR
    A[Push to GitHub] --> B[Vercel Auto-Deploy]
    B --> C[Build React App]
    C --> D[Deploy Serverless Function]
    D --> E[Use Environment Variables]
    E --> F[Live at ondrej7lukac-fakturidias.vercel.app]
```

## 🎯 Next Steps

1. ✅ Code is updated with environment variables
2. ⏳ Set environment variables in Vercel dashboard
3. ⏳ Update Google OAuth redirect URIs
4. ⏳ Redeploy to Vercel
5. ⏳ Test the deployment
6. (Optional) Set up MongoDB for full functionality

---

**Need Help?** Check the console logs in Vercel dashboard under **Deployments** → **Functions** tab.
