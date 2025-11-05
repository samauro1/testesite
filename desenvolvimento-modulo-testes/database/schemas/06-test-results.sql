-- ============================================================================
-- TABELAS DE RESULTADOS DE TESTES E IMAGENS
-- ============================================================================
-- Expansão da tabela de resultados e tabela de imagens analisadas
-- ============================================================================

-- Expandir testes_resultados se necessário
-- (já existe em 01-create-tables.sql, mas vamos garantir que tem todos os campos)

-- Adicionar campos de imagem se não existirem
DO $$ 
BEGIN
  -- Adicionar coluna de imagem se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'testes_resultados' AND column_name = 'imagem_url'
  ) THEN
    ALTER TABLE testes_resultados ADD COLUMN imagem_url VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'testes_resultados' AND column_name = 'imagem_analizada'
  ) THEN
    ALTER TABLE testes_resultados ADD COLUMN imagem_analizada BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'testes_resultados' AND column_name = 'contexto'
  ) THEN
    ALTER TABLE testes_resultados ADD COLUMN contexto VARCHAR(50) DEFAULT 'transito';
  END IF;
END $$;

-- Tabela de imagens analisadas (OCR/IA)
CREATE TABLE IF NOT EXISTS test_images (
  id SERIAL PRIMARY KEY,
  resultado_id INTEGER REFERENCES testes_resultados(id) ON DELETE CASCADE,
  imagem_url VARCHAR(255),
  imagem_storage_key VARCHAR(255),
  
  -- Análise IA
  ocr_extracted_text TEXT,
  ia_analyzed BOOLEAN DEFAULT FALSE,
  ia_confidence DECIMAL(5,2), -- Confiança 0-100
  
  -- Dados extraídos
  dados_extraidos JSONB,
  observacoes_ia TEXT,
  
  data_analise TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_test_images_resultado ON test_images(resultado_id);
CREATE INDEX IF NOT EXISTS idx_test_images_analizada ON test_images(ia_analyzed);

-- Comentários
COMMENT ON TABLE test_images IS 'Imagens de testes analisadas com OCR e IA';
COMMENT ON COLUMN test_images.ia_confidence IS 'Confiança da análise IA (0-100)';

