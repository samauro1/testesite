# 📋 PLANO DE IMPLEMENTAÇÃO - TESTE AC

**Data:** 03 de Novembro de 2025  
**Status:** Em Desenvolvimento

---

## 🎯 OBJETIVOS

1. **Entrada Manual de Dados** ✅ (Prioridade Alta)
   - Interface para inserir acertos, erros, omissões
   - Cálculo automático: P = A - (E + O)
   - Busca de percentil em tabelas normativas
   - Classificação automática

2. **Processamento de Imagem** ⏳ (Prioridade Média)
   - Upload de imagem do teste preenchido
   - Upload de imagem do crivo (ou uso de crivo pré-carregado)
   - Detecção automática de acertos, erros, omissões
   - Validação manual (opcional)

3. **Integração com Tabelas Normativas** ✅ (Prioridade Alta)
   - Seleção automática baseada em região/escolaridade
   - Permissão para usuário escolher tabela manualmente
   - Suporte a todas as 6 tabelas regionais

---

## 📊 ESTRUTURA ATUAL

### Backend (Módulo Isolado)

```
backend/
├── routes/
│   └── ac.js                    # ✅ Criado - Rotas do AC
├── services/
│   ├── acCalculatorService.js  # ✅ Criado - Cálculo e percentil
│   └── acImageProcessor.js      # ⏳ Criado (estrutura) - Processamento de imagem
└── server.js                    # ✅ Atualizado - Rota /api/ac registrada
```

### Endpoints Disponíveis

1. **POST /api/ac/calcular** ✅
   - Entrada: `{ acertos, erros, omissoes, escolaridade?, tabela_id? }`
   - Saída: `{ pb, percentil, classificacao, tabela_utilizada }`

2. **GET /api/ac/tabelas** ✅
   - Lista tabelas normativas disponíveis
   - Filtros: `regiao`, `escolaridade`

3. **POST /api/ac/processar-imagem** ⏳
   - Estrutura criada, implementação pendente

---

## ✅ IMPLEMENTADO

### 1. Serviço de Cálculo (`acCalculatorService.js`)
- ✅ Função `calcularAC()` - Calcula PB = A - (E + O)
- ✅ Busca de percentil em tabelas normativas
- ✅ Classificação baseada em percentil
- ✅ Validação de dados de entrada
- ✅ Tratamento de erros

### 2. Rotas da API (`ac.js`)
- ✅ POST `/calcular` - Cálculo manual
- ✅ GET `/tabelas` - Lista de tabelas
- ✅ Validação de dados
- ✅ Tratamento de erros

---

## ⏳ PENDENTE

### 1. Frontend (Interface)
- [ ] Componente de entrada manual
- [ ] Campos: Acertos, Erros, Omissões
- [ ] Seleção de tabela normativa
- [ ] Exibição de resultados
- [ ] Upload de imagem (futuro)

### 2. Processamento de Imagem
- [ ] Instalar dependências (OpenCV, Sharp, etc.)
- [ ] Implementar detecção de símbolos
- [ ] Implementar detecção de círculos do crivo
- [ ] Implementar detecção de marcas
- [ ] Implementar detecção de cancelamentos
- [ ] Implementar comparação de posições
- [ ] Interface de upload de imagem

### 3. Tabelas Normativas
- [ ] Popular banco com tabelas do AC
- [ ] Estrutura: 6 regiões × 4 níveis de escolaridade
- [ ] Percentis: 1, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 99

---

## 🧪 TESTES

### Teste Manual (API)

```bash
# Testar cálculo
curl -X POST http://localhost:3002/api/ac/calcular \
  -H "Content-Type: application/json" \
  -d '{
    "acertos": 147,
    "erros": 1,
    "omissoes": 0,
    "escolaridade": "Ensino Superior"
  }'
```

### Casos de Teste

1. **Caso 1: Exemplo da Documentação**
   - Acertos: 106
   - Erros: 4
   - Omissões: 12
   - Esperado: PB = 90, Percentil = 50 (Médio)

2. **Caso 2: Imagem Fornecida**
   - Acertos: 147
   - Erros: 1
   - Omissões: 0
   - Esperado: PB = 146

3. **Caso 3: Validação**
   - Acertos: -10 (inválido)
   - Esperado: Erro 400

---

## 📝 PRÓXIMOS PASSOS

1. **Imediato:**
   - [ ] Testar API de cálculo manual
   - [ ] Criar interface frontend básica
   - [ ] Popular tabelas normativas no banco

2. **Curto Prazo:**
   - [ ] Implementar seleção de tabela
   - [ ] Melhorar validações
   - [ ] Adicionar logs detalhados

3. **Médio Prazo:**
   - [ ] Implementar processamento de imagem
   - [ ] Criar interface de upload
   - [ ] Testar com imagens reais

---

**Última atualização:** 03 de Novembro de 2025

