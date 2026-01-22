@echo off
echo.
echo ========================================
echo   Creating .env file for your project
echo ========================================
echo.
echo This file will store your Google OAuth2 credentials securely.
echo.

set /p CLIENT_ID="Enter your GOOGLE_CLIENT_ID: "
set /p CLIENT_SECRET="Enter your GOOGLE_CLIENT_SECRET: "

echo.
echo Creating .env file...
echo.

(
echo # Google OAuth2 Configuration
echo GOOGLE_CLIENT_ID=%CLIENT_ID%
echo GOOGLE_CLIENT_SECRET=%CLIENT_SECRET%
echo.
echo # MongoDB (optional - for Vercel deployment^)
echo # MONGODB_URI=your-mongodb-connection-string-here
) > .env

echo.
echo ✅ .env file created successfully!
echo.
echo IMPORTANT REMINDERS:
echo 1. NEVER commit .env to Git (it's in .gitignore^)
echo 2. Keep your credentials secure
echo 3. Restart your server after creating this file
echo.
echo Press any key to exit...
pause >nul
