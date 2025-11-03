-- Tabela para registrar mensagens enviadas
CREATE TABLE IF NOT EXISTS mensagens_enviadas (
  id SERIAL PRIMARY KEY,
  avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
  aptidao VARCHAR(50) NOT NULL,
  email_enviado BOOLEAN DEFAULT false,
  whatsapp_enviado BOOLEAN DEFAULT false,
  erros TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_mensagens_avaliacao_id ON mensagens_enviadas(avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_created_at ON mensagens_enviadas(created_at);
