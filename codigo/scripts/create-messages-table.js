const { query } = require('../config/database');

async function createMessagesTable() {
  try {
    console.log('📝 Criando tabela de mensagens enviadas...');
    
    // Criar tabela
    await query(`
      CREATE TABLE IF NOT EXISTS mensagens_enviadas (
        id SERIAL PRIMARY KEY,
        avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
        aptidao VARCHAR(50) NOT NULL,
        email_enviado BOOLEAN DEFAULT false,
        whatsapp_enviado BOOLEAN DEFAULT false,
        erros TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Tabela mensagens_enviadas criada');
    
    // Criar índices
    await query(`
      CREATE INDEX IF NOT EXISTS idx_mensagens_avaliacao_id ON mensagens_enviadas(avaliacao_id)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_mensagens_created_at ON mensagens_enviadas(created_at)
    `);
    
    console.log('✅ Índices criados');
    console.log('🎉 Tabela de mensagens configurada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createMessagesTable()
    .then(() => {
      console.log('✅ Script concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro:', error);
      process.exit(1);
    });
}

module.exports = createMessagesTable;
