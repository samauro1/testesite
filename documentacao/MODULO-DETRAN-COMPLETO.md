# Documentação Completa do Módulo DETRAN

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Fluxo Completo de Funcionamento](#fluxo-completo-de-funcionamento)
4. [Estrutura de Arquivos](#estrutura-de-arquivos)
5. [Componentes Detalhados](#componentes-detalhados)
6. [Base de Dados](#base-de-dados)
7. [API Endpoints](#api-endpoints)
8. [Capturas de Tela e Estrutura do Site](#capturas-de-tela-e-estrutura-do-site)
9. [Problemas Conhecidos e Erros Enfrentados](#problemas-conhecidos-e-erros-enfrentados)
10. [Soluções Implementadas](#soluções-implementadas)
11. [Problemas Pendentes](#problemas-pendentes)
12. [Estratégias de Debug](#estratégias-de-debug)
13. [Plano de Correções Futuras](#plano-de-correções-futuras)

---

## Visão Geral

O módulo DETRAN é um sistema de **sincronização automática** que faz **web scraping** do site do DETRAN SP (`https://www.e-cnhsp.sp.gov.br/`) para importar agendamentos de peritos médicos/psicológicos diretamente para o sistema.

### Funcionalidades Principais

- ✅ **Configuração de Credenciais**: Salvar CPF e senha do perito de forma segura
- ✅ **Configuração de Dias de Trabalho**: Selecionar quais dias da semana sincronizar (ex: terças e quartas)
- ✅ **Sincronização Manual**: Botão para sincronizar agendamentos manualmente
- ✅ **Importação Automática**: Extrai e salva agendamentos no banco de dados
- ✅ **Deduplicação**: Evita importar agendamentos duplicados
- ✅ **Tratamento de Erros**: Logs detalhados e screenshots para debug
- ✅ **Scheduler Automático**: Executa sincronização diária às 08:00 (se habilitado)

### Tecnologias Utilizadas

- **Backend**: Node.js + Express + Puppeteer
- **Frontend**: Next.js + React + React Query
- **Banco de Dados**: PostgreSQL
- **Web Scraping**: Puppeteer (navegador headless Chrome)
- **Scheduler**: node-cron (para sincronização automática)

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Página de Configurações (/configuracoes)            │   │
│  │  - Formulário de CPF, Senha, Dias de Trabalho        │   │
│  │  - Botão "Sincronizar Agora"                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (axios)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (Express)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Rotas (/api/detran/*)                               │   │
│  │  - GET  /configuracao                                │   │
│  │  - PUT  /configuracao                                │   │
│  │  - POST /sincronizar                                 │   │
│  │  - POST /agenda-perito/consultar                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DetranScraper (Puppeteer)                           │   │
│  │  - init()              → Inicializa navegador        │   │
│  │  - login()             → Faz login no site           │   │
│  │  - fazerLoginAcessoRestrito() → Login tela agenda    │   │
│  │  - buscarAgendamentos() → Busca por data             │   │
│  │  - voltar()            → Volta para pesquisa         │   │
│  │  - sair()              → Encerra sessão              │   │
│  │  - close()             → Fecha navegador             │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AgendaPeritoScheduler (node-cron)                   │   │
│  │  - Executa diariamente às 08:00                      │   │
│  │  - Processa usuários ativos                          │   │
│  │  - Busca agendamentos para terças/quartas            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS (PostgreSQL)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  configuracoes_detran                                │   │
│  │  - usuario_id, cpf, senha, dias_trabalho, ...        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  agendamentos                                         │   │
│  │  - Importados do DETRAN                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  SITE DETRAN SP     │
                    │  e-cnhsp.sp.gov.br  │
                    └─────────────────────┘
```

---

## Fluxo Completo de Funcionamento

### Fluxo Ideal Esperado

```
1. LOGIN INICIAL
   └─> Acessa https://www.e-cnhsp.sp.gov.br/
   └─> Encontra campo CPF na página inicial
   └─> Preenche CPF e clica "Continuar"
   └─> Preenche CPF + Senha e clica "Acessar"
   └─> Redireciona para página principal logada

2. NAVEGAÇÃO PARA AGENDA
   └─> Procura link "Consultar Agenda do Perito" na página
   └─> Clica no link
   └─> Aguarda carregar tela "Acesso à Agenda Diária do Perito"
   └─> Detecta que precisa fazer login novamente (tela "Acesso Restrito")
   └─> Preenche CPF + Senha na tela de "Acesso Restrito"
   └─> Clica em "Acessar"
   └─> Carrega página de pesquisa de agenda (com frameset)

3. BUSCA DE AGENDAMENTOS (para cada data)
   └─> Preenche "Data Referência" (ex: "04112025" - DDMMYYYY)
   └─> Aguarda 1 segundo para dropdown "Data de Agendamento" carregar
   └─> Seleciona data no dropdown (ex: "04/11/2025")
   └─> Clica em "PESQUISAR"
   └─> Aguarda tabela de resultados carregar
   └─> Extrai dados da tabela:
       ├─> Hora (ex: "14:00")
       ├─> CPF (ex: "352.602.748-06")
       ├─> Nome (ex: "RAFAEL GIL NEGREIROS RENNO")
       ├─> Telefone (ex: "(11) 2502-6450 / (98) 325--9893")
       ├─> E-mail (ex: "rafael_negreirosrenno@yahoo.com.br")
       ├─> Tipo de Processo (ex: "Segunda Via")
       └─> Categoria (ex: "B")
   └─> Salva agendamento no banco de dados
   └─> Clica em "VOLTAR" para próxima consulta

4. FINALIZAÇÃO
   └─> Após todas as datas processadas
   └─> Clica em "SAIR" para encerrar sessão
   └─> Fecha navegador
   └─> Retorna resultado com agendamentos importados
```

### Fluxo Real Atual (com problemas)

O fluxo atual está **parcialmente funcionando**, mas encontra vários obstáculos:

1. ✅ **Login inicial** - FUNCIONANDO
   - Consegue fazer login na página inicial
   - Preenche CPF e senha corretamente
   
2. ⚠️ **Navegação para agenda** - PARCIALMENTE FUNCIONANDO
   - Encontra o link "Consultar Agenda do Perito"
   - Clica no link
   - **PROBLEMA**: Após clicar, a URL não muda (continua em `https://www.e-cnhsp.sp.gov.br/`)
   - **PROBLEMA**: Não detecta corretamente que precisa fazer login na tela "Acesso Restrito"
   - **PROBLEMA**: Às vezes não encontra a página de pesquisa de agenda

3. ❌ **Busca de agendamentos** - FALHANDO
   - **PROBLEMA**: Não encontra inputs visíveis na página (todos são `hidden`)
   - **PROBLEMA**: Campo "Data Referência" não é encontrado ou está dentro de iframe não acessível
   - **PROBLEMA**: Dropdown "Data de Agendamento" não é encontrado (0 selects encontrados)
   - **PROBLEMA**: Botão "PESQUISAR" não é encontrado
   - **PROBLEMA**: Erro `Cannot read properties of undefined (reading 'press')` ao tentar pressionar Enter

4. ⚠️ **Voltar/Sair** - PARCIALMENTE FUNCIONANDO
   - Botão "Voltar" não encontrado
   - `page.goBack()` dá timeout
   - Botão "Sair" implementado mas não testado

---

## Estrutura de Arquivos

```
codigo/
├── routes/
│   └── detran.js                    # Rotas da API DETRAN
├── services/
│   ├── detranScraper.js             # Serviço de web scraping (Puppeteer)
│   └── agendaPeritoScheduler.js     # Scheduler automático (node-cron)
├── utils/
│   ├── dateFormatting.js            # Funções para formatar datas
│   └── detranErrorTypes.js          # Tipos de erro específicos do DETRAN
├── config/
│   └── database.js                  # Conexão PostgreSQL
└── artifacts/                       # Screenshots e logs de erro
    ├── *.png                        # Screenshots capturados
    ├── *.html                       # HTML da página no momento do erro
    └── *.json                       # Informações estruturadas do erro

frontend/
└── frontend-nextjs/
    └── src/
        ├── app/
        │   └── configuracoes/
        │       └── page.tsx          # Página de configuração DETRAN
        └── services/
            └── api.ts                # Serviços de API (axios)

documentacao/
└── MODULO-DETRAN-COMPLETO.md        # Esta documentação
```

---

## Componentes Detalhados

### 1. `codigo/routes/detran.js`

#### Estrutura da Tabela `configuracoes_detran`

```sql
CREATE TABLE configuracoes_detran (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cpf VARCHAR(14) NOT NULL,
  senha TEXT NOT NULL,
  dias_trabalho TEXT NOT NULL,           -- JSON array: ["segunda","terca",...]
  sincronizacao_automatica BOOLEAN DEFAULT false,
  ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id)
);
```

#### Endpoints Disponíveis

**GET `/api/detran/configuracao`**
- Retorna configuração do usuário (sem senha)
- Parse de `dias_trabalho` de JSON string para array

**PUT `/api/detran/configuracao`**
- Salva/atualiza configuração
- Valida: CPF, senha, dias_trabalho obrigatórios

**POST `/api/detran/sincronizar`**
- Executa sincronização manual
- Timeout: 5 minutos (frontend)
- Processa múltiplas datas sequencialmente

**POST `/api/detran/agenda-perito/consultar`**
- Consulta manual para uma data específica
- Retorna resultado sem salvar no banco

---

### 2. `codigo/services/detranScraper.js`

#### Classe: `DetranScraper`

##### Método: `init()`

Inicializa navegador Puppeteer em modo headless.

**Configurações:**
- Headless: `true`
- Viewport: 1920x1080
- User Agent: Chrome Windows 10
- Timeout: 60000ms

##### Método: `login()`

**Fluxo Atual Implementado:**

1. Navega para `https://www.e-cnhsp.sp.gov.br/`
2. Aceita cookies se presente
3. Aguarda carregamento (3s + verifica frameset)

4. **Etapa 1: Preencher CPF na página inicial**
   - Procura campo CPF (múltiplas estratégias)
   - Preenche CPF
   - Pressiona Enter ou clica "Continuar"

5. **Etapa 2: Preencher CPF + Senha**
   - Aguarda navegação
   - Verifica frameset
   - Encontra campos CPF e Senha
   - Preenche ambos
   - Clica em "Acessar"

6. **Navegação para página de agenda**
   - Procura link "Consultar Agenda do Perito"
   - Clica no link
   - Aguarda 5s + 3s para carregamento AJAX/SPA
   - Verifica se há frameset (indicador de página de agenda)
   - Verifica se precisa fazer login em "Acesso Restrito"
   - Se necessário, chama `fazerLoginAcessoRestrito()`

##### Método: `fazerLoginAcessoRestrito()`

Login na segunda tela (após clicar em "Consultar Agenda do Perito").

**Fluxo:**
1. Verifica frameset
2. Encontra campo CPF
3. Preenche CPF (se não estiver preenchido)
4. Encontra campo Senha
5. Preenche Senha
6. Clica em "Acessar"
7. Aguarda 3 segundos

##### Método: `buscarAgendamentos(dataReferencia)`

**Parâmetro:** Data no formato `"DD/MM/YYYY"` (ex: `"04/11/2025"`)

**Fluxo Esperado:**
1. Verifica se está na página de pesquisa
2. Aguarda carregamento (3s)
3. Verifica frameset e encontra frame correto
4. Lista todos os inputs (visíveis e ocultos)
5. Encontra campo "Data Referência"
6. Preenche data no formato DDMMYYYY (ex: "04112025")
7. Aguarda 1 segundo para dropdown carregar
8. Seleciona data no dropdown "Data de Agendamento"
9. Clica em "PESQUISAR"
10. Aguarda resultados (4s)
11. Extrai dados da tabela
12. Retorna array de agendamentos

**Problemas Atuais:**
- ❌ Não encontra inputs visíveis (todos são `hidden`)
- ❌ Não encontra selects (0 selects encontrados)
- ❌ Não encontra botão "PESQUISAR"
- ❌ Erro ao usar `targetPage.keyboard.press()` (frames não têm `.keyboard`)

##### Método: `voltar()`

Volta para página de pesquisa antes de consultar próxima data.

**Estratégias:**
1. Procura botão "Voltar" em todos os frames
2. Se não encontrar → usa `page.goBack()`
3. Logs detalhados de cada tentativa

**Problemas Atuais:**
- ⚠️ Botão "Voltar" não encontrado
- ⚠️ `page.goBack()` dá timeout (30s)

##### Método: `sair()`

Encerra sessão clicando no botão "Sair".

**Fluxo:**
1. Verifica frameset
2. Procura botão "Sair" em todos os frames
3. Clica no botão
4. Aguarda 2 segundos

---

### 3. `codigo/services/agendaPeritoScheduler.js`

Scheduler automático que executa diariamente às 08:00.

**Funcionalidades:**
- Processa todos os usuários com configuração ativa
- Busca agendamentos apenas para terças e quartas (dias configurados)
- Usa `AgendaPeritoService` para executar a consulta

**Inicialização:**
- Executado no `server.js` na inicialização
- Pode ser desabilitado via `ENABLE_AGENDA_PERITO_SCHEDULER=false`

---

### 4. `codigo/utils/dateFormatting.js`

Funções auxiliares para formatação de datas:

- `formatarDataExibicao(date)`: Retorna "terça 04/11/2025"
- `formatarDDMMYYYY(date)`: Retorna "04/11/2025"

---

## Base de Dados

### Tabela: `configuracoes_detran`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | SERIAL | Primary Key |
| `usuario_id` | INTEGER | FK para `usuarios.id` (UNIQUE) |
| `cpf` | VARCHAR(14) | CPF do perito (sem formatação) |
| `senha` | TEXT | Senha do perito (**texto plano**) |
| `dias_trabalho` | TEXT | JSON array: `["segunda","terca",...]` |
| `sincronizacao_automatica` | BOOLEAN | Sincronização automática habilitada |
| `ultima_sincronizacao` | TIMESTAMP | Última execução |
| `ativo` | BOOLEAN | Configuração ativa |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

⚠️ **IMPORTANTE**: Senha armazenada em texto plano porque precisa ser usada para login no site DETRAN (não há API oficial).

---

## Problemas Conhecidos e Erros Enfrentados

### 🔴 Problema 1: Não Navega para Página de Agenda Após Clicar no Link

**Sintoma:**
```
✅ Link "Consultar Agenda do Perito" encontrado no frame "body"
✅ Clicando no link "Consultar Agenda do Perito"...
📍 URL após clicar em "Consultar Agenda do Perito": https://www.e-cnhsp.sp.gov.br/
```

A URL não muda após clicar no link. Isso indica que:
- O link pode ser JavaScript (onclick)
- A navegação é AJAX/SPA
- O link pode estar em iframe que precisa de tratamento especial

**Tentativas de Correção:**
1. ✅ Aumentado tempo de espera após clicar (5s + 3s)
2. ✅ Adicionada verificação de frameset após clique
3. ✅ Adicionada verificação de texto "Acesso Restrito"
4. ❌ **PENDENTE**: Não está detectando corretamente a mudança de página

**Próximos Passos:**
- Aguardar mais tempo após clique
- Verificar se há iframe que carrega após clique
- Usar `waitForSelector` para aguardar elemento específico da página de agenda

---

### 🔴 Problema 2: Não Encontra Inputs Visíveis na Página de Agenda

**Sintoma:**
```
📋 Inputs encontrados na página: 16 (0 visíveis)
📋 Primeiros 5 inputs: [
  { "type": "hidden", "visible": false },
  { "type": "hidden", "visible": false },
  ...
]
```

Todos os inputs encontrados são `hidden`. Isso significa que:
- Os inputs visíveis estão em iframe não detectado
- A página ainda não carregou completamente
- Os inputs são carregados dinamicamente via JavaScript

**Tentativas de Correção:**
1. ✅ Adicionado filtro para mostrar apenas inputs visíveis nos logs
2. ✅ Melhorada estratégia 4 para buscar apenas inputs visíveis
3. ❌ **PENDENTE**: Não está encontrando o frame correto com os inputs

**Próximos Passos:**
- Inspecionar manualmente a estrutura de iframes da página
- Aguardar elemento específico antes de buscar inputs
- Verificar se há iframe "body" ou outro frame específico

---

### 🔴 Problema 3: Não Encontra Campo "Data Referência"

**Sintoma:**
```
✍️ Preenchendo campo "Data Referência"...
📸 Screenshot salvo: E:\sistema\codigo\artifacts\data-referencia-not-found-*.png
❌ Erro ao buscar agendamentos: Não foi possível encontrar o campo "Data Referência"
```

**Estratégias Implementadas:**
1. Buscar por name/id contendo "referencia" ou "data"
2. Buscar por label "Data Referência"
3. Usar primeiro input visível
4. Fallback para qualquer input visível

**Tentativas de Correção:**
1. ✅ Múltiplas estratégias de busca
2. ✅ Busca em todos os frames
3. ✅ Logs detalhados de inputs encontrados
4. ❌ **PENDENTE**: Ainda não encontra o campo

**Próximos Passos:**
- Verificar screenshots salvos em `artifacts/`
- Inspecionar HTML salvo para ver estrutura real
- Ajustar seletores baseado na estrutura real

---

### 🔴 Problema 4: Não Encontra Dropdown "Data de Agendamento"

**Sintoma:**
```
✍️ Selecionando "Data de Agendamento" no dropdown...
📋 Total de selects encontrados: 0
⚠️ Não foi possível selecionar a data no dropdown automaticamente
```

Não encontra nenhum `<select>` na página. Isso pode indicar que:
- O dropdown é carregado dinamicamente via JavaScript após preencher "Data Referência"
- O dropdown está em iframe não acessado
- O dropdown é um componente JavaScript customizado (não é `<select>` nativo)

**Tentativas de Correção:**
1. ✅ Aguardar 1 segundo após preencher "Data Referência"
2. ✅ Aguardar 2 segundos antes de buscar selects
3. ❌ **PENDENTE**: Não encontra selects mesmo após aguardar

**Próximos Passos:**
- Verificar se o dropdown é realmente um `<select>` ou componente customizado
- Aguardar elemento específico aparecer após preencher data
- Usar `waitForSelector` para aguardar o dropdown aparecer

---

### 🔴 Problema 5: Erro ao Pressionar Enter (`Cannot read properties of undefined`)

**Sintoma:**
```
⚠️ Botão não encontrado, pressionando Enter...
❌ Erro ao buscar agendamentos: Cannot read properties of undefined (reading 'press')
```

**Causa:**
Frames (iframes) não têm propriedade `.keyboard`. Tentativa de usar `targetPage.keyboard.press()` quando `targetPage` é um frame.

**Correção Aplicada:**
✅ Alterado para usar `this.page.keyboard.press()` (sempre usa a página principal)
✅ Adicionado try/catch para evitar crash

---

### 🟡 Problema 6: Cache HTTP 304 (Já Corrigido)

**Sintoma:**
Frontend não atualizava agendamentos devido a respostas 304 (Not Modified).

**Correção Aplicada:**
✅ Desabilitado ETag em `server.js`: `app.set('etag', false)`
✅ Adicionado middleware para desabilitar cache em todas as rotas `/api/*`
✅ Headers configurados: `Cache-Control: no-store, no-cache, must-revalidate`

---

### 🟡 Problema 7: Botão "Voltar" Não Encontrado

**Sintoma:**
```
⚠️ Botão "Voltar" não encontrado, usando navegação do browser...
⚠️ Erro ao usar goBack: Navigation timeout of 30000 ms exceeded
```

**Tentativas de Correção:**
1. ✅ Busca em todos os frames
2. ✅ Fallback para `page.goBack()`
3. ❌ **PENDENTE**: Ainda não funciona

**Próximos Passos:**
- Verificar se há botão "Voltar" na página (pode ter outro nome)
- Aguardar página carregar antes de voltar
- Navegar diretamente para URL da página de pesquisa

---

### 🟡 Problema 8: Erros de Sintaxe JavaScript (Já Corrigido)

**Sintoma:**
```
SyntaxError: await is only valid in async functions
```

**Causa:**
Código duplicado e blocos catch fora de funções async.

**Correção Aplicada:**
✅ Removido código duplicado
✅ Corrigida estrutura de métodos
✅ Todos os `await` agora estão dentro de funções `async`

---

## Soluções Implementadas

### ✅ 1. Correção de Cache HTTP

**Arquivo:** `codigo/server.js`

```javascript
// Desabilitar ETag
app.set('etag', false);

// Middleware para desabilitar cache em rotas da API
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});
```

### ✅ 2. Correção de Erro `keyboard.press()`

**Arquivo:** `codigo/services/detranScraper.js`

```javascript
// ANTES (ERRADO):
await targetPage.keyboard.press('Enter'); // Falha se targetPage é frame

// DEPOIS (CORRETO):
try {
  await this.page.keyboard.press('Enter'); // Sempre usa página principal
} catch (kbError) {
  console.log('⚠️ Erro ao pressionar Enter:', kbError.message);
}
```

### ✅ 3. Melhor Detecção de Página de Agenda

**Arquivo:** `codigo/services/detranScraper.js`

```javascript
// Verificar se há frameset (indicador de página de agenda)
const temFrameset = await this.page.evaluate(() => {
  return document.querySelector('frameset') !== null;
});

if (temFrameset) {
  console.log('✅ Frameset detectado - parece estar na página de agenda');
  return true;
}
```

### ✅ 4. Aguardos Aumentados

- Após clicar no link: 5s + 3s adicional se for SPA
- Após preencher "Data Referência": 1s para dropdown carregar
- Antes de buscar inputs: 3s para página carregar

### ✅ 5. Busca Apenas de Inputs Visíveis

**Arquivo:** `codigo/services/detranScraper.js`

```javascript
// Filtrar apenas inputs visíveis
const visibleInputs = allInputs.filter(input => {
  const style = window.getComputedStyle(input);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         input.offsetParent !== null;
});
```

---

## Problemas Pendentes

### 🔴 P1: Navegação Não Funciona Após Clicar no Link

**Prioridade:** ALTA

**Descrição:**
Após clicar no link "Consultar Agenda do Perito", a URL não muda e a página de agenda não é carregada.

**Possíveis Causas:**
1. Link usa JavaScript (onclick) em vez de href
2. Navegação é AJAX/SPA e precisa aguardar elemento específico
3. Link está em iframe e precisa clicar no frame correto

**Plano de Ação:**
1. Inspecionar manualmente o link no navegador
2. Verificar se há evento onclick
3. Aguardar elemento específico aparecer após clique (ex: `waitForSelector('#agenda')`)
4. Verificar se precisa clicar dentro do frame correto

---

### 🔴 P2: Inputs Visíveis Não São Encontrados

**Prioridade:** ALTA

**Descrição:**
Todos os inputs encontrados são `hidden`. Os inputs visíveis não são detectados.

**Possíveis Causas:**
1. Inputs estão em iframe que não está sendo acessado
2. Inputs são carregados dinamicamente e ainda não existem
3. Inputs estão dentro de componente React/Vue que renderiza depois

**Plano de Ação:**
1. Verificar screenshots salvos em `artifacts/`
2. Inspecionar HTML salvo para ver estrutura de iframes
3. Listar todos os frames disponíveis e verificar cada um
4. Aguardar elemento específico aparecer (ex: `waitForSelector('input[name*="data"]')`)

---

### 🔴 P3: Dropdown "Data de Agendamento" Não É Encontrado

**Prioridade:** ALTA

**Descrição:**
Após preencher "Data Referência", o dropdown não é encontrado (0 selects).

**Possíveis Causas:**
1. Dropdown é carregado via AJAX e demora mais que 1-2 segundos
2. Dropdown não é um `<select>` nativo (é componente JavaScript)
3. Dropdown está em iframe não acessado

**Plano de Ação:**
1. Aumentar tempo de espera para 5-10 segundos
2. Usar `waitForSelector('select')` para aguardar aparecer
3. Verificar se é componente customizado (inspecionar HTML)
4. Aguardar elemento com texto "Data de Agendamento" aparecer

---

### 🟡 P4: Botão "PESQUISAR" Não É Encontrado

**Prioridade:** MÉDIA

**Descrição:**
Botão "PESQUISAR" não é encontrado após preencher campos.

**Possíveis Causas:**
1. Botão tem outro texto (ex: "Pesquisar", "Buscar")
2. Botão está em iframe não acessado
3. Botão é componente JavaScript

**Plano de Ação:**
1. Expandir busca para mais variações de texto
2. Buscar por ícone (ex: ícone de impressora mencionado nas imagens)
3. Verificar todos os botões na página e listar textos

---

### 🟡 P5: Botão "Voltar" Não Funciona

**Prioridade:** MÉDIA

**Descrição:**
Não encontra botão "Voltar" e `page.goBack()` dá timeout.

**Plano de Ação:**
1. Verificar se há botão com outro nome
2. Navegar diretamente para URL da página de pesquisa
3. Verificar se há botão no iframe correto

---

## Estratégias de Debug

### 1. Screenshots Automáticos

Quando há erro, o sistema salva:
- `artifacts/data-referencia-not-found-[timestamp].png` - Screenshot da página
- `artifacts/data-referencia-not-found-[timestamp].html` - HTML completo
- `artifacts/data-referencia-not-found-[timestamp].json` - Informações estruturadas

**Localização:** `codigo/artifacts/`

**Como Usar:**
1. Abrir screenshot para ver estado visual da página
2. Abrir HTML no navegador para inspecionar estrutura
3. Ver JSON para informações estruturadas (inputs, labels, etc.)

### 2. Logs Detalhados

O sistema gera logs emoji para facilitar identificação:

```
🚀 = Início de processo
✅ = Sucesso
❌ = Erro
⚠️ = Aviso
📋 = Lista/Informações
📍 = URL/Posição
✍️ = Preenchimento
🔘 = Clique/Ação
⏳ = Aguardando
📄 = Frameset/Iframe
🔍 = Busca/Procura
📊 = Dados/Resultados
🔙 = Voltar
🚪 = Sair/Logout
```

### 3. Verificar Estrutura de Frames

```javascript
// Listar todos os frames
const frames = this.page.frames();
console.log(`📋 Total de frames: ${frames.length}`);
for (const frame of frames) {
  console.log(`  - Frame: ${frame.name() || 'unnamed'} (${frame.url()})`);
}
```

### 4. Listar Todos os Elementos da Página

```javascript
// Listar todos os inputs
const inputs = await targetPage.evaluate(() => {
  return Array.from(document.querySelectorAll('input, select, button')).map(el => ({
    tag: el.tagName,
    type: el.type || '',
    name: el.name || '',
    id: el.id || '',
    text: el.textContent?.trim().substring(0, 50) || '',
    visible: el.offsetParent !== null
  }));
});
console.log('📋 Todos os elementos:', JSON.stringify(inputs, null, 2));
```

---

## Plano de Correções Futuras

### Fase 1: Corrigir Navegação (PRIORITÁRIO)

1. **Inspecionar manualmente o link "Consultar Agenda do Perito"**
   - Verificar se é `<a href="">` ou `<button onclick="">`
   - Verificar se há evento JavaScript
   - Verificar se abre em iframe

2. **Aguardar elemento específico após clique**
```javascript
   await Promise.all([
     consultarAgendaLink.element.click(),
     this.page.waitForSelector('frameset, #agenda, input[name*="data"]', { timeout: 15000 })
   ]);
   ```

3. **Verificar todos os frames após clique**
   - Listar frames disponíveis
   - Verificar qual frame tem o conteúdo da agenda
   - Usar esse frame como `targetPage`

### Fase 2: Corrigir Busca de Campos

1. **Aguardar inputs visíveis aparecerem**
```javascript
   await targetPage.waitForSelector('input[type="text"]:not([style*="display: none"])', {
     visible: true,
     timeout: 10000
   });
   ```

2. **Encontrar frame correto com inputs**
   - Iterar por todos os frames
   - Verificar qual tem inputs visíveis
   - Usar esse frame

3. **Aguardar dropdown aparecer**
```javascript
   // Após preencher "Data Referência"
   await targetPage.waitForSelector('select', {
     visible: true,
     timeout: 10000
});
```

### Fase 3: Melhorar Robustez

1. **Retry automático**
   - Se falhar, tentar novamente 2-3 vezes
   - Aguardar entre tentativas

2. **Cache de sessão**
   - Salvar cookies do navegador
   - Reutilizar sessão para evitar login repetido

3. **Validação de página**
   - Verificar título da página
   - Verificar URL esperada
   - Verificar elementos específicos presentes

---

## Capturas de Tela e Estrutura do Site

### Tela 1: Página Inicial do e-CNH SP

**URL:** `https://www.e-cnhsp.sp.gov.br/`

**Descrição:**
A página inicial apresenta:
- **Header**: Logo do Governo de São Paulo e título "e-CNHsp Serviços de Habilitação"
- **Barra de navegação azul**: Links (Home, O que é, Dúvidas, Central de Atendimento, etc.)
- **Coluna esquerda - Caixa "Credenciados"**:
  - Texto: "Acesso para credenciado"
  - Campo: **CPF** (input de texto vazio)
  - Botão: **"Continuar"** (azul)
  - Link importante: **"Consultar Agenda do Perito"** (texto azul, abaixo do botão Continuar)
- **Outras caixas**: "Como desbloquear o acesso", "Como aderir ao e-CNHsp", etc.

**Elemento Chave:**
- Link **"Consultar Agenda do Perito"** está visível na coluna esquerda, abaixo do botão "Continuar"

---

### Tela 2: Tela de Login "Acesso Restrito"

**Descrição:**
Após clicar em "Consultar Agenda do Perito", aparece a tela:
- **Título**: "Acesso à Agenda Diária do Perito" ou "Acesso Restrito"
- **Formulário de Login**:
  - Campo **CPF**: Preenchido com "237.244.708-43" (formatado)
  - Campo **Senha**: Input do tipo password (com caracteres mascarados)
  - Botão: **"Acessar"** (azul)
  - Link: "Esqueci minha senha"
- **Timer**: "Tempo restante: 00:29:55" (no topo direito)

**Nota:** Esta é uma **segunda tela de login** que aparece especificamente para acessar a agenda do perito.

---

### Tela 3: Página de Pesquisa "Imprimir Agenda Diária do Psicólogo"

**Descrição:**
Após fazer login na tela "Acesso Restrito", carrega a página de pesquisa:

**Estrutura:**
- **Header**: Logo + título "e-CNHsp Serviços de Habilitação"
- **Menu horizontal azul**: Home, Manuais, Dúvidas, Central de Atendimento
- **Sidebar esquerda (azul escuro)**: 
  - Link "Serviços" (destacado)
  - Link "Sair"
- **Conteúdo principal (branco)**:
  - Título: **"Imprimir Agenda Diária do Psicólogo"**
  - Seção **"PESQUISA"**:
    - **Campo 1: "Unidade de Trânsito *"** (dropdown)
      - Valor: "CIR-SAO PAULO"
      - Obrigatório (asterisco)
    - **Campo 2: "Data Referência *"** (input de texto)
      - Formato: DDMMYYYY (ex: "04112025")
      - Obrigatório (asterisco)
      - Exemplo: "04/11/2025"
    - **Campo 3: "Data de Agendamento *"** (dropdown)
      - Opção padrão: "- SELECIONE -"
      - Carrega dinamicamente após preencher "Data Referência"
      - Opções: "28/10/2025", "29/10/2025", "04/11/2025", "05/11/2025", "11/11/2025", etc.
      - Obrigatório (asterisco)
    - **Mensagem de atenção (vermelho)**:
      - "ATENÇÃO: AS DATAS EXIBIDAS SERÃO DE ACORDO COM OS AGENDAMENTOS EFETUADOS EM ATÉ 7 DIAS POSTERIOR À DATA DE REFERÊNCIA, PODENDO OU NÃO SER DATAS SUBSEQUENTES."
    - **Botões**:
      - **"LIMPAR"** (branco com ícone)
      - **"PESQUISAR"** (azul com ícone de impressora)

**Observações Importantes:**
- A página usa **frameset** (estrutura de frames)
- O formulário está dentro de um **frame "body"**
- O dropdown "Data de Agendamento" **carrega via AJAX** após preencher "Data Referência"
- É necessário aguardar 1-2 segundos para o dropdown carregar

**Seletores Esperados:**
- Campo "Data Referência": Possivelmente `input[name*="data" i]` ou próximo ao label "Data Referência *"
- Campo "Data de Agendamento": `select` com opções carregadas dinamicamente
- Botão "PESQUISAR": Botão com texto "PESQUISAR" ou ícone de impressora

**Estrutura de Frames:**
- Frame principal: Página base
- Frame "body": Contém o formulário de pesquisa
- Outros frames: Menu lateral, header, etc.

---

### Tela 4: Resultados da Pesquisa

**Descrição:**
Após clicar em "PESQUISAR", aparece a tabela com agendamentos:

**Estrutura da Tabela:**
| Hora | CPF | Nome | Telefone | E-mail | Tipo de Processo | Categoria | Status do Exame Médico | Status do Exame Psicológico |
|------|-----|------|----------|--------|------------------|-----------|------------------------|----------------------------|
| 14:00 | 352.602.748-06 | RAFAEL GIL NEGREIROS RENNO | (11) 2502-6450 / (98) 325--9893 | rafael_negreirosrenno@yahoo.com.br | Segunda Via | B | | Não Realizado |

**Campos Extraídos:**
- **Hora**: Formato HH:MM (ex: "14:00")
- **CPF**: Formatado com pontos e hífen (ex: "352.602.748-06")
- **Nome**: Nome completo em maiúsculas
- **Telefone**: Pode ter múltiplos números separados por "/"
- **E-mail**: Email completo
- **Tipo de Processo**: "Segunda Via", "Renovação", etc.
- **Categoria**: "A", "B", "AB", etc.
- **Status do Exame Médico**: Geralmente vazio ou "Realizado"/"Não Realizado"
- **Status do Exame Psicológico**: "Realizado" ou "Não Realizado"

**Ações Disponíveis:**
- **Botão "VOLTAR"**: Retorna para página de pesquisa
- Possibilidade de imprimir/exportar resultados

---

### Fluxo Visual Completo

```
[Página Inicial]
   ↓ (Clica "Continuar" após preencher CPF)
[Página Inicial - Logado]
   ↓ (Clica "Consultar Agenda do Perito")
[Tela "Acesso Restrito"]
   ↓ (Preenche CPF + Senha e clica "Acessar")
[Página de Pesquisa - "Imprimir Agenda Diária do Psicólogo"]
   ↓ (Preenche "Data Referência": 04112025)
   ↓ (Aguarda 1 segundo)
   ↓ (Dropdown "Data de Agendamento" carrega)
   ↓ (Seleciona "04/11/2025" no dropdown)
   ↓ (Clica "PESQUISAR")
[Tabela de Resultados]
   ↓ (Extrai dados)
   ↓ (Clica "VOLTAR")
[Página de Pesquisa]
   ↓ (Repete para próxima data)
```

---

## Como Testar Manualmente

### Passo a Passo para Reproduzir o Problema

1. **Abrir navegador Chrome**
2. **Acessar:** `https://www.e-cnhsp.sp.gov.br/`
3. **Fazer login:**
   - Preencher CPF na página inicial
   - Clicar "Continuar"
   - Preencher CPF + Senha
   - Clicar "Acessar"
4. **Navegar para agenda:**
   - Procurar link "Consultar Agenda do Perito"
   - Clicar no link
   - **OBSERVAR**: O que acontece? Nova página? Iframe? URL muda?
5. **Se aparecer tela "Acesso Restrito":**
   - Preencher CPF + Senha novamente
   - Clicar "Acessar"
6. **Na página de pesquisa:**
   - **INSPECIONAR ELEMENTO** (F12)
   - Verificar estrutura de iframes
   - Verificar campos visíveis
   - Verificar se dropdown é `<select>` ou componente customizado
7. **Preencher "Data Referência":**
   - Digitar "04112025"
   - **OBSERVAR**: Dropdown "Data de Agendamento" aparece? Quando?
   - Quanto tempo demora?
8. **Clicar em "PESQUISAR":**
   - **OBSERVAR**: Botão é encontrado? Qual é o seletor?

### Informações a Coletar

1. **Estrutura de iframes:**
   - Quantos iframes existem?
   - Qual iframe tem o formulário de pesquisa?
   - Qual é o name/id de cada iframe?

2. **Campos do formulário:**
   - Qual é o name/id do campo "Data Referência"?
   - Qual é o name/id do campo "Data de Agendamento"?
   - O dropdown é `<select>` ou outro elemento?

3. **Timing:**
   - Quanto tempo demora para dropdown aparecer após preencher data?
   - Quanto tempo demora para tabela aparecer após pesquisar?

---

## Checklist de Verificação

### Antes de Fazer Modificações

- [ ] Ler logs completos do backend
- [ ] Verificar screenshots em `artifacts/`
- [ ] Inspecionar HTML salvo em `artifacts/`
- [ ] Testar manualmente no navegador
- [ ] Documentar estrutura encontrada

### Após Fazer Modificações

- [ ] Testar localmente
- [ ] Verificar logs
- [ ] Verificar se não introduziu novos erros
- [ ] Atualizar esta documentação
- [ ] Comitar com mensagem descritiva

---

## Conclusão

O módulo DETRAN está **parcialmente funcional**. O login funciona corretamente, mas a navegação para a página de agenda e a busca de agendamentos estão enfrentando problemas relacionados a:

1. **Navegação AJAX/SPA** que não é detectada corretamente
2. **Iframes** que não estão sendo acessados corretamente
3. **Elementos dinâmicos** que carregam via JavaScript e precisam de mais tempo de espera
4. **Estrutura HTML** que pode ter mudado ou ser diferente do esperado

**Próximos Passos Prioritários:**
1. Inspecionar manualmente a página para entender estrutura real
2. Ajustar seletores baseado na estrutura real
3. Aumentar timeouts e usar `waitForSelector` adequadamente
4. Verificar e acessar frames corretos

---

## Apêndice: Informações Técnicas das Telas

### Seletor para "Consultar Agenda do Perito"

Baseado nas imagens, o link pode ser encontrado por:
```javascript
// Estratégia 1: Texto exato
const link = await page.evaluateHandle(() => {
  const links = Array.from(document.querySelectorAll('a'));
  return links.find(link => 
    link.textContent.trim() === 'Consultar Agenda do Perito'
  );
});

// Estratégia 2: Texto parcial (case insensitive)
const link = await page.evaluateHandle(() => {
  const links = Array.from(document.querySelectorAll('a'));
  return links.find(link => {
    const text = (link.textContent || '').toUpperCase();
    return text.includes('CONSULTAR') && 
           text.includes('AGENDA') && 
           text.includes('PERITO');
  });
});
```

### Estrutura do Formulário de Pesquisa

O formulário está em um **frameset**, e o conteúdo está no frame "body":

```html
<frameset>
  <!-- Frame do menu lateral -->
  <frame name="menu" src="..."/>
  
  <!-- Frame principal com formulário -->
  <frame name="body" src="...">
    <form>
      <select name="unidade">...</select>  <!-- Unidade de Trânsito -->
      <input type="text" name="dataReferencia"/>  <!-- Data Referência -->
      <select name="dataAgendamento">...</select>  <!-- Data de Agendamento -->
      <button type="submit">PESQUISAR</button>
    </form>
  </frame>
</frameset>
```

### Formato da Data de Referência

- **Formato de entrada**: DDMMYYYY (sem barras, ex: "04112025")
- **Formato de exibição**: DD/MM/YYYY (com barras, ex: "04/11/2025")
- **Campo**: Input de texto (não é date picker)

### Comportamento do Dropdown "Data de Agendamento"

1. Inicialmente mostra: "- SELECIONE -"
2. Após preencher "Data Referência" (ex: "04112025")
3. Faz requisição AJAX para buscar datas disponíveis
4. Popula o dropdown com datas no formato "DD/MM/YYYY"
5. **Tempo estimado**: 1-2 segundos para carregar

**Exemplo de opções após carregar:**
- "28/10/2025"
- "29/10/2025"
- "04/11/2025" ← Data preenchida em "Data Referência"
- "05/11/2025"
- "11/11/2025"
- etc.

---

**Última Atualização:** 01/11/2025  
**Versão do Documento:** 2.1  
**Status:** 🟡 Parcialmente Funcional - Requer Ajustes
