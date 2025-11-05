-- ============================================================================
-- POPULAR TIPOS DE TESTES E CAMPOS
-- ============================================================================
-- Este script popula o banco com os tipos de testes psicológicos e seus campos
-- ============================================================================

-- Inserir tipos de testes
INSERT INTO testes_tipos (codigo, nome, descricao, ativo) VALUES
('memore', 'MEMORE - Memória', 'Avaliação da capacidade de memória', true),
('mig', 'MIG - Avaliação Psicológica', 'Avaliação psicológica geral', true),
('ac', 'AC - Atenção Concentrada', 'Teste de atenção concentrada', true),
('beta-iii', 'BETA-III - Raciocínio Matricial', 'Teste de raciocínio matricial', true),
('r1', 'R-1 - Raciocínio', 'Teste de raciocínio', true),
('rotas', 'ROTAS - Atenção', 'Teste de atenção (3 rotas: Concentrada, Alternada, Dividida)', true),
('mvt', 'MVT - Memória Visual para Trânsito', 'Avaliação de memória visual específica para trânsito', true),
('bpa2', 'BPA-2 - Atenção', 'Teste de atenção', true),
('palografico', 'Palográfico', 'Teste palográfico', true)
ON CONFLICT (codigo) DO NOTHING;

-- Inserir campos do MEMORE
INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'vp',
  'Verdadeiros Positivos',
  'number',
  true,
  0,
  50,
  1
FROM testes_tipos WHERE codigo = 'memore'
ON CONFLICT DO NOTHING;

INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'vn',
  'Verdadeiros Negativos',
  'number',
  true,
  0,
  50,
  2
FROM testes_tipos WHERE codigo = 'memore'
ON CONFLICT DO NOTHING;

INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'fn',
  'Falsos Negativos',
  'number',
  true,
  0,
  50,
  3
FROM testes_tipos WHERE codigo = 'memore'
ON CONFLICT DO NOTHING;

INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'fp',
  'Falsos Positivos',
  'number',
  true,
  0,
  50,
  4
FROM testes_tipos WHERE codigo = 'memore'
ON CONFLICT DO NOTHING;

-- Inserir campos do MIG
INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'acertos_manual',
  'Acertos (opcional - preencha OU use o gabarito abaixo)',
  'number',
  false,
  0,
  28,
  1
FROM testes_tipos WHERE codigo = 'mig'
ON CONFLICT DO NOTHING;

-- Inserir campos do AC
INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'acertos',
  'Acertos',
  'number',
  true,
  0,
  300,
  1
FROM testes_tipos WHERE codigo = 'ac'
ON CONFLICT DO NOTHING;

INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'erros',
  'Erros',
  'number',
  true,
  0,
  300,
  2
FROM testes_tipos WHERE codigo = 'ac'
ON CONFLICT DO NOTHING;

INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'omissoes',
  'Omissões',
  'number',
  true,
  0,
  300,
  3
FROM testes_tipos WHERE codigo = 'ac'
ON CONFLICT DO NOTHING;

-- Inserir campos do BETA-III
INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'acertos',
  'Acertos',
  'number',
  true,
  0,
  50,
  1
FROM testes_tipos WHERE codigo = 'beta-iii'
ON CONFLICT DO NOTHING;

-- Inserir campos do R-1
INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'acertos',
  'Acertos',
  'number',
  true,
  0,
  40,
  1
FROM testes_tipos WHERE codigo = 'r1'
ON CONFLICT DO NOTHING;

-- Inserir campos do ROTAS
-- Rota A (Concentrada)
INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'acertos_rota_a',
  'Acertos - Rota A (Concentrada)',
  'number',
  true,
  0,
  50,
  1
FROM testes_tipos WHERE codigo = 'rotas'
ON CONFLICT DO NOTHING;

INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'erros_rota_a',
  'Erros - Rota A',
  'number',
  true,
  0,
  50,
  2
FROM testes_tipos WHERE codigo = 'rotas'
ON CONFLICT DO NOTHING;

INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'omissoes_rota_a',
  'Omissões - Rota A',
  'number',
  true,
  0,
  50,
  3
FROM testes_tipos WHERE codigo = 'rotas'
ON CONFLICT DO NOTHING;

-- Rota B (Alternada)
INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'acertos_rota_b',
  'Acertos - Rota B (Alternada)',
  'number',
  true,
  0,
  50,
  4
FROM testes_tipos WHERE codigo = 'rotas'
ON CONFLICT DO NOTHING;

INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'erros_rota_b',
  'Erros - Rota B',
  'number',
  true,
  0,
  50,
  5
FROM testes_tipos WHERE codigo = 'rotas'
ON CONFLICT DO NOTHING;

INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'omissoes_rota_b',
  'Omissões - Rota B',
  'number',
  true,
  0,
  50,
  6
FROM testes_tipos WHERE codigo = 'rotas'
ON CONFLICT DO NOTHING;

-- Rota C e D (para completude)
INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'acertos_rota_c',
  'Acertos - Rota C',
  'number',
  false,
  0,
  50,
  7
FROM testes_tipos WHERE codigo = 'rotas'
ON CONFLICT DO NOTHING;

INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'acertos_rota_d',
  'Acertos - Rota D',
  'number',
  false,
  0,
  50,
  8
FROM testes_tipos WHERE codigo = 'rotas'
ON CONFLICT DO NOTHING;

-- Inserir campos do MVT
INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'acertos',
  'Acertos',
  'number',
  true,
  0,
  50,
  1
FROM testes_tipos WHERE codigo = 'mvt'
ON CONFLICT DO NOTHING;

-- Inserir campos do BPA-2
INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'acertos',
  'Acertos',
  'number',
  true,
  0,
  50,
  1
FROM testes_tipos WHERE codigo = 'bpa2'
ON CONFLICT DO NOTHING;

-- Inserir campos do Palográfico
INSERT INTO testes_campos (teste_tipo_id, nome, label, tipo, obrigatorio, min_valor, max_valor, ordem)
SELECT 
  id,
  'acertos',
  'Acertos',
  'number',
  true,
  0,
  50,
  1
FROM testes_tipos WHERE codigo = 'palografico'
ON CONFLICT DO NOTHING;

-- Verificar dados inseridos
SELECT 
  tt.codigo,
  tt.nome,
  COUNT(tc.id) as total_campos
FROM testes_tipos tt
LEFT JOIN testes_campos tc ON tt.id = tc.teste_tipo_id
WHERE tt.ativo = true
GROUP BY tt.id, tt.codigo, tt.nome
ORDER BY tt.nome;

