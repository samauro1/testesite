-- ============================================================================
-- TABELAS NORMATIVAS DE TESTES DE ATENÇÃO (EXPANSÃO DO AC)
-- ============================================================================
-- Criação das tabelas para outros testes de atenção além do AC
-- ============================================================================

-- Tabela de normas de Atenção (generalizada para diferentes testes)
CREATE TABLE IF NOT EXISTS normas_atencao (
  id SERIAL PRIMARY KEY,
  tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
  
  -- Critérios da norma
  regiao VARCHAR(50),
  escolaridade VARCHAR(50),
  idade_minima INT,
  idade_maxima INT,
  contexto VARCHAR(50), -- 'transito', 'rh', 'clinico', 'ocupacional'
  
  -- Pontuação e classificação
  pontuacao_excelente_min INT,
  pontuacao_bom_min INT,
  pontuacao_bom_max INT,
  pontuacao_medio_min INT,
  pontuacao_medio_max INT,
  pontuacao_abaixo_min INT,
  pontuacao_abaixo_max INT,
  
  -- Tempo de reação (se aplicável)
  tempo_reacao_min INT,
  tempo_reacao_max INT,
  
  -- Percentis (se aplicável)
  percentil_min INT,
  percentil_max INT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de resultados de testes de atenção
CREATE TABLE IF NOT EXISTS resultados_atencao (
  id SERIAL PRIMARY KEY,
  resultado_id INTEGER REFERENCES testes_resultados(id) ON DELETE CASCADE,
  
  -- Dados do teste
  acertos INT,
  erros INT,
  omissoes INT,
  pontuacao_final INT,
  tempo_total INT,
  
  -- Percentil e classificação
  percentil INT,
  classificacao VARCHAR(50),
  
  -- Contexto
  contexto VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_normas_atencao_tabela ON normas_atencao(tabela_id);
CREATE INDEX IF NOT EXISTS idx_normas_atencao_regiao ON normas_atencao(regiao);
CREATE INDEX IF NOT EXISTS idx_normas_atencao_contexto ON normas_atencao(contexto);
CREATE INDEX IF NOT EXISTS idx_resultados_atencao_resultado ON resultados_atencao(resultado_id);

-- Comentários
COMMENT ON TABLE normas_atencao IS 'Normas para testes de atenção (AC e outros)';
COMMENT ON TABLE resultados_atencao IS 'Resultados específicos de testes de atenção';

