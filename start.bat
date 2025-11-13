@echo off
echo ========================================
echo   Lunar Day Portal - Local Server
echo ========================================
echo.
echo Starting local web server...
echo Open your browser at: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Try Python first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using Python HTTP server...
    python -m http.server 8000
    goto :end
)

REM Try Node.js serve
where npx >nul 2>&1
if %errorlevel% == 0 (
    echo Using Node.js serve...
    npx serve -p 8000
    goto :end
)

REM Try PHP
php --version >nul 2>&1
if %errorlevel% == 0 (
    echo Using PHP server...
    php -S localhost:8000
    goto :end
)

echo ERROR: No web server found!
echo.
echo Please install one of the following:
echo   1. Python (https://www.python.org/downloads/)
echo   2. Node.js (https://nodejs.org/)
echo   3. PHP (https://www.php.net/downloads.php)
echo.
echo Or simply open index.html directly in your browser
echo (some features may not work without a server)
pause

:end

