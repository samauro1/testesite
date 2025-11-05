# 📋 PLANO DE DESENVOLVIMENTO - MÓDULO DE TESTES

**Data de Início:** 03 de Novembro de 2025  
**Status:** Planejamento

---

## 🎯 OBJETIVOS

1. Refatorar completamente o módulo de testes psicológicos
2. Melhorar interface e experiência do usuário
3. Implementar sistema de correção automática robusto
4. Criar sistema de seleção inteligente de tabelas normativas
5. Adicionar validações e tratamento de erros aprimorados

---

## 📦 COMPONENTES A DESENVOLVER

### 1. Backend (API)

#### Rotas:
- `GET /api/testes/tipos` - Listar tipos de testes disponíveis
- `GET /api/testes/:tipo/campos` - Obter campos de um teste específico
- `POST /api/testes/:tipo/calcular` - Calcular resultado de um teste
- `POST /api/testes/:tipo/validar` - Validar dados antes de calcular
- `GET /api/testes/:tipo/tabelas-normativas` - Listar tabelas disponíveis
- `POST /api/testes/:tipo/sugerir-tabela` - Sugerir tabela baseada no paciente
- `GET /api/testes/historico/:paciente_id` - Histórico de testes do paciente

#### Serviços:
- `testCalculatorService.js` - Lógica de cálculo de todos os testes
- `tabelaNormativaService.js` - Seleção e gerenciamento de tabelas
- `validacaoService.js` - Validações específicas por teste
- `correcaoAutomaticaService.js` - Sistema de correção automática

### 2. Frontend (Interface)

#### Componentes:
- `TestSelector.tsx` - Seletor de tipo de teste
- `TestForm.tsx` - Formulário dinâmico baseado no tipo de teste
- `TestResultDisplay.tsx` - Exibição de resultados
- `TabelaNormativaSelector.tsx` - Seletor de tabela normativa
- `HistoricoTestes.tsx` - Histórico de testes do paciente
- `TestCorrector.tsx` - Sistema de correção automática

#### Páginas:
- `page.tsx` - Página principal de testes (refatorada)

### 3. Banco de Dados

#### Tabelas Principais:
- `testes_tipos` - Tipos de testes disponíveis
- `testes_campos` - Campos de cada tipo de teste
- `testes_resultados` - Resultados dos testes
- `tabelas_normativas` - Tabelas normativas (já existe, adaptar)
- `testes_gabaritos` - Gabaritos de correção
- `testes_historico` - Histórico de aplicações

---

## 🔄 FLUXO DE DESENVOLVIMENTO

### Fase 1: Estrutura Base (Semana 1)
- [ ] Criar estrutura de pastas
- [ ] Configurar banco de dados isolado
- [ ] Criar rotas básicas da API
- [ ] Setup do frontend isolado

### Fase 2: Lógica de Cálculo (Semana 2)
- [ ] Implementar calculadoras para cada teste
- [ ] Sistema de validação de dados
- [ ] Testes unitários das calculadoras

### Fase 3: Interface (Semana 3)
- [ ] Componentes de formulário dinâmicos
- [ ] Sistema de seleção de tabelas
- [ ] Exibição de resultados

### Fase 4: Correção Automática (Semana 4)
- [ ] Sistema de gabaritos
- [ ] Correção automática
- [ ] Validação de respostas

### Fase 5: Integração (Semana 5)
- [ ] Preparar integração com sistema principal
- [ ] Scripts de migração
- [ ] Testes de integração

---

## 📊 PRIORIDADES

### Alta Prioridade:
1. ✅ Estrutura base do projeto
2. ⏳ Sistema de cálculo de testes
3. ⏳ Interface básica funcional

### Média Prioridade:
4. ⏳ Seleção inteligente de tabelas
5. ⏳ Validações aprimoradas
6. ⏳ Histórico de testes

### Baixa Prioridade:
7. ⏳ Relatórios detalhados
8. ⏳ Exportação de resultados
9. ⏳ Analytics e estatísticas

---

## 🧪 TESTES

### Testes Unitários:
- Calculadoras de cada teste
- Validações
- Seleção de tabelas

### Testes de Integração:
- Fluxo completo de aplicação de teste
- Integração com banco de dados
- Integração frontend-backend

### Testes de Aceitação:
- Testes com dados reais
- Validação com usuários
- Performance

---

**Próxima atualização:** Após início do desenvolvimento

