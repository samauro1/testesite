/**
 * Script para adicionar coluna forma_pagamento na tabela nfs_e_emitidas
 * e atualizar registros existentes com base nos dados do paciente
 */

const { query } = require('../../config/database');

async function up() {
  try {
    console.log('🔄 Adicionando coluna forma_pagamento na tabela nfs_e_emitidas...');
    
    // Adicionar coluna se não existir
    await query(`
      ALTER TABLE nfs_e_emitidas 
      ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(20)
    `);
    
    console.log('✅ Coluna forma_pagamento adicionada');
    
    // Atualizar registros existentes que não têm forma_pagamento
    // Usar a forma de pagamento do paciente (nfs_forma_pagamento)
    console.log('🔄 Atualizando registros existentes...');
    
    const updateResult = await query(`
      UPDATE nfs_e_emitidas n
      SET forma_pagamento = COALESCE(
        p.nfs_forma_pagamento,
        'dinheiro'
      )
      FROM pacientes p
      WHERE n.paciente_id = p.id
        AND (n.forma_pagamento IS NULL OR n.forma_pagamento = '')
    `);
    
    console.log(`✅ ${updateResult.rowCount} registro(s) atualizado(s)`);
    
    // Se ainda houver registros sem forma_pagamento, definir como 'dinheiro'
    const finalUpdate = await query(`
      UPDATE nfs_e_emitidas
      SET forma_pagamento = 'dinheiro'
      WHERE forma_pagamento IS NULL OR forma_pagamento = ''
    `);
    
    if (finalUpdate.rowCount > 0) {
      console.log(`✅ ${finalUpdate.rowCount} registro(s) definido(s) como 'dinheiro'`);
    }
    
    console.log('✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('🔄 Removendo coluna forma_pagamento...');
    
    await query(`
      ALTER TABLE nfs_e_emitidas 
      DROP COLUMN IF EXISTS forma_pagamento
    `);
    
    console.log('✅ Coluna forma_pagamento removida');
    
  } catch (error) {
    console.error('❌ Erro ao reverter migração:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  up()
    .then(() => {
      console.log('✅ Script executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = { up, down };

