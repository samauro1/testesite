const { query } = require('../config/database');

async function verificarAgendamento() {
  try {
    console.log('🔍 Verificando agendamento do JHORDAN...\n');
    
    const res = await query(
      `SELECT id, paciente_id, nome, cpf, convertido_em_paciente, status, created_at, updated_at
       FROM agendamentos 
       WHERE cpf = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      ['417.039.758-47']
    );
    
    console.log(`📊 Agendamentos encontrados: ${res.rows.length}\n`);
    
    if (res.rows.length === 0) {
      console.log('❌ Nenhum agendamento encontrado para este CPF');
      process.exit(1);
    }
    
    res.rows.forEach((a, idx) => {
      console.log(`--- Agendamento ${idx + 1} ---`);
      console.log(`ID: ${a.id}`);
      console.log(`Paciente_ID: ${a.paciente_id || 'NULL'}`);
      console.log(`Convertido em Paciente: ${a.convertido_em_paciente}`);
      console.log(`Status: ${a.status}`);
      console.log(`Nome: ${a.nome}`);
      console.log(`CPF: ${a.cpf}`);
      console.log(`Criado em: ${a.created_at}`);
      console.log(`Atualizado em: ${a.updated_at}`);
      console.log('');
    });
    
    // Verificar se o paciente ainda existe
    if (res.rows[0].paciente_id) {
      const pacienteRes = await query(
        'SELECT id, nome FROM pacientes WHERE id = $1',
        [res.rows[0].paciente_id]
      );
      
      if (pacienteRes.rows.length === 0) {
        console.log('⚠️  PROBLEMA DETECTADO:');
        console.log(`   O agendamento tem paciente_id = ${res.rows[0].paciente_id}, mas o paciente não existe mais!`);
        console.log('   Isso impede o botão "Converter em Avaliado" de aparecer.');
        console.log('\n✅ SOLUÇÃO: Resetar paciente_id e convertido_em_paciente');
      } else {
        console.log('✅ Paciente vinculado ainda existe:', pacienteRes.rows[0].nome);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificarAgendamento();

