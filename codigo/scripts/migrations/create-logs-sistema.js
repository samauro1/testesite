const { query } = require('../../config/database');

async function createLogsTable() {
  try {
    console.log('Criando tabela logs_sistema...');

    await query(`
      CREATE TABLE IF NOT EXISTS logs_sistema (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        descricao TEXT,
        usuario_id INTEGER REFERENCES usuarios(id),
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Tabela logs_sistema criada com sucesso!');

    // Criar índices para melhor performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_logs_sistema_tipo ON logs_sistema(tipo);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_logs_sistema_usuario_id ON logs_sistema(usuario_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_logs_sistema_created_at ON logs_sistema(created_at DESC);
    `);

    console.log('✓ Índices criados com sucesso!');

    console.log('\n✅ Migration concluída!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createLogsTable()
    .then(() => {
      console.log('Migration executada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro na migration:', error);
      process.exit(1);
    });
}

module.exports = { createLogsTable };

