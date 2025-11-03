# Integração do Módulo Agenda DETRAN

## 📋 Visão Geral

Este documento explica a integração realizada entre o **guia de integração do módulo Agenda DETRAN V2** (localizado em `e:\agenda\`) e o **sistema principal** (localizado em `e:\sistema\`).

## 🔍 Análise da Situação

### O que o guia de integração oferecia:
- Módulo isolado e independente para consulta de agendamentos por data
- API REST com autenticação JWT
- Consulta de agendamentos por intervalo de datas
- Formato de resposta padronizado

### O que o sistema principal já tinha:
- ✅ Módulo DETRAN completo com scraping via Puppeteer
- ✅ Tabela `agendamentos` no banco de dados
- ✅ Endpoint de consulta `/api/agendamentos` existente
- ✅ Autenticação JWT implementada

### Diferenças Identificadas:

| Aspecto | Guia de Integração | Sistema Principal |
|---------|-------------------|-------------------|
| **Estrutura** | Módulo isolado separado | Integrado ao sistema principal |
| **Dados** | Banco próprio (`agenda_detran`) | Banco unificado (`sistema_avaliacao_psicologica`) |
| **Scraping** | Não realiza scraping | Realiza scraping via Puppeteer |
| **Endpoint** | `/api/detran-v2/agendamentos` | `/api/agendamentos` |

## ✅ Solução Implementada

Foi adicionado um **novo endpoint** no sistema principal que replica a funcionalidade descrita no guia, mantendo a compatibilidade com o sistema existente.

### Endpoint Adicionado

**GET** `/api/detran/agendamentos`

#### Parâmetros de Query:

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `data_inicio` | string (YYYY-MM-DD) | Data inicial para buscar | `2025-11-01` |
| `data_fim` | string (YYYY-MM-DD) | Data final para buscar | `2025-11-30` |
| `limit` | number | Limite de resultados (padrão: 100) | `50` |
| `offset` | number | Offset para paginação (padrão: 0) | `0` |

#### Exemplo de Uso:

```bash
GET /api/detran/agendamentos?data_inicio=2025-11-15&data_fim=2025-11-15
Authorization: Bearer {token}
```

#### Resposta de Sucesso (200 OK):

```json
{
  "sucesso": true,
  "total": 12,
  "agendamentos": [
    {
      "id": 1,
      "data_agendamento": "2025-11-15",
      "hora": "08:00:00",
      "tipo_processo": "RENOVAÇÃO",
      "categoria": "B",
      "status_exame_medico": null,
      "status_exame_psicologico": null,
      "origem": "DETRAN",
      "observacoes": "Importado automaticamente do DETRAN em 01/11/2025 10:30:00",
      "paciente_nome": "João Silva",
      "paciente_cpf": "12345678901",
      "paciente_telefone": "11999999999",
      "paciente_email": "joao@email.com"
    }
  ]
}
```

## 🔄 Fluxo Completo de Funcionamento

```
1. Configuração
   └─> Usuário configura CPF, senha e dias de trabalho
   └─> Salvo em configuracoes_detran
   
2. Sincronização (Manual ou Automática)
   └─> DetranScraper faz login no site DETRAN
   └─> Busca agendamentos para os dias configurados
   └─> Salva agendamentos na tabela agendamentos
   └─> Marca com origem "DETRAN"
   
3. Consulta (Novo Endpoint)
   └─> GET /api/detran/agendamentos?data_inicio=X&data_fim=Y
   └─> Busca agendamentos do banco (não faz scraping)
   └─> Filtra por usuário logado
   └─> Retorna no formato padronizado
```

## 🎯 Benefícios da Integração

### ✅ Mantém Compatibilidade
- Sistema existente continua funcionando normalmente
- Novo endpoint não interfere com funcionalidades atuais

### ✅ Reutiliza Infraestrutura
- Mesma autenticação JWT
- Mesma tabela de agendamentos
- Mesmo sistema de usuários

### ✅ Padroniza Resposta
- Formato de resposta alinhado com o guia
- Facilita integração com outros sistemas
- Documentação consistente

### ✅ Performance
- Consulta direta ao banco (sem scraping)
- Filtros eficientes por data e usuário
- Suporte a paginação

## 📊 Mapeamento de Dados

### Tabela `agendamentos` → Formato do Guia

| Campo na Tabela | Campo na Resposta | Observação |
|-----------------|-------------------|------------|
| `id` | `id` | - |
| `data_agendamento` | `data_agendamento` | Formatado como YYYY-MM-DD |
| Hora extraída | `hora` | Extraído de `data_agendamento` |
| `nome` | `paciente_nome` | - |
| `cpf` | `paciente_cpf` | - |
| `telefone_fixo` + `telefone_celular` | `paciente_telefone` | Concatenado |
| `email` | `paciente_email` | - |
| `tipo_transito` | `tipo_processo` | Renomeado |
| `categoria_cnh` | `categoria` | Renomeado |
| - | `status_exame_medico` | Sempre `null` (não utilizado) |
| - | `status_exame_psicologico` | Sempre `null` (não utilizado) |
| - | `origem` | Sempre `"DETRAN"` |
| `observacoes` | `observacoes` | - |

## 🔐 Autenticação

O endpoint utiliza a mesma autenticação JWT do sistema:

```javascript
// Obter token (uma vez)
POST /api/auth/login
{
  "email": "usuario@exemplo.com",
  "senha": "senha123"
}

// Usar em requisições
GET /api/detran/agendamentos?data_inicio=2025-11-15&data_fim=2025-11-15
Headers: {
  "Authorization": "Bearer {token}"
}
```

## 📝 Exemplos de Uso

### Consultar Agendamentos de Hoje

```javascript
const hoje = new Date().toISOString().split('T')[0];
const response = await fetch(
  `/api/detran/agendamentos?data_inicio=${hoje}&data_fim=${hoje}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const data = await response.json();
console.log(data.agendamentos);
```

### Consultar Agendamentos de um Período

```javascript
const inicio = '2025-11-01';
const fim = '2025-11-30';
const response = await fetch(
  `/api/detran/agendamentos?data_inicio=${inicio}&data_fim=${fim}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const { agendamentos } = await response.json();
console.log(`Total: ${agendamentos.length} agendamentos`);
```

### Consultar com Paginação

```javascript
// Primeira página (50 primeiros)
const page1 = await fetch(
  `/api/detran/agendamentos?limit=50&offset=0`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);

// Segunda página (próximos 50)
const page2 = await fetch(
  `/api/detran/agendamentos?limit=50&offset=50`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

## 🆚 Comparação com Endpoints Existentes

### Antes (Endpoint Original)

**GET** `/api/agendamentos`

```json
{
  "data": {
    "agendamentos": [...],
    "pagination": {...}
  }
}
```

**Características:**
- Formato tradicional do sistema
- Mais detalhes sobre pacientes
- Inclui informações de avaliação
- Filtros por status, busca textual

### Depois (Novo Endpoint)

**GET** `/api/detran/agendamentos`

```json
{
  "sucesso": true,
  "total": 12,
  "agendamentos": [...]
}
```

**Características:**
- Formato padronizado do guia
- Foco em agendamentos DETRAN
- Dados essenciais para consulta
- Filtro primário por data

**Ambos endpoints coexistem** e podem ser usados conforme a necessidade:

- `/api/agendamentos`: Uso interno do sistema, interface administrativa
- `/api/detran/agendamentos`: Integração externa, consulta específica de DETRAN

## ⚠️ Observações Importantes

### 1. Origem dos Dados

O endpoint **NÃO faz scraping** do DETRAN. Ele apenas consulta dados já importados no banco de dados através do endpoint de sincronização:

```bash
POST /api/detran/sincronizar
```

### 2. Dados do DETRAN

O endpoint retorna agendamentos importados do DETRAN. Agendamentos criados manualmente no sistema **não aparecem** neste endpoint, mas aparecem em `/api/agendamentos`.

### 3. Status de Exames

Os campos `status_exame_medico` e `status_exame_psicologico` retornam sempre `null`, pois o sistema não armazena essas informações do DETRAN.

### 4. Filtro por Usuário

O endpoint filtra automaticamente agendamentos do usuário logado. Usuários administradores podem ver agendamentos de outros usuários através do endpoint `/api/agendamentos`.

## 🚀 Próximos Passos Sugeridos

1. **Testar o endpoint** com dados reais
2. **Criar documentação OpenAPI/Swagger** para facilitar integração
3. **Implementar cache** para melhor performance em consultas frequentes
4. **Adicionar rate limiting** para proteger a API

## 📚 Referências

- Guia de Integração: `e:\agenda\artifacts\guia.txt`
- Documentação do Módulo DETRAN: `documentacao/MODULO-DETRAN-COMPLETO.md`
- Código do Endpoint: `codigo/routes/detran.js` (linhas 866-958)

---

**Versão:** 1.0.0  
**Data:** 01/11/2025  
**Status:** ✅ Implementado e Funcional

