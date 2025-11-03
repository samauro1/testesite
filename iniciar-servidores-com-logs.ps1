# Script para iniciar Backend e Frontend com logs visíveis
# Uso: .\iniciar-servidores-com-logs.ps1

Write-Host "🔄 Reiniciando todos os servidores com logs visíveis..." -ForegroundColor Cyan
Write-Host "🛑 Parando processos Node.js existentes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "✅ Processos encerrados" -ForegroundColor Green

Write-Host "`n🚀 Iniciando Backend e Frontend..." -ForegroundColor Cyan

# Criar diretório de logs
$logsDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
    Write-Host "📁 Diretório de logs criado: $logsDir" -ForegroundColor Gray
}

# Backend
Write-Host "  → Backend (porta 3001)..." -ForegroundColor White
$backendLog = Join-Path $logsDir "backend-$(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss').log"
cd E:\sistema\codigo
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\sistema\codigo; Write-Host '🚀 Backend iniciando na porta 3001...' -ForegroundColor Green; Write-Host '📋 Logs serão exibidos nesta janela' -ForegroundColor Yellow; npm start 2>&1 | Tee-Object -FilePath '$backendLog'"

Start-Sleep -Seconds 3

# Frontend
Write-Host "  → Frontend (porta 3000)..." -ForegroundColor White
$frontendLog = Join-Path $logsDir "frontend-$(Get-Date -Format 'yyyy-MM-dd-HH-mm-ss').log"
cd E:\sistema\frontend\frontend-nextjs
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Write-Host "    ✓ Cache do Next.js limpo" -ForegroundColor Gray
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\sistema\frontend\frontend-nextjs; Write-Host '🚀 Frontend iniciando na porta 3000...' -ForegroundColor Green; Write-Host '📋 Logs serão exibidos nesta janela' -ForegroundColor Yellow; npm run dev 2>&1 | Tee-Object -FilePath '$frontendLog'"

Start-Sleep -Seconds 3

Write-Host "`n✅ Ambos os servidores iniciados!" -ForegroundColor Green
Write-Host "📋 URLs:" -ForegroundColor Cyan
Write-Host "  • Backend: http://localhost:3001" -ForegroundColor White
Write-Host "  • Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "`n⏳ Aguarde 10-15 segundos para inicialização completa" -ForegroundColor Yellow
Write-Host "💡 Verifique as 2 janelas do PowerShell que abriram:" -ForegroundColor White
Write-Host "   1. Backend - deve mostrar 'Servidor rodando na porta 3001'" -ForegroundColor Gray
Write-Host "   2. Frontend - deve mostrar 'Ready' e URL local" -ForegroundColor Gray
Write-Host "`n📁 Logs também estão sendo salvos em: $logsDir" -ForegroundColor Cyan

# Abrir diretório de logs no Explorer
Start-Sleep -Seconds 2
Write-Host "`n🔍 Abrindo diretório de logs..." -ForegroundColor Yellow
Start-Process explorer.exe -ArgumentList $logsDir

