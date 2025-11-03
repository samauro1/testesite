const { query } = require('../../config/database');

async function addUserFields() {
  try {
    console.log('Adicionando campos CRP e especialidade na tabela usuarios...');

    // Verificar se as colunas já existem
    const checkCrp = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='usuarios' AND column_name='crp'
    `);

    if (checkCrp.rows.length === 0) {
      await query(`
        ALTER TABLE usuarios 
        ADD COLUMN crp VARCHAR(50)
      `);
      console.log('✓ Coluna crp adicionada');
    } else {
      console.log('✓ Coluna crp já existe');
    }

    const checkEspecialidade = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='usuarios' AND column_name='especialidade'
    `);

    if (checkEspecialidade.rows.length === 0) {
      await query(`
        ALTER TABLE usuarios 
        ADD COLUMN especialidade VARCHAR(255)
      `);
      console.log('✓ Coluna especialidade adicionada');
    } else {
      console.log('✓ Coluna especialidade já existe');
    }

    console.log('\n✅ Migration concluída!');
  } catch (error) {
    console.error('❌ Erro na migration:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  addUserFields()
    .then(() => {
      console.log('Migration executada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro na migration:', error);
      process.exit(1);
    });
}

module.exports = { addUserFields };

