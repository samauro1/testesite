const db = require('../../backend/config/database');

db.query(`
  SELECT tabela_id, tipo_atencao, COUNT(*) as total 
  FROM normas_bpa2 
  WHERE tabela_id IN (26, 28, 30) 
  GROUP BY tabela_id, tipo_atencao 
  ORDER BY tabela_id, tipo_atencao
`).then(r => {
  console.log('Normas nas tabelas 26, 28, 30:');
  if (r.rows.length === 0) {
    console.log('  ❌ Nenhuma norma encontrada!');
  } else {
    r.rows.forEach(row => {
      console.log(`  Tabela ${row.tabela_id} (${row.tipo_atencao}): ${row.total} normas`);
    });
  }
  process.exit(0);
}).catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});


