# Instagram Webhook Setup - Quick Fix
# Install and configure ngrok to expose your localhost to Instagram

Write-Host "🔧 Setting up ngrok for Instagram webhooks..." -ForegroundColor Green

# Check if ngrok is already installed
if (Get-Command ngrok -ErrorAction SilentlyContinue) {
    Write-Host "✅ ngrok is already installed" -ForegroundColor Green
} else {
    Write-Host "📥 Installing ngrok..." -ForegroundColor Yellow
    
    # Create directory for ngrok
    New-Item -ItemType Directory -Force -Path "C:\ngrok" | Out-Null
    
    # Download ngrok
    Write-Host "Downloading ngrok..."
    Invoke-WebRequest -Uri "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" -OutFile "C:\ngrok\ngrok.zip"
    
    # Extract
    Write-Host "Extracting ngrok..."
    Expand-Archive -Path "C:\ngrok\ngrok.zip" -DestinationPath "C:\ngrok\" -Force
    
    # Add to PATH
    $env:PATH += ";C:\ngrok"
    
    Write-Host "✅ ngrok installed successfully" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Sign up for free ngrok account: https://dashboard.ngrok.com/signup" -ForegroundColor White
Write-Host "2. Get your auth token from the dashboard" -ForegroundColor White  
Write-Host "3. Run: ngrok config add-authtoken YOUR_AUTH_TOKEN" -ForegroundColor Yellow
Write-Host "4. Run: ngrok http 3000" -ForegroundColor Yellow
Write-Host "5. Copy the https://xxx.ngrok.io URL" -ForegroundColor White
Write-Host "6. Configure Instagram webhook with that URL" -ForegroundColor White
Write-Host ""
Write-Host "💡 Instagram needs a PUBLIC URL to send webhooks!" -ForegroundColor Magenta
