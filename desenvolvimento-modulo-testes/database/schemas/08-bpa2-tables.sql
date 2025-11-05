-- ============================================================================
-- TABELAS NORMATIVAS DO TESTE BPA-2
-- ============================================================================
-- Criação das tabelas necessárias para armazenar as tabelas normativas do BPA-2
-- BPA-2: Bateria de Provas de Atenção - Teste de Atenção (Sustentada, Alternada, Dividida)
-- ============================================================================

-- Tabela de normas do BPA-2
CREATE TABLE IF NOT EXISTS normas_bpa2 (
  id SERIAL PRIMARY KEY,
  tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
  
  -- Tipo de atenção
  tipo_atencao VARCHAR(20) NOT NULL, -- 'Alternada', 'Concentrada', 'Dividida', 'Geral'
  
  -- Faixa de pontos
  pontos_min INTEGER NOT NULL,
  pontos_max INTEGER NOT NULL,
  
  -- Resultado normativo
  percentil INTEGER NOT NULL,
  classificacao VARCHAR(50) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Garantir que não haja duplicatas
  UNIQUE(tabela_id, tipo_atencao, pontos_min, pontos_max)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_normas_bpa2_tabela ON normas_bpa2(tabela_id);
CREATE INDEX IF NOT EXISTS idx_normas_bpa2_tipo ON normas_bpa2(tipo_atencao);
CREATE INDEX IF NOT EXISTS idx_normas_bpa2_pontos ON normas_bpa2(pontos_min, pontos_max);

-- Comentários
COMMENT ON TABLE normas_bpa2 IS 'Normas do teste BPA-2 (Bateria de Provas de Atenção)';
COMMENT ON COLUMN normas_bpa2.tipo_atencao IS 'Tipo de atenção: Alternada (AA), Concentrada (AC), Dividida (AD) ou Geral (Atenção Geral)';
COMMENT ON COLUMN normas_bpa2.pontos_min IS 'Pontuação mínima para esta faixa normativa';
COMMENT ON COLUMN normas_bpa2.pontos_max IS 'Pontuação máxima para esta faixa normativa';
COMMENT ON COLUMN normas_bpa2.percentil IS 'Percentil correspondente a esta faixa';
COMMENT ON COLUMN normas_bpa2.classificacao IS 'Classificação normativa (Superior, Médio, Inferior, etc.)';

