# Rackbase Setup Script (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Rackbase - Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "Python: $(python --version 2>&1)" -ForegroundColor Green
Write-Host "Node:   $(node --version)" -ForegroundColor Green
Write-Host "npm:    $(npm --version)" -ForegroundColor Green
Write-Host ""

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Yellow
} else {
    Write-Host "Found existing .env" -ForegroundColor Yellow
}

function Get-EnvValue {
    param(
        [string]$Path,
        [string]$Key,
        [string]$Default
    )
    if (-not (Test-Path $Path)) {
        return $Default
    }
    $line = Get-Content $Path | Where-Object { $_ -match "^$Key=" } | Select-Object -Last 1
    if ($line) {
        return ($line -replace "^$Key=", "")
    }
    return $Default
}

function Set-EnvValue {
    param(
        [string]$Path,
        [string]$Key,
        [string]$Value
    )
    if (-not (Test-Path $Path)) {
        return
    }
    $content = Get-Content $Path
    $updated = $false
    $newContent = $content | ForEach-Object {
        if ($_ -match "^$Key=") {
            $updated = $true
            return "$Key=$Value"
        }
        return $_
    }
    if (-not $updated) {
        $newContent += "$Key=$Value"
    }
    Set-Content -Path $Path -Value $newContent
}

$lanChoice = Read-Host "Expose services on LAN? (y/N)"
if ($lanChoice -match "^[Yy]") {
    $backendPort = Get-EnvValue -Path ".env" -Key "BACKEND_PORT" -Default "8088"
    $frontendPort = Get-EnvValue -Path ".env" -Key "FRONTEND_PORT" -Default "3036"

    $lanIp = $null
    try {
        $lanIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254*" } |
            Select-Object -First 1 -ExpandProperty IPAddress
    } catch {
        $lanIp = $null
    }

    if (-not $lanIp) {
        $lanIp = Read-Host "Enter the LAN IP to use (e.g. 192.168.1.50)"
    }

    if (-not $lanIp) {
        Write-Host "ERROR: No LAN IP provided" -ForegroundColor Red
        exit 1
    }

    $corsOrigins = "http://localhost:$frontendPort,http://127.0.0.1:$frontendPort,http://$lanIp`:$frontendPort"

    Set-EnvValue -Path ".env" -Key "BACKEND_HOST" -Value "0.0.0.0"
    Set-EnvValue -Path ".env" -Key "FRONTEND_HOST" -Value "0.0.0.0"
    Set-EnvValue -Path ".env" -Key "NEXT_PUBLIC_API_URL" -Value "http://$lanIp`:$backendPort"
    Set-EnvValue -Path ".env" -Key "CORS_ORIGINS" -Value $corsOrigins

    Write-Host "Configured .env for LAN access using $lanIp" -ForegroundColor Green
}

Write-Host ""
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
python -m pip install -r requirements.txt

Write-Host ""
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location frontend
npm install
Pop-Location

Write-Host ""
Write-Host "Setup complete. You can now start the servers using start.ps1/start.bat/start.sh." -ForegroundColor Green
