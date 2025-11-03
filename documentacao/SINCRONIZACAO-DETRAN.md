# Sincronização Automática com DETRAN SP

## Visão Geral

O sistema agora possui funcionalidade de sincronização automática com o site do DETRAN SP (https://www.e-cnhsp.sp.gov.br/), permitindo importar agendamentos diretamente da agenda diária do perito para o sistema.

## Como Funciona

1. **Configuração**: O usuário configura seu CPF, senha e dias da semana que trabalha para o DETRAN
2. **Sincronização**: O sistema acessa automaticamente o site do DETRAN, faz login e busca agendamentos
3. **Importação**: Os agendamentos encontrados são importados para a agenda do sistema

## Configuração

### Passo 1: Acessar Configurações

1. No menu lateral, clique em **Configurações**
2. Selecione a aba **DETRAN**

### Passo 2: Preencher Dados

1. **CPF do Perito**: Digite seu CPF no formato 000.000.000-00
2. **Senha do Site DETRAN**: Digite sua senha de acesso ao site
3. **Dias da Semana**: Marque os dias que você trabalha para o DETRAN (ex: Terça e Quarta)
4. **Sincronização Automática**: Marque se deseja que o sistema sincronize automaticamente todos os dias
5. **Ativo**: Marque para ativar a configuração

### Passo 3: Salvar

Clique em **"Salvar Configuração"** para guardar suas credenciais.

## Sincronização

### Sincronização Manual

#### Opção 1: Pela Página de Configurações
1. Vá em **Configurações > DETRAN**
2. Clique em **"Sincronizar Agora"**
3. Aguarde o processo (pode levar alguns minutos)

#### Opção 2: Pela Página de Agenda
1. Vá em **Agenda**
2. Clique no botão **"Sincronizar DETRAN"** (botão verde com ícone de refresh)
3. Aguarde o processo

### Sincronização Automática

Se você marcou "Sincronização Automática", o sistema executará automaticamente todos os dias, buscando agendamentos para os próximos 14 dias baseados nos dias configurados.

## O que é Importado

Para cada data configurada, o sistema busca e importa:

- ✅ **Nome completo** do paciente
- ✅ **CPF** 
- ✅ **Telefone** (separado em fixo e celular)
- ✅ **E-mail**
- ✅ **Data e hora** do agendamento
- ✅ **Tipo de Processo** (Renovação, Primeira Habilitação, etc.)
- ✅ **Categoria CNH** (A, B, AB, etc.)
- ✅ **Contexto** automaticamente definido como "Trânsito"

## Validações e Segurança

### Prevenção de Duplicatas

O sistema verifica automaticamente se já existe um agendamento com:
- Mesmo CPF
- Mesma data
- Mesma hora
- Mesmo usuário

Se encontrar duplicata, o agendamento é **ignorado** (não cria novo).

### Processamento de Telefones

Os telefones extraídos do DETRAN são automaticamente processados:
- Números com 11 dígitos → **Celular** (telefone_celular)
- Números com 8 ou 10 dígitos → **Fixo** (telefone_fixo)
- Múltiplos números → Separados corretamente

### Observação Automática

Todos os agendamentos importados recebem uma observação indicando:
> "Importado automaticamente do DETRAN em [data/hora]"

## Processo Técnico de Sincronização

### 1. Login no Site
- Acessa https://www.e-cnhsp.sp.gov.br/
- Navega até "Consultar agenda do Perito"
- Faz login com CPF e senha configurados

### 2. Busca por Data
Para cada data configurada:
- Preenche "Data Referência" (ex: 04/11/2025)
- Aguarda 2 segundos
- Seleciona a mesma data no dropdown "Data de Agendamento"
- Clica em "Pesquisar"

### 3. Extração de Dados
- Extrai dados da tabela de resultados
- Valida CPF e nome
- Normaliza telefones
- Processa tipos de processo e categorias

### 4. Importação
- Cria agendamento no sistema
- Associa ao usuário logado
- Define contexto como "Trânsito"
- Adiciona observação de origem

### 5. Navegação
- Clica em "Voltar" para processar próxima data
- Repete processo para cada dia configurado

## Estrutura do Banco de Dados

### Tabela: `configuracoes_detran`

```sql
CREATE TABLE configuracoes_detran (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  cpf VARCHAR(14) NOT NULL,
  senha TEXT NOT NULL,
  dias_trabalho TEXT NOT NULL, -- JSON: ["terca", "quarta"]
  sincronizacao_automatica BOOLEAN DEFAULT false,
  ultima_sincronizacao TIMESTAMP,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Arquivos Criados/Modificados

### Backend

1. **`codigo/scripts/migrations/add-configuracao-detran.sql`**
   - SQL para criar tabela de configuração

2. **`codigo/services/detranScraper.js`**
   - Serviço de web scraping usando Puppeteer
   - Métodos: `init()`, `login()`, `buscarAgendamentos()`, `voltar()`, `close()`

3. **`codigo/routes/detran.js`**
   - Endpoints REST:
     - `GET /api/detran/configuracao` - Obter configuração
     - `PUT /api/detran/configuracao` - Salvar configuração
     - `POST /api/detran/sincronizar` - Executar sincronização

### Frontend

1. **`frontend/frontend-nextjs/src/services/api.ts`**
   - Adicionado `detranService` com métodos de API

2. **`frontend/frontend-nextjs/src/app/configuracoes/page.tsx`**
   - Nova aba "DETRAN" nas configurações
   - Interface para configurar CPF, senha, dias de trabalho
   - Botão de sincronização manual

3. **`frontend/frontend-nextjs/src/app/agenda/page.tsx`**
   - Botão "Sincronizar DETRAN" na página de agenda

## Dependências

### Backend
- **puppeteer**: Já instalado (v24.26.0)
  - Usado para automação do navegador e web scraping

### Executar Migration

Antes de usar, execute o SQL de migração:

```sql
-- Executar em PostgreSQL
\i codigo/scripts/migrations/add-configuracao-detran.sql
```

Ou copie e cole o conteúdo de `codigo/scripts/migrations/add-configuracao-detran.sql` no seu cliente PostgreSQL.

## Fluxo de Uso

```
1. Usuário configura CPF, senha e dias → Configurações > DETRAN
2. Usuário clica "Sincronizar Agora" ou aguarda sincronização automática
3. Sistema acessa site DETRAN e faz login
4. Para cada data configurada:
   a. Preenche data de referência
   b. Seleciona data no dropdown
   c. Clica em Pesquisar
   d. Extrai agendamentos da tabela
   e. Importa para sistema
   f. Clica em Voltar (exceto última data)
5. Retorna resultado com quantidade importada
```

## Troubleshooting

### Erro: "Configuração DETRAN não encontrada"
- **Solução**: Configure primeiro em **Configurações > DETRAN**

### Erro: "Nenhum dia de trabalho configurado"
- **Solução**: Marque pelo menos um dia da semana na configuração

### Erro: "Erro ao fazer login no DETRAN"
- **Verifique**: CPF e senha estão corretos no site
- **Teste**: Tente fazer login manualmente no site
- **Possível**: Site do DETRAN pode ter alterado o layout

### Sincronização demora muito
- **Normal**: Processamento pode levar 2-5 minutos dependendo da quantidade de datas
- **Cada data**: ~30 segundos de processamento + tempo de navegação

### Agendamentos duplicados
- **Não deve acontecer**: Sistema verifica duplicatas automaticamente
- **Se acontecer**: Verifique logs do backend para detalhes

### Telefones não aparecem
- **Causa possível**: Formato do telefone no site pode estar diferente
- **Verifique**: Logs mostram telefone extraído do DETRAN

## Logs e Debugging

O sistema gera logs detalhados durante a sincronização:

```
🚀 Inicializando navegador...
🔐 Acessando página de login...
✍️ Preenchendo CPF...
✍️ Preenchendo senha...
✅ Login realizado com sucesso
📅 Buscando agendamentos para 04/11/2025...
✍️ Preenchendo data de referência...
✍️ Selecionando data de agendamento...
🔘 Clicando em Pesquisar...
📊 Extraindo dados da tabela...
✅ Encontrados 3 agendamentos
✅ Agendamento criado: RAFAEL GIL NEGREIROS RENNO - 04/11/2025 14:00
🔙 Voltando para página de pesquisa...
```

## Segurança

- **Senha criptografada**: Senha armazenada no banco (não visível em logs)
- **Por usuário**: Cada usuário tem sua própria configuração
- **Isolamento**: Agendamentos importados são associados ao usuário que sincronizou

## Melhorias Futuras

- [ ] Sincronização agendada via cron job
- [ ] Notificações quando novos agendamentos são importados
- [ ] Histórico de sincronizações
- [ ] Opção de escolher datas específicas além dos dias da semana
- [ ] Suporte a múltiplos perfis/peritos (se necessário)

---

**Última atualização:** 01/11/2025  
**Versão:** 1.0

