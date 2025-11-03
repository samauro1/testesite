# Script para iniciar Backend e Frontend
# Uso: .\iniciar-servidores.ps1
# Sempre reinicia AMBOS os servidores juntos

Write-Host "🔄 Reiniciando todos os servidores..." -ForegroundColor Cyan
Write-Host "🛑 Parando processos Node.js existentes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Write-Host "✅ Processos encerrados" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Iniciando Backend e Frontend..." -ForegroundColor Cyan

# Backend
Write-Host "  → Backend (porta 3001)..." -ForegroundColor White
Set-Location E:\sistemas\codigo
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\sistemas\codigo; Write-Host '🚀 Backend iniciando na porta 3001...' -ForegroundColor Green; npm start"

Start-Sleep -Seconds 3

# Frontend
Write-Host "  → Frontend (porta 3000)..." -ForegroundColor White
Set-Location E:\sistemas\frontend\frontend-nextjs
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Write-Host "    ✓ Cache do Next.js limpo" -ForegroundColor Gray
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\sistemas\frontend\frontend-nextjs; Write-Host '🚀 Frontend iniciando na porta 3000...' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ Ambos os servidores iniciados!" -ForegroundColor Green
Write-Host "📋 URLs:" -ForegroundColor Cyan
Write-Host "  • Backend: http://localhost:3001" -ForegroundColor White
Write-Host "  • Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Aguarde 10-15 segundos para inicialização completa" -ForegroundColor Yellow
Write-Host "💡 Verifique as 2 janelas do PowerShell que abriram:" -ForegroundColor White
Write-Host "   1. Backend - deve mostrar 'Servidor rodando na porta 3001'" -ForegroundColor Gray
Write-Host "   2. Frontend - deve mostrar 'Ready' e URL local" -ForegroundColor Gray
