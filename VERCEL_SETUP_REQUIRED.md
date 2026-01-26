# Vercel Configuration Guide

Your application works on Vercel, but it is missing the **Environment Variables** needed to connect to the database and Google Login. For security reasons, these secrets are not uploaded to GitHub.

## ⚠️ Action Required: Add Environment Variables in Vercel

1. Go to your **Vercel Dashboard**.
2. Select your project (**fakturidias** or similar).
3. Click on the **Settings** tab.
4. Click on **Environment Variables** on the left menu.
5. Add the following 3 variables exactly as shown below:

### 1. MongoDB Connection
This allows the app to store data so it persists.
- **Key**: `MONGODB_URI`
- **Value**: `mongodb+srv://ondrej_7:YmyYXrGup6H3m494@cluster0.hstox8b.mongodb.net/invoicemaker?retryWrites=true&w=majority&appName=Cluster0`

### 2. Google Client ID
This identifies your app to Google.
- **Key**: `GOOGLE_CLIENT_ID`
- **Value**: `1028031822016-8tmthisgtu441grprobpvuanprc19ej9.apps.googleusercontent.com`

### 3. Google Client Secret
This authenticates your app with Google.
- **Key**: `GOOGLE_CLIENT_SECRET`
- **Value**: `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`

---

## 🔄 After Adding Variables
1. Go to the **Deployments** tab in Vercel.
2. Click the **three dots** on the latest deployment and select **Redeploy**.
3. Once finished, open your app and try logging in again.
