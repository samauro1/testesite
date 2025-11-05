# Script para reiniciar TODOS os servidores do sistema
# Inclui: Backend Principal (3001), Frontend (3000) e Modulo de Testes (3002)

Write-Host "Reiniciando TODOS os modulos do sistema..." -ForegroundColor Cyan
Write-Host ""

# Fechar todos os processos Node.js
Write-Host "Parando todos os processos Node.js existentes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Fechar janelas PowerShell que podem estar rodando os servidores
Write-Host "Fechando janelas PowerShell de servidores..." -ForegroundColor Yellow
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { 
    $_.MainWindowTitle -like "*Backend*" -or 
    $_.MainWindowTitle -like "*Frontend*" -or
    $_.MainWindowTitle -like "*Testes*" -or
    $_.CommandLine -like "*npm start*" -or
    $_.CommandLine -like "*npm run dev*" -or
    $_.CommandLine -like "*node server.js*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Aguardando 3 segundos para garantir que tudo foi encerrado..." -ForegroundColor Gray
Start-Sleep -Seconds 3
Write-Host "Todos os processos encerrados" -ForegroundColor Green
Write-Host ""

# 1. BACKEND PRINCIPAL (Porta 3001)
Write-Host "Iniciando Backend Principal (porta 3001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\sistemas\codigo; Write-Host 'Backend Principal iniciando na porta 3001...' -ForegroundColor Green; npm start"

Start-Sleep -Seconds 4

# 2. FRONTEND (Porta 3000)
Write-Host "Iniciando Frontend (porta 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\sistemas\frontend\frontend-nextjs; Write-Host 'Frontend iniciando na porta 3000...' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 4

# 3. MODULO DE TESTES (Porta 3002)
Write-Host "Iniciando Modulo de Testes (porta 3002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\sistemas\desenvolvimento-modulo-testes\backend; Write-Host 'Modulo de Testes iniciando na porta 3002...' -ForegroundColor Green; node server.js"

Write-Host ""
Write-Host "Todos os servidores reiniciados com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "URLs dos modulos:" -ForegroundColor Cyan
Write-Host "  - Backend Principal: http://localhost:3001" -ForegroundColor White
Write-Host "  - Frontend:          http://localhost:3000" -ForegroundColor White
Write-Host "  - Modulo de Testes:   http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "Aguarde 10-15 segundos para inicializacao completa" -ForegroundColor Yellow
Write-Host "Verifique as 3 janelas do PowerShell que abriram" -ForegroundColor White
