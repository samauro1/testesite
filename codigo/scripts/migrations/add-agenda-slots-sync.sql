-- Migration: Sistema de sincronização robusta de agenda DETRAN
-- Cria tabelas para rastreamento de slots, deduplicação e observabilidade

-- Tabela de slots/vagas da agenda (rastreamento granular)
CREATE TABLE IF NOT EXISTS agenda_slots (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'DETRAN',
  unidade_code TEXT NOT NULL DEFAULT 'DEFAULT', -- código/identificador da unidade/posto
  servico_code TEXT NOT NULL DEFAULT 'PERITO',  -- tipo de serviço no portal
  data DATE NOT NULL,
  hora TIME NOT NULL,                           -- hora de início (HH:mm:ss)
  duracao_min INTEGER,                          -- duração em minutos (opcional)
  status TEXT NOT NULL DEFAULT 'available',     -- 'available' | 'booked' | 'removed' | 'unknown'
  is_current BOOLEAN NOT NULL DEFAULT TRUE,     -- se apareceu no último sync daquele dia
  external_uid TEXT NOT NULL,                  -- identificador estável (hash SHA1)
  payload JSONB,                              -- raw normalizado do scraping
  content_hash TEXT,                           -- hash SHA1 do payload normalizado
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE, -- perito que sincroniza
  agendamento_id INTEGER REFERENCES agendamentos(id) ON DELETE SET NULL, -- vínculo opcional com agendamento criado
  UNIQUE (source, external_uid)
);

-- Índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_agenda_slots_lookup
  ON agenda_slots (source, unidade_code, servico_code, data, status);

CREATE INDEX IF NOT EXISTS idx_agenda_slots_current
  ON agenda_slots (data, is_current, status) 
  WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_agenda_slots_usuario
  ON agenda_slots (usuario_id, data);

CREATE INDEX IF NOT EXISTS idx_agenda_slots_external_uid
  ON agenda_slots (external_uid);

-- Tabela de execuções de sincronização (observabilidade)
CREATE TABLE IF NOT EXISTS agenda_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'DETRAN',
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',      -- 'success' | 'partial' | 'failed' | 'running'
  totals JSONB,                                -- { "inserted": n, "updated": n, "removed": n, "skipped": n }
  error TEXT,
  error_details JSONB,                          -- stack trace, contexto adicional
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_usuario
  ON agenda_sync_runs (usuario_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_runs_status
  ON agenda_sync_runs (status, started_at DESC);

-- Comentários para documentação
COMMENT ON TABLE agenda_slots IS 'Rastreamento granular de slots/vagas da agenda DETRAN. Permite deduplicação, histórico e sincronização incremental.';
COMMENT ON TABLE agenda_sync_runs IS 'Log de execuções de sincronização para observabilidade e troubleshooting.';

COMMENT ON COLUMN agenda_slots.external_uid IS 'Hash SHA1 estável baseado em unidade+servico+data+hora+slotId. Garante unicidade.';
COMMENT ON COLUMN agenda_slots.content_hash IS 'Hash do payload normalizado. Detecta mudanças no conteúdo do slot.';
COMMENT ON COLUMN agenda_slots.is_current IS 'TRUE se o slot apareceu no último sync daquele dia. FALSE se foi removido/sumiu.';
COMMENT ON COLUMN agenda_slots.status IS 'Estado atual: available (disponível), booked (reservado), removed (removido do site), unknown (indeterminado)';

