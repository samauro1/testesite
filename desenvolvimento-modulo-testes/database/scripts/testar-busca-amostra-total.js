const db = require('../../backend/config/database');

async function testar() {
  const testes = [
    { tabela: 26, tipo: 'Concentrada', pontos: 100 },
    { tabela: 28, tipo: 'Dividida', pontos: 100 },
    { tabela: 30, tipo: 'Geral', pontos: 300 }
  ];
  
  for (const teste of testes) {
    console.log(`\n🧪 Tabela ${teste.tabela} (${teste.tipo}), ${teste.pontos} pontos, valor_criterio='Amostra Total':`);
    
    const resultado = await db.query(`
      SELECT percentil, classificacao, pontos_min, pontos_max
      FROM normas_bpa2 
      WHERE tabela_id = $1 
        AND tipo_atencao = $2
        AND valor_criterio = 'Amostra Total'
        AND $3 >= pontos_min 
        AND ($3 <= pontos_max OR pontos_max = 999)
      ORDER BY percentil DESC
      LIMIT 1
    `, [teste.tabela, teste.tipo, teste.pontos]);
    
    if (resultado.rows.length > 0) {
      console.log(`  ✅ Encontrada: P${resultado.rows[0].percentil} - ${resultado.rows[0].classificacao} (${resultado.rows[0].pontos_min}-${resultado.rows[0].pontos_max})`);
    } else {
      console.log(`  ❌ Não encontrada`);
    }
  }
  
  process.exit(0);
}

testar().catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});


