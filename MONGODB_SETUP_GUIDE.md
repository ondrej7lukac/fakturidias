# 🍃 MongoDB Setup Guide for Invoice Maker

## Step 1: Create a Free MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with Google or create an account
3. Choose the **FREE** tier (M0 Sandbox)

## Step 2: Create a Cluster

1. After login, click **"Build a Database"** or **"Create"**
2. Choose **M0 FREE** tier
3. Choose a cloud provider and region:
   - Provider: **AWS** (recommended)
   - Region: Choose one close to you (e.g., Frankfurt for EU)
4. Cluster Name: `InvoiceMaker` (or leave default)
5. Click **"Create Cluster"** (takes 1-3 minutes)

## Step 3: Create Database User

1. A popup will appear asking "How would you like to authenticate your connection?"
2. Choose **Username and Password**
3. Create credentials:
   - Username: `invoicemaker` (or your choice)
   - Password: Click **"Autogenerate Secure Password"** and **SAVE IT**
   - Or create your own strong password
4. Click **"Create User"**

## Step 4: Set Up Network Access

1. Scroll down to "Where would you like to connect from?"
2. Choose **"My Local Environment"**
3. Click **"Add My Current IP Address"**
4. **IMPORTANT for Vercel:** Also add `0.0.0.0/0` to allow access from anywhere
   - Click **"Add IP Address"**
   - IP Address: `0.0.0.0/0`
   - Description: `Vercel and everywhere`
   - Click **"Add Entry"**
5. Click **"Finish and Close"**

## Step 5: Get Your Connection String

1. Click **"Database"** in the left sidebar
2. Click **"Connect"** button on your cluster
3. Choose **"Drivers"**
4. Driver: **Node.js**
5. Copy the connection string (looks like):
   ```
   mongodb+srv://invoicemaker:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. **Replace `<password>` with your actual password** from Step 3
7. Save this connection string - you'll need it!

## Step 6: Add Connection String to Vercel

1. Go to https://vercel.com/dashboard
2. Select your project: **fakturidias**
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add:
   - Name: `MONGODB_URI`
   - Value: `mongodb+srv://invoicemaker:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/invoicemaker?retryWrites=true&w=majority`
   - **Note:** Add `/invoicemaker` before the `?` to specify the database name
   - Environments: ✅ Production ✅ Preview ✅ Development
6. Click **"Save"**

## Step 7: Add to Local .env File

1. Open your `.env` file (or create it with `create-env.bat`)
2. Add the MongoDB connection string:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   MONGODB_URI=mongodb+srv://invoicemaker:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/invoicemaker?retryWrites=true&w=majority
   ```
3. Save the file

## Step 8: Test Locally (Optional)

1. Make sure you have the connection string in `.env`
2. Restart your server:
   ```bash
   node server.js
   ```
3. Test invoice saving - it should now persist to MongoDB!

## Step 9: Redeploy on Vercel

After adding `MONGODB_URI` to Vercel:

1. Go to **Deployments** tab
2. Click latest deployment → **Redeploy**
3. Wait for deployment to complete

## ✅ Verification Checklist

- [ ] MongoDB Atlas account created
- [ ] Free M0 cluster created
- [ ] Database user created (username + password saved)
- [ ] Network access configured (0.0.0.0/0 added)
- [ ] Connection string obtained and password replaced
- [ ] `MONGODB_URI` added to Vercel environment variables
- [ ] `MONGODB_URI` added to local `.env` file
- [ ] Vercel redeployed

## 📝 Your Connection String Template

```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.xxxxx.mongodb.net/invoicemaker?retryWrites=true&w=majority
```

**Replace:**
- `USERNAME` - Your MongoDB username
- `PASSWORD` - Your MongoDB password (URL-encoded if it has special characters)
- `CLUSTER` - Your cluster name (e.g., cluster0.ab1cd)

## 🎯 What Will Work After MongoDB Setup

Once MongoDB is configured:
- ✅ Persistent OAuth tokens
- ✅ Server-side invoice storage
- ✅ Email sending (with OAuth tokens)
- ✅ Items database
- ✅ Multi-user support (each Google account gets their own data)

## 🐛 Troubleshooting

### "Authentication failed" error
- Check that you replaced `<password>` with your actual password
- Make sure password doesn't have special characters that need URL encoding

### "Connection timed out"
- Make sure you added `0.0.0.0/0` to IP Access List
- Check that your connection string is correct

### "Database not found"
- Make sure you added `/invoicemaker` before the `?` in the connection string

---

**Ready?** Follow the steps above and let me know when you have your MongoDB connection string!
