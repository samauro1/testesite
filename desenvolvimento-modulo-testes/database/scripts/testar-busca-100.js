const db = require('../../backend/config/database');

async function testar() {
  const tabelas = [
    { id: 26, tipo: 'Concentrada' },
    { id: 28, tipo: 'Dividida' },
    { id: 30, tipo: 'Geral' }
  ];
  
  for (const tabela of tabelas) {
    console.log(`\n🧪 Testando busca para tabela ${tabela.id} (${tabela.tipo}), 100 pontos:`);
    
    const resultado = await db.query(`
      SELECT percentil, classificacao, pontos_min, pontos_max, valor_criterio
      FROM normas_bpa2 
      WHERE tabela_id = $1 
        AND tipo_atencao = $2
        AND 100 >= pontos_min 
        AND (100 <= pontos_max OR pontos_max = 999)
      ORDER BY percentil DESC
      LIMIT 3
    `, [tabela.id, tabela.tipo]);
    
    console.log(`  Encontradas: ${resultado.rows.length} norma(s)`);
    resultado.rows.forEach(n => {
      console.log(`    P${n.percentil}: ${n.classificacao} (${n.pontos_min}-${n.pontos_max}) [${n.valor_criterio || 'NULL'}]`);
    });
  }
  
  process.exit(0);
}

testar().catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});


