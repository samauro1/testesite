require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../config/database');

async function verificarAvaliacoes() {
  try {
    console.log('🔍 Verificando avaliações no banco de dados...\n');

    // 1. Buscar o paciente Gilvania
    console.log('1️⃣ Buscando paciente Gilvania Vieira da Silva...');
    const pacienteResult = await query(`
      SELECT id, nome, cpf 
      FROM pacientes 
      WHERE nome ILIKE '%gilvania%' OR nome ILIKE '%gilvania%'
    `);

    if (pacienteResult.rows.length === 0) {
      console.log('❌ Paciente não encontrado');
      return;
    }

    const paciente = pacienteResult.rows[0];
    console.log(`✅ Paciente encontrado: ID ${paciente.id}, Nome: ${paciente.nome}, CPF: ${paciente.cpf}\n`);

    // 2. Buscar todas as avaliações deste paciente
    console.log(`2️⃣ Buscando avaliações do paciente ID ${paciente.id}...`);
    const avaliacoesResult = await query(`
      SELECT 
        a.id, 
        a.numero_laudo, 
        a.data_aplicacao, 
        a.created_at,
        a.usuario_id,
        u.nome as usuario_nome
      FROM avaliacoes a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.paciente_id = $1
      ORDER BY a.created_at DESC
    `, [paciente.id]);

    console.log(`✅ Total de avaliações encontradas: ${avaliacoesResult.rows.length}\n`);

    if (avaliacoesResult.rows.length === 0) {
      console.log('❌ Nenhuma avaliação encontrada para este paciente!\n');
      console.log('🔍 Verificando se há avaliações recentes de outros pacientes...\n');
      
      // Buscar avaliações recentes de qualquer paciente
      const avaliacoesRecentes = await query(`
        SELECT 
          a.id, 
          a.paciente_id,
          p.nome as paciente_nome,
          a.numero_laudo, 
          a.data_aplicacao, 
          a.created_at
        FROM avaliacoes a
        JOIN pacientes p ON a.paciente_id = p.id
        ORDER BY a.created_at DESC
        LIMIT 5
      `);
      
      if (avaliacoesRecentes.rows.length > 0) {
        console.log('📋 Últimas 5 avaliações criadas no sistema:');
        avaliacoesRecentes.rows.forEach((av, index) => {
          console.log(`   ${index + 1}. ID: ${av.id}, Paciente: ${av.paciente_nome}, Laudo: ${av.numero_laudo}, Data: ${av.data_aplicacao}, Criada em: ${av.created_at}`);
        });
      }
      
      return;
    }

    // 3. Mostrar detalhes de cada avaliação
    console.log('📋 Detalhes das avaliações:');
    for (const avaliacao of avaliacoesResult.rows) {
      console.log(`\n   ┌─ Avaliação ID: ${avaliacao.id}`);
      console.log(`   ├─ Número Laudo: ${avaliacao.numero_laudo || '(não informado)'}`);
      console.log(`   ├─ Data Aplicação: ${avaliacao.data_aplicacao || '(não informado)'}`);
      console.log(`   ├─ Criada em: ${avaliacao.created_at}`);
      console.log(`   ├─ Usuário ID: ${avaliacao.usuario_id}`);
      console.log(`   └─ Usuário Nome: ${avaliacao.usuario_nome || '(não encontrado)'}`);

      // 4. Verificar resultados de testes para cada avaliação
      console.log(`\n   🔬 Verificando resultados de testes para avaliação ${avaliacao.id}:`);

      // Memore
      const memoreResult = await query(`
        SELECT * FROM resultados_memore WHERE avaliacao_id = $1
      `, [avaliacao.id]);

      if (memoreResult.rows.length > 0) {
        console.log(`      ✅ Memore encontrado: ${memoreResult.rows.length} resultado(s)`);
        memoreResult.rows.forEach((resultado, idx) => {
          console.log(`         ${idx + 1}. VP: ${resultado.vp}, VN: ${resultado.vn}, FN: ${resultado.fn}, FP: ${resultado.fp}`);
          console.log(`            Resultado Final: ${resultado.resultado_final}, Percentil: ${resultado.percentil}, Classificação: ${resultado.classificacao}`);
        });
      } else {
        console.log(`      ❌ Nenhum resultado Memore encontrado`);
      }

      // MIG
      const migResult = await query(`
        SELECT * FROM resultados_mig WHERE avaliacao_id = $1
      `, [avaliacao.id]);

      if (migResult.rows.length > 0) {
        console.log(`      ✅ MIG encontrado: ${migResult.rows.length} resultado(s)`);
      }

      // AC
      const acResult = await query(`
        SELECT * FROM resultados_ac WHERE avaliacao_id = $1
      `, [avaliacao.id]);

      if (acResult.rows.length > 0) {
        console.log(`      ✅ AC encontrado: ${acResult.rows.length} resultado(s)`);
      }

      // Outros testes
      const outrosTestes = await query(`
        SELECT 
          'R1' as tipo, COUNT(*) as total FROM resultados_r1 WHERE avaliacao_id = $1
        UNION ALL
        SELECT 'MVT', COUNT(*) FROM resultados_mvt WHERE avaliacao_id = $1
        UNION ALL
        SELECT 'BETA-III', COUNT(*) FROM resultados_beta_iii WHERE avaliacao_id = $1
        UNION ALL
        SELECT 'BPA2', COUNT(*) FROM resultados_bpa2 WHERE avaliacao_id = $1
      `, [avaliacao.id]);

      outrosTestes.rows.forEach(teste => {
        if (parseInt(teste.total) > 0) {
          console.log(`      ✅ ${teste.tipo} encontrado: ${teste.total} resultado(s)`);
        }
      });
    }

    // 5. Verificar todas as avaliações recentes do sistema
    console.log('\n\n📊 Resumo Geral:');
    const totalAvaliacoes = await query('SELECT COUNT(*) as total FROM avaliacoes');
    const totalPacientes = await query('SELECT COUNT(*) as total FROM pacientes');
    console.log(`   Total de avaliações no sistema: ${totalAvaliacoes.rows[0].total}`);
    console.log(`   Total de pacientes no sistema: ${totalPacientes.rows[0].total}`);

  } catch (error) {
    console.error('❌ Erro ao verificar avaliações:', error);
  } finally {
    process.exit(0);
  }
}

verificarAvaliacoes();

