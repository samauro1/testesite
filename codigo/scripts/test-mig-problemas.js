const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function query(text, params) {
  return pool.query(text, params);
}

async function testarProblemas() {
  try {
    console.log('🔍 Testando problemas reportados...\n');

    // ===== TESTE 1: Motoristas Profissionais, 13 acertos =====
    console.log('📊 TESTE 1: Motoristas Profissionais, 13 acertos');
    console.log('Esperado: Percentil 70, Classificação Médio, QI 94\n');

    const tabela1 = await query(`
      SELECT id, nome FROM tabelas_normativas 
      WHERE tipo = 'mig' AND nome LIKE '%Motorista%Profissional%'
    `);

    if (tabela1.rows.length > 0) {
      console.log(`   Tabela: ${tabela1.rows[0].nome} (ID: ${tabela1.rows[0].id})`);

      // Buscar percentil
      const percentil1 = await query(`
        SELECT acertos_min, acertos_max, percentil, classificacao 
        FROM normas_mig 
        WHERE tabela_id = $1 AND tipo_avaliacao = 'geral' 
          AND 13 BETWEEN acertos_min AND acertos_max
        ORDER BY percentil DESC
        LIMIT 1
      `, [tabela1.rows[0].id]);

      if (percentil1.rows.length > 0) {
        console.log(`   ✅ Percentil encontrado: ${percentil1.rows[0].percentil}`);
        console.log(`   ✅ Classificação: ${percentil1.rows[0].classificacao}`);
        console.log(`   📌 Faixa: ${percentil1.rows[0].acertos_min}-${percentil1.rows[0].acertos_max} acertos`);
      } else {
        console.log('   ❌ Percentil NÃO encontrado');
      }

      // Buscar QI
      const qi1 = await query(`
        SELECT qi, classificacao 
        FROM normas_mig 
        WHERE tabela_id IN (SELECT id FROM tabelas_normativas WHERE nome LIKE '%Conversão QI%')
          AND tipo_avaliacao = 'qi' 
          AND 13 BETWEEN acertos_min AND acertos_max
        LIMIT 1
      `);

      if (qi1.rows.length > 0) {
        console.log(`   ✅ QI encontrado: ${qi1.rows[0].qi}`);
        console.log(`   ✅ Classificação QI: ${qi1.rows[0].classificacao}`);
      } else {
        console.log('   ❌ QI NÃO encontrado');
      }
    } else {
      console.log('   ❌ Tabela não encontrada');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // ===== TESTE 2: Ensino Superior, 15 acertos =====
    console.log('📊 TESTE 2: Ensino Superior, 15 acertos');
    console.log('Esperado: Percentil 45, Classificação Médio, QI 100\n');

    const tabela2 = await query(`
      SELECT id, nome FROM tabelas_normativas 
      WHERE tipo = 'mig' AND nome LIKE '%Ensino Superior%'
    `);

    if (tabela2.rows.length > 0) {
      console.log(`   Tabela: ${tabela2.rows[0].nome} (ID: ${tabela2.rows[0].id})`);

      // Listar TODAS as normas da tabela
      const todasNormas = await query(`
        SELECT acertos_min, acertos_max, percentil, classificacao 
        FROM normas_mig 
        WHERE tabela_id = $1 AND tipo_avaliacao = 'geral'
        ORDER BY percentil
      `, [tabela2.rows[0].id]);

      console.log('\n   📋 Todas as normas da tabela:');
      todasNormas.rows.forEach(n => {
        console.log(`      ${n.acertos_min}-${n.acertos_max} acertos → Percentil ${n.percentil}, ${n.classificacao}`);
      });

      // Buscar percentil para 15 acertos
      const percentil2 = await query(`
        SELECT acertos_min, acertos_max, percentil, classificacao 
        FROM normas_mig 
        WHERE tabela_id = $1 AND tipo_avaliacao = 'geral' 
          AND 15 BETWEEN acertos_min AND acertos_max
        ORDER BY percentil DESC
        LIMIT 1
      `, [tabela2.rows[0].id]);

      console.log('\n   🔍 Busca para 15 acertos:');
      if (percentil2.rows.length > 0) {
        console.log(`   ✅ Percentil encontrado: ${percentil2.rows[0].percentil}`);
        console.log(`   ✅ Classificação: ${percentil2.rows[0].classificacao}`);
        console.log(`   📌 Faixa: ${percentil2.rows[0].acertos_min}-${percentil2.rows[0].acertos_max} acertos`);
      } else {
        console.log('   ❌ Percentil NÃO encontrado para 15 acertos');
      }

      // Buscar QI
      const qi2 = await query(`
        SELECT qi, classificacao 
        FROM normas_mig 
        WHERE tabela_id IN (SELECT id FROM tabelas_normativas WHERE nome LIKE '%Conversão QI%')
          AND tipo_avaliacao = 'qi' 
          AND 15 BETWEEN acertos_min AND acertos_max
        LIMIT 1
      `);

      if (qi2.rows.length > 0) {
        console.log(`   ✅ QI encontrado: ${qi2.rows[0].qi}`);
        console.log(`   ✅ Classificação QI: ${qi2.rows[0].classificacao}`);
      } else {
        console.log('   ❌ QI NÃO encontrado');
      }
    } else {
      console.log('   ❌ Tabela não encontrada');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testarProblemas();

