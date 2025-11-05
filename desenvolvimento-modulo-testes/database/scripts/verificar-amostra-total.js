const db = require('../../backend/config/database');

async function verificar() {
  const tabelas = [26, 28, 30];
  const tipos = ['Concentrada', 'Dividida', 'Geral'];
  
  for (let i = 0; i < tabelas.length; i++) {
    const id = tabelas[i];
    const tipo = tipos[i];
    
    const result = await db.query(`
      SELECT COUNT(*) as total 
      FROM normas_bpa2 
      WHERE tabela_id = $1 AND valor_criterio = $2
    `, [id, 'Amostra Total']);
    
    console.log(`Tabela ${id} (${tipo}) - Amostra Total: ${result.rows[0].total} normas`);
    
    // Se não tem "Amostra Total", mostrar quantas normas tem no total
    if (result.rows[0].total === 0) {
      const total = await db.query(`
        SELECT COUNT(*) as total 
        FROM normas_bpa2 
        WHERE tabela_id = $1
      `, [id]);
      console.log(`  (Total de normas na tabela: ${total.rows[0].total})`);
    }
  }
  
  process.exit(0);
}

verificar().catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});


