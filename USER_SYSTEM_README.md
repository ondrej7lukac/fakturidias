# 👥 User-Based Invoice System

## Overview
Your invoice application now features a **server-based user system** where each user's invoices are stored securely on the server, associated with their Google account.

## How It Works

### 🔐 **Authentication**
- Users authenticate via **Google OAuth2**
- Each user is identified by their Google email address
- No manual login/password required!

### 💾 **Data Storage**

#### **Server-Side (New!)**
- **Invoices**: Stored on server in `data/{user-email}/invoices.json`
- Each user has their own isolated storage
- Invoices are automatically synced across devices

#### **Client-Side (Settings only)**
- **Language preference**: Stored locally
- **Default supplier details**: Stored locally
- **Categories**: Stored locally
- **Invoice counter**: Stored locally

### 📡 **API Endpoints**

#### `GET /api/invoices`
- Fetch all invoices for the authenticated user
- Returns: `{ invoices: [...] }`
- Requires authentication

#### `POST /api/invoices`
- Create or update an invoice
- Body: `{ invoice: {...} }`
- Returns: `{ success: true, invoice: {...} }`
- Requires authentication

#### `DELETE /api/invoices/:id`
- Delete a specific invoice by ID
- Returns: `{ success: true }`
- Requires authentication

### 🔄 **Data Flow**

```
User Action (Frontend)
    ↓
API Call to Server
    ↓
Server checks Google authentication
    ↓
If authenticated:
    ├─ Read/Write from data/{email}/invoices.json
    └─ Return result to frontend
If not authenticated:
    └─ Return 401 error
```

### 🚀 **Benefits**

1. ✅ **Multi-device sync**: Access invoices from any device
2. ✅ **Automatic backup**: Invoices stored on server
3. ✅ **User isolation**: Each user sees only their own data
4. ✅ **No manual backups**: Everything saved automatically
5. ✅ **Secure**: Google OAuth2 authentication

### 📁 **File Structure**

```
project/
├── data/
│   ├── user1@gmail.com/
│   │   └── invoices.json
│   ├── user2@gmail.com/
│   │   └── invoices.json
│   └── ...
├── google_tokens.json (current session)
└── server.js
```

### ⚠️ **Important Notes**

1. **First-time use**: Connect your Google account in Settings before creating invoices
2. **Email sending**: Requires Google connection (no SMTP fallback)
3. **Local settings**: Language, supplier details, and categories remain in browser localStorage
4. **Data migration**: Old localStorage invoices won't automatically migrate - they stay local

### 🔧 **For Developers**

**Frontend Functions (utils/storage.js)**:
- `loadData()` - Fetch invoices from server
- `saveInvoice(invoice)` - Save/update invoice
- `deleteInvoice(id)` - Delete invoice

**Backend Functions (server.js)**:
- `getUserInvoices(email)` - Get user's invoices
- `saveUserInvoices(email, invoices)` - Save user's invoices  
- `getCurrentUserEmail()` - Get authenticated user's email

---

**Ready to use!** 🎉 Just restart the server and refresh your browser.
