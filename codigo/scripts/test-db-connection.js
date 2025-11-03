const { query } = require('../config/database');

async function testDbConnection() {
  try {
    console.log('🔍 Testando conexão com banco de dados...');

    // Testar conexão simples
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Conexão com banco funcionando');
    console.log('Hora atual:', result.rows[0].current_time);

    // Testar consulta de pacientes
    const pacientesResult = await query('SELECT COUNT(*) as total FROM pacientes');
    console.log('✅ Consulta de pacientes funcionando');
    console.log('Total de pacientes:', pacientesResult.rows[0].total);

    // Testar inserção simples
    const insertResult = await query(`
      INSERT INTO pacientes (nome, cpf, escolaridade) 
      VALUES ($1, $2, $3) 
      RETURNING id, nome, cpf, escolaridade
    `, ['Teste Conexão', '999.888.777-66', 'E. Fundamental']);
    
    console.log('✅ Inserção funcionando');
    console.log('ID criado:', insertResult.rows[0].id);
    
    // Limpar o teste
    await query('DELETE FROM pacientes WHERE id = $1', [insertResult.rows[0].id]);
    console.log('✅ Teste limpo');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na conexão com banco:', error);
    process.exit(1);
  }
}

testDbConnection();

