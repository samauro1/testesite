# 📚 Documentação Completa - Sistema de Avaliação Psicológica (PaloGráfico)

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Tecnologias Utilizadas](#tecnologias-utilizadas)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Instalação e Configuração](#instalação-e-configuração)
6. [Funcionalidades Principais](#funcionalidades-principais)
7. [Banco de Dados](#banco-de-dados)
8. [API e Rotas](#api-e-rotas)
9. [Testes Psicológicos](#testes-psicológicos)
10. [NFS-e (Nota Fiscal de Serviços Eletrônica)](#nfs-e-nota-fiscal-de-serviços-eletrônica)
11. [Autenticação e Segurança](#autenticação-e-segurança)
12. [Desenvolvimento](#desenvolvimento)
13. [Deploy e Produção](#deploy-e-produção)
14. [Troubleshooting](#troubleshooting)
15. [Histórico de Mudanças](#histórico-de-mudanças)

---

## 🎯 Visão Geral

O **Sistema de Avaliação Psicológica (PaloGráfico)** é uma plataforma completa desenvolvida para gestão de clínicas psicológicas, com foco em avaliações psicológicas para CNH (Carteira Nacional de Habilitação) e outros contextos de avaliação psicológica.

### Principais Objetivos

- **Gestão de Pacientes**: Cadastro completo com dados pessoais, documentos RENACH, histórico de avaliações
- **Agendamentos**: Sistema de agendamento flexível com conversão automática para pacientes
- **Avaliações Psicológicas**: Aplicação e cálculo automático de testes psicológicos padronizados
- **Emissão de Laudos**: Geração automática de laudos e documentos
- **NFS-e**: Integração para emissão de Notas Fiscais de Serviços Eletrônicas
- **Relatórios**: Dashboard e relatórios completos de atividades
- **Controle de Usuários**: Sistema de permissões e perfis de acesso

### Contextos de Uso

- **Trânsito**: Avaliações para obtenção/renewação de CNH
- **Saúde**: Avaliações psicológicas gerais
- **Trabalho**: Avaliações ocupacionais
- **Outros**: Contextos customizados

---

## 🏗️ Arquitetura do Sistema

O sistema é composto por duas partes principais:

### Backend (Node.js + Express)
- **Localização**: `codigo/`
- **Porta**: `3001` (desenvolvimento)
- **Framework**: Express.js
- **Banco de Dados**: PostgreSQL
- **Autenticação**: JWT (JSON Web Tokens)

### Frontend (Next.js + React)
- **Localização**: `frontend/frontend-nextjs/`
- **Porta**: `3000` (desenvolvimento)
- **Framework**: Next.js 15.5.4
- **UI**: React 19.1.0 com Tailwind CSS
- **Gerenciamento de Estado**: React Query (TanStack Query)

### Comunicação

```
Frontend (localhost:3000) ←→ Backend API (localhost:3001) ←→ PostgreSQL Database
```

---

## 🛠️ Tecnologias Utilizadas

### Backend

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| **Node.js** | - | Runtime JavaScript |
| **Express** | ^4.18.2 | Framework web |
| **PostgreSQL** | - | Banco de dados relacional |
| **pg** | ^8.11.3 | Driver PostgreSQL para Node.js |
| **jsonwebtoken** | ^9.0.2 | Autenticação JWT |
| **bcryptjs** | ^2.4.3 | Hash de senhas |
| **joi** | ^17.9.2 | Validação de dados |
| **helmet** | ^7.0.0 | Segurança HTTP |
| **cors** | ^2.8.5 | Configuração CORS |
| **express-rate-limit** | ^6.10.0 | Rate limiting |
| **pdf-parse** | ^1.1.1 | Parse de PDFs |
| **pdf-lib** | ^1.17.1 | Manipulação de PDFs |
| **pdfjs-dist** | ^3.11.174 | Renderização de PDFs |
| **sharp** | ^0.34.4 | Processamento de imagens |
| **canvas** | ^3.2.0 | Geração de imagens |
| **puppeteer** | ^24.26.0 | Automação de browser (NFS-e) |
| **nodemailer** | ^7.0.9 | Envio de emails |
| **soap** | ^1.5.0 | Cliente SOAP para NFS-e |
| **xml2js** | ^0.6.2 | Parser XML |
| **xml-crypto** | ^6.1.2 | Assinatura XML |
| **graphene-pk11** | ^2.3.6 | Certificados digitais A3 |
| **node-forge** | ^1.3.1 | Criptografia |

### Frontend

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| **Next.js** | 15.5.4 | Framework React |
| **React** | 19.1.0 | Biblioteca UI |
| **TypeScript** | ^5 | Tipagem estática |
| **Tailwind CSS** | ^3.4.18 | Framework CSS |
| **@tanstack/react-query** | ^5.90.2 | Gerenciamento de estado servidor |
| **axios** | ^1.12.2 | Cliente HTTP |
| **react-hook-form** | ^7.65.0 | Formulários |
| **react-hot-toast** | ^2.6.0 | Notificações |
| **date-fns** | ^4.1.0 | Manipulação de datas |
| **recharts** | ^3.2.1 | Gráficos |
| **lucide-react** | ^0.545.0 | Ícones |
| **jspdf** | ^3.0.3 | Geração de PDFs |
| **html2canvas** | ^1.4.1 | Captura de tela |
| **xlsx** | ^0.18.5 | Exportação Excel |
| **web-pki** | ^2.16.3 | Certificados digitais |

### Banco de Dados

- **PostgreSQL**: Sistema de gerenciamento de banco de dados relacional
- **Schema**: Múltiplas tabelas relacionadas (usuarios, pacientes, avaliacoes, agendamentos, etc.)

---

## 📁 Estrutura do Projeto

```
palografico/
├── codigo/                          # Backend (Node.js + Express)
│   ├── config/
│   │   └── database.js              # Configuração do PostgreSQL
│   ├── middleware/
│   │   ├── auth.js                  # Middleware de autenticação
│   │   └── validation.js            # Validação de dados (Joi)
│   ├── routes/                      # Rotas da API
│   │   ├── auth.js                  # Autenticação (login, registro)
│   │   ├── pacientes.js             # CRUD de pacientes
│   │   ├── avaliacoes.js             # CRUD de avaliações
│   │   ├── agendamentos.js           # CRUD de agendamentos
│   │   ├── usuarios.js               # CRUD de usuários
│   │   ├── tabelas.js                # Tabelas normativas dos testes
│   │   ├── estoque.js                # Estoque de testes
│   │   ├── relatorios.js             # Relatórios e estatísticas
│   │   ├── configuracoes.js          # Configurações da clínica
│   │   ├── assinatura.js             # Assinaturas digitais
│   │   ├── assinatura-digital.js     # Certificados A3
│   │   ├── nfs-e.js                  # NFS-e principal
│   │   ├── nfs-e-real.js             # NFS-e real (Web Service)
│   │   ├── nfs-e-login.js            # NFS-e com login
│   │   ├── nfs-e-hibrido.js           # NFS-e híbrida
│   │   ├── nfs-e-rpa.js              # NFS-e com RPA
│   │   ├── nfs-e-rpa-real.js         # NFS-e RPA real
│   │   └── nfs-e-web-service-real.js # NFS-e Web Service real
│   ├── scripts/                     # Scripts utilitários
│   │   ├── setup-database.js         # Setup inicial do banco
│   │   ├── migrate.js                # Executor de migrações
│   │   ├── seed.js                   # Popular banco com dados iniciais
│   │   └── migrations/               # Migrações de banco
│   ├── utils/                        # Utilitários
│   │   ├── renachProcessor.js        # Processamento de PDFs RENACH
│   │   ├── certificadoA3Service.js    # Certificados digitais
│   │   ├── nfsEService*.js           # Serviços NFS-e
│   │   └── tabelaNormativaSelector.js # Seleção de tabelas normativas
│   ├── server.js                     # Servidor Express principal
│   ├── package.json                  # Dependências do backend
│   └── .env                          # Variáveis de ambiente
│
├── frontend/
│   └── frontend-nextjs/               # Frontend (Next.js)
│       ├── src/
│       │   ├── app/                  # Páginas (App Router do Next.js)
│       │   │   ├── login/
│       │   │   ├── dashboard/
│       │   │   ├── pacientes/
│       │   │   ├── avaliacoes/
│       │   │   ├── agenda/
│       │   │   ├── testes/
│       │   │   ├── relatorios/
│       │   │   ├── configuracoes/
│       │   │   └── ...
│       │   ├── components/           # Componentes React reutilizáveis
│       │   ├── contexts/             # Contexts (Auth, Theme, etc.)
│       │   ├── hooks/                # Custom hooks
│       │   ├── services/             # Serviços de API
│       │   ├── types/                # Definições TypeScript
│       │   └── utils/                # Utilitários do frontend
│       ├── public/                   # Arquivos estáticos
│       ├── package.json               # Dependências do frontend
│       └── next.config.ts            # Configuração do Next.js
│
└── documentacao/                     # Documentação
    ├── documentacao.md               # Este arquivo
    └── COMANDOS-WINDOWS.md           # Comandos específicos para Windows
```

---

## ⚙️ Instalação e Configuração

### Pré-requisitos

1. **Node.js** (versão 18 ou superior)
2. **PostgreSQL** (versão 12 ou superior)
3. **npm** ou **yarn**
4. **Git** (para clonar o repositório)

### Passo a Passo

#### 1. Clonar/Obter o Projeto

```bash
# Navegar para o diretório do projeto
cd D:\zite\palografico
```

#### 2. Configurar Banco de Dados PostgreSQL

```bash
# Criar banco de dados (se necessário)
createdb -U postgres sistema_avaliacao_psicologica

# Ou via psql
psql -U postgres
CREATE DATABASE sistema_avaliacao_psicologica;
```

#### 3. Configurar Variáveis de Ambiente

Criar arquivo `.env` na raiz do projeto (`codigo/.env`):

```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_avaliacao_psicologica
DB_USER=postgres
DB_PASSWORD=sua_senha_postgres

# JWT
JWT_SECRET=seu_secret_key_jwt_aqui_altere_em_producao

# Servidor
PORT=3001
NODE_ENV=development

# CORS (em produção, definir domínios específicos)
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
```

#### 4. Instalar Dependências

```bash
# Backend
cd codigo
npm install

# Frontend
cd ../frontend/frontend-nextjs
npm install
```

#### 5. Configurar Banco de Dados (Migrações e Dados Iniciais)

```bash
# Voltar para a raiz do projeto
cd D:\zite\palografico

# Executar setup completo (criação, migrações e dados iniciais)
npm run setup

# OU executar passo a passo:
npm run db:create    # Criar tabelas básicas
npm run migrate      # Executar todas as migrações
npm run seed         # Popular com dados iniciais
```

#### 6. Iniciar o Sistema

```bash
# Opção 1: Iniciar tudo de uma vez (recomendado)
npm run dev:full

# Opção 2: Iniciar separadamente
# Terminal 1 - Backend
cd codigo
npm run dev

# Terminal 2 - Frontend
cd frontend/frontend-nextjs
npm run dev
```

#### 7. Acessar o Sistema

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

### Usuário Padrão (após seed)

- **Email**: `samauro@gmail.com` (ou conforme seed)
- **Senha**: `Diogo` (ou conforme seed)
- **Perfil**: `administrador`

⚠️ **IMPORTANTE**: Altere a senha padrão após o primeiro login!

---

## 🎨 Funcionalidades Principais

### 1. Gestão de Pacientes

**Funcionalidades:**
- Cadastro completo de pacientes com dados pessoais
- Upload e processamento automático de documentos RENACH (PDF)
- Extração automática de dados do RENACH (CPF, nome, endereço, etc.)
- Histórico completo de avaliações por paciente
- Busca avançada (nome, CPF)
- Telefones separados (fixo e celular) com ícones específicos
- Filtros por contexto (Trânsito, Saúde, Trabalho, etc.)

**Campos Principais:**
- Nome completo
- CPF
- Data de nascimento (idade calculada automaticamente)
- Telefone fixo e celular
- Email
- Endereço completo
- Dados extraídos do RENACH
- Observações

### 2. Agendamentos

**Funcionalidades:**
- Criação de agendamentos individuais ou em lote (importação)
- Status: Agendado, Confirmado, Realizado, Cancelado
- Conversão automática de agendamento para paciente
- Campos específicos:
  - Tipo de avaliação
  - Contexto (Trânsito, Saúde, etc.)
  - Tipo de trânsito (obtenção, renovação, etc.)
  - Categoria CNH (A, B, C, D, E, AB, etc.)
- Telefones separados durante importação
- Filtros e busca

### 3. Avaliações Psicológicas

**Funcionalidades:**
- Criação de avaliações vinculadas a pacientes
- Aplicação de múltiplos testes psicológicos
- Cálculo automático de resultados
- Geração de laudos
- Histórico completo de avaliações
- Status: Apto, Inapto, Pendente
- Numeração automática de laudos

**Campos:**
- Número do laudo
- Data de aplicação
- Tipo de habilitação
- Aplicação (primeira, segunda via, renovação)
- Observações
- Aptidão (Apto/Inapto)

### 4. Testes Psicológicos

O sistema suporta os seguintes testes:

#### AC - Atenção Concentrada
- Avaliação da atenção concentrada
- Campos: acertos, erros, omissões
- Tabelas normativas por idade e escolaridade

#### MIG - Avaliação Psicológica
- Teste com 28 questões
- Suporte a gabarito digital (marcação de respostas)
- Cálculo automático baseado em gabarito ou entrada manual
- Tabelas normativas por idade e escolaridade

#### MEMORE - Memória
- Avaliação da capacidade de memória
- Total de 30 itens (6 de treino A-F + 24 de teste)
- Contadores automáticos: VP, VN, FP, FN
- Gabarito fixo não editável

#### Rotas de Atenção
- Rotas A, D e C
- Campos: acertos, erros, omissões por rota
- Análise combinada

#### MVT - Memória Visual para o Trânsito
- Campos: acertos, erros, omissão

#### R-1 - Raciocínio
- Campos: acertos

#### Palográfico
- Campos: acertos, erros, omissão

**Funcionalidades dos Testes:**
- Interface visual para marcação de respostas
- Cálculo automático de resultados
- Seleção de tabela normativa
- Análise anônima ou vinculada a paciente
- Exportação de resultados

### 5. Relatórios e Dashboard

**Dashboard:**
- Estatísticas gerais (pacientes, avaliações, agendamentos)
- Gráficos de distribuição
- Atividades recentes
- Resumo mensal

**Relatórios Disponíveis:**
- Relatório de avaliações
- Relatório de pacientes
- Relatório de agendamentos
- Relatório de NFS-e emitidas
- Exportação para Excel/PDF

### 6. Configurações

**Funcionalidades:**
- **Dados da Clínica**: Nome, CNPJ, endereço, contatos, logo
- **Meu Perfil**: Edição de dados pessoais, foto, CRP, especialidade, senha
- **NFS-e**: Configurações completas para emissão
- **Email**: Configurações de SMTP para envio de emails
- **Notificações**: Configurações de notificações do sistema

**Validações:**
- Validação visual de senhas (Nova Senha e Confirmar Senha devem coincidir)
- Campos obrigatórios

### 7. Gestão de Usuários

**Funcionalidades:**
- Criação e edição de usuários
- Perfis: Administrador, Psicólogo, Secretário
- Permissões por perfil
- Ativação/desativação de usuários
- Foto de perfil

**Perfis:**
- **Administrador**: Acesso total ao sistema
- **Psicólogo**: Acesso a pacientes, avaliações, testes (próprios ou todos)
- **Secretário**: Acesso a agendamentos, pacientes (somente visualização)

### 8. Estoque de Testes

**Funcionalidades:**
- Controle de estoque de testes psicológicos
- Quantidade disponível
- Status (ativo/inativo)

### 9. Assinatura Digital

**Funcionalidades:**
- Assinatura digital de documentos
- Suporte a certificados A3 (token USB)
- Assinatura manual (HTML5 Canvas)
- Logs de assinaturas

---

## 🗄️ Banco de Dados

### Principais Tabelas

#### `usuarios`
Armazena usuários do sistema.

**Colunas principais:**
- `id` (PK)
- `nome`, `email`
- `senha_hash` (bcrypt)
- `perfil` (administrador, psicologo, secretario)
- `crp`, `especialidade`
- `foto_url`
- `ativo` (boolean)
- `created_at`, `updated_at`

#### `pacientes`
Armazena dados dos pacientes.

**Colunas principais:**
- `id` (PK)
- `nome`, `cpf`, `idade`
- `data_nascimento`
- `telefone`, `telefone_fixo`, `telefone_celular`
- `email`, `endereco`
- `contexto` (Trânsito, Saúde, Trabalho, etc.)
- `tipo_transito`, `categoria_cnh`
- `escolaridade`
- `numero_laudo`
- `observacoes`
- `usuario_id` (FK)
- Campos RENACH (`numero_renach`, `renach_arquivo`, `renach_foto`, etc.)
- `created_at`, `updated_at`

#### `agendamentos`
Armazena agendamentos.

**Colunas principais:**
- `id` (PK)
- `nome`, `cpf`
- `telefone`, `telefone_fixo`, `telefone_celular`
- `email`
- `data_agendamento`
- `tipo_avaliacao`
- `contexto`, `tipo_transito`, `categoria_cnh`
- `status` (agendado, confirmado, realizado, cancelado)
- `observacoes`
- `paciente_id` (FK, nullable)
- `usuario_id` (FK)
- `created_at`, `updated_at`

#### `avaliacoes`
Armazena avaliações psicológicas.

**Colunas principais:**
- `id` (PK)
- `paciente_id` (FK)
- `usuario_id` (FK)
- `numero_laudo`
- `data_aplicacao`
- `aplicacao` (primeira, segunda_via, renovacao)
- `tipo_habilitacao`
- `aptidao` (apto, inapto, pendente)
- `observacoes`
- `created_at`, `updated_at`

#### `configuracoes_clinica`
Configurações gerais da clínica.

**Colunas:**
- `id` (PK)
- `nome_clinica`, `cnpj`
- `endereco`, `cidade`, `estado`, `cep`
- `telefone`, `email`
- `logo_url`

#### `configuracoes_nfs_e`
Configurações de NFS-e por usuário.

**Colunas principais:**
- `id` (PK)
- `usuario_id` (FK)
- `api_url`, `usuario_api`, `senha_api`
- `cnpj`, `inscricao_municipal`
- `valor_padrao`
- `ambiente`, `regime_tributacao`
- `codigo_servico`, `discriminacao_servico`
- `cnae`, `item_lista_servico`
- `aliquota_iss`
- E outros campos de configuração

#### `nfs_e_emitidas`
Armazena NFS-e emitidas.

**Colunas principais:**
- `id` (PK)
- `usuario_id` (FK)
- `paciente_id` (FK)
- `numero_nfs_e`, `codigo_verificacao`
- `status`, `valor`
- `discriminacao`, `observacoes`
- `data_emissao`, `data_vencimento`
- `link_visualizacao`
- `xml_nfs_e`
- `created_at`, `updated_at`

#### Outras Tabelas

- `tabelas_normativas`: Tabelas normativas dos testes psicológicos
- `movimentacoes_estoque`: Movimentações de estoque
- `logs_assinaturas`: Logs de assinaturas digitais
- `logs_sistema`: Logs gerais do sistema

### Migrações

As migrações estão em `codigo/scripts/migrations/` e são executadas via:

```bash
npm run migrate
```

**Principais migrações:**
- `add-configuracoes-clinica.js`
- `add-renach-fields.js` / `add-renach-storage.js`
- `add-tipo-transito-agendamentos.js`
- `add-email-config.js`
- `add-nfs-e-config.js`
- `create-agendamentos.js`
- E outras...

---

## 🔌 API e Rotas

### Base URL

```
http://localhost:3001/api
```

### Autenticação

Todas as rotas (exceto login) exigem autenticação via JWT.

**Header:**
```
Authorization: Bearer <token>
```

### Principais Endpoints

#### Autenticação (`/api/auth`)

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro (admin apenas)
- `GET /api/auth/verify` - Verificar token
- `POST /api/auth/logout` - Logout

#### Pacientes (`/api/pacientes`)

- `GET /api/pacientes` - Listar (com paginação e busca)
- `GET /api/pacientes/:id` - Detalhes
- `POST /api/pacientes` - Criar
- `PUT /api/pacientes/:id` - Atualizar
- `DELETE /api/pacientes/:id` - Deletar
- `POST /api/pacientes/:id/renach` - Upload RENACH (PDF base64)
- `GET /api/pacientes/:id/renach` - Buscar arquivo RENACH

#### Avaliações (`/api/avaliacoes`)

- `GET /api/avaliacoes` - Listar (com paginação e filtros)
- `GET /api/avaliacoes/:id` - Detalhes
- `POST /api/avaliacoes` - Criar
- `PUT /api/avaliacoes/:id` - Atualizar
- `DELETE /api/avaliacoes/:id` - Deletar

#### Agendamentos (`/api/agendamentos`)

- `GET /api/agendamentos` - Listar
- `GET /api/agendamentos/:id` - Detalhes
- `POST /api/agendamentos` - Criar
- `POST /api/agendamentos/importar-lote` - Importar em lote
- `PUT /api/agendamentos/:id` - Atualizar
- `DELETE /api/agendamentos/:id` - Deletar
- `POST /api/agendamentos/:id/converter-paciente` - Converter para paciente

#### Usuários (`/api/usuarios`)

- `GET /api/usuarios` - Listar
- `GET /api/usuarios/:id` - Detalhes
- `POST /api/usuarios` - Criar (admin apenas)
- `PUT /api/usuarios/:id` - Atualizar
- `PUT /api/usuarios/perfil/me` - Atualizar próprio perfil
- `DELETE /api/usuarios/:id` - Deletar (admin apenas)

#### Configurações (`/api/configuracoes`)

- `GET /api/configuracoes/clinica` - Buscar dados da clínica
- `PUT /api/configuracoes/clinica` - Atualizar dados da clínica
- `GET /api/configuracoes/email` - Buscar configurações de email
- `PUT /api/configuracoes/email` - Atualizar configurações de email

#### NFS-e (`/api/nfs-e`)

- `GET /api/nfs-e/configuracoes` - Buscar configurações
- `PUT /api/nfs-e/configuracoes` - Atualizar configurações
- `POST /api/nfs-e/emitir` - Emitir NFS-e
- `GET /api/nfs-e/emitidas` - Listar NFS-e emitidas
- `GET /api/nfs-e/emitidas/:id` - Detalhes de NFS-e

#### Tabelas Normativas (`/api/tabelas`)

- `GET /api/tabelas` - Listar tabelas disponíveis
- `GET /api/tabelas/:id` - Detalhes da tabela

#### Relatórios (`/api/relatorios`)

- `GET /api/relatorios/dashboard` - Dados do dashboard
- `GET /api/relatorios/avaliacoes` - Relatório de avaliações
- `GET /api/relatorios/pacientes` - Relatório de pacientes

#### Estoque (`/api/estoque`)

- `GET /api/estoque` - Listar estoque
- `PUT /api/estoque/:id` - Atualizar quantidade

### Exemplos de Requisições

#### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "samauro@gmail.com",
  "senha": "Diogo"
}
```

#### Criar Paciente

```bash
POST /api/pacientes
Authorization: Bearer <token>
Content-Type: application/json

{
  "nome": "João Silva",
  "cpf": "12345678900",
  "data_nascimento": "1990-01-01",
  "telefone_fixo": "1123456789",
  "telefone_celular": "11987654321",
  "email": "joao@email.com",
  "contexto": "Trânsito",
  "tipo_transito": "renovacao",
  "categoria_cnh": "B"
}
```

#### Upload RENACH

```bash
POST /api/pacientes/:id/renach
Authorization: Bearer <token>
Content-Type: application/json

{
  "renach_arquivo": "data:application/pdf;base64,..."
}
```

---

## 🧪 Testes Psicológicos

### AC - Atenção Concentrada

**Campos:**
- `acertos` (número)
- `erros` (número)
- `omissoes` (número)

**Cálculo:**
- Resultados calculados automaticamente
- Tabela normativa selecionada por idade e escolaridade

### MIG - Avaliação Psicológica

**Características:**
- 28 questões
- Suporte a gabarito digital (marcação visual)
- Cálculo automático de acertos baseado em gabarito
- Entrada manual de acertos também disponível

**Campos:**
- `acertos` (0-28)
- `idade` (15-64)
- `escolaridade` (Ensino Fundamental, Médio, Superior)

**Interface:**
- Grid visual de questões
- Marcação de respostas
- Validação de gabarito
- Cálculo automático

### MEMORE - Memória

**Características:**
- 30 itens totais (6 de treino A-F + 24 de teste)
- Gabarito fixo não editável
- Contadores automáticos: VP, VN, FP, FN

**Cálculo:**
- VP = Verdadeiros Positivos (marcados corretamente)
- VN = Verdadeiros Negativos (não marcados corretamente)
- FP = Falsos Positivos (marcados incorretamente)
- FN = Falsos Negativos (não marcados incorretamente)

**Interface:**
- Interface visual com checkboxes
- Atualização em tempo real dos contadores
- Validação automática

### Rotas de Atenção

**Campos:**
- `acertos_rota_a`, `erros_rota_a`, `omissoes_rota_a`
- `acertos_rota_d`, `erros_rota_d`, `omissoes_rota_d`
- `acertos_rota_c`, `erros_rota_c`, `omissoes_rota_c`

### Outros Testes

- **MVT**: Memória Visual para o Trânsito
- **R-1**: Raciocínio
- **Palográfico**: Teste específico

### Tabelas Normativas

O sistema possui tabelas normativas para cada teste, considerando:
- Idade
- Escolaridade
- Sexo (quando aplicável)
- Contexto de aplicação

As tabelas são selecionadas automaticamente ou manualmente durante o cálculo.

---

## 🧾 NFS-e (Nota Fiscal de Serviços Eletrônica)

### Visão Geral

O sistema possui integração completa para emissão de NFS-e, com múltiplas implementações:

1. **NFS-e Real**: Integração via Web Service da Prefeitura
2. **NFS-e com Login**: Autenticação via login/senha
3. **NFS-e Híbrida**: Preparada para integração real
4. **NFS-e RPA**: Automação via RPA (Robotic Process Automation)
5. **NFS-e Web Service Real**: Web Service completo

### Configuração

**Endpoint:** `/api/nfs-e/configuracoes`

**Campos principais:**
- `api_url`: URL do Web Service
- `usuario_api`: Usuário da API
- `senha_api`: Senha da API
- `cnpj`: CNPJ da clínica
- `inscricao_municipal`: Inscrição municipal
- `valor_padrao`: Valor padrão do serviço
- `ambiente`: Produção ou Homologação
- `regime_tributacao`: Regime tributário
- `codigo_servico`: Código do serviço (ex: 05118)
- `discriminacao_servico`: Descrição do serviço
- `cnae`: CNAE
- `item_lista_servico`: Item da lista de serviços
- `aliquota_iss`: Alíquota de ISS
- E outros...

### Emissão

**Endpoint:** `POST /api/nfs-e/emitir`

**Dados necessários:**
- `paciente_id`: ID do paciente
- `valor_servico`: Valor do serviço
- `forma_pagamento`: Forma de pagamento
- `observacoes`: Observações opcionais

**Processo:**
1. Buscar configurações NFS-e do usuário
2. Buscar dados do paciente
3. Montar XML RPS
4. Assinar XML com certificado digital (quando necessário)
5. Enviar para Web Service da Prefeitura
6. Salvar no banco de dados

### Consulta de NFS-e Emitidas

**Endpoint:** `GET /api/nfs-e/emitidas`

**Filtros:**
- `page`: Página
- `limit`: Limite por página
- `date_filter`: Filtro de data (hoje, semana, mes, ano, personalizado)
- `paciente_id`: Filtrar por paciente

**Campos retornados:**
- `numero_nfs_e`: Número da NFS-e
- `codigo_verificacao`: Código de verificação
- `status`: Status da NFS-e
- `valor`: Valor do serviço
- `data_emissao`: Data de emissão
- `link_visualizacao`: Link para visualização na Prefeitura

### Relatórios NFS-e

Página dedicada em `/relatorios-nfs-e` com:
- Lista de NFS-e emitidas
- Filtros por data e paciente
- Estatísticas
- Exportação

---

## 🔐 Autenticação e Segurança

### Autenticação JWT

**Fluxo:**
1. Usuário faz login com email/senha
2. Backend valida credenciais
3. Backend gera JWT token
4. Frontend armazena token (localStorage)
5. Frontend envia token em todas as requisições (header Authorization)
6. Backend valida token em cada requisição

**Expiração:** Tokens expiram após período determinado (configurável)

### Segurança Implementada

1. **Helmet**: Headers de segurança HTTP
2. **CORS**: Configuração de Cross-Origin Resource Sharing
3. **Rate Limiting**: Limitação de requisições por IP
4. **Validação de Dados**: Joi para validação de entrada
5. **Senhas**: Hash com bcryptjs (nunca armazenadas em texto plano)
6. **SQL Injection**: Prevenção via queries parametrizadas
7. **XSS**: Sanitização de entrada e escape de saída

### Permissões

**Perfis:**
- **Administrador**: Acesso total
- **Psicólogo**: Acesso a pacientes e avaliações próprias (ou todas, dependendo da configuração)
- **Secretário**: Acesso limitado a agendamentos e visualização

**Middleware:**
- `authenticateToken`: Verifica se o usuário está autenticado
- `isAdmin`: Verifica se o usuário é administrador

---

## 💻 Desenvolvimento

### Scripts Disponíveis

#### Backend (raiz: `D:\zite\palografico\codigo`)

```bash
npm start           # Iniciar em produção
npm run dev          # Iniciar em desenvolvimento (nodemon)
npm run dev:full     # Iniciar backend + frontend
npm run db:create    # Criar banco de dados
npm run migrate      # Executar migrações
npm run seed         # Popular dados iniciais
npm run setup        # Tudo de uma vez (db:create + migrate + seed)
```

#### Frontend (diretório: `frontend/frontend-nextjs`)

```bash
npm run dev          # Iniciar em desenvolvimento (porta 3000)
npm run build        # Build para produção
npm run start        # Iniciar build de produção
npm run lint         # Executar ESLint
npm run type-check   # Verificar tipos TypeScript
```

### Estrutura de Código

#### Backend

- **Modularização**: Rotas separadas por funcionalidade
- **Middleware**: Autenticação e validação reutilizáveis
- **Utils**: Funções utilitárias (processamento RENACH, NFS-e, etc.)
- **Migrations**: Migrações versionadas do banco

#### Frontend

- **App Router**: Next.js 13+ App Router
- **Componentes**: Componentes React reutilizáveis
- **Contexts**: Gerenciamento de estado global (Auth, Theme, etc.)
- **Hooks**: Custom hooks
- **Services**: Chamadas à API
- **Types**: Definições TypeScript

### Boas Práticas

1. **Backend:**
   - Sempre usar queries parametrizadas
   - Validar entrada com Joi
   - Tratar erros adequadamente
   - Logs para debugging
   - Código modular e reutilizável

2. **Frontend:**
   - TypeScript para type safety
   - Componentes funcionais com hooks
   - React Query para cache e sincronização
   - Validação de formulários
   - Feedback visual para o usuário

### Debugging

**Backend:**
- Logs no console
- Query logging ativado (desenvolvimento)
- Stack traces em desenvolvimento

**Frontend:**
- React DevTools
- Console do navegador
- Network tab para ver requisições

---

## 🚀 Deploy e Produção

### Preparação

1. **Variáveis de Ambiente:**
   - Configurar todas as variáveis em `.env`
   - Usar JWT_SECRET forte e único
   - Configurar CORS para domínio de produção
   - Configurar credenciais do banco de produção

2. **Banco de Dados:**
   - Criar banco de produção
   - Executar migrações
   - Fazer backup regularmente

3. **Build:**
   ```bash
   # Frontend
   cd frontend/frontend-nextjs
   npm run build
   ```

4. **Servidor:**
   - Usar PM2 ou similar para gerenciar processos
   - Configurar nginx ou outro reverse proxy
   - Configurar SSL/HTTPS

### Checklist de Produção

- [ ] Variáveis de ambiente configuradas
- [ ] JWT_SECRET alterado
- [ ] CORS configurado para domínio de produção
- [ ] Banco de dados de produção criado e migrado
- [ ] SSL/HTTPS configurado
- [ ] Rate limiting ativado
- [ ] Logs configurados
- [ ] Backup automatizado
- [ ] Monitoramento configurado
- [ ] Usuários padrão removidos ou senhas alteradas

---

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão com Banco de Dados

```
error: autenticação do tipo senha falhou para o usuário "postgres"
```

**Solução:**
- Verificar credenciais no `.env`
- Verificar se o PostgreSQL está rodando
- Verificar se o banco existe

#### 2. Porta já em uso

```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solução:**
- Matar processo na porta: `netstat -ano | findstr :3001` (Windows)
- Ou alterar porta no `.env`

#### 3. Dependências não instaladas

```
Error: Cannot find module 'express'
```

**Solução:**
```bash
npm install
```

#### 4. Erro de CORS

**Solução:**
- Verificar configuração de CORS no `server.js`
- Verificar origem da requisição

#### 5. Token expirado

```
error: Token expirado
```

**Solução:**
- Fazer logout e login novamente
- Aumentar tempo de expiração do token (desenvolvimento)

#### 6. Coluna não existe no banco

```
error: coluna "xxx" da relação "yyy" não existe
```

**Solução:**
- Executar migrações: `npm run migrate`
- Verificar se a migração foi executada

### Logs e Debug

**Backend:**
- Logs no console
- Verificar `server.js` para configuração de logs
- Query logging ativado em desenvolvimento

**Frontend:**
- Console do navegador
- Network tab
- React DevTools

---

## 📝 Histórico de Mudanças

### Versão Atual (2025-10-26)

#### Funcionalidades Adicionadas

1. **Separação de Telefones:**
   - Campos `telefone_fixo` e `telefone_celular` adicionados
   - Processamento automático de telefones separados por `/`
   - Exibição com ícones específicos (📞 fixo, 💬 celular/WhatsApp)
   - Suporte na importação em lote de agendamentos

2. **Cálculo Automático de Idade:**
   - Idade calculada automaticamente a partir de `data_nascimento`
   - Prevenção de erro `NULL` na coluna `idade`

3. **Validação Visual de Senhas:**
   - Validação em tempo real de "Nova Senha" e "Confirmar Nova Senha"
   - Bordas vermelhas quando não coincidem
   - Mensagem de erro visual

4. **Colunas RENACH:**
   - Adicionadas colunas `renach_arquivo`, `renach_foto`, `renach_data_upload`
   - Suporte completo para upload e processamento de documentos RENACH
   - Correção do erro "coluna renach_arquivo não existe" (31/10/2025)

#### Correções

1. **Correção de Coluna de Senha:**
   - Alterado `senha` para `senha_hash` na atualização de perfil
   - Correção do erro ao atualizar senha do usuário

2. **Correção de Agendamentos:**
   - Removida referência à coluna inexistente `aptidao` na tabela `agendamentos`
   - Adicionados campos `contexto`, `tipo_transito`, `categoria_cnh` ao update

3. **Correção de Conversão de Agendamento:**
   - Cálculo de idade antes de inserir em pacientes
   - Separação correta de telefones durante conversão

4. **Migrações de Banco:**
   - Migrações executadas para adicionar campos faltantes
   - Scripts temporários criados para correções de schema

#### Melhorias

1. **Interface de Pacientes:**
   - Exibição melhorada de telefones com ícones
   - Links diretos para WhatsApp e chamadas telefônicas

2. **Processamento de Telefones:**
   - Função `separarTelefones` para parsing inteligente
   - Identificação automática de fixo vs celular
   - Preservação de máscaras visuais

3. **Configurações:**
   - Busca automática de dados da clínica ao carregar página
   - Interface mais intuitiva

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Verificar esta documentação
2. Verificar logs do sistema
3. Verificar arquivo `COMANDOS-WINDOWS.md` para comandos específicos
4. Consultar código fonte (bem comentado)

---

## 📄 Licença

MIT License

---

**Última atualização:** 31/10/2025

### Mudanças Recentes (31/10/2025)

#### Correções de Banco de Dados

1. **Colunas RENACH Adicionadas:**
   - Executado script `adicionar-colunas-renach.js`
   - Adicionadas colunas `renach_arquivo` (TEXT), `renach_foto` (TEXT), `renach_data_upload` (TIMESTAMP)
   - Corrigido erro ao buscar arquivo RENACH via endpoint `/api/pacientes/:id/renach`
   - Suporte completo para armazenamento e recuperação de documentos RENACH

2. **Função `separarTelefones` Melhorada:**
   - Melhorias na detecção de telefones fixos vs celulares
   - Preservação de máscaras de apresentação
   - Tratamento correto de múltiplos telefones separados por `/`
   - Armazenamento apenas de números limpos na base de dados

**Versão do Sistema:** 1.0.0

