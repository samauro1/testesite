const { query } = require('../config/database');

async function analisarEstruturaTestes() {
  console.log('🔍 ========== ANÁLISE DA ESTRUTURA DE TESTES ==========\n');

  try {
    // 1. Verificar estrutura das tabelas de resultados
    console.log('📋 1. ESTRUTURA DAS TABELAS DE RESULTADOS:\n');
    
    const tabelasResultados = [
      'resultados_memore',
      'resultados_ac',
      'resultados_mig',
      'resultados_r1',
      'resultados_mvt',
      'resultados_beta_iii',
      'resultados_bpa2',
      'resultados_rotas',
      'resultados_palografico'
    ];

    for (const tabela of tabelasResultados) {
      try {
        // Verificar se a tabela existe
        const existeTabela = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [tabela]);

        if (!existeTabela.rows[0].exists) {
          console.log(`   ❌ ${tabela}: Tabela NÃO existe`);
          continue;
        }

        console.log(`\n   📊 ${tabela}:`);
        
        // Listar todas as colunas
        const colunas = await query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tabela]);

        console.log(`      Colunas (${colunas.rows.length}):`);
        colunas.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`        - ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
        });

        // Verificar se tem avaliacao_id
        const temAvaliacaoId = colunas.rows.some(c => c.column_name === 'avaliacao_id');
        console.log(`      ✅ Tem avaliacao_id: ${temAvaliacaoId ? 'SIM' : '❌ NÃO'}`);

        // Verificar se tem tabela_normativa_id
        const temTabelaNormativaId = colunas.rows.some(c => c.column_name === 'tabela_normativa_id');
        console.log(`      ${temTabelaNormativaId ? '✅' : '⚠️'} Tem tabela_normativa_id: ${temTabelaNormativaId ? 'SIM' : 'NÃO'}`);

        // Verificar foreign keys
        const foreignKeys = await query(`
          SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = $1
        `, [tabela]);

        if (foreignKeys.rows.length > 0) {
          console.log(`      Foreign Keys:`);
          foreignKeys.rows.forEach(fk => {
            console.log(`        - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
          });
        } else {
          console.log(`      ⚠️ Nenhuma Foreign Key encontrada`);
        }

        // Contar registros
        const count = await query(`SELECT COUNT(*) as total FROM ${tabela}`);
        console.log(`      📊 Total de registros: ${count.rows[0].total}`);

        // Verificar registros órfãos (sem avaliacao_id válido)
        if (temAvaliacaoId) {
          const orfaos = await query(`
            SELECT COUNT(*) as total 
            FROM ${tabela} r
            WHERE r.avaliacao_id IS NULL 
               OR r.avaliacao_id NOT IN (SELECT id FROM avaliacoes)
          `);
          const totalOrfaos = parseInt(orfaos.rows[0].total);
          if (totalOrfaos > 0) {
            console.log(`      ⚠️ Registros órfãos (sem avaliacao_id válido): ${totalOrfaos}`);
          } else {
            console.log(`      ✅ Nenhum registro órfão encontrado`);
          }
        }

      } catch (error) {
        console.error(`   ❌ Erro ao analisar ${tabela}:`, error.message);
      }
    }

    // 2. Verificar tabela de avaliações
    console.log('\n\n📋 2. TABELA DE AVALIAÇÕES:\n');
    
    const avaliacoesColunas = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'avaliacoes'
      ORDER BY ordinal_position
    `);
    
    console.log(`   Colunas (${avaliacoesColunas.rows.length}):`);
    avaliacoesColunas.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`     - ${col.column_name} (${col.data_type}) ${nullable}`);
    });

    const totalAvaliacoes = await query('SELECT COUNT(*) as total FROM avaliacoes');
    console.log(`   📊 Total de avaliações: ${totalAvaliacoes.rows[0].total}`);

    // 3. Verificar integridade referencial
    console.log('\n\n📋 3. INTEGRIDADE REFERENCIAL:\n');
    
    console.log('   Verificando avaliações sem paciente válido:');
    const avaliacoesSemPaciente = await query(`
      SELECT COUNT(*) as total
      FROM avaliacoes a
      WHERE a.paciente_id IS NOT NULL 
        AND a.paciente_id NOT IN (SELECT id FROM pacientes)
    `);
    const totalSemPaciente = parseInt(avaliacoesSemPaciente.rows[0].total);
    if (totalSemPaciente > 0) {
      console.log(`      ⚠️ Encontradas ${totalSemPaciente} avaliações com paciente_id inválido`);
    } else {
      console.log(`      ✅ Todas as avaliações têm paciente_id válido`);
    }

    // 4. Verificar distribuição de testes por avaliação
    console.log('\n\n📋 4. DISTRIBUIÇÃO DE TESTES POR AVALIAÇÃO:\n');
    
    for (const tabela of tabelasResultados) {
      try {
        const existeTabela = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [tabela]);

        if (!existeTabela.rows[0].exists) continue;

        const distribuicao = await query(`
          SELECT 
            COUNT(*) as total_testes,
            COUNT(DISTINCT avaliacao_id) as total_avaliacoes
          FROM ${tabela}
          WHERE avaliacao_id IS NOT NULL
        `);
        
        if (distribuicao.rows[0].total_testes > 0) {
          console.log(`   ${tabela}:`);
          console.log(`     - Total de testes: ${distribuicao.rows[0].total_testes}`);
          console.log(`     - Avaliações com testes: ${distribuicao.rows[0].total_avaliacoes}`);
        }
      } catch (error) {
        // Ignorar erros
      }
    }

    // 5. Verificar avaliações sem testes
    console.log('\n\n📋 5. AVALIAÇÕES SEM TESTES:\n');
    
    const avaliacoesSemTestes = await query(`
      SELECT a.id, a.numero_laudo, a.data_aplicacao, a.created_at
      FROM avaliacoes a
      WHERE NOT EXISTS (
        SELECT 1 FROM resultados_memore WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_ac WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_mig WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_r1 WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_mvt WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_beta_iii WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_bpa2 WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_rotas WHERE avaliacao_id = a.id
        UNION ALL
        SELECT 1 FROM resultados_palografico WHERE avaliacao_id = a.id
      )
      ORDER BY a.created_at DESC
      LIMIT 10
    `);

    if (avaliacoesSemTestes.rows.length > 0) {
      console.log(`   ⚠️ Encontradas ${avaliacoesSemTestes.rows.length} avaliações sem testes (mostrando últimas 10):`);
      avaliacoesSemTestes.rows.forEach(av => {
        console.log(`     - Avaliação ID ${av.id}, Laudo: ${av.numero_laudo}, Data: ${av.data_aplicacao}`);
      });
    } else {
      console.log(`   ✅ Todas as avaliações têm pelo menos um teste`);
    }

    // 6. Verificar tabela_normativas
    console.log('\n\n📋 6. TABELA NORMATIVAS:\n');
    
    const tabelasNormativas = await query('SELECT COUNT(*) as total FROM tabelas_normativas');
    console.log(`   Total de tabelas normativas: ${tabelasNormativas.rows[0].total}`);

    const tabelasPorTipo = await query(`
      SELECT tipo, COUNT(*) as total
      FROM tabelas_normativas
      WHERE ativa = true
      GROUP BY tipo
      ORDER BY tipo
    `);
    
    if (tabelasPorTipo.rows.length > 0) {
      console.log(`   Tabelas por tipo:`);
      tabelasPorTipo.rows.forEach(row => {
        console.log(`     - ${row.tipo}: ${row.total}`);
      });
    }

    console.log('\n✅ Análise concluída!\n');

  } catch (error) {
    console.error('❌ Erro na análise:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

analisarEstruturaTestes();

