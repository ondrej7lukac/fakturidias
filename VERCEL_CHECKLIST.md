# ✅ Vercel Deployment Checklist

## 🔐 Step 1: Create New Google OAuth Credentials

- [ ] Go to https://console.cloud.google.com/
- [ ] Navigate to **APIs & Services** → **Credentials**
- [ ] **DELETE** the old exposed credential: `1028031822016-6jqktqscqmksr0qjnp65ctcehq6etjrr`
- [ ] Click **+ CREATE CREDENTIALS** → **OAuth client ID**
- [ ] Application type: **Web application**
- [ ] Name: `Invoice Maker - Production`
- [ ] **Authorized redirect URIs**, add:
  - `http://localhost:5500/auth/google/callback`
  - `http://localhost:5173/auth/google/callback`
  - `https://ondrej7lukac-fakturidias.vercel.app/auth/google/callback`
- [ ] Click **CREATE**
- [ ] **Copy** the Client ID and Client Secret somewhere safe

## ⚙️ Step 2: Configure Vercel Environment Variables

- [ ] Go to https://vercel.com/dashboard
- [ ] Select project: **ondrej7lukac-fakturidias**
- [ ] Go to **Settings** → **Environment Variables**
- [ ] Click **Add New**
- [ ] Add first variable:
  - Name: `GOOGLE_CLIENT_ID`
  - Value: `[paste your new Client ID]`
  - Environments: ✅ Production ✅ Preview ✅ Development
  - Click **Save**
- [ ] Click **Add New** again
- [ ] Add second variable:
  - Name: `GOOGLE_CLIENT_SECRET`
  - Value: `[paste your new Client Secret]`
  - Environments: ✅ Production ✅ Preview ✅ Development
  - Click **Save**

## 🚀 Step 3: Deploy to Vercel

Choose one option:

### Option A: GitHub Auto-Deploy

```bash
git add .
git commit -m "feat: secure Google OAuth with environment variables"
git push origin main
```

### Option B: Manual Redeploy from Vercel Dashboard

- [ ] Go to **Deployments** tab
- [ ] Click on the latest deployment
- [ ] Click **...** (three dots)
- [ ] Click **Redeploy**
- [ ] Wait for deployment to complete

## 🧪 Step 4: Test Your Deployment

- [ ] Visit https://ondrej7lukac-fakturidias.vercel.app
- [ ] Test ARES search (should work)
- [ ] Go to Settings
- [ ] Click **Connect Google Account**
- [ ] Verify OAuth flow starts (you'll see a warning about stateless tokens - this is expected)

## 📝 Step 5: Create Local .env File

For local development:

- [ ] Run `create-env.bat` (Windows)
- [ ] OR manually create `.env` file with:
  ```env
  GOOGLE_CLIENT_ID=your-new-client-id.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=your-new-client-secret
  ```
- [ ] Restart your local server: `node server.js`
- [ ] Test locally at http://localhost:5500

## ⚠️ Important Notes

### What Works on Vercel:
- ✅ ARES company search
- ✅ OAuth flow (temporary, session-based)
- ✅ All frontend features
- ✅ Client-side invoice storage (localStorage)

### What Needs MongoDB/Database:
- ❌ Persistent OAuth tokens
- ❌ Server-side invoice storage
- ❌ Email sending functionality

### To Enable Full Features:
See `VERCEL_DEPLOYMENT_GUIDE.md` for MongoDB setup instructions.

## ✅ Completion Checklist

- [ ] New Google OAuth credentials created
- [ ] Old credentials deleted from Google Cloud Console
- [ ] Environment variables set in Vercel
- [ ] Application redeployed
- [ ] Deployment tested and working
- [ ] Local `.env` file created
- [ ] Local development tested

---

**Status**: Once all checkboxes are ✅, your app is secure and deployed!
