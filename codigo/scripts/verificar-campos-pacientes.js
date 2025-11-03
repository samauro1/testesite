const { query } = require('../config/database');

async function verificarCampos() {
  try {
    console.log('🔍 Verificando campos na tabela pacientes...\n');
    
    const res = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'pacientes' 
      AND column_name IN (
        'data_primeira_habilitacao', 
        'nome_pai', 
        'nome_mae', 
        'data_exame', 
        'numero_laudo'
      )
      ORDER BY column_name
    `);
    
    console.log('📊 Campos encontrados:');
    if (res.rows.length === 0) {
      console.log('  ❌ Nenhum dos campos procurados foi encontrado');
    } else {
      res.rows.forEach(r => {
        console.log(`  ✅ ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`);
      });
    }
    
    // Verificar se data_primeira_habilitacao existe
    const temDataPrimeiraHabilitacao = res.rows.some(r => r.column_name === 'data_primeira_habilitacao');
    if (!temDataPrimeiraHabilitacao) {
      console.log('\n⚠️  Campo data_primeira_habilitacao não existe - será criado');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificarCampos();

