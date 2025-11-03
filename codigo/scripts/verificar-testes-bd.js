const { query } = require('../config/database');

async function verificarTestes() {
  try {
    console.log('🔍 Verificando testes no banco de dados...\n');

    // 1. Verificar todas as avaliações
    console.log('📋 Listando todas as avaliações:');
    const avaliacoes = await query('SELECT id, paciente_id, numero_laudo, data_aplicacao, created_at FROM avaliacoes ORDER BY created_at DESC LIMIT 10');
    console.log(`   Total de avaliações encontradas: ${avaliacoes.rows.length}`);
    avaliacoes.rows.forEach(av => {
      console.log(`   - Avaliação ID: ${av.id}, Laudo: ${av.numero_laudo}, Data: ${av.data_aplicacao}`);
    });
    console.log('');

    // 2. Verificar testes por tipo
    const tiposTestes = [
      { tabela: 'resultados_memore', nome: 'MEMORE' },
      { tabela: 'resultados_mig', nome: 'MIG' },
      { tabela: 'resultados_ac', nome: 'AC' },
      { tabela: 'resultados_r1', nome: 'R-1' },
      { tabela: 'resultados_mvt', nome: 'MVT' },
      { tabela: 'resultados_beta_iii', nome: 'BETA-III' },
      { tabela: 'resultados_bpa2', nome: 'BPA2' },
      { tabela: 'resultados_rotas', nome: 'ROTAS' },
      { tabela: 'resultados_palografico', nome: 'Palográfico' }
    ];

    console.log('🧪 Verificando testes salvos por tipo:');
    for (const tipo of tiposTestes) {
      try {
        const result = await query(`SELECT COUNT(*) as total, avaliacao_id FROM ${tipo.tabela} GROUP BY avaliacao_id ORDER BY COUNT(*) DESC LIMIT 5`);
        if (result.rows.length > 0) {
          console.log(`   ${tipo.nome}:`);
          result.rows.forEach(row => {
            console.log(`      - Avaliação ${row.avaliacao_id}: ${row.total} resultado(s)`);
          });
        }
      } catch (err) {
        // Tabela pode não existir
        console.log(`   ${tipo.nome}: Tabela não existe ou erro - ${err.message}`);
      }
    }
    console.log('');

    // 3. Verificar testes por avaliação recente
    console.log('📊 Testes das últimas 5 avaliações:');
    const ultimasAvaliacoes = await query('SELECT id, numero_laudo FROM avaliacoes ORDER BY created_at DESC LIMIT 5');
    
    for (const av of ultimasAvaliacoes.rows) {
      console.log(`\n   Avaliação ID ${av.id} (Laudo: ${av.numero_laudo}):`);
      
      for (const tipo of tiposTestes) {
        try {
          const result = await query(`SELECT * FROM ${tipo.tabela} WHERE avaliacao_id = $1 LIMIT 1`, [av.id]);
          if (result.rows.length > 0) {
            console.log(`      ✅ ${tipo.nome}: ${result.rows.length} resultado(s)`);
          }
        } catch (err) {
          // Ignorar erros de tabela não existente
        }
      }
    }

    // 4. Verificar se há avaliações sem testes
    console.log('\n⚠️  Avaliações sem testes vinculados:');
    const avaliacoesSemTestes = await query(`
      SELECT a.id, a.numero_laudo, a.data_aplicacao
      FROM avaliacoes a
      WHERE NOT EXISTS (
        SELECT 1 FROM resultados_memore WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_mig WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_ac WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_r1 WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_mvt WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_beta_iii WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_rotas WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_palografico WHERE avaliacao_id = a.id
      )
      ORDER BY a.created_at DESC
      LIMIT 10
    `);
    
    if (avaliacoesSemTestes.rows.length > 0) {
      console.log(`   Encontradas ${avaliacoesSemTestes.rows.length} avaliações sem testes:`);
      avaliacoesSemTestes.rows.forEach(av => {
        console.log(`      - Avaliação ID: ${av.id}, Laudo: ${av.numero_laudo}, Data: ${av.data_aplicacao}`);
      });
    } else {
      console.log('   ✅ Todas as avaliações têm pelo menos um teste vinculado');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar testes:', error);
  } finally {
    process.exit(0);
  }
}

verificarTestes();

