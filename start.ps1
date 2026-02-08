# Rackbase Startup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Rackbase - Starting Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]*)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Set defaults if not in .env
$backendPort = if ($env:BACKEND_PORT) { $env:BACKEND_PORT } else { "8088" }
$backendHost = if ($env:BACKEND_HOST) { $env:BACKEND_HOST } else { "0.0.0.0" }
$frontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "3036" }
$frontendHost = if ($env:FRONTEND_HOST) { $env:FRONTEND_HOST } else { "0.0.0.0" }

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    exit 1
}
Write-Host "Python: $(python --version 2>&1)" -ForegroundColor Green

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js: $(node --version)" -ForegroundColor Green

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Backend:  $backendHost`:$backendPort" -ForegroundColor Gray
Write-Host "  Frontend: $frontendHost`:$frontendPort" -ForegroundColor Gray
Write-Host ""

# Start backend
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--port", $backendPort, "--host", $backendHost -PassThru -WindowStyle Normal

# Start frontend with correct port
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Push-Location frontend
$frontend = Start-Process -FilePath "npm" -ArgumentList "run", "dev", "--", "--port", $frontendPort, "--hostname", $frontendHost -PassThru -WindowStyle Normal
Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Servers Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost`:$backendPort" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost`:$frontendPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop..." -ForegroundColor Yellow
Write-Host ""

# Wait for user input
try {
    while ($true) {
        if ($backend.HasExited) {
            Write-Host "Backend stopped!" -ForegroundColor Red
            break
        }
        if ($frontend.HasExited) {
            Write-Host "Frontend stopped!" -ForegroundColor Red
            break
        }
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host ""
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    
    if (-not $backend.HasExited) {
        Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    }
    if (-not $frontend.HasExited) {
        Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Servers stopped." -ForegroundColor Green
}
