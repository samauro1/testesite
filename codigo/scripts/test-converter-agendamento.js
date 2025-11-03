require('dotenv').config();
const { query } = require('../config/database');

async function testConverter() {
  try {
    console.log('🔍 Testando estrutura da tabela pacientes...\n');
    
    // Verificar colunas
    const columns = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'pacientes' 
      AND column_name IN ('telefone_fixo', 'telefone_celular', 'idade')
      ORDER BY column_name
    `);
    
    console.log('Colunas encontradas:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Verificar agendamento ID 8
    console.log('\n🔍 Verificando agendamento ID 8...\n');
    const agendamento = await query(`
      SELECT id, nome, cpf, telefone, telefone_fixo, telefone_celular, usuario_id
      FROM agendamentos 
      WHERE id = 8
    `);
    
    if (agendamento.rows.length === 0) {
      console.log('❌ Agendamento ID 8 não encontrado');
    } else {
      console.log('Agendamento encontrado:');
      console.log(JSON.stringify(agendamento.rows[0], null, 2));
      
      // Testar processamento de telefones
      const { processarTelefones } = require('../utils/phoneUtils');
      const telefones = processarTelefones(agendamento.rows[0].telefone);
      console.log('\nTelefones processados:');
      console.log(JSON.stringify(telefones, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testConverter();

