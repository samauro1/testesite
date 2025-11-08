# Script para reiniciar o servidor do modulo de testes
# Uso: .\reiniciar-servidor.ps1

Write-Host "Reiniciando servidor do modulo de testes..." -ForegroundColor Cyan

# Fechar processos Node.js na porta 3002
Write-Host "Parando processos Node.js na porta 3002..." -ForegroundColor Yellow
try {
    $processes = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($processes) {
        foreach ($procId in $processes) {
            try {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Host "  Processo $procId encerrado" -ForegroundColor Gray
            } catch {
                Write-Host "  Nao foi possivel encerrar processo $procId" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  Nenhum processo encontrado na porta 3002" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Erro ao verificar processos: $_" -ForegroundColor Yellow
}

Start-Sleep -Seconds 2
Write-Host "Processos encerrados" -ForegroundColor Green

Write-Host ""
Write-Host "Iniciando servidor na porta 3002..." -ForegroundColor Cyan

# Navegar para o diretorio do backend
Set-Location E:\sistemas\desenvolvimento-modulo-testes\backend

# Iniciar servidor
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\sistemas\desenvolvimento-modulo-testes\backend; Write-Host 'Servidor do modulo de testes iniciando na porta 3002...' -ForegroundColor Green; npm start" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Servidor iniciado!" -ForegroundColor Green
Write-Host "URL: http://localhost:3002" -ForegroundColor Cyan
Write-Host ""
Write-Host "Aguarde 5-10 segundos para inicializacao completa" -ForegroundColor Yellow
Write-Host "Verifique a janela do PowerShell que abriu" -ForegroundColor White
