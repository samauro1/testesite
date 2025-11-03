-- Migration: Remover constraint UNIQUE do numero_laudo
-- Permite que um laudo tenha múltiplas avaliações (em diferentes datas)
-- Exemplo: LAU-2025-0013 pode ter:
--   - Avaliação 1: Data 17/10/2025 - Testes: Memória + Atenção
--   - Avaliação 2: Data 20/10/2025 - Testes: Memória + Inteligência

-- 1. Remover a constraint UNIQUE do numero_laudo
ALTER TABLE avaliacoes 
DROP CONSTRAINT IF EXISTS avaliacoes_numero_laudo_key;

-- 2. Adicionar index para performance (não unique)
CREATE INDEX IF NOT EXISTS idx_avaliacoes_numero_laudo 
ON avaliacoes(numero_laudo);

-- 3. Adicionar index composto para buscar avaliações por paciente e laudo
CREATE INDEX IF NOT EXISTS idx_avaliacoes_paciente_laudo 
ON avaliacoes(paciente_id, numero_laudo);

-- 4. Adicionar index para ordenação por data
CREATE INDEX IF NOT EXISTS idx_avaliacoes_data_aplicacao 
ON avaliacoes(data_aplicacao DESC);

-- Agora é possível ter múltiplas avaliações com o mesmo número de laudo
-- desde que sejam em datas diferentes ou com contextos diferentes

