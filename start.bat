@echo off
REM Rackbase Startup Script for Windows

echo ========================================
echo   Rackbase - Starting Servers
echo ========================================
echo.

REM Load environment variables from .env file
if exist ".env" (
    for /f "tokens=*" %%a in ('type .env ^| findstr /v "^#" ^| findstr /v "^$"') do (
        for /f "tokens=1,* delims==" %%b in ("%%a") do (
            set "%%b=%%c"
        )
    )
)

REM Set defaults
if "%BACKEND_PORT%"=="" set BACKEND_PORT=8088
if "%BACKEND_HOST%"=="" set BACKEND_HOST=0.0.0.0
if "%FRONTEND_PORT%"=="" set FRONTEND_PORT=3036
if "%FRONTEND_HOST%"=="" set FRONTEND_HOST=0.0.0.0

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo Configuration:
echo   Backend:  %BACKEND_HOST%:%BACKEND_PORT%
echo   Frontend: %FRONTEND_HOST%:%FRONTEND_PORT%
echo.

echo Starting Backend Server...
start "Rackbase Backend" cmd /k "uvicorn main:app --reload --port %BACKEND_PORT% --host %BACKEND_HOST%"

echo.
echo Starting Frontend Server...
cd frontend
start "Rackbase Frontend" cmd /k "npm run dev -- --port %FRONTEND_PORT% --hostname %FRONTEND_HOST%"
cd ..

echo.
echo ========================================
echo   Servers Started!
echo ========================================
echo.
echo Backend:  http://localhost:%BACKEND_PORT%
echo Frontend: http://localhost:%FRONTEND_PORT%
echo.
echo Press any key to stop all servers...
pause >nul

echo.
echo Stopping servers...
taskkill /FI "WINDOWTITLE eq Rackbase Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Rackbase Frontend*" /F >nul 2>&1

echo.
echo Servers stopped.
pause
