# 🚀 INÍCIO RÁPIDO - Módulo de Testes Isolado

Guia rápido para começar a trabalhar no módulo de testes isolado.

---

## ⚡ SETUP RÁPIDO (5 minutos)

### 1. Criar Banco de Dados

```sql
-- Conectar ao PostgreSQL
psql -U postgres

-- Criar banco separado para desenvolvimento
CREATE DATABASE sistema_testes_desenvolvimento;

-- Sair
\q
```

### 2. Configurar Variáveis de Ambiente

Crie `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME_TESTES=sistema_testes_desenvolvimento
DB_USER=postgres
DB_PASSWORD=sua_senha
PORT=3002
JWT_SECRET=dev_secret_key
```

### 3. Instalar Dependências

```bash
cd E:\sistemas\desenvolvimento-modulo-testes\backend
npm install
```

### 4. Executar Migrações

```bash
psql -U postgres -d sistema_testes_desenvolvimento -f database/schemas/01-create-tables.sql
```

### 5. Iniciar Servidor

```bash
npm start
```

Servidor estará rodando em: **http://localhost:3002**

---

## 📁 ESTRUTURA DE ARQUIVOS

```
desenvolvimento-modulo-testes/
├── backend/
│   ├── routes/          # Rotas da API
│   ├── services/        # Lógica de negócio
│   ├── utils/           # Utilitários
│   ├── config/          # Configurações
│   └── server.js        # Servidor Express
│
├── frontend/            # Frontend (será criado)
├── database/            # Scripts SQL
└── documentacao/        # Documentação
```

---

## 🎯 PRÓXIMOS PASSOS

1. Analisar código atual em `backend/routes/tabelas-original.js`
2. Analisar interface atual em `frontend/testes-original.tsx`
3. Criar novas rotas otimizadas
4. Criar nova interface melhorada
5. Implementar sistema de correção automática
6. Testar tudo no ambiente isolado
7. Integrar ao sistema principal (quando finalizado)

---

## ✅ CHECKLIST DE DESENVOLVIMENTO

- [ ] Banco de dados criado
- [ ] Dependências instaladas
- [ ] Migrações executadas
- [ ] Servidor rodando
- [ ] Análise do código atual concluída
- [ ] Plano de refatoração definido
- [ ] Desenvolvimento iniciado

---

**Boa sorte no desenvolvimento! 🚀**

