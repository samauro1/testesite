-- ============================================================================
-- SCHEMA DE BANCO DE DADOS - MÓDULO DE TESTES (AMBIENTE ISOLADO)
-- ============================================================================
-- 
-- IMPORTANTE: Execute este script em um BANCO DE DADOS SEPARADO
-- ou use um SCHEMA SEPARADO para não afetar o sistema principal.
--
-- Opção 1: Criar banco separado
--   CREATE DATABASE sistema_testes_desenvolvimento;
--
-- Opção 2: Criar schema separado
--   CREATE SCHEMA testes_dev;
--   SET search_path = 'testes_dev';
-- ============================================================================

-- Tabela de tipos de testes
CREATE TABLE IF NOT EXISTS testes_tipos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de campos de cada teste
CREATE TABLE IF NOT EXISTS testes_campos (
  id SERIAL PRIMARY KEY,
  teste_tipo_id INTEGER REFERENCES testes_tipos(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  label VARCHAR(200) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'number', 'text', 'select', etc.
  obrigatorio BOOLEAN DEFAULT false,
  min_valor NUMERIC,
  max_valor NUMERIC,
  opcoes JSONB, -- Para campos select
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de resultados de testes
CREATE TABLE IF NOT EXISTS testes_resultados (
  id SERIAL PRIMARY KEY,
  teste_tipo_id INTEGER REFERENCES testes_tipos(id),
  paciente_id INTEGER, -- Será integrado com tabela pacientes do sistema principal
  avaliacao_id INTEGER, -- Será integrado com tabela avaliacoes do sistema principal
  dados_entrada JSONB NOT NULL, -- Dados de entrada do teste
  resultado_calculado JSONB NOT NULL, -- Resultado calculado
  tabela_normativa_id INTEGER, -- Referência à tabela normativa usada
  interpretacao TEXT,
  usuario_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de gabaritos (para correção automática)
CREATE TABLE IF NOT EXISTS testes_gabaritos (
  id SERIAL PRIMARY KEY,
  teste_tipo_id INTEGER REFERENCES testes_tipos(id) ON DELETE CASCADE,
  versao VARCHAR(50),
  gabarito JSONB NOT NULL, -- Estrutura do gabarito
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de histórico de aplicações
CREATE TABLE IF NOT EXISTS testes_historico (
  id SERIAL PRIMARY KEY,
  teste_resultado_id INTEGER REFERENCES testes_resultados(id) ON DELETE CASCADE,
  paciente_id INTEGER,
  avaliacao_id INTEGER,
  tipo_teste VARCHAR(50),
  data_aplicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_id INTEGER,
  observacoes TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_testes_resultados_paciente ON testes_resultados(paciente_id);
CREATE INDEX IF NOT EXISTS idx_testes_resultados_avaliacao ON testes_resultados(avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_testes_resultados_tipo ON testes_resultados(teste_tipo_id);
CREATE INDEX IF NOT EXISTS idx_testes_historico_paciente ON testes_historico(paciente_id);
CREATE INDEX IF NOT EXISTS idx_testes_historico_data ON testes_historico(data_aplicacao);

-- Comentários nas tabelas
COMMENT ON TABLE testes_tipos IS 'Tipos de testes psicológicos disponíveis';
COMMENT ON TABLE testes_campos IS 'Campos de entrada de cada tipo de teste';
COMMENT ON TABLE testes_resultados IS 'Resultados calculados dos testes';
COMMENT ON TABLE testes_gabaritos IS 'Gabaritos para correção automática';
COMMENT ON TABLE testes_historico IS 'Histórico de aplicações de testes';

