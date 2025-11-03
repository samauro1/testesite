const { query } = require('../../config/database');

async function addTabelaNormativaId() {
  try {
    console.log('🔧 Adicionando campo tabela_normativa_id nas tabelas de resultados...\n');
    
    const tabelas = [
      'resultados_rotas',
      'resultados_mig',
      'resultados_memore',
      'resultados_ac',
      'resultados_beta_iii',
      'resultados_bpa2',
      'resultados_r1',
      'resultados_mvt',
      'resultados_palografico'
    ];
    
    for (const tabela of tabelas) {
      try {
        // Verificar se a coluna já existe
        const checkColumn = await query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'tabela_normativa_id'
        `, [tabela]);
        
        if (checkColumn.rows.length === 0) {
          // Adicionar coluna
          await query(`
            ALTER TABLE ${tabela}
            ADD COLUMN tabela_normativa_id INTEGER REFERENCES tabelas_normativas(id)
          `);
          console.log(`✅ Coluna adicionada em ${tabela}`);
        } else {
          console.log(`ℹ️ Coluna já existe em ${tabela}`);
        }
      } catch (error) {
        console.error(`❌ Erro em ${tabela}:`, error.message);
      }
    }
    
    console.log('\n✅ Migração concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

addTabelaNormativaId();

