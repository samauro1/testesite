# Instruções para Atualizar Tabelas BPA-2

## Problema Identificado

As tabelas normativas do BPA-2 têm dados para **múltiplas idades e escolaridades**, mas o sistema não estava armazenando qual idade/escolaridade cada norma se refere, causando:
1. Busca incorreta de percentis (resultado "Fora da faixa normativa")
2. Impossibilidade de selecionar idade/escolaridade específica

## Solução

1. **Adicionar campo `valor_criterio`** na tabela `normas_bpa2` para identificar idade/escolaridade
2. **Repopular todas as tabelas** com o novo campo
3. **Atualizar busca** para usar percentil inferior quando entre dois valores (conforme manual)

## Passos para Executar

### 1. Executar Script SQL de Atualização

```bash
cd database/schemas
psql -U seu_usuario -d seu_banco -f 08-bpa2-tables-update.sql
```

Ou via Node.js:
```bash
cd backend
node -e "const db = require('./config/database'); const fs = require('fs'); const sql = fs.readFileSync('../database/schemas/08-bpa2-tables-update.sql', 'utf8'); db.query(sql).then(() => { console.log('✅ Schema atualizado'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"
```

### 2. Repopular Tabelas

```bash
cd database/scripts
node 06-popular-tabelas-bpa2-completo.js
```

### 3. Verificar

```bash
# Verificar se o campo foi adicionado
psql -U seu_usuario -d seu_banco -c "SELECT COUNT(*) as total, COUNT(DISTINCT valor_criterio) as criterios FROM normas_bpa2 WHERE valor_criterio IS NOT NULL;"
```

## O que foi Alterado

### Schema
- ✅ Adicionado campo `valor_criterio VARCHAR(50)` em `normas_bpa2`
- ✅ Criado índice para performance
- ✅ Atualizada constraint UNIQUE

### Código
- ✅ Backend: busca usa `valor_criterio` e percentil inferior
- ✅ Frontend: campos para selecionar idade/escolaridade
- ✅ Script de população: inclui `valor_criterio` nas inserções

### Lógica de Busca
- ✅ Usa percentil inferior quando entre dois valores (conforme manual)
- ✅ Prioriza idade específica, depois escolaridade, senão "Amostra Total"
- ✅ Busca: `pontos >= pontos_min AND pontos <= pontos_max ORDER BY percentil DESC LIMIT 1`


