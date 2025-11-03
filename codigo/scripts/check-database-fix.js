const { query } = require('../config/database');

async function checkAndFixDatabase() {
  try {
    console.log('🔍 Verificando estrutura da tabela pacientes...');
    
    // Verificar estrutura atual da tabela
    const result = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'pacientes' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas atuais na tabela pacientes:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Verificar se as colunas necessárias existem
    const existingColumns = result.rows.map(row => row.column_name);
    const requiredColumns = ['telefone', 'email', 'observacoes', 'data_nascimento', 'numero_laudo', 'contexto', 'tipo_transito'];
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\n❌ Colunas faltando:', missingColumns);
      console.log('🔧 Adicionando colunas faltantes...');
      
      for (const column of missingColumns) {
        let alterQuery = '';
        switch (column) {
          case 'telefone':
            alterQuery = 'ALTER TABLE pacientes ADD COLUMN telefone VARCHAR(20)';
            break;
          case 'email':
            alterQuery = 'ALTER TABLE pacientes ADD COLUMN email VARCHAR(255)';
            break;
          case 'observacoes':
            alterQuery = 'ALTER TABLE pacientes ADD COLUMN observacoes TEXT DEFAULT \'\'';
            break;
          case 'data_nascimento':
            alterQuery = 'ALTER TABLE pacientes ADD COLUMN data_nascimento DATE';
            break;
          case 'numero_laudo':
            alterQuery = 'ALTER TABLE pacientes ADD COLUMN numero_laudo VARCHAR(50)';
            break;
          case 'contexto':
            alterQuery = 'ALTER TABLE pacientes ADD COLUMN contexto VARCHAR(50)';
            break;
          case 'tipo_transito':
            alterQuery = 'ALTER TABLE pacientes ADD COLUMN tipo_transito VARCHAR(50)';
            break;
        }
        
        if (alterQuery) {
          await query(alterQuery);
          console.log(`✅ Coluna ${column} adicionada`);
        }
      }
    } else {
      console.log('\n✅ Todas as colunas necessárias existem!');
    }
    
    // Verificar estrutura final
    console.log('\n🔍 Verificando estrutura final...');
    const finalResult = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'pacientes' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estrutura final da tabela pacientes:');
    finalResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n🎯 Banco de dados corrigido com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    // Não precisamos fechar a conexão pois usamos o módulo do sistema
  }
}

checkAndFixDatabase();
