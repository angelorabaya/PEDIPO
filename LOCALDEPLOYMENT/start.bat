@echo off
title PEDIPO - Product Distribution ^& Purchase Order System
echo ============================================
echo   PEDIPO Local Server
echo ============================================
echo.

cd /d "%~dp0backend"

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    echo This is a one-time setup, please wait...
    echo.
    call npm install
    echo.
    echo Dependencies installed successfully!
    echo.
)

echo Starting server...
echo.

:: Start the server and open the browser after a short delay
start "" http://localhost:4000
node src/server.js

pause
