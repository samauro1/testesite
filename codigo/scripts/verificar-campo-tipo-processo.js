const { query } = require('../config/database');

async function verificar() {
  try {
    const res = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pacientes' 
      AND column_name IN ('tipo_processo', 'contexto')
      ORDER BY column_name
    `);
    
    console.log('Campos encontrados:');
    if (res.rows.length === 0) {
      console.log('  Nenhum campo encontrado');
    } else {
      res.rows.forEach(r => console.log(`  ✅ ${r.column_name}`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

verificar();

