require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../config/database');

async function verificarAvaliacoesRecentes() {
  try {
    console.log('🔍 Verificando avaliações e resultados recentes no banco de dados...\n');

    // 1. Verificar todas as avaliações criadas nas últimas 24 horas
    console.log('1️⃣ Avaliações criadas nas últimas 24 horas:');
    const avaliacoesRecentes = await query(`
      SELECT 
        a.id, 
        a.paciente_id,
        p.nome as paciente_nome,
        p.cpf as paciente_cpf,
        a.numero_laudo, 
        a.data_aplicacao, 
        a.created_at,
        a.usuario_id,
        u.nome as usuario_nome
      FROM avaliacoes a
      LEFT JOIN pacientes p ON a.paciente_id = p.id
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY a.created_at DESC
    `);

    if (avaliacoesRecentes.rows.length === 0) {
      console.log('   ❌ Nenhuma avaliação criada nas últimas 24 horas\n');
    } else {
      console.log(`   ✅ Total: ${avaliacoesRecentes.rows.length} avaliação(ões)\n`);
      avaliacoesRecentes.rows.forEach((av, idx) => {
        console.log(`   ${idx + 1}. ID: ${av.id}`);
        console.log(`      Paciente: ${av.paciente_nome || '(sem paciente)'} (ID: ${av.paciente_id || 'N/A'})`);
        console.log(`      CPF: ${av.paciente_cpf || 'N/A'}`);
        console.log(`      Laudo: ${av.numero_laudo || '(sem laudo)'}`);
        console.log(`      Data Aplicação: ${av.data_aplicacao || 'N/A'}`);
        console.log(`      Criada em: ${av.created_at}`);
        console.log(`      Usuário: ${av.usuario_nome || 'ID ' + av.usuario_id || 'N/A'}`);
        console.log('');
      });
    }

    // 2. Verificar resultados de testes recentes
    console.log('2️⃣ Resultados de testes salvos nas últimas 24 horas:');
    
    // Memore
    const memoreRecentes = await query(`
      SELECT rm.*, a.paciente_id, a.numero_laudo, p.nome as paciente_nome
      FROM resultados_memore rm
      JOIN avaliacoes a ON rm.avaliacao_id = a.id
      LEFT JOIN pacientes p ON a.paciente_id = p.id
      WHERE rm.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY rm.created_at DESC
    `);
    
    if (memoreRecentes.rows.length === 0) {
      console.log('   ❌ Nenhum resultado Memore encontrado\n');
    } else {
      console.log(`   ✅ Memore: ${memoreRecentes.rows.length} resultado(s)\n`);
      memoreRecentes.rows.forEach((r, idx) => {
        console.log(`   ${idx + 1}. Avaliação ID: ${r.avaliacao_id}`);
        console.log(`      Paciente: ${r.paciente_nome || '(sem paciente)'} (ID: ${r.paciente_id || 'N/A'})`);
        console.log(`      Laudo: ${r.numero_laudo || 'N/A'}`);
        console.log(`      VP: ${r.vp}, VN: ${r.vn}, FN: ${r.fn}, FP: ${r.fp}`);
        console.log(`      Resultado: ${r.resultado_final}, Percentil: ${r.percentil}`);
        console.log(`      Criado em: ${r.created_at}`);
        console.log('');
      });
    }

    // Outros testes
    const outrosTestes = await query(`
      SELECT 'MIG' as tipo, COUNT(*) as total FROM resultados_mig WHERE created_at >= NOW() - INTERVAL '24 hours'
      UNION ALL
      SELECT 'AC', COUNT(*) FROM resultados_ac WHERE created_at >= NOW() - INTERVAL '24 hours'
      UNION ALL
      SELECT 'R1', COUNT(*) FROM resultados_r1 WHERE created_at >= NOW() - INTERVAL '24 hours'
      UNION ALL
      SELECT 'BETA-III', COUNT(*) FROM resultados_beta_iii WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);

    outrosTestes.rows.forEach(teste => {
      if (parseInt(teste.total) > 0) {
        console.log(`   ✅ ${teste.tipo}: ${teste.total} resultado(s)`);
      }
    });

    // 3. Verificar se há avaliações órfãs (sem resultados)
    console.log('\n3️⃣ Avaliações sem resultados de testes:');
    const avaliacoesOrfas = await query(`
      SELECT a.id, a.paciente_id, p.nome as paciente_nome, a.numero_laudo, a.created_at
      FROM avaliacoes a
      LEFT JOIN pacientes p ON a.paciente_id = p.id
      WHERE a.created_at >= NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
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
      )
      ORDER BY a.created_at DESC
    `);

    if (avaliacoesOrfas.rows.length > 0) {
      console.log(`   ⚠️  ${avaliacoesOrfas.rows.length} avaliação(ões) sem resultados:\n`);
      avaliacoesOrfas.rows.forEach((av, idx) => {
        console.log(`   ${idx + 1}. Avaliação ID: ${av.id}`);
        console.log(`      Paciente: ${av.paciente_nome || '(sem paciente)'} (ID: ${av.paciente_id || 'N/A'})`);
        console.log(`      Laudo: ${av.numero_laudo || 'N/A'}`);
        console.log(`      Criada em: ${av.created_at}`);
        console.log('');
      });
    } else {
      console.log('   ✅ Todas as avaliações têm resultados associados\n');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar avaliações:', error);
  } finally {
    process.exit(0);
  }
}

verificarAvaliacoesRecentes();

