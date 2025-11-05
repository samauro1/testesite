-- ============================================================================
-- TABELAS NORMATIVAS DO TESTE PALOGRÁFICO
-- ============================================================================
-- Criação das tabelas necessárias para armazenar as tabelas normativas do Palográfico
-- ============================================================================

-- Tabela de normas do Palográfico
CREATE TABLE IF NOT EXISTS normas_palografico (
  id SERIAL PRIMARY KEY,
  tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
  
  -- Critérios da norma
  regiao VARCHAR(50) NOT NULL, -- 'Sudeste', 'Nordeste', 'Sul', 'Norte', 'Centro-Oeste', 'Total'
  sexo VARCHAR(10), -- 'M', 'F', 'Ambos'
  escolaridade VARCHAR(50), -- 'Fundamental', 'Médio', 'Superior'
  idade_minima INT,
  idade_maxima INT,
  
  -- PRODUTIVIDADE (palos por 5 minutos)
  produtividade_muito_alta_min INT,
  produtividade_muito_alta_max INT,
  produtividade_alta_min INT,
  produtividade_alta_max INT,
  produtividade_media_min INT,
  produtividade_media_max INT,
  produtividade_baixa_min INT,
  produtividade_baixa_max INT,
  produtividade_muito_baixa_min INT,
  produtividade_muito_baixa_max INT,
  
  -- NOR (Nível Oscilação Rítmica)
  nor_muito_alto_min DECIMAL(5,2),
  nor_muito_alto_max DECIMAL(5,2),
  nor_alto_min DECIMAL(5,2),
  nor_alto_max DECIMAL(5,2),
  nor_medio_min DECIMAL(5,2),
  nor_medio_max DECIMAL(5,2),
  nor_baixo_min DECIMAL(5,2),
  nor_baixo_max DECIMAL(5,2),
  nor_muito_baixo_min DECIMAL(5,2),
  nor_muito_baixo_max DECIMAL(5,2),
  
  -- TAMANHO PALOS (em mm)
  tamanho_muito_grande_min DECIMAL(5,1),
  tamanho_grande_min DECIMAL(5,1),
  tamanho_grande_max DECIMAL(5,1),
  tamanho_medio_min DECIMAL(5,1),
  tamanho_medio_max DECIMAL(5,1),
  tamanho_pequeno_min DECIMAL(5,1),
  tamanho_pequeno_max DECIMAL(5,1),
  tamanho_muito_pequeno_min DECIMAL(5,1),
  tamanho_muito_pequeno_max DECIMAL(5,1),
  
  -- DISTÂNCIA PALOS (em mm)
  distancia_muito_ampla_min DECIMAL(5,2),
  distancia_ampla_min DECIMAL(5,2),
  distancia_ampla_max DECIMAL(5,2),
  distancia_normal_min DECIMAL(5,2),
  distancia_normal_max DECIMAL(5,2),
  distancia_estreita_min DECIMAL(5,2),
  distancia_estreita_max DECIMAL(5,2),
  distancia_muito_estreita_min DECIMAL(5,2),
  distancia_muito_estreita_max DECIMAL(5,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de resultados qualitativos do Palográfico
CREATE TABLE IF NOT EXISTS resultados_palografico_qualitativo (
  id SERIAL PRIMARY KEY,
  resultado_id INTEGER REFERENCES testes_resultados(id) ON DELETE CASCADE,
  
  -- Variáveis qualitativas
  inclinacao VARCHAR(50), -- 'Direita', 'Vertical', 'Esquerda'
  inclinacao_descricao TEXT,
  margens_esquerda VARCHAR(50), -- 'Ampla', 'Normal', 'Estreita'
  margens_descricao TEXT,
  pressao VARCHAR(50), -- 'Forte', 'Normal', 'Fraca'
  pressao_descricao TEXT,
  organizacao VARCHAR(50), -- 'Ordenada', 'Normal', 'Desorganizada'
  organizacao_descricao TEXT,
  
  -- Irregularidades
  irregularidades JSONB, -- Array de irregularidades encontradas
  emotividade_indice INT, -- 0-8 irregularidades
  depressao_indicios BOOLEAN,
  
  -- Interpretação combinada
  ambiente_grafico VARCHAR(20), -- 'Positivo', 'Negativo'
  ritmo_resultado VARCHAR(50), -- 'Bom equilíbrio', 'Instável', etc
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_normas_palografico_tabela ON normas_palografico(tabela_id);
CREATE INDEX IF NOT EXISTS idx_normas_palografico_regiao ON normas_palografico(regiao);
CREATE INDEX IF NOT EXISTS idx_normas_palografico_sexo ON normas_palografico(sexo);
CREATE INDEX IF NOT EXISTS idx_normas_palografico_escolaridade ON normas_palografico(escolaridade);
CREATE INDEX IF NOT EXISTS idx_resultados_palografico_qualitativo ON resultados_palografico_qualitativo(resultado_id);

-- Comentários
COMMENT ON TABLE normas_palografico IS 'Normas do teste Palográfico por região, sexo, escolaridade e idade';
COMMENT ON TABLE resultados_palografico_qualitativo IS 'Resultados qualitativos do teste Palográfico (inclinação, margens, pressão, etc)';
COMMENT ON COLUMN normas_palografico.produtividade_muito_alta_min IS 'Produtividade muito alta: mínimo de palos em 5 minutos';
COMMENT ON COLUMN normas_palografico.nor_muito_alto_min IS 'NOR muito alto: mínimo do índice de oscilação rítmica';
COMMENT ON COLUMN normas_palografico.tamanho_muito_grande_min IS 'Tamanho muito grande: mínimo em mm dos palos';

