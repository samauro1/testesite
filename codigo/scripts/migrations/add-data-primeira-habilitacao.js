const { query } = require('../../config/database');

async function up() {
  try {
    console.log('🔄 Adicionando campo data_primeira_habilitacao à tabela pacientes...');
    
    await query(`
      ALTER TABLE pacientes 
      ADD COLUMN IF NOT EXISTS data_primeira_habilitacao DATE
    `);
    
    console.log('✅ Campo data_primeira_habilitacao adicionado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao adicionar campo:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('🔄 Removendo campo data_primeira_habilitacao da tabela pacientes...');
    
    await query(`
      ALTER TABLE pacientes 
      DROP COLUMN IF EXISTS data_primeira_habilitacao
    `);
    
    console.log('✅ Campo removido com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao remover campo:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  up()
    .then(() => {
      console.log('✅ Migration concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na migration:', error);
      process.exit(1);
    });
}

module.exports = { up, down };

