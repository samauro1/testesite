const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function corrigirFaixas() {
  try {
    console.log('🔧 Corrigindo faixas de acertos nas normas MIG...\n');

    // Buscar todas as tabelas MIG (exceto QI)
    const tabelas = await pool.query(`
      SELECT id, nome 
      FROM tabelas_normativas 
      WHERE tipo = 'mig' AND nome NOT LIKE '%Conversão QI%'
      ORDER BY id
    `);

    for (const tabela of tabelas.rows) {
      console.log(`\n📊 Processando: ${tabela.nome} (ID: ${tabela.id})`);

      // Buscar todas as normas ordenadas por acertos_min
      const normas = await pool.query(`
        SELECT id, acertos_min, acertos_max, percentil, classificacao
        FROM normas_mig
        WHERE tabela_id = $1 AND tipo_avaliacao = 'geral'
        ORDER BY percentil ASC
      `, [tabela.id]);

      if (normas.rows.length === 0) {
        console.log('   ⚠️  Nenhuma norma encontrada');
        continue;
      }

      let updates = 0;

      for (let i = 0; i < normas.rows.length; i++) {
        const current = normas.rows[i];
        const next = normas.rows[i + 1];

        // Se já está correto, pular
        if (current.acertos_min !== current.acertos_max) {
          continue;
        }

        // Calcular o novo acertos_max
        let newMax;
        if (next) {
          // Se há próxima norma, usar até antes dela
          newMax = next.acertos_min - 1;
        } else {
          // Última norma, vai até 28
          newMax = 28;
        }

        // Se newMax for menor que current.acertos_min, manter igual
        if (newMax < current.acertos_min) {
          newMax = current.acertos_min;
        }

        // Atualizar apenas se houver mudança
        if (newMax !== current.acertos_max) {
          await pool.query(`
            UPDATE normas_mig
            SET acertos_max = $1
            WHERE id = $2
          `, [newMax, current.id]);

          console.log(`   ✅ Percentil ${current.percentil}: ${current.acertos_min}-${current.acertos_max} → ${current.acertos_min}-${newMax}`);
          updates++;
        }
      }

      console.log(`   📝 Total de atualizações: ${updates}`);
    }

    console.log('\n✅ Correção de faixas concluída!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

corrigirFaixas();

