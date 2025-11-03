const { query } = require('../config/database');

async function criarTabelaMensagensEnviadas() {
  try {
    console.log('📝 Criando/Atualizando tabela de mensagens enviadas...');
    
    // Criar tabela se não existir
    await query(`
      CREATE TABLE IF NOT EXISTS mensagens_enviadas (
        id SERIAL PRIMARY KEY,
        avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
        aptidao VARCHAR(50) NOT NULL,
        metodo_envio VARCHAR(20) NOT NULL, -- 'email', 'whatsapp', 'ambos'
        data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(avaliacao_id) -- Uma avaliação só pode ter um registro de envio
      )
    `);
    
    console.log('✅ Tabela mensagens_enviadas criada/verificada');
    
    // Adicionar coluna metodo_envio se não existir
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'mensagens_enviadas' AND column_name = 'metodo_envio'
        ) THEN
          ALTER TABLE mensagens_enviadas ADD COLUMN metodo_envio VARCHAR(20) NOT NULL DEFAULT 'whatsapp';
        END IF;
      END $$;
    `);
    
    // Remover colunas antigas se existirem (email_enviado, whatsapp_enviado)
    try {
      await query(`
        ALTER TABLE mensagens_enviadas 
        DROP COLUMN IF EXISTS email_enviado,
        DROP COLUMN IF EXISTS whatsapp_enviado,
        DROP COLUMN IF EXISTS erros
      `);
    } catch (err) {
      // Ignorar se não existirem
    }
    
    // Garantir que há índice único em avaliacao_id
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mensagens_avaliacao_id_unique 
      ON mensagens_enviadas(avaliacao_id)
    `);
    
    // Criar índices para performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_mensagens_avaliacao_id 
      ON mensagens_enviadas(avaliacao_id)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_mensagens_data_envio 
      ON mensagens_enviadas(data_envio)
    `);
    
    console.log('✅ Índices criados');
    console.log('🎉 Tabela de mensagens configurada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    throw error;
  }
}

if (require.main === module) {
  criarTabelaMensagensEnviadas()
    .then(() => {
      console.log('\n✅ Script concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro:', error);
      process.exit(1);
    });
}

module.exports = criarTabelaMensagensEnviadas;

