-- ============================================================================
-- TABELAS NORMATIVAS DO TESTE DE MEMÓRIA
-- ============================================================================
-- Criação das tabelas para teste de memória
-- ============================================================================

-- Tabela de normas de Memória
CREATE TABLE IF NOT EXISTS normas_memoria (
  id SERIAL PRIMARY KEY,
  tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
  
  -- Critérios da norma
  regiao VARCHAR(50),
  escolaridade VARCHAR(50),
  idade_minima INT,
  idade_maxima INT,
  
  -- Evocação
  evocacao_excelente_min INT,
  evocacao_bom_min INT,
  evocacao_bom_max INT,
  evocacao_medio_min INT,
  evocacao_medio_max INT,
  evocacao_abaixo_min INT,
  evocacao_abaixo_max INT,
  
  -- Retenção
  retencao_excelente_min INT,
  retencao_bom_min INT,
  retencao_bom_max INT,
  retencao_medio_min INT,
  retencao_medio_max INT,
  retencao_abaixo_min INT,
  retencao_abaixo_max INT,
  
  -- Reconhecimento
  reconhecimento_excelente_min INT,
  reconhecimento_bom_min INT,
  reconhecimento_bom_max INT,
  reconhecimento_medio_min INT,
  reconhecimento_medio_max INT,
  reconhecimento_abaixo_min INT,
  reconhecimento_abaixo_max INT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de resultados de testes de memória
CREATE TABLE IF NOT EXISTS resultados_memoria (
  id SERIAL PRIMARY KEY,
  resultado_id INTEGER REFERENCES testes_resultados(id) ON DELETE CASCADE,
  
  -- Dados do teste
  evocacao_imediata INT,
  evocacao_tardia INT,
  retencao INT,
  reconhecimento INT,
  
  -- Percentis e classificações
  evocacao_percentil INT,
  evocacao_classificacao VARCHAR(50),
  retencao_percentil INT,
  retencao_classificacao VARCHAR(50),
  reconhecimento_percentil INT,
  reconhecimento_classificacao VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_normas_memoria_tabela ON normas_memoria(tabela_id);
CREATE INDEX IF NOT EXISTS idx_normas_memoria_regiao ON normas_memoria(regiao);
CREATE INDEX IF NOT EXISTS idx_resultados_memoria_resultado ON resultados_memoria(resultado_id);

-- Comentários
COMMENT ON TABLE normas_memoria IS 'Normas para teste de memória';
COMMENT ON TABLE resultados_memoria IS 'Resultados específicos de testes de memória';

