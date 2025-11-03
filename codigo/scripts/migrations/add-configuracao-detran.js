const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sistema_avaliacao_psicologica',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migração: Criar tabela configuracoes_detran...\n');
    
    await client.query('BEGIN');
    
    // Verificar se a tabela já existe
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'configuracoes_detran'
      )
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('✅ Tabela configuracoes_detran já existe');
      await client.query('COMMIT');
      return;
    }
    
    // Criar tabela
    console.log('1️⃣  Criando tabela configuracoes_detran...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracoes_detran (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        cpf VARCHAR(14) NOT NULL,
        senha TEXT NOT NULL,
        dias_trabalho TEXT NOT NULL,
        sincronizacao_automatica BOOLEAN DEFAULT false,
        ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id)
      )
    `);
    console.log('✅ Tabela criada com sucesso');
    
    // Criar índice
    console.log('2️⃣  Criando índice...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_configuracoes_detran_usuario 
      ON configuracoes_detran(usuario_id)
    `);
    console.log('✅ Índice criado com sucesso');
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migração executada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na migração:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { migrate };
