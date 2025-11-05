# 🛠️ COMO TRABALHAR NO MÓDULO ISOLADO

Guia prático para começar a desenvolver o módulo de testes isolado.

---

## 🚀 INÍCIO RÁPIDO

### 1. Executar Setup Automatizado

```powershell
cd E:\sistemas\desenvolvimento-modulo-testes
.\SETUP-AMBIENTE.ps1
```

### 2. Configurar Banco de Dados

```sql
-- Conectar ao PostgreSQL
psql -U postgres

-- Criar banco de dados isolado
CREATE DATABASE sistema_testes_desenvolvimento;

-- Sair
\q
```

### 3. Executar Migrações

```bash
cd E:\sistemas\desenvolvimento-modulo-testes
psql -U postgres -d sistema_testes_desenvolvimento -f database\schemas\01-create-tables.sql
```

### 4. Editar .env

Edite `backend\.env` com suas credenciais do PostgreSQL.

### 5. Iniciar Servidor

```bash
cd backend
npm start
```

Servidor estará em: **http://localhost:3002**

---

## 📁 ESTRUTURA DE TRABALHO

### Backend (E:\sistemas\desenvolvimento-modulo-testes\backend\)

```
backend/
├── routes/
│   └── testes.js          # ← Criar aqui as rotas da API
│
├── services/
│   ├── testCalculatorService.js    # ← Lógica de cálculo
│   ├── tabelaNormativaService.js   # ← Seleção de tabelas
│   └── validacaoService.js         # ← Validações
│
├── utils/
│   └── tabelaNormativaSelector.js  # ← Copiar do sistema principal
│
├── config/
│   └── database.js        # ← Já configurado
│
└── server.js              # ← Servidor Express
```

### Frontend (será criado quando necessário)

```
frontend/
└── src/
    ├── app/
    │   └── testes/
    │       └── page.tsx   # ← Nova interface de testes
    └── components/
        └── testes/        # ← Componentes específicos
```

---

## 🔍 ANÁLISE DO CÓDIGO ATUAL

### Arquivos para Analisar:

1. **`backend/routes/tabelas-original.js`**
   - Rotas atuais de cálculo de testes
   - Lógica de cada teste (MEMORE, MIG, AC, etc.)
   - Integração com banco de dados

2. **`frontend/testes-original.tsx`**
   - Interface atual de testes
   - Componentes e formulários
   - Lógica de frontend

### Onde Começar:

1. **Analisar** os arquivos `-original.js` e `-original.tsx`
2. **Identificar** problemas e melhorias necessárias
3. **Planejar** a refatoração
4. **Implementar** no ambiente isolado

---

## 💻 COMANDOS ÚTEIS

### Iniciar Servidor de Desenvolvimento

```bash
cd E:\sistemas\desenvolvimento-modulo-testes\backend
npm start          # Produção
npm run dev        # Desenvolvimento (com nodemon)
```

### Testar Rotas da API

```bash
# Testar saúde do servidor
curl http://localhost:3002/health

# Testar rota principal
curl http://localhost:3002/
```

### Verificar Banco de Dados

```bash
psql -U postgres -d sistema_testes_desenvolvimento

# Listar tabelas
\dt

# Ver estrutura de uma tabela
\d testes_tipos
```

---

## 📝 WORKFLOW DE DESENVOLVIMENTO

### 1. Criar Rota de Teste

```javascript
// backend/routes/testes.js
router.post('/:tipo/calcular', async (req, res) => {
  // Implementar lógica de cálculo
});
```

### 2. Testar Localmente

```bash
# Iniciar servidor
npm start

# Testar com curl ou Postman
curl -X POST http://localhost:3002/api/testes/memore/calcular \
  -H "Content-Type: application/json" \
  -d '{"vp": 45, "vn": 12, "fn": 3, "fp": 2}'
```

### 3. Validar Resultados

- Verificar cálculos
- Validar integração com banco
- Testar diferentes cenários

### 4. Documentar

- Adicionar comentários no código
- Atualizar documentação
- Registrar mudanças

---

## 🎯 TAREFAS PRIORITÁRIAS

### Fase 1: Estrutura Base
- [ ] Criar rotas básicas da API
- [ ] Implementar sistema de tipos de testes
- [ ] Criar estrutura de campos dinâmicos

### Fase 2: Lógica de Cálculo
- [ ] Implementar calculadora MEMORE
- [ ] Implementar calculadora MIG
- [ ] Implementar calculadora AC
- [ ] Implementar outros testes

### Fase 3: Interface
- [ ] Criar componente de seleção de teste
- [ ] Criar formulário dinâmico
- [ ] Criar exibição de resultados

---

## 🔗 INTEGRAÇÃO COM SISTEMA PRINCIPAL (Futuro)

Quando o módulo estiver pronto:

1. Testar tudo no ambiente isolado
2. Criar scripts de migração
3. Fazer backup do sistema principal
4. Integrar seguindo `GUIA-INTEGRACAO.md`

---

## ⚠️ LEMBRETES IMPORTANTES

- ✅ **NUNCA** modifique arquivos do sistema principal durante desenvolvimento
- ✅ Use porta **3002** para backend (sistema principal usa 3001)
- ✅ Use banco de dados **separado** (`sistema_testes_desenvolvimento`)
- ✅ Documente todas as mudanças
- ✅ Teste tudo antes de integrar

---

**Boa sorte no desenvolvimento! 🚀**

