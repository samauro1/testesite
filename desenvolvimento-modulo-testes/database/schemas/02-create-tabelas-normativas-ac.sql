-- ============================================================================
-- TABELAS NORMATIVAS DO TESTE AC
-- ============================================================================
-- Criação das tabelas necessárias para armazenar as tabelas normativas do AC
-- ============================================================================

-- Tabela de tabelas normativas (se não existir)
CREATE TABLE IF NOT EXISTS tabelas_normativas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(500) UNIQUE NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  versao VARCHAR(50),
  criterio TEXT,
  descricao TEXT,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de normas do AC
CREATE TABLE IF NOT EXISTS normas_ac (
  id SERIAL PRIMARY KEY,
  tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
  classificacao VARCHAR(50) NOT NULL,
  percentil INTEGER NOT NULL,
  fundamental_min INTEGER,
  fundamental_max INTEGER,
  medio_min INTEGER,
  medio_max INTEGER,
  superior_min INTEGER,
  superior_max INTEGER,
  total_min INTEGER,
  total_max INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tabela_id, percentil, classificacao)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_normas_ac_tabela ON normas_ac(tabela_id);
CREATE INDEX IF NOT EXISTS idx_normas_ac_percentil ON normas_ac(percentil);
CREATE INDEX IF NOT EXISTS idx_tabelas_normativas_tipo ON tabelas_normativas(tipo);

-- Comentários
COMMENT ON TABLE tabelas_normativas IS 'Tabelas normativas dos testes psicológicos';
COMMENT ON TABLE normas_ac IS 'Normas do teste AC (Atenção Concentrada)';
COMMENT ON COLUMN normas_ac.fundamental_min IS 'Pontuação mínima para Ensino Fundamental neste percentil';
COMMENT ON COLUMN normas_ac.fundamental_max IS 'Pontuação máxima para Ensino Fundamental neste percentil';
COMMENT ON COLUMN normas_ac.medio_min IS 'Pontuação mínima para Ensino Médio neste percentil';
COMMENT ON COLUMN normas_ac.medio_max IS 'Pontuação máxima para Ensino Médio neste percentil';
COMMENT ON COLUMN normas_ac.superior_min IS 'Pontuação mínima para Ensino Superior neste percentil';
COMMENT ON COLUMN normas_ac.superior_max IS 'Pontuação máxima para Ensino Superior neste percentil';
COMMENT ON COLUMN normas_ac.total_min IS 'Pontuação mínima para Amostra Total neste percentil';
COMMENT ON COLUMN normas_ac.total_max IS 'Pontuação máxima para Amostra Total neste percentil';

