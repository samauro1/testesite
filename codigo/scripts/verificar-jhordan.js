require('dotenv').config();
const { query } = require('../config/database');

async function verificar() {
  try {
    console.log('🔍 Verificando JHORDAN...\n');
    
    // Agendamento
    const agend = await query(`
      SELECT id, nome, cpf, paciente_id, convertido_em_paciente, status 
      FROM agendamentos 
      WHERE cpf = $1 OR nome LIKE $2
    `, ['41703975847', '%JHORDAN%']);
    
    console.log('Agendamentos encontrados:', agend.rows.length);
    agend.rows.forEach(a => {
      console.log(`  ID: ${a.id}`);
      console.log(`  Nome: ${a.nome}`);
      console.log(`  CPF: ${a.cpf}`);
      console.log(`  Paciente ID: ${a.paciente_id}`);
      console.log(`  Convertido: ${a.convertido_em_paciente}`);
      console.log(`  Status: ${a.status}`);
      console.log('');
    });
    
    // Paciente
    const paciente = await query(`
      SELECT id, nome, cpf 
      FROM pacientes 
      WHERE cpf = $1
    `, ['41703975847']);
    
    console.log('Pacientes encontrados:', paciente.rows.length);
    if (paciente.rows.length > 0) {
      paciente.rows.forEach(p => {
        console.log(`  ID: ${p.id}, Nome: ${p.nome}, CPF: ${p.cpf}`);
      });
    } else {
      console.log('  ❌ Nenhum paciente encontrado (foi deletado)');
    }
    
    // Verificar se paciente_id do agendamento existe
    if (agend.rows.length > 0 && agend.rows[0].paciente_id) {
      const pacienteVinculado = await query(`
        SELECT id, nome FROM pacientes WHERE id = $1
      `, [agend.rows[0].paciente_id]);
      
      if (pacienteVinculado.rows.length === 0) {
        console.log(`\n⚠️  PROBLEMA DETECTADO:`);
        console.log(`  Agendamento ID ${agend.rows[0].id} está marcado como convertido`);
        console.log(`  Mas o paciente ID ${agend.rows[0].paciente_id} NÃO EXISTE mais!`);
        console.log(`  Por isso não consegue reconverter.`);
      }
    }
    
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
}

verificar();

