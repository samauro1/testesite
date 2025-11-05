-- ============================================================================
-- ATUALIZAÇÃO DA TABELA normas_bpa2
-- Adicionar campo valor_criterio para identificar idade/escolaridade específica
-- ============================================================================

-- Adicionar coluna valor_criterio se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'normas_bpa2' AND column_name = 'valor_criterio'
    ) THEN
        ALTER TABLE normas_bpa2 
        ADD COLUMN valor_criterio VARCHAR(50);
        
        COMMENT ON COLUMN normas_bpa2.valor_criterio IS 'Valor específico do critério: idade (ex: "6 anos", "7 anos", "15-17 anos") ou escolaridade (ex: "Ensino Fundamental") ou "Amostra Total"';
    ELSE
        -- Se já existe, garantir que não seja NOT NULL
        ALTER TABLE normas_bpa2 
        ALTER COLUMN valor_criterio DROP NOT NULL;
    END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_normas_bpa2_criterio ON normas_bpa2(tabela_id, tipo_atencao, valor_criterio);

-- Remover duplicatas antes de criar constraint
-- Manter apenas a primeira ocorrência de cada combinação única
DELETE FROM normas_bpa2 a USING normas_bpa2 b
WHERE a.id > b.id
  AND a.tabela_id = b.tabela_id
  AND a.tipo_atencao = b.tipo_atencao
  AND COALESCE(a.valor_criterio, '') = COALESCE(b.valor_criterio, '')
  AND a.pontos_min = b.pontos_min
  AND a.pontos_max = b.pontos_max;

-- Atualizar constraint UNIQUE para incluir valor_criterio
-- Primeiro, remover constraints antigas se existirem
DO $$
BEGIN
    -- Remover constraint antiga se existir
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'normas_bpa2_tabela_id_tipo_atencao_pontos_min_pontos_max_key'
    ) THEN
        ALTER TABLE normas_bpa2 
        DROP CONSTRAINT normas_bpa2_tabela_id_tipo_atencao_pontos_min_pontos_max_key;
    END IF;
    
    -- Remover constraint nova se já existir (para permitir recriação)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'normas_bpa2_unique'
    ) THEN
        ALTER TABLE normas_bpa2 
        DROP CONSTRAINT normas_bpa2_unique;
    END IF;
END $$;

-- Criar nova constraint UNIQUE incluindo valor_criterio
ALTER TABLE normas_bpa2 
ADD CONSTRAINT normas_bpa2_unique 
UNIQUE(tabela_id, tipo_atencao, valor_criterio, pontos_min, pontos_max);

