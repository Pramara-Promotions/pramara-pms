# Automated Pull & Setup Script
# Usage: .\scripts\pull-and-setup.ps1

Write-Host "🔄 Pulling latest changes..." -ForegroundColor Cyan
git pull origin phase2-execution-control

Write-Host "`n📋 Checking for dependency changes..." -ForegroundColor Cyan
$apiPackageChanged = git diff HEAD@{1} HEAD --name-only | Select-String "api/package.json"
$webPackageChanged = git diff HEAD@{1} HEAD --name-only | Select-String "web/package.json"

if ($apiPackageChanged -or $webPackageChanged) {
    Write-Host "⚠️  Dependencies have changed!" -ForegroundColor Yellow
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    
    if ($apiPackageChanged) {
        Write-Host "`n  → API dependencies..." -ForegroundColor Gray
        Push-Location api
        npm install
        Pop-Location
    }
    
    if ($webPackageChanged) {
        Write-Host "`n  → Frontend dependencies..." -ForegroundColor Gray
        Push-Location web
        npm install
        Pop-Location
    }
    
    Write-Host "`n✅ Dependencies installed!" -ForegroundColor Green
} else {
    Write-Host "✅ No dependency changes detected" -ForegroundColor Green
}

Write-Host "`n🔐 Checking environment configuration..." -ForegroundColor Cyan
if (Test-Path .env.cloud) {
    $envExists = Test-Path .env
    if (-not $envExists) {
        Write-Host "⚠️  .env not found, copying from .env.cloud..." -ForegroundColor Yellow
        Copy-Item -Force .env.cloud .env
        Write-Host "✅ Environment configured!" -ForegroundColor Green
    } else {
        Write-Host "✅ .env already exists" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  .env.cloud not found - you may need to configure manually" -ForegroundColor Yellow
}

Write-Host "`n📄 Reading latest chat context..." -ForegroundColor Cyan
if (Test-Path docs/chat-context/latest.md) {
    Write-Host "✅ Chat context available at docs/chat-context/latest.md" -ForegroundColor Green
} else {
    Write-Host "⚠️  No chat context found" -ForegroundColor Yellow
}

Write-Host "`n📚 Checking dependency sync notes..." -ForegroundColor Cyan
if (Test-Path docs/DEPENDENCY_SYNC.md) {
    Write-Host "✅ Dependency notes available at docs/DEPENDENCY_SYNC.md" -ForegroundColor Green
    Write-Host "`nRecent changes:" -ForegroundColor Gray
    Get-Content docs/DEPENDENCY_SYNC.md | Select-Object -First 20
} else {
    Write-Host "⚠️  No dependency sync notes found" -ForegroundColor Yellow
}

Write-Host "`n✨ Setup complete! Ready to start development." -ForegroundColor Green
Write-Host "Run 'npm run dev' to start the servers`n" -ForegroundColor Cyan
