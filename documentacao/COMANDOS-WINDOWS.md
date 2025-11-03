# 🪟 Comandos para Windows - Sistema de Avaliação Psicológica

## 📍 Estrutura de Diretórios

```
D:\zite\palografico\          ← RAIZ DO PROJETO (aqui ficam os scripts do backend)
├── package.json              ← Scripts do backend (db:create, migrate, etc.)
├── server.js
├── scripts/
└── frontend\                 ← Frontend React
    ├── package.json          ← Scripts do frontend (start, build, etc.)
    └── src/
```

## 🚀 Comandos Corretos

### ⚠️ IMPORTANTE: Sempre execute os comandos no diretório correto!

#### 1. Configuração do Banco (RAIZ DO PROJETO)
```powershell
# Navegar para a raiz do projeto
cd D:\zite\palografico

# Verificar se está no lugar certo (deve mostrar package.json com scripts do backend)
dir package.json

# Criar banco de dados
npm run db:create

# Executar migrações
npm run migrate

# Popular dados iniciais
npm run seed

# OU fazer tudo de uma vez:
npm run setup
```

#### 2. Iniciar Sistema

**Opção 1: Início Completo (RAIZ DO PROJETO)**
```powershell
cd D:\zite\palografico
npm run dev:full
```

**Opção 2: Início Separado**
```powershell
# Terminal 1 - Backend (RAIZ DO PROJETO)
cd D:\zite\palografico
npm run dev

# Terminal 2 - Frontend (DIRETÓRIO FRONTEND)
cd D:\zite\palografico\frontend
npm start
```

## 🔧 Solução do Seu Problema

Você estava em:
```
PS D:\zite\palografico\frontend> npm run db:create  ❌ ERRADO
```

Deveria estar em:
```
PS D:\zite\palografico> npm run db:create  ✅ CORRETO
```

### Passos para Corrigir:

1. **Voltar para a raiz**:
```powershell
cd D:\zite\palografico
```

2. **Verificar se está no lugar certo**:
```powershell
# Deve mostrar o package.json com os scripts do backend
type package.json | findstr "db:create"
```

3. **Executar o comando**:
```powershell
npm run db:create
```

## 📋 Scripts Disponíveis

### No Backend (RAIZ: D:\zite\palografico\)
```powershell
npm run db:create    # Criar banco de dados
npm run migrate      # Executar migrações
npm run seed         # Popular dados iniciais
npm run setup        # Tudo de uma vez
npm run dev          # Iniciar apenas backend
npm run dev:full     # Iniciar backend + frontend
npm start            # Iniciar em produção
```

### No Frontend (DIRETÓRIO: D:\zite\palografico\frontend\)
```powershell
npm start            # Iniciar frontend em desenvolvimento
npm run build        # Build para produção
npm test             # Executar testes
```

## 🎯 Sequência Completa de Instalação

```powershell
# 1. Ir para a raiz do projeto
cd D:\zite\palografico

# 2. Instalar dependências do backend
npm install

# 3. Instalar dependências do frontend
cd frontend
npm install
cd ..

# 4. Configurar banco de dados
npm run setup

# 5. Iniciar sistema
npm run dev:full
```

## 🔍 Como Saber se Está no Diretório Correto

### Backend (RAIZ):
```powershell
# Deve mostrar:
# - package.json (com scripts db:create, migrate, etc.)
# - server.js
# - scripts/ (pasta)
# - frontend/ (pasta)

dir
```

### Frontend:
```powershell
# Deve mostrar:
# - package.json (com scripts start, build, etc.)
# - src/ (pasta)
# - public/ (pasta)

dir
```

## 🚨 Erros Comuns

### Erro: "Missing script: db:create"
**Causa**: Está no diretório frontend
**Solução**: `cd ..` para voltar à raiz

### Erro: "Cannot find module"
**Causa**: Dependências não instaladas
**Solução**: `npm install` no diretório correto

### Erro: "Port already in use"
**Causa**: Processo já rodando
**Solução**: `Ctrl+C` no terminal ou matar processo

---

**💡 Dica**: Sempre verifique em qual diretório você está com `pwd` (PowerShell) ou `cd` (CMD)
