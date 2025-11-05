# Script para iniciar o servidor do módulo de testes

Write-Host "🚀 Iniciando servidor do módulo de testes..." -ForegroundColor Cyan
Write-Host "📍 Porta: 3002 (isolado do sistema principal)" -ForegroundColor White
Write-Host ""

$basePath = "E:\sistemas\desenvolvimento-modulo-testes\backend"
Set-Location $basePath

# Verificar se .env existe
if (-not (Test-Path ".env")) {
    Write-Host "⚠️ Arquivo .env não encontrado. Criando..." -ForegroundColor Yellow
    @"
DB_HOST=localhost
DB_PORT=5432
DB_NAME_TESTES=sistema_testes_desenvolvimento
DB_USER=postgres
DB_PASSWORD=password
PORT=3002
JWT_SECRET=dev_secret_key_change_in_production
NODE_ENV=development
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Arquivo .env criado (edite com suas credenciais)" -ForegroundColor Yellow
    Write-Host ""
}

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Iniciar servidor
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
Write-Host ""
node server.js

