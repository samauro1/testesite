const db = require('../../backend/config/database');

async function verificarSchema() {
  try {
    const colunas = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'normas_bpa2' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Colunas em normas_bpa2:');
    colunas.rows.forEach(c => {
      console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
    });
    
    // Verificar se há coluna "criterio" (errada)
    const temCriterioErrado = colunas.rows.some(c => c.column_name === 'criterio');
    const temValorCriterio = colunas.rows.some(c => c.column_name === 'valor_criterio');
    
    console.log('\n🔍 Diagnóstico:');
    console.log(`  Coluna "criterio" (errada)? ${temCriterioErrado ? '❌ SIM - precisa remover' : '✅ NÃO'}`);
    console.log(`  Coluna "valor_criterio" (correta)? ${temValorCriterio ? '✅ SIM' : '❌ NÃO - precisa criar'}`);
    
    if (temCriterioErrado) {
      console.log('\n⚠️  Há uma coluna "criterio" que não deveria existir!');
      console.log('   Removendo coluna "criterio"...');
      await db.query('ALTER TABLE normas_bpa2 DROP COLUMN IF EXISTS criterio');
      console.log('   ✅ Coluna removida');
    }
    
    if (!temValorCriterio) {
      console.log('\n⚠️  Coluna "valor_criterio" não existe!');
      console.log('   Criando coluna "valor_criterio"...');
      await db.query('ALTER TABLE normas_bpa2 ADD COLUMN valor_criterio VARCHAR(50)');
      console.log('   ✅ Coluna criada');
    }
    
    // Garantir que valor_criterio seja nullable
    await db.query('ALTER TABLE normas_bpa2 ALTER COLUMN valor_criterio DROP NOT NULL');
    console.log('\n✅ Schema corrigido!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}

verificarSchema();


