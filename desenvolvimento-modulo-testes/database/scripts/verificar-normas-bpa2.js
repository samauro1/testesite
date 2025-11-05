/**
 * Script para Verificar Normas BPA-2 no Banco
 * Verifica se há normas populadas e testa buscas
 */

const db = require('../../backend/config/database');

async function verificarNormas() {
  console.log('\n🔍 Verificando normas BPA-2 no banco...\n');
  
  try {
    // Verificar se campo valor_criterio existe
    const campoExiste = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'normas_bpa2' AND column_name = 'valor_criterio'
    `);
    
    console.log(`Campo valor_criterio existe? ${campoExiste.rows.length > 0 ? '✅ SIM' : '❌ NÃO'}\n`);
    
    // Contar normas por tabela
    const normasPorTabela = await db.query(`
      SELECT 
        n.tabela_id,
        t.nome as tabela_nome,
        n.tipo_atencao,
        COUNT(*) as total_normas,
        COUNT(DISTINCT n.valor_criterio) as criterios_distintos,
        MIN(n.pontos_min) as min_pontos,
        MAX(n.pontos_max) as max_pontos
      FROM normas_bpa2 n
      JOIN tabelas_normativas t ON n.tabela_id = t.id
      WHERE t.tipo = 'bpa2'
      GROUP BY n.tabela_id, t.nome, n.tipo_atencao
      ORDER BY n.tabela_id, n.tipo_atencao
    `);
    
    console.log(`📊 Total de tabelas com normas: ${normasPorTabela.rows.length}\n`);
    
    normasPorTabela.rows.forEach(row => {
      console.log(`  Tabela ${row.tabela_id} (${row.tabela_nome.substring(0, 40)}...):`);
      console.log(`    Tipo: ${row.tipo_atencao}`);
      console.log(`    Normas: ${row.total_normas}`);
      console.log(`    Critérios distintos: ${row.criterios_distintos}`);
      console.log(`    Faixa de pontos: ${row.min_pontos} a ${row.max_pontos}`);
      console.log('');
    });
    
    // Testar busca para 100 pontos na tabela 24
    console.log('\n🧪 Testando busca para 100 pontos (tabela_id=24, tipo=Alternada):\n');
    
    const busca1 = await db.query(`
      SELECT percentil, classificacao, pontos_min, pontos_max, valor_criterio
      FROM normas_bpa2 
      WHERE tabela_id = 24 
        AND tipo_atencao = 'Alternada' 
        AND 100 >= pontos_min 
        AND 100 <= pontos_max
      ORDER BY percentil DESC
      LIMIT 5
    `);
    
    console.log(`Encontradas ${busca1.rows.length} norma(s):`);
    busca1.rows.forEach(n => {
      console.log(`  P${n.percentil}: ${n.classificacao} (${n.pontos_min}-${n.pontos_max}) [critério: ${n.valor_criterio || 'NULL'}]`);
    });
    
    // Testar busca sem filtro de valor_criterio
    console.log('\n🧪 Testando busca SEM valor_criterio:\n');
    
    const busca2 = await db.query(`
      SELECT percentil, classificacao, pontos_min, pontos_max, valor_criterio
      FROM normas_bpa2 
      WHERE tabela_id = 24 
        AND tipo_atencao = 'Alternada' 
        AND 100 >= pontos_min 
        AND (100 <= pontos_max OR pontos_max = 999)
      ORDER BY percentil DESC
      LIMIT 5
    `);
    
    console.log(`Encontradas ${busca2.rows.length} norma(s):`);
    busca2.rows.forEach(n => {
      console.log(`  P${n.percentil}: ${n.classificacao} (${n.pontos_min}-${n.pontos_max}) [critério: ${n.valor_criterio || 'NULL'}]`);
    });
    
    // Verificar se há normas com valor_criterio NULL
    const normasNull = await db.query(`
      SELECT COUNT(*) as total 
      FROM normas_bpa2 
      WHERE valor_criterio IS NULL
    `);
    
    console.log(`\n⚠️  Normas com valor_criterio NULL: ${normasNull.rows[0].total}`);
    
    if (normasNull.rows[0].total > 0) {
      console.log('\n💡 Dica: Execute o script de atualização para adicionar valor_criterio às normas existentes.');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  }
  
  process.exit(0);
}

verificarNormas();


