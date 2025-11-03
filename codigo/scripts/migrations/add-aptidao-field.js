const { query } = require('../../config/database');

async function addAptidaoField() {
  try {
    console.log('🔧 Iniciando migration: Adicionar campo de aptidão...\n');

    // 1. Adicionar coluna aptidao
    console.log('1. Adicionando coluna aptidao...');
    await query(`
      ALTER TABLE avaliacoes 
      ADD COLUMN IF NOT EXISTS aptidao VARCHAR(50)
    `);
    console.log('   ✅ Coluna aptidao adicionada\n');

    // 2. Adicionar constraint CHECK para valores válidos
    console.log('2. Adicionando constraint para valores válidos...');
    await query(`
      ALTER TABLE avaliacoes 
      DROP CONSTRAINT IF EXISTS avaliacoes_aptidao_check
    `);
    
    await query(`
      ALTER TABLE avaliacoes 
      ADD CONSTRAINT avaliacoes_aptidao_check 
      CHECK (aptidao IS NULL OR aptidao IN ('Apto', 'Inapto Temporário', 'Inapto'))
    `);
    console.log('   ✅ Constraint adicionada\n');

    // 3. Adicionar index para buscar por aptidão
    console.log('3. Adicionando index para aptidao...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_avaliacoes_aptidao 
      ON avaliacoes(aptidao) 
      WHERE aptidao IS NOT NULL
    `);
    console.log('   ✅ Index criado\n');

    console.log('🎉 Migration concluída com sucesso!\n');
    console.log('📋 Valores permitidos para aptidão:');
    console.log('   - Apto');
    console.log('   - Inapto Temporário');
    console.log('   - Inapto');
    console.log('   - NULL (sem observação)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migration:', error);
    process.exit(1);
  }
}

addAptidaoField();

