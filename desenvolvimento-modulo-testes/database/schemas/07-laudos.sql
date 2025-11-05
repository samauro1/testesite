-- ============================================================================
-- TABELA DE LAUDOS PERICIAIS
-- ============================================================================
-- Criação da tabela para armazenar laudos gerados
-- ============================================================================

-- Tabela de laudos periciais
CREATE TABLE IF NOT EXISTS laudos_periciais (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER,
  avaliador_id INTEGER,
  contexto_id INTEGER,
  
  -- Dados do laudo
  numero_laudo VARCHAR(50) UNIQUE,
  titulo VARCHAR(255),
  
  -- Testes inclusos
  testes_resultados INTEGER[], -- Array de resultado_ids
  
  -- Conclusão
  conclusao_texto TEXT,
  parecer VARCHAR(50), -- 'Apto', 'Inapto', 'Inapto Temporário'
  parecer_detalhado TEXT,
  
  -- Observações gerais
  observacoes TEXT,
  recomendacoes TEXT[],
  
  -- Documentos
  pdf_url VARCHAR(255),
  word_url VARCHAR(255),
  html_content TEXT,
  
  -- Assinatura
  assinado BOOLEAN DEFAULT FALSE,
  assinatura_digital_key VARCHAR(255),
  data_assinatura TIMESTAMP,
  
  -- Status
  arquivo_finalizado BOOLEAN DEFAULT FALSE,
  data_finalizacao TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de backups e arquivamento
CREATE TABLE IF NOT EXISTS backups (
  id SERIAL PRIMARY KEY,
  tipo_backup VARCHAR(50), -- 'completo', 'incremental', 'laudos', 'testes'
  descricao TEXT,
  arquivo_url VARCHAR(255),
  tamanho_mb DECIMAL(10,2),
  restauravel BOOLEAN DEFAULT TRUE,
  data_backup TIMESTAMP,
  data_restauracao TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_laudos_paciente ON laudos_periciais(paciente_id);
CREATE INDEX IF NOT EXISTS idx_laudos_avaliador ON laudos_periciais(avaliador_id);
CREATE INDEX IF NOT EXISTS idx_laudos_numero ON laudos_periciais(numero_laudo);
CREATE INDEX IF NOT EXISTS idx_laudos_parecer ON laudos_periciais(parecer);
CREATE INDEX IF NOT EXISTS idx_backups_tipo ON backups(tipo_backup);

-- Comentários
COMMENT ON TABLE laudos_periciais IS 'Laudos periciais gerados pelo sistema';
COMMENT ON TABLE backups IS 'Backups e arquivamentos do sistema';

