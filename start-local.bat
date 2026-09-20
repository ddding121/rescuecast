@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\wrangler\bin\wrangler.js" goto run_setup
goto check_build

:run_setup
echo Dependencies are missing. Starting setup now...
call setup-local.bat
if errorlevel 1 exit /b 1
if not exist "node_modules\wrangler\bin\wrangler.js" goto failed

:check_build
if exist "dist\server\index.js" goto start_server
echo Build output is missing. Building now...
call npx --yes pnpm@11.25.0 build
if errorlevel 1 goto failed

:start_server
echo ========================================
echo RescueCast is starting.
echo URL: http://127.0.0.1:3000
echo To stop: press Ctrl+C in this window.
echo ========================================
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://127.0.0.1:3000"
call npx --yes pnpm@11.25.0 start --port 3000
pause
exit /b 0

:failed
echo.
echo START FAILED. Run setup-local.bat again and send a screenshot if it fails.
pause
exit /b 1
