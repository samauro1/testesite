require('dotenv').config();
const { query } = require('../config/database');

async function verificar() {
  try {
    console.log('🔍 Verificando estrutura da tabela agendamentos...\n');
    
    // Verificar todas as colunas
    const columns = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'agendamentos' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas encontradas:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Verificar especificamente campos de telefone
    const telefoneCols = columns.rows.filter(c => c.column_name.includes('telefone'));
    console.log('\n📱 Colunas de telefone:');
    if (telefoneCols.length === 0) {
      console.log('  Nenhuma coluna de telefone encontrada');
    } else {
      telefoneCols.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificar();

