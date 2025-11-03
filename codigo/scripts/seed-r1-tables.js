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

async function seedR1Tables() {
  try {
    console.log('🔧 Criando tabelas normativas do R-1...\n');

    // 1. Limpar dados antigos
    await query('DELETE FROM normas_r1');
    console.log('✅ Dados antigos removidos\n');

    // 2. Buscar tabela R-1
    const tabelaR1 = await query("SELECT id FROM tabelas_normativas WHERE tipo = 'r1' LIMIT 1");
    if (tabelaR1.rows.length === 0) {
      console.log('❌ Tabela R-1 não encontrada');
      return;
    }
    
    const tabelaId = tabelaR1.rows[0].id;
    console.log(`📋 Usando tabela R-1 (ID: ${tabelaId})\n`);

    // 3. Criar normas por escolaridade
    console.log('📝 Criando normas por escolaridade...\n');

    // Ensino Fundamental
    const normasFundamental = [
      { acertos_min: 35, acertos_max: 40, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 30, acertos_max: 34, percentil: 85, classificacao: 'Acima da Média' },
      { acertos_min: 25, acertos_max: 29, percentil: 70, classificacao: 'Média Superior' },
      { acertos_min: 20, acertos_max: 24, percentil: 50, classificacao: 'Média' },
      { acertos_min: 15, acertos_max: 19, percentil: 30, classificacao: 'Média Inferior' },
      { acertos_min: 10, acertos_max: 14, percentil: 15, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 9, percentil: 5, classificacao: 'Muito Inferior' }
    ];

    // Ensino Médio
    const normasMedio = [
      { acertos_min: 37, acertos_max: 40, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 33, acertos_max: 36, percentil: 85, classificacao: 'Acima da Média' },
      { acertos_min: 29, acertos_max: 32, percentil: 70, classificacao: 'Média Superior' },
      { acertos_min: 25, acertos_max: 28, percentil: 50, classificacao: 'Média' },
      { acertos_min: 21, acertos_max: 24, percentil: 30, classificacao: 'Média Inferior' },
      { acertos_min: 17, acertos_max: 20, percentil: 15, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 16, percentil: 5, classificacao: 'Muito Inferior' }
    ];

    // Ensino Superior
    const normasSuperior = [
      { acertos_min: 38, acertos_max: 40, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 35, acertos_max: 37, percentil: 85, classificacao: 'Acima da Média' },
      { acertos_min: 31, acertos_max: 34, percentil: 70, classificacao: 'Média Superior' },
      { acertos_min: 27, acertos_max: 30, percentil: 50, classificacao: 'Média' },
      { acertos_min: 23, acertos_max: 26, percentil: 30, classificacao: 'Média Inferior' },
      { acertos_min: 19, acertos_max: 22, percentil: 15, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 18, percentil: 5, classificacao: 'Muito Inferior' }
    ];

    // Inserir normas do Ensino Fundamental
    for (const norma of normasFundamental) {
      await query(
        'INSERT INTO normas_r1 (tabela_id, escolaridade, acertos_min, acertos_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5, $6)',
        [tabelaId, 'Ensino Fundamental', norma.acertos_min, norma.acertos_max, norma.percentil, norma.classificacao]
      );
    }
    console.log(`✅ ${normasFundamental.length} normas do Ensino Fundamental inseridas`);

    // Inserir normas do Ensino Médio
    for (const norma of normasMedio) {
      await query(
        'INSERT INTO normas_r1 (tabela_id, escolaridade, acertos_min, acertos_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5, $6)',
        [tabelaId, 'Ensino Médio', norma.acertos_min, norma.acertos_max, norma.percentil, norma.classificacao]
      );
    }
    console.log(`✅ ${normasMedio.length} normas do Ensino Médio inseridas`);

    // Inserir normas do Ensino Superior
    for (const norma of normasSuperior) {
      await query(
        'INSERT INTO normas_r1 (tabela_id, escolaridade, acertos_min, acertos_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5, $6)',
        [tabelaId, 'Ensino Superior', norma.acertos_min, norma.acertos_max, norma.percentil, norma.classificacao]
      );
    }
    console.log(`✅ ${normasSuperior.length} normas do Ensino Superior inseridas`);

    // 4. Verificar inserção
    const totalNormas = await query('SELECT COUNT(*) as count FROM normas_r1');
    console.log(`\n📊 Total de normas R-1 inseridas: ${totalNormas.rows[0].count}`);

    // 5. Listar algumas normas para verificação
    console.log('\n📋 Amostra das normas inseridas:');
    const amostra = await query(`
      SELECT escolaridade, acertos_min, acertos_max, percentil, classificacao 
      FROM normas_r1 
      ORDER BY escolaridade, percentil DESC
      LIMIT 10
    `);
    
    amostra.rows.forEach(norma => {
      console.log(`   ${norma.escolaridade}: ${norma.acertos_min}-${norma.acertos_max} acertos → Percentil ${norma.percentil} (${norma.classificacao})`);
    });

    console.log('\n🎉 Tabelas normativas do R-1 criadas com sucesso!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

seedR1Tables();
