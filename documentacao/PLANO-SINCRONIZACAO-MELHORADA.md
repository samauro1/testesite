# Plano Prático: Sincronização Robusta da Agenda DETRAN

## 🎯 Objetivo

Implementar sistema de sincronização confiável, idempotente, tolerante a falhas e sem duplicações para a agenda do DETRAN.

## ✅ Funcionalidades Implementadas

### 1. **Deduplicação Robusta**
- ✅ Identificador estável (`external_uid`) baseado em hash SHA1
- ✅ `UNIQUE` constraint no banco para evitar duplicatas
- ✅ `ON CONFLICT` para upsert seguro

### 2. **Cache de Sessão**
- ✅ Reuso de cookies de login (evita login repetido)
- ✅ TTL de 45 minutos
- ✅ Limpeza automática de sessões expiradas
- ✅ Validação de sessão antes de usar

### 3. **Retry Automático**
- ✅ Backoff exponencial com jitter
- ✅ 3 tentativas por padrão
- ✅ Timeouts configuráveis

### 4. **Sincronização Incremental**
- ✅ Janelas de datas configuráveis
- ✅ Marcagem de slots removidos (sem deletar histórico)
- ✅ Rastreamento de `first_seen_at` e `last_seen_at`

### 5. **Observabilidade**
- ✅ Tabela `agenda_sync_runs` com logs de execuções
- ✅ Totais de inseridos/atualizados/removidos
- ✅ Erros capturados com stack trace

### 6. **Lock para Evitar Concorrência**
- ✅ Advisory locks do PostgreSQL
- ✅ Um sync por usuário por vez

## 📁 Estrutura de Arquivos Criados

```
codigo/
├── scripts/
│   └── migrations/
│       └── add-agenda-slots-sync.sql          # Migração SQL
├── utils/
│   ├── detranUID.js                           # Utilitários de UID e hash
│   └── detranSessionCache.js                 # Cache de sessão em memória
├── services/
│   └── detranSyncImproved.js                 # Serviço de sincronização melhorado
└── routes/
    └── detran.js                              # Rotas atualizadas (com useImproved)
```

## 🗄️ Estrutura do Banco de Dados

### Tabela: `agenda_slots`

Rastreamento granular de slots/vagas:

```sql
CREATE TABLE agenda_slots (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'DETRAN',
  unidade_code TEXT NOT NULL DEFAULT 'DEFAULT',
  servico_code TEXT NOT NULL DEFAULT 'PERITO',
  data DATE NOT NULL,
  hora TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',  -- 'available' | 'booked' | 'removed'
  is_current BOOLEAN NOT NULL DEFAULT TRUE,  -- Apareceu no último sync?
  external_uid TEXT NOT NULL,                 -- Hash SHA1 estável
  payload JSONB,                              -- Dados completos
  content_hash TEXT,                          -- Hash do conteúdo
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  usuario_id INTEGER REFERENCES usuarios(id),
  agendamento_id INTEGER REFERENCES agendamentos(id),
  UNIQUE (source, external_uid)
);
```

### Tabela: `agenda_sync_runs`

Log de execuções:

```sql
CREATE TABLE agenda_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'DETRAN',
  usuario_id INTEGER REFERENCES usuarios(id),
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  status TEXT NOT NULL,                       -- 'success' | 'partial' | 'failed' | 'running'
  totals JSONB,                               -- { "inserted": n, "updated": n, "removed": n }
  error TEXT,
  error_details JSONB,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
```

## 🚀 Como Usar

### 1. Executar Migração SQL

```bash
# Conectar ao PostgreSQL e executar:
psql -U seu_usuario -d seu_banco -f codigo/scripts/migrations/add-agenda-slots-sync.sql
```

Ou via Node.js:
```javascript
const { query } = require('./config/database');
const fs = require('fs');
const sql = fs.readFileSync('./scripts/migrations/add-agenda-slots-sync.sql', 'utf8');
await query(sql);
```

### 2. Instalar Dependência (Opcional)

O sistema funciona sem `p-retry`, mas é recomendado:
```bash
cd codigo
npm install p-retry
```

### 3. Usar no Backend

#### Opção A: Via Rota (Recomendado)

```javascript
// Frontend ou Postman
POST /api/detran/sincronizar?useImproved=true

// Ou no body:
POST /api/detran/sincronizar
{
  "useImproved": true,
  "windowStart": "2025-11-04",  // Opcional: padrão é hoje
  "windowEnd": "2025-11-18"      // Opcional: padrão é +14 dias
}
```

#### Opção B: Direto no Código

```javascript
const DetranSyncImproved = require('./services/detranSyncImproved');

const sync = new DetranSyncImproved(usuarioId);

const result = await sync.runWindowSync({
  windowStart: '2025-11-04',
  windowEnd: '2025-11-18',
  diasTrabalho: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
  cpf: '12345678900',
  senha: 'senha123'
});

console.log(result);
// {
//   success: true,
//   message: "Sincronização concluída: 5 inseridos, 2 atualizados, 1 removido",
//   totals: { inserted: 5, updated: 2, removed: 1, skipped: 0 }
// }
```

## 📊 Fluxo de Sincronização

```
1. Iniciar Run
   └─> INSERT INTO agenda_sync_runs (status='running')

2. Adquirir Lock
   └─> pg_try_advisory_lock() para evitar concorrência

3. Obter/Criar Sessão
   ├─> Tentar cache de cookies
   ├─> Se não existir/expirado → fazer login
   └─> Salvar cookies no cache (45 min TTL)

4. Para cada data na janela:
   ├─> buscarAgendamentos(data) com retry
   ├─> Normalizar slots
   ├─> Gerar external_uid e content_hash
   ├─> Upsert na tabela agenda_slots
   ├─> Marcar ausentes como 'removed'
   └─> Voltar para página de pesquisa

5. Criar Agendamentos
   └─> Converter slots disponíveis para tabela agendamentos

6. Finalizar Run
   └─> UPDATE agenda_sync_runs (status, totals, finished_at)

7. Liberar Lock
   └─> pg_advisory_unlock()
```

## 🔍 Consultas Úteis

### Ver últimos syncs
```sql
SELECT 
  id,
  window_start,
  window_end,
  status,
  totals,
  started_at,
  finished_at - started_at AS duracao
FROM agenda_sync_runs
WHERE usuario_id = 1
ORDER BY started_at DESC
LIMIT 10;
```

### Ver slots atuais disponíveis
```sql
SELECT 
  data,
  hora,
  payload->>'nome' AS nome,
  payload->>'cpf' AS cpf,
  status,
  first_seen_at,
  last_seen_at
FROM agenda_slots
WHERE usuario_id = 1
  AND is_current = TRUE
  AND status = 'available'
  AND data >= CURRENT_DATE
ORDER BY data, hora;
```

### Ver slots que foram removidos
```sql
SELECT 
  data,
  hora,
  payload->>'nome' AS nome,
  first_seen_at,
  last_seen_at
FROM agenda_slots
WHERE usuario_id = 1
  AND status = 'removed'
  AND is_current = FALSE
ORDER BY last_seen_at DESC;
```

### Estatísticas de sincronização
```sql
SELECT 
  DATE_TRUNC('day', started_at) AS dia,
  COUNT(*) AS total_syncs,
  SUM((totals->>'inserted')::int) AS total_inseridos,
  SUM((totals->>'updated')::int) AS total_atualizados,
  SUM((totals->>'removed')::int) AS total_removidos,
  COUNT(*) FILTER (WHERE status = 'success') AS sucessos,
  COUNT(*) FILTER (WHERE status = 'failed') AS falhas
FROM agenda_sync_runs
WHERE usuario_id = 1
  AND started_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', started_at)
ORDER BY dia DESC;
```

## 🛠️ Configurações e Ajustes

### Ajustar TTL do Cache de Sessão

Em `codigo/utils/detranSessionCache.js`:
```javascript
const DEFAULT_TTL_SECONDS = 45 * 60; // 45 minutos
```

### Ajustar Retry

Em `codigo/services/detranSyncImproved.js`:
```javascript
const slots = await pRetry(
  async () => { ... },
  {
    retries: 3,              // Número de tentativas
    minTimeout: 1000,        // Delay mínimo (ms)
    maxTimeout: 8000,       // Delay máximo (ms)
    factor: 2               // Fator exponencial
  }
);
```

### Ajustar Janela de Datas Padrão

Na rota `/api/detran/sincronizar`:
```javascript
const windowEnd = req.body.windowEnd || (() => {
  const endDate = new Date(hoje);
  endDate.setDate(hoje.getDate() + 14); // Alterar para +7, +30, etc.
  return endDate.toISOString().split('T')[0];
})();
```

## 🔄 Migração do Sistema Antigo

O sistema antigo continua funcionando (compatibilidade). Para migrar:

1. **Executar migração SQL** (criar novas tabelas)
2. **Usar `useImproved=true`** nas chamadas
3. **Monitorar logs** por alguns dias
4. **Deprecar sistema antigo** quando estiver estável

## 📈 Próximos Passos (Melhorias Futuras)

### Cache com Redis (Opcional)
Substituir `detranSessionCache.js` por implementação com Redis:
```javascript
const redis = require('redis');
const client = redis.createClient();

async function getCachedCookies(usuarioId) {
  const raw = await client.get(`detran:${usuarioId}`);
  return raw ? JSON.parse(raw) : null;
}
```

### Sincronização Automática (Cron)
Criar job agendado:
```javascript
const cron = require('node-cron');

// A cada 15 minutos para próximos 3 dias
cron.schedule('*/15 * * * *', async () => {
  // Sincronizar janela de próximos 3 dias
});

// A cada 2 horas para dias 4-14
cron.schedule('0 */2 * * *', async () => {
  // Sincronizar janela de dias 4-14
});
```

### Alertas
Integrar com Slack/Email quando:
- Taxa de falha > X%
- Muitos slots removidos
- Erro de autenticação

## 🐛 Troubleshooting

### Lock não liberado
```sql
-- Ver locks ativos
SELECT * FROM pg_locks WHERE locktype = 'advisory';

-- Liberar lock manualmente (CUIDADO!)
SELECT pg_advisory_unlock_all();
```

### Cache com sessão inválida
```javascript
// Limpar cache manualmente
const { clearCachedCookies } = require('./utils/detranSessionCache');
await clearCachedCookies(usuarioId);
```

### Slots não criando agendamentos
Verificar se `criarAgendamentosDeSlots()` está sendo chamada após sincronização.

## 📝 Notas Importantes

1. **Sistema mantém compatibilidade**: O sistema antigo continua funcionando
2. **Deduplicação automática**: Não precisa verificar duplicatas manualmente
3. **Histórico preservado**: Slots removidos não são deletados, apenas marcados
4. **Um sync por vez**: Lock evita corridas, mas pode bloquear se anterior falhar
5. **Cache em memória**: Reinicia se servidor reiniciar (migrar para Redis em produção)

---

**Última Atualização:** 04/11/2025  
**Versão:** 1.0

