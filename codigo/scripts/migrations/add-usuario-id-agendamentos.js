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
    console.log('🔄 Iniciando migração: Adicionar usuario_id à tabela agendamentos...\n');
    
    await client.query('BEGIN');
    
    // 1. Adicionar coluna usuario_id
    console.log('1️⃣  Adicionando coluna usuario_id...');
    await client.query(`
      ALTER TABLE agendamentos 
      ADD COLUMN IF NOT EXISTS usuario_id INTEGER
    `);
    console.log('✅ Coluna usuario_id adicionada');
    
    // 2. Buscar o primeiro usuário administrador
    console.log('\n2️⃣  Buscando usuário administrador...');
    const adminResult = await client.query(`
      SELECT id FROM usuarios 
      WHERE perfil = 'administrador' 
      ORDER BY created_at ASC 
      LIMIT 1
    `);
    
    if (adminResult.rows.length === 0) {
      throw new Error('Nenhum usuário administrador encontrado!');
    }
    
    const adminId = adminResult.rows[0].id;
    console.log(`✅ Administrador encontrado: ID ${adminId}`);
    
    // 3. Atribuir todos os agendamentos existentes ao administrador
    console.log('\n3️⃣  Atribuindo agendamentos existentes ao administrador...');
    const updateResult = await client.query(`
      UPDATE agendamentos 
      SET usuario_id = $1 
      WHERE usuario_id IS NULL
    `, [adminId]);
    console.log(`✅ ${updateResult.rowCount} agendamentos atribuídos ao administrador`);
    
    // 4. Tornar a coluna NOT NULL
    console.log('\n4️⃣  Tornando coluna usuario_id obrigatória...');
    await client.query(`
      ALTER TABLE agendamentos 
      ALTER COLUMN usuario_id SET NOT NULL
    `);
    console.log('✅ Coluna usuario_id agora é obrigatória');
    
    // 5. Adicionar foreign key
    console.log('\n5️⃣  Adicionando foreign key...');
    await client.query(`
      ALTER TABLE agendamentos 
      ADD CONSTRAINT fk_agendamentos_usuario 
      FOREIGN KEY (usuario_id) 
      REFERENCES usuarios(id) 
      ON DELETE RESTRICT
    `);
    console.log('✅ Foreign key adicionada');
    
    // 6. Criar índice
    console.log('\n6️⃣  Criando índice...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agendamentos_usuario_id 
      ON agendamentos(usuario_id)
    `);
    console.log('✅ Índice criado');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`   - Coluna usuario_id adicionada à tabela agendamentos`);
    console.log(`   - ${updateResult.rowCount} agendamentos existentes atribuídos ao admin`);
    console.log(`   - Foreign key e índice criados`);
    
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

