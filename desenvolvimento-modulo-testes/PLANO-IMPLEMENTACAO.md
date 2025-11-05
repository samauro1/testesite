# Plano de Implementação - Módulo de Avaliação Psicológica

## 📋 Análise da Estrutura Proposta

### Status Atual
- ✅ Teste AC implementado e funcional
- ✅ Cálculo automático de pontos (PB = A - (E + O))
- ✅ Seleção inteligente de tabelas normativas
- ✅ Interface básica funcional
- ✅ Tabelas normativas do AC populadas

### Próximos Passos

## 1. EXPANSÃO DO BANCO DE DADOS

### Arquivos a Criar:
- `database/schemas/03-palografico-tables.sql` - Tabelas normativas do Palográfico
- `database/schemas/04-atencao-tables.sql` - Tabelas normativas de Atenção
- `database/schemas/05-memoria-tables.sql` - Tabelas normativas de Memória
- `database/schemas/06-test-results.sql` - Tabela de resultados de testes
- `database/schemas/07-laudos.sql` - Tabela de laudos periciais

### Estrutura Proposta:
```sql
-- Tabelas normativas do Palográfico
- palografico_normativas (região, sexo, escolaridade, idade, produtividade, NOR, tamanho, distância)

-- Tabelas normativas de Atenção
- atencao_normativas (região, escolaridade, faixas de pontuação)

-- Resultados de testes
- test_results_quantitativa (dados brutos, cálculos)
- test_results_qualitativa (interpretações qualitativas)
- test_images (imagens analisadas, OCR, IA)

-- Laudos
- laudos_periciais (documentos finais, PDF, Word, assinatura)
```

## 2. BACKEND - ROTAS E CÁLCULOS

### Arquivos a Criar:
- `backend/routes/palografico.js` - Rotas para teste Palográfico
- `backend/routes/atencao.js` - Rotas para teste de Atenção (expandir AC)
- `backend/routes/memoria.js` - Rotas para teste de Memória
- `backend/routes/laudos.js` - Rotas para geração de laudos
- `backend/utils/palograficoCalculator.js` - Cálculos do Palográfico
- `backend/utils/aiAnalyzer.js` - Análise de imagens com IA
- `backend/utils/reportGenerator.js` - Geração de PDF/Word

### Funcionalidades:
- Cálculo automático de Produtividade, NOR, Tamanho, Distância
- Classificação contra tabelas normativas
- Upload e análise de imagens
- Geração de laudos contextualizados

## 3. FRONTEND - COMPONENTES

### Arquivos a Criar:
- `frontend/components/TestCorrector.tsx` - Corretor principal de testes
- `frontend/components/PalograficoCalculator.tsx` - Calculadora do Palográfico
- `frontend/components/ImageUploader.tsx` - Upload e análise de imagens
- `frontend/components/TableSelector.tsx` - Seletor de tabelas normativas
- `frontend/components/ReportPreview.tsx` - Preview de laudo
- `frontend/pages/testes/[testId]/correcao.tsx` - Página de correção

### Funcionalidades:
- Interface multi-step (entrada → cálculo → tabela → resultado)
- Upload de imagem com preview
- Análise automática com feedback visual
- Seleção dinâmica de tabelas normativas
- Preview de laudo antes de gerar

## 4. INTEGRAÇÃO COM IA

### APIs Sugeridas:
- OpenAI GPT-4 Vision (análise de imagens)
- Tesseract.js (OCR para texto)
- Claude Vision (alternativa)

### Funcionalidades:
- Extração automática de dados de imagens
- Validação de dados extraídos vs. manual
- Sugestões de correção
- Análise qualitativa (pressão, inclinação, organização)

## 5. GERADOR DE LAUDOS

### Bibliotecas:
- `pdfkit` ou `jspdf` (PDF)
- `docx` (Word)

### Funcionalidades:
- Template de laudo (máx. 2 páginas)
- Interpretação automática contextualizada
- Parecer final (Apto/Inapto/Inapto Temporário)
- Assinatura digital
- Exportação PDF e Word

## 6. ORDEM DE IMPLEMENTAÇÃO

### Fase 1: Base de Dados (Prioridade Alta)
1. ✅ Tabelas normativas do AC
2. ⏳ Tabelas normativas do Palográfico
3. ⏳ Tabelas normativas de Atenção
4. ⏳ Tabela de resultados de testes
5. ⏳ Tabela de laudos

### Fase 2: Cálculos (Prioridade Alta)
1. ✅ Cálculo do AC
2. ⏳ Cálculo do Palográfico (Produtividade, NOR, Tamanho, Distância)
3. ⏳ Cálculo de Atenção (expandir AC)
4. ⏳ Classificação automática

### Fase 3: Interface (Prioridade Média)
1. ✅ Interface básica do AC
2. ⏳ Interface do Palográfico
3. ⏳ Seletor de tabelas avançado
4. ⏳ Upload de imagens

### Fase 4: IA e Laudos (Prioridade Baixa - Futuro)
1. ⏳ Integração com IA para análise de imagens
2. ⏳ Gerador de laudos
3. ⏳ Assinatura digital

## 7. COMPATIBILIDADE COM SISTEMA ATUAL

### Adaptações Necessárias:
- Usar PostgreSQL (não MySQL) - já configurado
- Integrar com sistema de pacientes existente
- Usar autenticação do sistema principal
- Manter isolamento do módulo de desenvolvimento

## 8. PRÓXIMAS AÇÕES IMEDIATAS

1. **Expandir calculadora do AC** para incluir todos os testes de atenção
2. **Criar estrutura do Palográfico** (schema + cálculos básicos)
3. **Melhorar interface** com timeline multi-step
4. **Implementar seletor de tabelas** mais robusto

---

**Status**: Análise completa - Pronto para implementação faseada

