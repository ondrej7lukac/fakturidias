# 🔐 SECURITY FIX: Google OAuth2 Credentials

## 🚨 URGENT: What happened?

GitGuardian detected that your Google OAuth2 credentials were exposed in your GitHub repository. This is a **critical security vulnerability**.

## ✅ What has been fixed:

1. ✅ Removed hardcoded credentials from `server.js`
2. ✅ Removed hardcoded credentials from `invoice-react/api/index.js`
3. ✅ Created `.gitignore` to prevent future leaks
4. ✅ Created `.env.example` template
5. ✅ Installed `dotenv` package for environment variable management

## 🔴 CRITICAL STEPS YOU MUST DO NOW:

### Step 1: Revoke the Exposed Credentials

The exposed credentials are:
- Client ID: `1028031822016-6jqktqscqmksr0qjnp65ctcehq6etjrr.apps.googleusercontent.com`
- Client Secret: `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`

You **MUST** revoke these immediately:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find the OAuth 2.0 Client ID `1028031822016-6jqktqscqmksr0qjnp65ctcehq6etjrr`
5. **DELETE** this credential

### Step 2: Create New Credentials

1. In Google Cloud Console → **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Invoice Maker - Secure`
5. **Authorized redirect URIs**: Add these:
   - `http://localhost:5500/auth/google/callback` (for local development)
   - `http://localhost:5173/auth/google/callback` (for Vite dev server)
   - Your Vercel URL (if deploying): `https://your-app.vercel.app/auth/google/callback`
6. Click **CREATE**
7. **Copy the Client ID and Client Secret** (you'll need these for the next step)

### Step 3: Create Your `.env` File

1. In your project root, create a file called `.env` (NOT `.env.example`)
2. Add your **NEW** credentials:

```env
GOOGLE_CLIENT_ID=your-new-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-new-client-secret-here
```

**IMPORTANT**: 
- Never commit `.env` to Git (it's already in `.gitignore`)
- The `.env` file stays on your local machine only

### Step 4: Configure Vercel (if using)

If you're deploying to Vercel:

1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add:
   - `GOOGLE_CLIENT_ID` = your new client ID
   - `GOOGLE_CLIENT_SECRET` = your new client secret
   - `MONGODB_URI` = your MongoDB connection string (if using)
4. Redeploy your application

### Step 5: Clean Up Git History

The old credentials are still in your Git history. To completely remove them:

```bash
# WARNING: This rewrites history and will affect collaborators
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch server.js invoice-react/api/index.js" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

**Simpler alternative** (if you don't have important history):
1. Create a new repository
2. Copy all files (except `.git` folder)
3. Push to the new repository
4. Delete the old repository

### Step 6: Verify Everything Works

1. Make sure `.env` file exists with your new credentials
2. Restart your server: `node server.js`
3. Test the Google OAuth connection in Settings

## 📚 Additional Security Best Practices

1. **Never** commit sensitive data to Git
2. **Always** use environment variables for secrets
3. **Regularly** rotate your credentials
4. **Enable** 2FA on your Google Cloud account
5. **Monitor** your Google Cloud audit logs

## 🔍 How to check if you're secure now:

```bash
# These commands should NOT show any credentials:
git grep "GOCSPX"
git grep "1028031822016"
```

If they still show results, you need to clean your Git history (see Step 5).

---

**Questions?** The code is now secured with environment variables. Once you create the `.env` file with new credentials, everything should work again!
