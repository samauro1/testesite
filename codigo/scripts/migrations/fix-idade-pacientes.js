const { query } = require('../../config/database');

async function fixIdadePacientes() {
  try {
    console.log('🔧 Atualizando idades dos pacientes...\n');
    
    // Atualizar idade de todos os pacientes que têm data_nascimento
    const result = await query(`
      UPDATE pacientes
      SET idade = EXTRACT(YEAR FROM AGE(data_nascimento))
      WHERE data_nascimento IS NOT NULL
      RETURNING id, nome, data_nascimento, idade
    `);
    
    console.log(`✅ ${result.rows.length} pacientes atualizados:\n`);
    result.rows.forEach(p => {
      console.log(`   - ${p.nome}: ${p.idade} anos (nascido em ${new Date(p.data_nascimento).toLocaleDateString('pt-BR')})`);
    });
    
    console.log('\n✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

fixIdadePacientes();

