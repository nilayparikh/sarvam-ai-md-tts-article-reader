<#
.SYNOPSIS
    Setup and run the Sarvam TTS application.
.DESCRIPTION
    This script sets up the Python backend with UV and the React frontend,
    then runs both in development mode.
.PARAMETER Setup
    Run setup only (install dependencies)
.PARAMETER Backend
    Run backend only
.PARAMETER Frontend
    Run frontend only
.PARAMETER All
    Run both backend and frontend (default)
#>

param(
    [switch]$Setup,
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$All
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sarvam TTS Application Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Install-Backend {
    Write-Host "[Backend] Setting up Python environment with UV..." -ForegroundColor Yellow
    
    $backendPath = Join-Path $ProjectRoot "src\backend"
    Push-Location $backendPath
    
    try {
        # Check if UV is installed
        if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
            Write-Host "[Backend] Installing UV..." -ForegroundColor Yellow
            Invoke-RestMethod https://astral.sh/uv/install.ps1 | Invoke-Expression
        }
        
        # Create virtual environment
        if (-not (Test-Path ".venv")) {
            Write-Host "[Backend] Creating virtual environment..." -ForegroundColor Yellow
            uv venv
        }
        
        # Install dependencies
        Write-Host "[Backend] Installing dependencies..." -ForegroundColor Yellow
        uv pip install -e .
        
        # Check for .env file
        if (-not (Test-Path ".env")) {
            if (Test-Path ".env.example") {
                Copy-Item ".env.example" ".env"
                Write-Host "[Backend] Created .env from .env.example" -ForegroundColor Yellow
                Write-Host "[Backend] Please edit .env and add your SARVAM_API_KEY" -ForegroundColor Red
            }
        }
        
        Write-Host "[Backend] Setup complete!" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

function Install-Frontend {
    Write-Host "[Frontend] Setting up React application..." -ForegroundColor Yellow
    
    $frontendPath = Join-Path $ProjectRoot "src\frontend"
    Push-Location $frontendPath
    
    try {
        # Check if Node.js is installed
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
            Write-Host "[Frontend] Node.js is not installed. Please install Node.js 18+." -ForegroundColor Red
            exit 1
        }
        
        # Install dependencies
        Write-Host "[Frontend] Installing dependencies..." -ForegroundColor Yellow
        npm install
        
        Write-Host "[Frontend] Setup complete!" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

function Start-Backend {
    Write-Host "[Backend] Starting FastAPI server..." -ForegroundColor Yellow
    
    $backendPath = Join-Path $ProjectRoot "src\backend"
    Push-Location $backendPath
    
    try {
        # Activate venv and run
        $activateScript = Join-Path $backendPath ".venv\Scripts\Activate.ps1"
        if (Test-Path $activateScript) {
            & $activateScript
        }
        
        uvicorn main:app --reload --port 8000
    }
    finally {
        Pop-Location
    }
}

function Start-Frontend {
    Write-Host "[Frontend] Starting Vite dev server..." -ForegroundColor Yellow
    
    $frontendPath = Join-Path $ProjectRoot "src\frontend"
    Push-Location $frontendPath
    
    try {
        npm run dev
    }
    finally {
        Pop-Location
    }
}

# Ensure speech output directory exists
$speechDir = Join-Path $ProjectRoot "pipeline\speech"
if (-not (Test-Path $speechDir)) {
    New-Item -ItemType Directory -Path $speechDir -Force | Out-Null
    Write-Host "Created speech output directory: $speechDir" -ForegroundColor Yellow
}

# Execute based on parameters
if ($Setup -or (-not $Backend -and -not $Frontend)) {
    Install-Backend
    Install-Frontend
}

if ($All -or (-not $Setup -and -not $Backend -and -not $Frontend)) {
    Write-Host ""
    Write-Host "Starting application in development mode..." -ForegroundColor Cyan
    Write-Host "Backend: http://localhost:8000" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
    Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Green
    Write-Host ""
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    # Start backend in background
    $backendJob = Start-Job -ScriptBlock {
        param($backendPath)
        Set-Location $backendPath
        & ".\.venv\Scripts\python.exe" -m uvicorn main:app --reload --port 8000
    } -ArgumentList (Join-Path $ProjectRoot "src\backend")
    
    # Start frontend in foreground
    Start-Frontend
    
    # Cleanup
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
}
elseif ($Backend) {
    Start-Backend
}
elseif ($Frontend) {
    Start-Frontend
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
