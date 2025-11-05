# Script de Setup Completo - Módulo de Testes
# Este script configura tudo necessário para começar a trabalhar

param(
    [string]$DbUser = "postgres",
    [string]$DbPassword = "",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETO - MÓDULO DE TESTES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$basePath = "E:\sistemas\desenvolvimento-modulo-testes"
Set-Location $basePath

# Verificar PostgreSQL
Write-Host "🔍 Verificando PostgreSQL..." -ForegroundColor Yellow
try {
    $psqlVersion = & psql --version 2>&1
    Write-Host "✅ PostgreSQL encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL não encontrado. Instale o PostgreSQL primeiro." -ForegroundColor Red
    exit 1
}

# Criar banco de dados
Write-Host ""
Write-Host "📦 Criando banco de dados..." -ForegroundColor Yellow
$dbName = "sistema_testes_desenvolvimento"

$env:PGPASSWORD = $DbPassword
$createDbCmd = "psql -U $DbUser -h $DbHost -p $DbPort -c `"SELECT 1 FROM pg_database WHERE datname='$dbName'`" -t"
$dbExists = & cmd /c $createDbCmd 2>&1

if ($dbExists -match "1") {
    Write-Host "✅ Banco de dados já existe" -ForegroundColor Green
} else {
    Write-Host "📝 Criando banco de dados '$dbName'..." -ForegroundColor Yellow
    $createDb = "psql -U $DbUser -h $DbHost -p $DbPort -c `"CREATE DATABASE $dbName`""
    & cmd /c $createDb 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Banco de dados criado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao criar banco de dados. Verifique as credenciais." -ForegroundColor Red
        exit 1
    }
}

# Executar migrações
Write-Host ""
Write-Host "📊 Executando migrações..." -ForegroundColor Yellow
$schemaFile = "$basePath\database\schemas\01-create-tables.sql"
if (Test-Path $schemaFile) {
    $env:PGPASSWORD = $DbPassword
    $migrateCmd = "psql -U $DbUser -h $DbHost -p $DbPort -d $dbName -f `"$schemaFile`""
    & cmd /c $migrateCmd 2>&1 | ForEach-Object {
        if ($_ -match "ERROR") {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_ -ForegroundColor Gray
        }
    }
    Write-Host "✅ Migrações executadas!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Arquivo de migração não encontrado: $schemaFile" -ForegroundColor Yellow
}

# Popular dados iniciais
Write-Host ""
Write-Host "📝 Populando dados iniciais..." -ForegroundColor Yellow
$populateFile = "$basePath\database\scripts\02-popular-tipos-testes.sql"
if (Test-Path $populateFile) {
    $env:PGPASSWORD = $DbPassword
    $populateCmd = "psql -U $DbUser -h $DbHost -p $DbPort -d $dbName -f `"$populateFile`""
    & cmd /c $populateCmd 2>&1 | ForEach-Object {
        if ($_ -match "ERROR") {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_ -ForegroundColor Gray
        }
    }
    Write-Host "✅ Dados iniciais populados!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Arquivo de população não encontrado: $populateFile" -ForegroundColor Yellow
}

# Verificar configuração do .env
Write-Host ""
Write-Host "⚙️ Verificando configuração..." -ForegroundColor Yellow
$envFile = "$basePath\backend\.env"
if (Test-Path $envFile) {
    Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green
} else {
    Write-Host "📝 Criando arquivo .env..." -ForegroundColor Yellow
    $envContent = @"
DB_HOST=$DbHost
DB_PORT=$DbPort
DB_NAME_TESTES=$dbName
DB_USER=$DbUser
DB_PASSWORD=$DbPassword
PORT=3002
JWT_SECRET=dev_secret_key_change_in_production
NODE_ENV=development
"@
    $envContent | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "✅ Arquivo .env criado!" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ✅ SETUP COMPLETO!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor White
Write-Host "1. Inicie o servidor: cd backend && npm start" -ForegroundColor Gray
Write-Host "2. Teste a API: curl http://localhost:3002/api/testes" -ForegroundColor Gray
Write-Host "3. Comece a desenvolver!" -ForegroundColor Gray
Write-Host ""

