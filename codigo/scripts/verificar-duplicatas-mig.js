const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function verificarDuplicatas() {
  try {
    console.log('🔍 Verificando duplicatas em todas as tabelas MIG...\n');

    // Buscar todas as tabelas MIG (exceto QI)
    const tabelas = await pool.query(`
      SELECT id, nome FROM tabelas_normativas 
      WHERE tipo = 'mig' AND nome NOT LIKE '%Conversão QI%'
      ORDER BY id
    `);

    let totalDuplicatas = 0;

    for (const tabela of tabelas.rows) {
      // Buscar acertos que têm múltiplos percentis
      const duplicatas = await pool.query(`
        SELECT acertos_min, acertos_max, COUNT(*) as qtd
        FROM normas_mig 
        WHERE tabela_id = $1 AND tipo_avaliacao = 'geral'
        GROUP BY acertos_min, acertos_max
        HAVING COUNT(*) > 1
        ORDER BY acertos_min
      `, [tabela.id]);

      if (duplicatas.rows.length > 0) {
        console.log(`\n📊 ${tabela.nome} (ID: ${tabela.id})`);
        
        for (const dup of duplicatas.rows) {
          // Buscar todos os percentis para esse acerto
          const percentis = await pool.query(`
            SELECT percentil, classificacao 
            FROM normas_mig 
            WHERE tabela_id = $1 AND tipo_avaliacao = 'geral' 
              AND acertos_min = $2 AND acertos_max = $3
            ORDER BY percentil
          `, [tabela.id, dup.acertos_min, dup.acertos_max]);

          console.log(`   🔴 ${dup.acertos_min}-${dup.acertos_max} acertos → ${dup.qtd} percentis:`);
          percentis.rows.forEach(p => {
            console.log(`      - Percentil ${p.percentil} (${p.classificacao})`);
          });
          
          totalDuplicatas++;
        }
      }
    }

    if (totalDuplicatas === 0) {
      console.log('\n✅ Nenhuma duplicata encontrada!');
    } else {
      console.log(`\n📊 Total de acertos com duplicatas: ${totalDuplicatas}`);
      console.log('\n💡 Nota: O sistema usa o MAIOR percentil quando há duplicatas.');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificarDuplicatas();

