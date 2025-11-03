-- Migration: Adicionar tabela de configuração DETRAN
-- Execute este SQL no PostgreSQL

CREATE TABLE IF NOT EXISTS configuracoes_detran (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cpf VARCHAR(14) NOT NULL,
  senha TEXT NOT NULL,
  dias_trabalho TEXT NOT NULL, -- JSON array: ["terca", "quarta"]
  sincronizacao_automatica BOOLEAN DEFAULT false,
  ultima_sincronizacao TIMESTAMP,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id)
);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_configuracoes_detran_usuario 
ON configuracoes_detran(usuario_id);

