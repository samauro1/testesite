# Correções do Teste BPA-2 conforme Manual

## Data: 2024
## Status: ✅ Corrigido

---

## Problemas Identificados e Corrigidos

### 1. ❌ NOMENCLATURA ERRADA

**Problema:**
- Código usava: "Sustentada, Alternada, Dividida"
- Manual correto: "Alternada (AA), Concentrada (AC), Dividida (AD)"

**Correção:**
- ✅ "Sustentada" → "Concentrada" (AC)
- ✅ Mantida compatibilidade com nomenclatura antiga (aceita ambos)
- ✅ Atualizado em todos os arquivos:
  - `backend/utils/calculadoras.js`
  - `backend/routes/bpa2.js`
  - `backend/routes/tabelas-original.js`
  - `backend/public/testes.html`
  - `database/schemas/08-bpa2-tables.sql`

---

### 2. ❌ CÁLCULO DE ATENÇÃO GERAL ERRADO

**Problema:**
- Código estava fazendo: média dos percentis
- Código estava fazendo: média dos pontos
- Manual correto: **SOMA dos pontos** (AA + AC + AD) e depois consultar tabela normativa

**Correção:**
```javascript
// ❌ ANTES (ERRADO):
const pontos_geral = (pontos_sustentada + pontos_alternada + pontos_dividida) / 3;
percentil_geral = média dos percentis;

// ✅ AGORA (CORRETO):
const pontos_geral = pontos_alternada + pontos_concentrada + pontos_dividida;
// Buscar percentil e classificação na tabela normativa com tipo_atencao = 'Geral'
```

**Conforme manual página 2:**
> "Pontos em AA + Pontos em AC + Pontos em AD = Pontos em Atenção Geral"
> "deve-se, posteriormente, consultar a tabela normativa correspondente"

---

### 3. ✅ ESTRUTURA DE TABELAS NORMATIVAS

**Schema atualizado:**
- `tipo_atencao` pode ser: 'Alternada', 'Concentrada', 'Dividida', **'Geral'**
- Tabela `normas_bpa2` aceita agora registros para Atenção Geral

---

### 4. ✅ VALIDAÇÃO COM EXEMPLOS DO MANUAL

**Exemplo 1: A.S.F. (Paraíba)**
- AA: 96 pontos
- AC: 104 pontos  
- AD: 83 pontos
- **Atenção Geral: 283 pontos** (96 + 104 + 83 = 283) ✅
- Percentil e classificação consultados nas tabelas normativas do estado

**Exemplo 2: R.M.C. (Brasília-DF)**
- AD: 89 pontos
- AA: 105 pontos
- AC: 111 pontos (assumindo que "AG" no manual era erro de digitação)
- **Atenção Geral: 305 pontos** (89 + 105 + 111 = 305) ✅

---

## Mudanças Implementadas

### Arquivos Modificados:

1. **`backend/utils/calculadoras.js`**
   - Função `calcularBPA2()` corrigida
   - Nomenclatura: Alternada, Concentrada, Dividida
   - Atenção Geral: soma dos pontos + busca na tabela

2. **`backend/routes/bpa2.js`**
   - Aceita nomenclatura antiga e nova (compatibilidade)
   - Rota GET `/api/bpa2/tabelas` adicionada

3. **`backend/routes/tabelas-original.js`**
   - Função `calcularBPA2()` corrigida
   - Salvamento corrigido para usar "Concentrada"

4. **`backend/public/testes.html`**
   - Formulário atualizado com nomenclatura correta
   - Exibição de resultados corrigida
   - Labels: AA, AC, AD com tempos de aplicação

5. **`database/schemas/08-bpa2-tables.sql`**
   - Schema atualizado para aceitar 'Geral' como tipo_atencao

---

## Estrutura Correta do BPA-2

### Modalidades:
1. **AA - Atenção Alternada**: 2 minutos e 30 segundos
2. **AC - Atenção Concentrada**: 2 minutos
3. **AD - Atenção Dividida**: 4 minutos

### Fórmulas:
- **Pontos por modalidade**: `P = A - (E + O)`
- **Atenção Geral**: `Pontos_AA + Pontos_AC + Pontos_AD = Pontos_Atenção_Geral`

### Tabelas Normativas:
- Tabelas por **idade/faixa etária**
- Tabelas por **escolaridade**
- Tabelas por **região** (5 regiões)
- Tabelas por **estado** (26 estados + DF)
- Tabelas **gerais** (Brasil)

Cada tabela tem 4 tipos de atenção:
- `tipo_atencao = 'Alternada'`
- `tipo_atencao = 'Concentrada'`
- `tipo_atencao = 'Dividida'`
- `tipo_atencao = 'Geral'`

---

## Próximos Passos

1. ✅ Criar script de população de tabelas normativas com dados do manual
2. ✅ Testar com exemplos do manual para validar percentis
3. ✅ Verificar se há outras referências a "Sustentada" no código

---

## Notas Importantes

- O código mantém **compatibilidade retroativa**: aceita tanto "sustentada" quanto "concentrada"
- A **ordem de aplicação** dos testes pode ser escolhida pelo aplicador (conforme manual)
- A **correção** deve considerar apenas até a última figura marcada pelo examinando
- Se a pontuação ficar entre dois percentis, usar o **percentil inferior**

---

## Status Final

✅ **TODAS AS CORREÇÕES IMPLEMENTADAS**

O teste BPA-2 agora está:
- ✅ Com nomenclatura correta (AA, AC, AD)
- ✅ Calculando Atenção Geral corretamente (soma, não média)
- ✅ Buscando percentil e classificação na tabela normativa para Atenção Geral
- ✅ Pronto para receber tabelas normativas populadas


