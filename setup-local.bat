@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo RescueCast Local Setup
echo ========================================

where node >nul 2>nul
if errorlevel 1 goto no_node

echo [1/3] Installing dependencies...
call npx --yes pnpm@11.25.0 install --frozen-lockfile
if errorlevel 1 goto failed

if not exist "node_modules\wrangler\bin\wrangler.js" goto failed

echo [2/3] Building the website...
call npx --yes pnpm@11.25.0 build
if errorlevel 1 goto failed

echo [3/3] Initializing the local database...
if not exist ".wrangler" mkdir ".wrangler"
call node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file scripts/local-schema.sql
if errorlevel 1 goto failed

echo.
echo SETUP COMPLETE.
echo Double-click start-local.bat to run RescueCast.
pause
exit /b 0

:no_node
echo.
echo ERROR: Node.js was not found.
echo Install Node.js 22.13 or newer, then run this file again.
pause
exit /b 1

:failed
echo.
echo SETUP FAILED. Keep this window open and send a screenshot.
pause
exit /b 1
