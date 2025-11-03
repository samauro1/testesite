const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'palografico',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Criando tabela logs_assinaturas...\n');
    
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs_assinaturas (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        tipo_documento VARCHAR(50) NOT NULL,
        hash_documento TEXT NOT NULL,
        certificado_cn VARCHAR(255),
        certificado_cpf VARCHAR(14),
        timestamp_assinatura TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Tabela logs_assinaturas criada');
    
    // Criar índice
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_logs_assinaturas_usuario 
      ON logs_assinaturas(usuario_id)
    `);
    
    console.log('✅ Índice criado');
    
    await client.query('COMMIT');
    console.log('\n✅ Migração concluída com sucesso!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro na migração:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

