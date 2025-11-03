# Script para reiniciar os servidores
# Fecha TODOS os processos Node.js e janelas PowerShell antes de reiniciar

Write-Host "🔄 Reiniciando todos os servidores..." -ForegroundColor Cyan

# Fechar todos os processos Node.js
Write-Host "🛑 Parando processos Node.js existentes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Fechar janelas PowerShell que podem estar rodando os servidores
Write-Host "🛑 Fechando janelas PowerShell de servidores..." -ForegroundColor Yellow
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { 
    $_.MainWindowTitle -like "*Backend*" -or 
    $_.MainWindowTitle -like "*Frontend*" -or
    $_.CommandLine -like "*npm start*" -or
    $_.CommandLine -like "*npm run dev*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "⏳ Aguardando 3 segundos para garantir que tudo foi encerrado..." -ForegroundColor Gray
Start-Sleep -Seconds 3
Write-Host "✅ Todos os processos encerrados" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Iniciando Backend na porta 3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\sistemas\codigo; Write-Host '🚀 Backend iniciando na porta 3001...' -ForegroundColor Green; npm start"

Write-Host "⏳ Aguardando 4 segundos antes de iniciar frontend..." -ForegroundColor Gray
Start-Sleep -Seconds 4

Write-Host "🚀 Iniciando Frontend na porta 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\sistemas\frontend\frontend-nextjs; Write-Host '🚀 Frontend iniciando na porta 3000...' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "✅ Servidores reiniciados com sucesso!" -ForegroundColor Green
Write-Host "📝 Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📝 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ Aguarde 10-15 segundos para inicialização completa" -ForegroundColor Yellow
