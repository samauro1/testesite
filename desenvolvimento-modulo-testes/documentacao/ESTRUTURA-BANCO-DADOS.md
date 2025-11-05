# 🗄️ ESTRUTURA DO BANCO DE DADOS - Módulo de Testes

Este documento descreve a estrutura completa do banco de dados para o módulo de testes isolado.

---

## 📊 TABELAS PRINCIPAIS

### 1. `testes_tipos`
Armazena os tipos de testes psicológicos disponíveis.

**Campos:**
- `id` (SERIAL PRIMARY KEY)
- `codigo` (VARCHAR(50) UNIQUE) - Código único do teste (ex: 'memore', 'mig')
- `nome` (VARCHAR(200)) - Nome completo do teste
- `descricao` (TEXT) - Descrição detalhada
- `ativo` (BOOLEAN) - Se o teste está ativo
- `created_at`, `updated_at` (TIMESTAMP)

**Exemplos:**
- MEMORE - Memória
- MIG - Avaliação Psicológica
- AC - Atenção Concentrada
- BETA-III - Raciocínio Matricial
- R-1 - Raciocínio
- ROTAS - Atenção (3 rotas)
- MVT - Memória Visual para Trânsito
- BPA-2 - Atenção
- Palográfico

---

### 2. `testes_campos`
Define os campos de entrada de cada tipo de teste.

**Campos:**
- `id` (SERIAL PRIMARY KEY)
- `teste_tipo_id` (INTEGER) - FK para testes_tipos
- `nome` (VARCHAR(100)) - Nome do campo (ex: 'vp', 'vn')
- `label` (VARCHAR(200)) - Rótulo para exibição
- `tipo` (VARCHAR(50)) - Tipo do campo ('number', 'text', 'select')
- `obrigatorio` (BOOLEAN) - Se o campo é obrigatório
- `min_valor`, `max_valor` (NUMERIC) - Valores mínimo e máximo
- `opcoes` (JSONB) - Opções para campos select
- `ordem` (INTEGER) - Ordem de exibição

**Exemplo para MEMORE:**
- vp (Verdadeiros Positivos) - number, 0-50
- vn (Verdadeiros Negativos) - number, 0-50
- fn (Falsos Negativos) - number, 0-50
- fp (Falsos Positivos) - number, 0-50

---

### 3. `testes_resultados`
Armazena os resultados calculados dos testes.

**Campos:**
- `id` (SERIAL PRIMARY KEY)
- `teste_tipo_id` (INTEGER) - FK para testes_tipos
- `paciente_id` (INTEGER) - FK para pacientes (sistema principal)
- `avaliacao_id` (INTEGER) - FK para avaliacoes (sistema principal)
- `dados_entrada` (JSONB) - Dados de entrada do teste
- `resultado_calculado` (JSONB) - Resultado completo calculado
- `tabela_normativa_id` (INTEGER) - Tabela normativa usada
- `interpretacao` (TEXT) - Interpretação do resultado
- `usuario_id` (INTEGER) - Usuário que aplicou o teste
- `created_at`, `updated_at` (TIMESTAMP)

**Estrutura JSONB exemplo:**
```json
{
  "dados_entrada": {
    "vp": 45,
    "vn": 12,
    "fn": 3,
    "fp": 2
  },
  "resultado_calculado": {
    "sensibilidade": 0.9375,
    "especificidade": 0.8571,
    "classificacao": "Normal"
  }
}
```

---

### 4. `testes_gabaritos`
Gabaritos para correção automática de testes.

**Campos:**
- `id` (SERIAL PRIMARY KEY)
- `teste_tipo_id` (INTEGER) - FK para testes_tipos
- `versao` (VARCHAR(50)) - Versão do gabarito
- `gabarito` (JSONB) - Estrutura do gabarito
- `ativo` (BOOLEAN) - Se o gabarito está ativo
- `created_at` (TIMESTAMP)

---

### 5. `testes_historico`
Histórico de aplicações de testes.

**Campos:**
- `id` (SERIAL PRIMARY KEY)
- `teste_resultado_id` (INTEGER) - FK para testes_resultados
- `paciente_id` (INTEGER)
- `avaliacao_id` (INTEGER)
- `tipo_teste` (VARCHAR(50))
- `data_aplicacao` (TIMESTAMP)
- `usuario_id` (INTEGER)
- `observacoes` (TEXT)

---

## 🔗 RELACIONAMENTOS COM SISTEMA PRINCIPAL

O módulo isolado será integrado com as seguintes tabelas do sistema principal:

- `pacientes` - Dados dos pacientes
- `avaliacoes` - Avaliações psicológicas
- `tabelas_normativas` - Tabelas normativas (já existente)
- `usuarios` - Usuários do sistema

---

## 📝 NOTAS DE IMPLEMENTAÇÃO

1. **Banco Separado:** Use `sistema_testes_desenvolvimento` durante desenvolvimento
2. **Schema Separado:** Alternativamente, use schema `testes_dev` no mesmo banco
3. **Integração:** Ao integrar, os FKs serão ajustados para apontar ao banco principal

---

**Última atualização:** 03 de Novembro de 2025

