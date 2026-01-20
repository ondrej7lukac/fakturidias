# Git Workflow Guide for Invoice App

## 🎯 What Git Does
Git is like a "save point" system for your code. Think of it like this:
- Your **data** (invoices, tokens) = Your game save files (PROTECTED, never in Git)
- Your **code** = The game itself (IN Git, can be versioned)

## 🛡️ What's Protected (Never Goes to Git)
Your `.gitignore` file protects:
- `data/` folder - Your invoices and items database
- `google_tokens.json` - Your Google OAuth tokens
- `node_modules/` - Can be reinstalled with `npm install`
- `dist/` - Can be rebuilt with `npm run build`

## 📝 Basic Git Commands You'll Use

### 1. **Check Status** - See what changed
```bash
git status
```
Shows you which files changed since last commit.

### 2. **Add Files** - Stage changes for commit
```bash
# Add all changed files
git add .

# Or add specific file
git add server.js
```

### 3. **Commit** - Save a checkpoint
```bash
git commit -m "Brief description of what you changed"
```
Example: `git commit -m "Added per-item tax rates"`

### 4. **View History** - See all your checkpoints
```bash
git log --oneline
```

### 5. **Push to GitHub** - Backup to cloud (we'll set this up)
```bash
git push origin main
```

## 🔄 Daily Workflow

### When You Make Changes:
1. **Check what changed**: `git status`
2. **Review changes**: `git diff` (see exact changes)
3. **Add changes**: `git add .`
4. **Commit**: `git commit -m "What you did"`
5. **Push to GitHub**: `git push` (if you want cloud backup)

### Example Session:
```bash
# You just added a new feature
git status                              # See what files changed
git add .                               # Stage all changes
git commit -m "Added discount field"    # Save checkpoint
git push                                # Backup to GitHub (optional)
```

## 🚨 How to NOT Lose Data

### Your Data is Safe Because:
1. **`.gitignore` protects data/** - Your invoices never go to Git
2. **`data/` stays on your computer** - Even if you delete code, data remains
3. **Separate concerns**:
   - Code = in Git (replaceable)
   - Data = on your disk (precious)

### Best Practices:
```bash
# ✅ SAFE - Only commits code
git add .
git commit -m "Updated UI"

# ⚠️ CHECK FIRST - Make sure data/ is not listed
git status

# ✅ BACKUP YOUR DATA SEPARATELY
# Copy the entire data/ folder to another location manually
# Or use OneDrive/Google Drive for data/ folder backup
```

## 🌐 Setting Up GitHub (Cloud Backup)

### Step 1: Create Repository on GitHub
1. Go to https://github.com
2. Click "+" → "New repository"
3. Name it "invoice-app" (or whatever you like)
4. Don't initialize with README (we already have code)
5. Click "Create repository"

### Step 2: Connect Your Local Repo to GitHub
```bash
# Add GitHub as remote
git remote add origin https://github.com/YOUR-USERNAME/invoice-app.git

# Push your code
git branch -M main
git push -u origin main
```

## 🔧 Common Scenarios

### Scenario 1: "I want to try something risky"
```bash
# Create a branch to experiment
git branch experiment
git checkout experiment
# Make changes...
# If it works:
git checkout main
git merge experiment
# If it doesn't work:
git checkout main
git branch -D experiment  # Delete failed experiment
```

### Scenario 2: "I messed up, want to go back"
```bash
# See history
git log --oneline
# Go back to specific commit
git checkout abc1234  # Use commit hash from log
# Or undo last commit but keep changes
git reset --soft HEAD~1
```

### Scenario 3: "Update code on another computer"
```bash
# First time on new computer
git clone https://github.com/YOUR-USERNAME/invoice-app.git
cd invoice-app
npm install                    # Install dependencies
cd invoice-react && npm install

# Later updates
git pull                       # Get latest code
npm install                    # Update dependencies if needed
```

## 📦 Complete Setup Commands

```bash
# Initial setup (already done)
git init
git add .
git commit -m "Initial commit"

# When you make changes
git add .
git commit -m "Describe your changes"

# Push to GitHub (after connecting)
git push
```

## ⚠️ Important Reminders

1. **Never commit sensitive data**
   - The `.gitignore` protects you
   - But always check `git status` before committing

2. **Commit often**
   - Small, frequent commits are better
   - Each commit should do ONE thing

3. **Write clear commit messages**
   - ❌ Bad: "Fixed stuff"
   - ✅ Good: "Fixed IBAN calculation bug when pasting Czech format"

4. **Your data is separate**
   - Git = code versioning
   - Data folder = manually backup separately

## 🎓 Summary

**Git tracks CODE changes, not data.**
Your invoices in `data/` are safe and never touched by Git!

Use Git to:
- ✅ Save code checkpoints
- ✅ Try new features safely
- ✅ Collaborate with others
- ✅ Restore old versions

Don't worry about:
- ❌ Losing invoice data (it's protected)
- ❌ Losing Google tokens (it's protected)
- ❌ Breaking production (you can always go back)
