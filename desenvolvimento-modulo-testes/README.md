# 🔬 Módulo de Testes - Ambiente de Desenvolvimento Isolado

**Data de Criação:** 03 de Novembro de 2025  
**Status:** Desenvolvimento Isolado  
**Localização:** `E:\sistemas\desenvolvimento-modulo-testes`

---

## 📋 OBJETIVO

Este é um ambiente de desenvolvimento **ISOLADO** para refatorar e melhorar o módulo de testes psicológicos sem afetar o sistema atual que está funcionando.

**Princípio:** Desenvolver → Testar → Integrar

---

## 🏗️ ESTRUTURA DO PROJETO

```
desenvolvimento-modulo-testes/
├── backend/                    # Backend isolado (Node.js/Express)
│   ├── routes/                # Rotas da API de testes
│   ├── middleware/            # Middlewares (auth, validation)
│   ├── utils/                  # Utilitários (cálculos, seleção de tabelas)
│   ├── config/                 # Configurações (database, etc.)
│   ├── scripts/                # Scripts de setup e migrações
│   └── server.js              # Servidor Express isolado
│
├── frontend/                   # Frontend isolado (Next.js)
│   └── src/
│       ├── app/
│       │   └── testes/         # Página de testes
│       ├── components/         # Componentes específicos de testes
│       └── services/           # Serviços de API
│
├── database/                   # Scripts e schemas de banco
│   ├── migrations/             # Migrações de banco de dados
│   └── schemas/                # Schemas SQL
│
├── documentacao/               # Documentação do módulo
│   ├── PLANO-DESENVOLVIMENTO.md
│   ├── ESTRUTURA-BANCO-DADOS.md
│   └── GUIA-INTEGRACAO.md
│
└── README.md                   # Este arquivo
```

---

## 🚀 INÍCIO RÁPIDO

### 1. Setup do Ambiente

```bash
cd E:\sistemas\desenvolvimento-modulo-testes

# Instalar dependências do backend
cd backend
npm init -y
npm install express cors dotenv pg joi bcryptjs jsonwebtoken

# Instalar dependências do frontend (quando criado)
cd ../frontend
npm init -y
npm install next react react-dom
```

### 2. Configuração do Banco de Dados

**Opção A - Banco de Dados Separado (RECOMENDADO):**
```sql
CREATE DATABASE sistema_testes_desenvolvimento;
```

**Opção B - Schema Separado no Mesmo Banco:**
```sql
CREATE SCHEMA testes_dev;
```

### 3. Executar Migrações

```bash
cd database/migrations
psql -U postgres -d sistema_testes_desenvolvimento -f 01-create-tables.sql
```

### 4. Iniciar Servidor de Desenvolvimento

```bash
# Backend (porta 3002 para não conflitar)
cd backend
node server.js

# Frontend (porta 3003 para não conflitar)
cd frontend
npm run dev
```

---

## 📊 FUNCIONALIDADES A DESENVOLVER

### Testes Psicológicos Suportados:
- ✅ MEMORE (Memória)
- ✅ MIG (Avaliação Psicológica)
- ✅ AC (Atenção Concentrada)
- ✅ BETA-III (Raciocínio Matricial)
- ✅ R-1 (Raciocínio)
- ✅ ROTAS (Atenção - 3 rotas)
- ✅ MVT (Memória Visual para Trânsito)
- ✅ BPA-2 (Atenção)
- ✅ Palográfico

### Funcionalidades Planejadas:
- [ ] Sistema de correção automática
- [ ] Seleção inteligente de tabelas normativas
- [ ] Interface melhorada
- [ ] Validações aprimoradas
- [ ] Histórico de testes
- [ ] Relatórios detalhados
- [ ] Exportação de resultados

---

## 🔄 PROCESSO DE INTEGRAÇÃO (Quando Finalizado)

1. **Fase de Testes:**
   - Testar todas as funcionalidades no ambiente isolado
   - Validar cálculos e resultados
   - Verificar integração com banco de dados

2. **Fase de Preparação:**
   - Documentar mudanças
   - Criar scripts de migração
   - Preparar backup do sistema atual

3. **Fase de Integração:**
   - Substituir arquivos antigos pelos novos
   - Executar migrações de banco
   - Testar integração com outros módulos

4. **Fase de Validação:**
   - Testes completos no sistema integrado
   - Validação com usuários
   - Ajustes finais

---

## 📝 DOCUMENTAÇÃO

Consulte a pasta `documentacao/` para:
- Plano de desenvolvimento detalhado
- Estrutura do banco de dados
- Guia de integração passo a passo
- Especificações técnicas

---

## ⚠️ IMPORTANTE

- Este ambiente é **TOTALMENTE ISOLADO** do sistema principal
- Não modifique arquivos do sistema principal durante o desenvolvimento
- Use portas diferentes (3002 para backend, 3003 para frontend)
- Use banco de dados separado ou schema separado
- Mantenha documentação atualizada

---

**Última atualização:** 03 de Novembro de 2025

