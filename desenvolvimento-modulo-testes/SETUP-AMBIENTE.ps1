# Script de Setup Automatizado - Módulo de Testes Isolado
# Execute este script para configurar o ambiente de desenvolvimento

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SETUP DO AMBIENTE DE DESENVOLVIMENTO" -ForegroundColor Cyan
Write-Host "  Módulo de Testes - Ambiente Isolado" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$basePath = "E:\sistemas\desenvolvimento-modulo-testes"
Set-Location $basePath

# Verificar se Node.js está instalado
Write-Host "🔍 Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Instale Node.js 18+ primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se npm está instalado
Write-Host "🔍 Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm encontrado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm não encontrado." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Instalando dependências do backend..." -ForegroundColor Yellow
Set-Location "$basePath\backend"

if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependências do backend instaladas!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao instalar dependências do backend" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ node_modules já existe, pulando instalação" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📝 Criando arquivo .env..." -ForegroundColor Yellow

# Criar arquivo .env se não existir
$envFile = "$basePath\backend\.env"
if (-not (Test-Path $envFile)) {
    $envContent = @"
# Configuração do Banco de Dados - AMBIENTE ISOLADO
DB_HOST=localhost
DB_PORT=5432
DB_NAME_TESTES=sistema_testes_desenvolvimento
DB_USER=postgres
DB_PASSWORD=password

# Porta do Servidor (isolado para não conflitar)
PORT=3002

# JWT Secret (desenvolvimento)
JWT_SECRET=dev_secret_key_change_in_production

# Ambiente
NODE_ENV=development
"@
    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "✅ Arquivo .env criado!" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais do PostgreSQL!" -ForegroundColor Yellow
} else {
    Write-Host "✅ Arquivo .env já existe" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure o banco de dados:" -ForegroundColor White
Write-Host "   psql -U postgres" -ForegroundColor Gray
Write-Host "   CREATE DATABASE sistema_testes_desenvolvimento;" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Execute as migracoes:" -ForegroundColor White
Write-Host "   psql -U postgres -d sistema_testes_desenvolvimento -f database\schemas\01-create-tables.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Edite o arquivo .env com suas credenciais:" -ForegroundColor White
Write-Host "   backend\.env" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Inicie o servidor:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Ambiente configurado!" -ForegroundColor Green
Write-Host "📖 Consulte INICIO-RAPIDO.md para mais detalhes" -ForegroundColor Cyan

