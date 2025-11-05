# Correções BPA-2: Suporte a Idade/Escolaridade Específica

## Data: 2024
## Status: ✅ Implementado (aguardando execução do script de atualização)

---

## Problemas Identificados

### 1. ❌ Tabelas Desorganizadas e Faltantes
- **Problema**: As tabelas normativas do BPA-2 têm dados para múltiplas idades/escolaridades, mas o sistema não permitia selecionar a idade/escolaridade específica
- **Causa**: O banco de dados não armazenava qual idade/escolaridade cada norma se referia

### 2. ❌ Classificação "Fora da faixa normativa"
- **Problema**: Mesmo com tabelas populadas, os resultados mostravam "Fora da faixa normativa"
- **Causa**: 
  - Busca não filtrava por idade/escolaridade específica
  - Busca usava `BETWEEN` que pode falhar em casos de limites
  - Não seguia regra do manual: "usar percentil inferior quando entre dois percentis"

---

## Soluções Implementadas

### 1. ✅ Adicionado Campo `valor_criterio`
- **Schema**: Criado `database/schemas/08-bpa2-tables-update.sql`
- **Campo**: `valor_criterio VARCHAR(50)` em `normas_bpa2`
- **Valores**: 
  - Idades: "6 anos", "7 anos", "15-17 anos", etc.
  - Escolaridade: "Ensino Fundamental", "Ensino Médio/Técnico/Profissionalizante", etc.
  - Padrão: "Amostra Total"

### 2. ✅ Script de População Atualizado
- **Arquivo**: `database/scripts/06-popular-tabelas-bpa2-completo.js`
- **Mudança**: Agora inclui `valor_criterio` em todas as inserções
- **Cada norma** armazena para qual idade/escolaridade ela se refere

### 3. ✅ Busca Corrigida (Percentil Inferior)
- **Arquivo**: `backend/utils/calculadoras.js`
- **Lógica**: 
  ```sql
  WHERE valor_criterio = $1
    AND pontos >= pontos_min 
    AND (pontos <= pontos_max OR pontos_max = 999)
  ORDER BY percentil DESC
  LIMIT 1
  ```
- **Comportamento**: 
  - Se pontuação está entre dois percentis → usa o **percentil inferior** (conforme manual)
  - Busca específica por idade/escolaridade
  - Fallback para "Amostra Total" se não encontrar

### 4. ✅ Frontend Atualizado
- **Arquivo**: `backend/public/testes.html`
- **Adicionado**:
  - Dropdown para selecionar **Idade/Faixa Etária**
  - Dropdown para selecionar **Escolaridade**
  - Lógica para enviar esses valores ao backend

### 5. ✅ Backend Atualizado
- **Arquivo**: `backend/routes/bpa2.js`
- **Recebe**: `idade`, `escolaridade`, `valor_criterio`
- **Passa**: Para `calcularBPA2()` que usa na busca

---

## Como Executar a Atualização

### Opção 1: Script Automático (Recomendado)

```bash
cd database/scripts
node atualizar-bpa2-completo.js
```

### Opção 2: Manual

1. **Atualizar Schema**:
```bash
cd database/schemas
psql -U seu_usuario -d seu_banco -f 08-bpa2-tables-update.sql
```

2. **Repopular Tabelas**:
```bash
cd database/scripts
node 06-popular-tabelas-bpa2-completo.js
```

---

## Como Usar o Sistema Atualizado

1. **Selecionar Tabela Normativa**:
   - Escolha uma tabela (ex: "BPA-2 - Brasil - AA por Idade/Faixa Etária")

2. **Selecionar Idade OU Escolaridade**:
   - Se tabela é por **idade**: selecione a idade específica (ex: "15-17 anos")
   - Se tabela é por **escolaridade**: selecione a escolaridade (ex: "Ensino Fundamental")
   - Se não selecionar: usa "Amostra Total" (padrão)

3. **Inserir Dados e Calcular**:
   - O sistema buscará normas específicas para a idade/escolaridade selecionada
   - Percentis e classificações serão calculados corretamente

---

## Estrutura das Tabelas Normativas

### Por Idade/Faixa Etária
- Cada tabela tem normas para: 6 anos, 7 anos, 8 anos, ..., 15-17 anos, 18-20 anos, ..., 81 anos ou mais, Amostra Total
- **Exemplo**: Tabela "BPA-2 - Brasil - AA por Idade" → tem normas para cada idade

### Por Escolaridade
- Cada tabela tem normas para: Não alfabetizado, Ensino Fundamental, Ensino Médio/Técnico/Profissionalizante, Ensino Superior e/ou Pós-Graduação, Amostra Total
- **Exemplo**: Tabela "BPA-2 - Brasil - AA por Escolaridade" → tem normas para cada nível de escolaridade

---

## Regra do Manual: Percentil Inferior

> "No momento de consultar as normas de interpretação dos testes, pode ocorrer de determinada pontuação ficar localizada entre dois percentis. Nesse caso, deve-se considerar o percentil inferior."

**Implementação**:
- Busca: `ORDER BY percentil DESC LIMIT 1`
- Isso garante que, se a pontuação está entre dois percentis, usa o menor (inferior)

---

## Arquivos Modificados

1. ✅ `database/schemas/08-bpa2-tables-update.sql` - Adiciona campo `valor_criterio`
2. ✅ `database/scripts/06-popular-tabelas-bpa2-completo.js` - Inclui `valor_criterio` nas inserções
3. ✅ `backend/utils/calculadoras.js` - Busca corrigida com percentil inferior
4. ✅ `backend/routes/bpa2.js` - Recebe e passa idade/escolaridade
5. ✅ `backend/public/testes.html` - Campos para selecionar idade/escolaridade
6. ✅ `database/scripts/atualizar-bpa2-completo.js` - Script de atualização automática

---

## Status

- ✅ Código implementado
- ⏳ **Aguardando**: Execução do script de atualização do banco de dados
- ⏳ **Aguardando**: Repopulação das tabelas com `valor_criterio`

---

## Próximos Passos

1. Executar script de atualização
2. Testar com diferentes idades/escolaridades
3. Verificar se percentis e classificações aparecem corretamente
4. Popular todas as 24 tabelas do manual (Brasil, Sudeste, São Paulo)


