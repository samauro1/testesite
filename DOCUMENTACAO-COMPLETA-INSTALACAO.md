# 📚 Documentação Completa - Sistema de Avaliação Psicológica

**Data de Atualização:** 05/11/2025  
**Versão:** 1.0.0  
**Autor:** Equipe de Desenvolvimento

---

## 📋 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
3. [Pré-requisitos](#pré-requisitos)
4. [Instalação Completa Passo a Passo](#instalação-completa-passo-a-passo)
5. [Configuração do Ambiente](#configuração-do-ambiente)
6. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
7. [Estrutura do Projeto](#estrutura-do-projeto)
8. [Executando o Sistema](#executando-o-sistema)
9. [Módulos do Sistema](#módulos-do-sistema)
10. [Deploy em Produção](#deploy-em-produção)
11. [Troubleshooting](#troubleshooting)
12. [Backup e Restauração](#backup-e-restauração)
13. [Manutenção](#manutenção)

---

## 🎯 Visão Geral do Sistema

O **Sistema de Avaliação Psicológica (PaloGráfico)** é uma plataforma completa desenvolvida para gestão de clínicas psicológicas, com foco em avaliações psicológicas para CNH (Carteira Nacional de Habilitação) e outros contextos de avaliação psicológica.

### Principais Funcionalidades

- ✅ **Gestão de Pacientes**: Cadastro completo com dados pessoais, documentos RENACH, histórico de avaliações
- ✅ **Agendamentos**: Sistema de agendamento flexível com conversão automática para pacientes
- ✅ **Avaliações Psicológicas**: Aplicação e cálculo automático de testes psicológicos padronizados
- ✅ **Testes Psicológicos**: AC, MIG, MEMORE, Rotas, MVT, R-1, Palográfico, BPA2, Beta-III, Atenção
- ✅ **Emissão de Laudos**: Geração automática de laudos e documentos
- ✅ **NFS-e**: Integração para emissão de Notas Fiscais de Serviços Eletrônicas
- ✅ **Integração DETRAN**: Sincronização automática de agendamentos do DETRAN SP
- ✅ **Relatórios**: Dashboard e relatórios completos de atividades
- ✅ **Controle de Usuários**: Sistema de permissões e perfis de acesso
- ✅ **Assinatura Digital**: Suporte a certificados A3 para assinatura de documentos

### Contextos de Uso

- **Trânsito**: Avaliações para obtenção/renovação de CNH
- **Saúde**: Avaliações psicológicas gerais
- **Trabalho**: Avaliações ocupacionais
- **Outros**: Contextos customizados

---

## 🏗️ Arquitetura e Tecnologias

### Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│                   Porta: 3000                                │
│            React 19 + TypeScript + Tailwind CSS              │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend Principal (Express)                 │
│                   Porta: 3001                                │
│         Node.js + Express + PostgreSQL + JWT                 │
└──────┬──────────────────────────────┬───────────────────────┘
       │                              │
       ▼                              ▼
┌──────────────┐            ┌─────────────────────┐
│  PostgreSQL  │            │  Módulo de Testes   │
│   Database   │            │    Porta: 3002      │
│              │            │  (Backend Separado) │
└──────────────┘            └─────────────────────┘
```

### Stack Tecnológico

#### Backend Principal (`codigo/`)

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| **Node.js** | 18+ | Runtime JavaScript |
| **Express** | ^4.18.2 | Framework web |
| **PostgreSQL** | 12+ | Banco de dados relacional |
| **pg** | ^8.11.3 | Driver PostgreSQL |
| **jsonwebtoken** | ^9.0.2 | Autenticação JWT |
| **bcryptjs** | ^2.4.3 | Hash de senhas |
| **joi** | ^17.9.2 | Validação de dados |
| **helmet** | ^7.0.0 | Segurança HTTP |
| **cors** | ^2.8.5 | Configuração CORS |
| **express-rate-limit** | ^6.10.0 | Rate limiting |
| **pdf-parse** | ^1.1.1 | Parse de PDFs |
| **puppeteer** | ^24.26.0 | Automação de browser |
| **node-cron** | ^4.2.1 | Agendamento de tarefas |
| **soap** | ^1.5.0 | Cliente SOAP para NFS-e |
| **graphene-pk11** | ^2.3.6 | Certificados digitais A3 |

#### Frontend (`frontend/frontend-nextjs/`)

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| **Next.js** | 15.5.4 | Framework React |
| **React** | 19.1.0 | Biblioteca UI |
| **TypeScript** | ^5 | Tipagem estática |
| **Tailwind CSS** | ^3.4.18 | Framework CSS |
| **React Query** | ^5.90.2 | Gerenciamento de estado |
| **Axios** | ^1.12.2 | Cliente HTTP |
| **React Hook Form** | ^7.65.0 | Formulários |
| **React Hot Toast** | ^2.6.0 | Notificações |
| **Recharts** | ^3.2.1 | Gráficos |
| **Lucide React** | ^0.545.0 | Ícones |

#### Módulo de Testes (`desenvolvimento-modulo-testes/`)

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| **Node.js** | 18+ | Runtime JavaScript |
| **Express** | ^4.18.2 | Framework web |
| **PostgreSQL** | 12+ | Banco de dados |
| **tesseract.js** | ^5.0.4 | OCR |
| **openai** | ^4.20.1 | IA (análise de imagens) |
| **pdfkit** | ^0.14.0 | Geração de PDFs |
| **docx** | ^8.5.0 | Geração de documentos Word |

---

## 🔧 Pré-requisitos

### Software Necessário

1. **Node.js** (versão 18 ou superior)
   - Download: https://nodejs.org/
   - Verificar instalação: `node --version`

2. **PostgreSQL** (versão 12 ou superior)
   - Download: https://www.postgresql.org/download/
   - Verificar instalação: `psql --version`

3. **Git** (para clonar o repositório)
   - Download: https://git-scm.com/downloads
   - Verificar instalação: `git --version`

4. **npm** ou **yarn** (vem com Node.js)
   - Verificar instalação: `npm --version`

### Requisitos do Sistema

- **Sistema Operacional**: Windows 10/11, Linux, macOS
- **RAM**: Mínimo 4GB (recomendado 8GB+)
- **Disco**: Mínimo 2GB livres
- **Portas**: 3000, 3001, 3002 (devem estar livres)
- **PostgreSQL**: Porta 5432 (padrão)

### Conta GitHub

- Acesso ao repositório: `https://github.com/samauro1/testesite.git`

---

## 📦 Instalação Completa Passo a Passo

### Passo 1: Clonar o Repositório

```powershell
# Criar diretório de trabalho
cd E:\
mkdir sistemas
cd sistemas

# Clonar repositório
git clone https://github.com/samauro1/testesite.git .

# Ou se já existe o repositório, atualizar:
git pull origin main
```

### Passo 2: Instalar Dependências do Backend Principal

```powershell
# Navegar para o diretório do backend
cd E:\sistemas\codigo

# Instalar dependências
npm install

# Aguardar conclusão (pode demorar alguns minutos)
```

### Passo 3: Instalar Dependências do Frontend

```powershell
# Navegar para o diretório do frontend
cd E:\sistemas\frontend\frontend-nextjs

# Instalar dependências
npm install

# Aguardar conclusão
```

### Passo 4: Instalar Dependências do Módulo de Testes (Opcional)

```powershell
# Navegar para o diretório do módulo de testes
cd E:\sistemas\desenvolvimento-modulo-testes\backend

# Instalar dependências
npm install
```

### Passo 5: Configurar Banco de Dados PostgreSQL

```powershell
# Abrir PostgreSQL (psql ou pgAdmin)

# Criar banco de dados
psql -U postgres
CREATE DATABASE sistema_avaliacao_psicologica;

# Verificar criação
\l

# Sair
\q
```

### Passo 6: Configurar Variáveis de Ambiente

#### Backend Principal (`codigo/.env`)

Criar arquivo `.env` em `E:\sistemas\codigo\.env`:

```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_avaliacao_psicologica
DB_USER=postgres
DB_PASSWORD=SUA_SENHA_POSTGRES_AQUI

# JWT
JWT_SECRET=seu_secret_key_jwt_aqui_altere_em_producao_use_uma_string_aleatoria_segura

# Servidor
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (opcional - para notificações)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_app
EMAIL_FROM=noreply@seu-dominio.com

# NFS-e (configurar conforme município)
NFSE_API_URL=https://nfe.prefeitura.sp.gov.br/ws/nfe2.asmx
NFSE_USUARIO=seu_usuario
NFSE_SENHA=sua_senha
NFSE_CNPJ=00.000.000/0000-00
NFSE_INSCRICAO_MUNICIPAL=00000000

# DETRAN (opcional - para sincronização automática)
DETRAN_CPF=
DETRAN_SENHA=
DETRAN_SYNC_ENABLED=false
DETRAN_SYNC_CRON=0 8 * * *
```

#### Frontend (`frontend/frontend-nextjs/.env.local`)

Criar arquivo `.env.local` em `E:\sistemas\frontend\frontend-nextjs\.env.local`:

```env
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Ambiente
NODE_ENV=development
```

#### Módulo de Testes (`desenvolvimento-modulo-testes/backend/.env`)

Criar arquivo `.env` em `E:\sistemas\desenvolvimento-modulo-testes\backend\.env`:

```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_avaliacao_psicologica
DB_USER=postgres
DB_PASSWORD=SUA_SENHA_POSTGRES_AQUI

# Servidor
PORT=3002
NODE_ENV=development
```

### Passo 7: Configurar Banco de Dados (Migrações e Dados Iniciais)

```powershell
# Navegar para o diretório do backend
cd E:\sistemas\codigo

# Executar setup completo (criação, migrações e dados iniciais)
npm run setup

# OU executar passo a passo:
npm run db:create    # Criar tabelas básicas
npm run migrate      # Executar todas as migrações
npm run seed         # Popular com dados iniciais
```

### Passo 8: Verificar Instalação

```powershell
# Testar conexão com banco de dados
cd E:\sistemas\codigo
node scripts/test-db-connection-simple.js

# Deve retornar: "✅ Conectado ao banco de dados PostgreSQL"
```

---

## ⚙️ Configuração do Ambiente

### Windows PowerShell

#### Scripts de Inicialização

O sistema inclui scripts PowerShell para facilitar o gerenciamento:

1. **`iniciar-servidores.ps1`**: Inicia Backend e Frontend
2. **`reiniciar-servidores.ps1`**: Reinicia todos os servidores (inclui módulo de testes)
3. **`iniciar-servidores-com-logs.ps1`**: Inicia com logs detalhados

**Uso:**
```powershell
# Executar na raiz do projeto (E:\sistemas)
.\reiniciar-servidores.ps1
```

### Variáveis de Ambiente Importantes

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `NODE_ENV` | Ambiente (development/production) | development |
| `PORT` | Porta do servidor | 3001 (backend) |
| `DB_HOST` | Host do PostgreSQL | localhost |
| `DB_PORT` | Porta do PostgreSQL | 5432 |
| `JWT_SECRET` | Chave secreta para JWT | (obrigatório) |
| `CORS_ORIGIN` | Origem permitida para CORS | http://localhost:3000 |

### Timezone

O sistema está configurado para usar o timezone de São Paulo (UTC-3):
```javascript
process.env.TZ = 'America/Sao_Paulo';
```

---

## 🗄️ Configuração do Banco de Dados

### Estrutura do Banco

O banco de dados principal (`sistema_avaliacao_psicologica`) contém as seguintes tabelas principais:

- `usuarios` - Usuários do sistema
- `pacientes` - Cadastro de pacientes
- `agendamentos` - Agendamentos de avaliações
- `avaliacoes` - Avaliações psicológicas
- `testes` - Testes aplicados
- `laudos` - Laudos gerados
- `tabelas_normativas` - Tabelas normativas dos testes
- `configuracoes` - Configurações do sistema
- `nfs_e` - Notas fiscais emitidas
- `mensagens_enviadas` - Mensagens SMS/Email enviadas

### Migrações

As migrações estão em `codigo/scripts/migrations/` e são executadas automaticamente com `npm run migrate`.

### Dados Iniciais (Seed)

O seed inicial cria:
- Usuário administrador padrão
- Tabelas normativas para os testes
- Configurações padrão do sistema

**Usuário Padrão:**
- Email: `samauro@gmail.com` (ou conforme seed)
- Senha: `Diogo` (ou conforme seed)
- Perfil: `administrador`

⚠️ **IMPORTANTE**: Altere a senha padrão após o primeiro login!

---

## 📁 Estrutura do Projeto

```
E:\sistemas\
│
├── codigo/                          # Backend Principal
│   ├── config/                      # Configurações
│   │   └── database.js              # Configuração do banco
│   ├── middleware/                  # Middlewares
│   │   ├── auth.js                  # Autenticação JWT
│   │   └── validation.js            # Validação de dados
│   ├── routes/                      # Rotas da API
│   │   ├── auth.js                  # Autenticação
│   │   ├── pacientes.js             # Pacientes
│   │   ├── avaliacoes.js            # Avaliações
│   │   ├── agendamentos.js          # Agendamentos
│   │   ├── detran.js                # Integração DETRAN
│   │   ├── nfs-e.js                 # NFS-e
│   │   └── ...                      # Outras rotas
│   ├── services/                    # Serviços
│   │   ├── detranScraper.js         # Scraper DETRAN
│   │   ├── agendaPeritoService.js   # Serviço de agendamento
│   │   └── messageService.js        # Envio de mensagens
│   ├── utils/                       # Utilitários
│   │   ├── logger.js                # Sistema de logs
│   │   ├── renachProcessor.js       # Processamento RENACH
│   │   └── ...                      # Outros utilitários
│   ├── scripts/                     # Scripts
│   │   ├── migrations/              # Migrações do banco
│   │   ├── setup-database.js        # Setup inicial
│   │   ├── migrate.js               # Executar migrações
│   │   └── seed.js                  # Popular dados iniciais
│   ├── server.js                    # Servidor principal
│   ├── package.json                 # Dependências backend
│   └── .env                         # Variáveis de ambiente
│
├── frontend/                        # Frontend
│   └── frontend-nextjs/             # Next.js App
│       ├── src/
│       │   ├── app/                 # App Router (Next.js 13+)
│       │   │   ├── (auth)/          # Rotas de autenticação
│       │   │   ├── dashboard/       # Dashboard
│       │   │   ├── pacientes/       # Gestão de pacientes
│       │   │   ├── avaliacoes/      # Avaliações
│       │   │   └── ...              # Outras páginas
│       │   ├── components/          # Componentes React
│       │   ├── services/            # Serviços de API
│       │   └── types/               # Definições TypeScript
│       ├── public/                  # Arquivos estáticos
│       ├── package.json             # Dependências frontend
│       └── .env.local               # Variáveis de ambiente
│
├── desenvolvimento-modulo-testes/   # Módulo de Testes
│   ├── backend/                     # Backend do módulo
│   │   ├── routes/                  # Rotas específicas de testes
│   │   ├── services/                # Serviços de testes
│   │   ├── utils/                   # Utilitários
│   │   ├── server.js                # Servidor do módulo
│   │   └── package.json
│   ├── database/                    # Schemas e scripts do banco
│   │   ├── schemas/                 # Schemas SQL
│   │   └── scripts/                 # Scripts de setup
│   └── documentacao/                # Documentação do módulo
│
├── documentacao/                    # Documentação geral
│   ├── documentacao.md              # Documentação principal
│   ├── MODULO-DETRAN-COMPLETO.md    # Documentação DETRAN
│   └── ...                          # Outras documentações
│
├── iniciar-servidores.ps1           # Script iniciar servidores
├── reiniciar-servidores.ps1         # Script reiniciar servidores
└── README.md                        # README principal
```

---

## 🚀 Executando o Sistema

### Opção 1: Usando Scripts PowerShell (Recomendado)

```powershell
# Na raiz do projeto (E:\sistemas)
.\reiniciar-servidores.ps1
```

Isso irá:
1. Parar todos os processos Node.js existentes
2. Iniciar Backend Principal (porta 3001)
3. Iniciar Frontend (porta 3000)
4. Iniciar Módulo de Testes (porta 3002)

### Opção 2: Manualmente

#### Terminal 1 - Backend Principal

```powershell
cd E:\sistemas\codigo
npm start
# ou para desenvolvimento com auto-reload:
npm run dev
```

#### Terminal 2 - Frontend

```powershell
cd E:\sistemas\frontend\frontend-nextjs
npm run dev
```

#### Terminal 3 - Módulo de Testes (Opcional)

```powershell
cd E:\sistemas\desenvolvimento-modulo-testes\backend
node server.js
```

### URLs de Acesso

Após iniciar os servidores:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health
- **Módulo de Testes**: http://localhost:3002 (se iniciado)

### Primeiro Acesso

1. Acesse: http://localhost:3000
2. Faça login com as credenciais padrão:
   - Email: `samauro@gmail.com`
   - Senha: `Diogo`
3. ⚠️ **Altere a senha imediatamente após o primeiro login!**

---

## 🧩 Módulos do Sistema

### 1. Módulo de Pacientes

**Funcionalidades:**
- Cadastro completo de pacientes
- Upload e processamento automático de documentos RENACH (PDF)
- Extração automática de dados do RENACH
- Histórico completo de avaliações por paciente
- Busca avançada (nome, CPF)

**Endpoints Principais:**
- `GET /api/pacientes` - Listar pacientes
- `POST /api/pacientes` - Criar paciente
- `PUT /api/pacientes/:id` - Atualizar paciente
- `PUT /api/pacientes/:id/renach` - Upload RENACH

### 2. Módulo de Agendamentos

**Funcionalidades:**
- Criação de agendamentos individuais ou em lote
- Status: Agendado, Confirmado, Realizado, Cancelado
- Conversão automática de agendamento para paciente
- Integração com DETRAN SP

**Endpoints Principais:**
- `GET /api/agendamentos` - Listar agendamentos
- `POST /api/agendamentos` - Criar agendamento
- `PUT /api/agendamentos/:id` - Atualizar agendamento

### 3. Módulo de Avaliações

**Funcionalidades:**
- Criação de avaliações vinculadas a pacientes
- Aplicação de múltiplos testes psicológicos
- Cálculo automático de resultados
- Geração de laudos

**Endpoints Principais:**
- `GET /api/avaliacoes` - Listar avaliações
- `POST /api/avaliacoes` - Criar avaliação
- `GET /api/avaliacoes/:id` - Obter avaliação

### 4. Módulo de Testes Psicológicos

**Testes Disponíveis:**
- **AC** - Atenção Concentrada
- **MIG** - Avaliação Psicológica (28 questões)
- **MEMORE** - Memória
- **Rotas** - Rotas A, D e C
- **MVT** - Memória Visual para o Trânsito
- **R-1** - Raciocínio
- **Palográfico**
- **BPA2** - Bateria de Provas de Atenção 2
- **Beta-III** - Teste de Inteligência
- **Atenção** - Teste de Atenção

**Funcionalidades:**
- Interface visual para marcação de respostas
- Cálculo automático de resultados
- Seleção de tabela normativa
- Exportação de resultados

### 5. Módulo DETRAN

**Funcionalidades:**
- Sincronização automática de agendamentos do DETRAN SP
- Configuração de credenciais
- Sincronização manual ou automática (cron)
- Tratamento de erros e logs

**Configuração:**
1. Acesse Configurações > DETRAN
2. Configure CPF e senha do perito
3. Selecione dias de trabalho
4. Ative sincronização automática (opcional)

### 6. Módulo NFS-e

**Funcionalidades:**
- Emissão de Notas Fiscais de Serviços Eletrônicas
- Integração com prefeituras (ex: São Paulo)
- Assinatura digital com certificado A3
- Histórico de notas emitidas

**Configuração:**
1. Configure credenciais NFS-e em Configurações
2. Configure certificado A3 (se necessário)
3. Teste emissão antes de usar em produção

---

## 🌐 Deploy em Produção

### Pré-requisitos para Produção

1. Servidor com Node.js 18+
2. PostgreSQL 12+ configurado
3. Domínio configurado (ex: www.samauro.com.ar)
4. Certificado SSL (HTTPS)
5. Proxy reverso (Nginx recomendado)

### Configuração de Produção

#### 1. Variáveis de Ambiente

**Backend (`codigo/.env`):**
```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_NAME=sistema_avaliacao_psicologica
DB_USER=postgres
DB_PASSWORD=senha_segura_producao
JWT_SECRET=chave_secreta_forte_producao
CORS_ORIGIN=https://www.samauro.com.ar
```

**Frontend (`frontend/frontend-nextjs/.env.local`):**
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://www.samauro.com.ar/sistema/api
```

#### 2. Build do Frontend

```powershell
cd E:\sistemas\frontend\frontend-nextjs
npm run build
```

#### 3. Configuração Nginx (Exemplo)

```nginx
server {
    listen 80;
    server_name www.samauro.com.ar samauro.com.ar;
    
    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.samauro.com.ar samauro.com.ar;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Frontend Next.js
    location /sistema {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API Backend
    location /sistema/api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 4. Process Manager (PM2)

```powershell
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar backend
cd E:\sistemas\codigo
pm2 start server.js --name "backend-principal"

# Iniciar frontend
cd E:\sistemas\frontend\frontend-nextjs
pm2 start npm --name "frontend" -- start

# Salvar configuração
pm2 save

# Configurar para iniciar no boot
pm2 startup
```

### Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados configurado e migrado
- [ ] Build do frontend executado
- [ ] Certificado SSL configurado
- [ ] Nginx/configurado
- [ ] Firewall configurado (portas 80, 443)
- [ ] Backup automático configurado
- [ ] Monitoramento configurado
- [ ] Logs configurados

---

## 🔍 Troubleshooting

### Problema: Erro de conexão com banco de dados

**Sintomas:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Soluções:**
1. Verificar se PostgreSQL está rodando:
   ```powershell
   # Windows
   Get-Service postgresql*
   
   # Se não estiver rodando:
   Start-Service postgresql*
   ```

2. Verificar credenciais no `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=sua_senha
   ```

3. Testar conexão:
   ```powershell
   psql -U postgres -h localhost
   ```

### Problema: Porta já em uso

**Sintomas:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Soluções:**
1. Encontrar processo usando a porta:
   ```powershell
   # Windows
   netstat -ano | findstr :3001
   
   # Matar processo (substituir PID)
   taskkill /PID <PID> /F
   ```

2. Ou usar o script de reinicialização:
   ```powershell
   .\reiniciar-servidores.ps1
   ```

### Problema: Erro de CORS

**Sintomas:**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Soluções:**
1. Verificar `CORS_ORIGIN` no `.env` do backend
2. Verificar `NEXT_PUBLIC_API_URL` no `.env.local` do frontend
3. Limpar cache do navegador

### Problema: Erro ao processar RENACH

**Sintomas:**
```
Erro ao processar documento RENACH
```

**Soluções:**
1. Verificar tamanho do arquivo (máximo 20MB)
2. Verificar formato do PDF
3. Verificar logs em `codigo/logs/`

### Problema: Dependências não instaladas

**Sintomas:**
```
Cannot find module 'express'
```

**Soluções:**
```powershell
# Reinstalar dependências
cd E:\sistemas\codigo
rm -rf node_modules
rm package-lock.json
npm install
```

### Problema: Erro de autenticação JWT

**Sintomas:**
```
Invalid token
```

**Soluções:**
1. Verificar `JWT_SECRET` no `.env`
2. Limpar cache do navegador
3. Fazer logout e login novamente

---

## 💾 Backup e Restauração

### Backup do Banco de Dados

```powershell
# Backup completo
pg_dump -U postgres -h localhost sistema_avaliacao_psicologica > backup_$(Get-Date -Format "yyyy-MM-dd").sql

# Backup apenas dados (sem estrutura)
pg_dump -U postgres -h localhost --data-only sistema_avaliacao_psicologica > backup_data_$(Get-Date -Format "yyyy-MM-dd").sql

# Backup apenas estrutura (sem dados)
pg_dump -U postgres -h localhost --schema-only sistema_avaliacao_psicologica > backup_schema_$(Get-Date -Format "yyyy-MM-dd").sql
```

### Restauração do Banco de Dados

```powershell
# Restaurar backup completo
psql -U postgres -h localhost sistema_avaliacao_psicologica < backup_2025-11-05.sql

# Ou criar novo banco e restaurar
createdb -U postgres sistema_avaliacao_psicologica
psql -U postgres -h localhost sistema_avaliacao_psicologica < backup_2025-11-05.sql
```

### Backup Completo do Sistema

O sistema inclui scripts de backup automático. O backup completo está em:
```
E:\backup\YYYY-MM-DD\
```

Para restaurar:
1. Copiar arquivos do backup para o diretório do projeto
2. Restaurar banco de dados
3. Reconfigurar variáveis de ambiente
4. Reinstalar dependências

---

## 🔧 Manutenção

### Atualizar Dependências

```powershell
# Backend
cd E:\sistemas\codigo
npm update

# Frontend
cd E:\sistemas\frontend\frontend-nextjs
npm update
```

### Atualizar Código do GitHub

```powershell
cd E:\sistemas
git pull origin main

# Reinstalar dependências se necessário
cd codigo
npm install

cd ..\frontend\frontend-nextjs
npm install
```

### Limpar Cache

```powershell
# Limpar cache do Next.js
cd E:\sistemas\frontend\frontend-nextjs
Remove-Item -Recurse -Force .next

# Limpar node_modules (se necessário)
Remove-Item -Recurse -Force node_modules
npm install
```

### Verificar Logs

Os logs do sistema estão em:
- Backend: Console do terminal ou arquivo de log configurado
- Frontend: Console do navegador (F12)
- Banco de Dados: Logs do PostgreSQL

### Monitoramento

Para monitoramento em produção, considere:
- PM2 Monitor (para processos Node.js)
- Logs centralizados (ex: Winston + Loggly)
- Monitoramento de banco (ex: pgAdmin)
- Alertas de erro (ex: Sentry)

---

## 📞 Suporte

### Documentação Adicional

- `documentacao/documentacao.md` - Documentação detalhada
- `documentacao/MODULO-DETRAN-COMPLETO.md` - Módulo DETRAN
- `documentacao/EXTRACAO-RENACH-COMPLETA.md` - Extração RENACH
- `GUIA-RESTAURAR-BACKUP.md` - Guia de restauração

### Contato

Para dúvidas ou problemas:
1. Verificar esta documentação
2. Verificar seção Troubleshooting
3. Consultar logs do sistema
4. Contatar equipe de desenvolvimento

---

## 📝 Notas Importantes

### Segurança

- ⚠️ **NUNCA** commitar arquivos `.env` no Git
- ⚠️ **SEMPRE** usar senhas fortes em produção
- ⚠️ **SEMPRE** usar HTTPS em produção
- ⚠️ **ALTERAR** senha padrão após primeiro login
- ⚠️ **MANTER** dependências atualizadas

### Performance

- Use cache quando apropriado
- Configure índices no banco de dados
- Monitore performance de queries
- Use PM2 para gerenciar processos em produção

### Backup

- ⚠️ **FAZER** backup regular do banco de dados
- ⚠️ **TESTAR** restauração periodicamente
- ⚠️ **MANTER** múltiplas cópias de backup

---

**Documentação criada em:** 05/11/2025  
**Última atualização:** 05/11/2025  
**Versão do Sistema:** 1.0.0

