const { query } = require('../config/database');

async function fixMemoreTables() {
  try {
    console.log('🔧 Corrigindo tabelas MEMORE com dados OFICIAIS do manual...\n');

    // Limpar todas as normas antigas
    await query('DELETE FROM normas_memore');
    console.log('✅ Normas antigas removidas\n');

    // ========== TABELA 7 - TRÂNSITO (Página 60 do manual) ==========
    console.log('📋 Criando Tabela 7 - Trânsito (oficial)...');
    const transitoNormas = [
      { eb: -4, p: 1, c: 'Inferior' },
      { eb: 0, p: 5, c: 'Inferior' },
      { eb: 2, p: 10, c: 'Médio inferior' },
      { eb: 4, p: 15, c: 'Médio inferior' },
      { eb: 6, p: 20, c: 'Médio inferior' },
      { eb: 7, p: 25, c: 'Médio inferior' },
      { eb: 8, p: 30, c: 'Médio' },
      { eb: 8, p: 35, c: 'Médio' },
      { eb: 10, p: 40, c: 'Médio' },
      { eb: 10, p: 45, c: 'Médio' },
      { eb: 12, p: 50, c: 'Médio' },
      { eb: 14, p: 55, c: 'Médio' },
      { eb: 14, p: 60, c: 'Médio' },
      { eb: 16, p: 65, c: 'Médio' },
      { eb: 16, p: 70, c: 'Médio' },
      { eb: 16, p: 75, c: 'Médio superior' },
      { eb: 18, p: 80, c: 'Médio superior' },
      { eb: 20, p: 85, c: 'Médio superior' },
      { eb: 22, p: 90, c: 'Médio superior' },
      { eb: 22, p: 95, c: 'Superior' },
      { eb: 24, p: 99, c: 'Superior' }
    ];

    for (const norma of transitoNormas) {
      await query(
        'INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
        [116, norma.eb, norma.eb, norma.p, norma.c]
      );
    }
    console.log(`✅ Tabela 7 (Trânsito) - ${transitoNormas.length} normas\n`);

    // ========== TABELA 8 - ESCOLARIDADE (Página 61 do manual) ==========
    console.log('📋 Criando Tabela 8 - Escolaridade...');
    
    // Fundamental
    const escFundNormas = [
      { eb: -8, p: 1, c: 'Inferior' },
      { eb: -4, p: 5, c: 'Inferior' },
      { eb: -2, p: 10, c: 'Médio inferior' },
      { eb: 0, p: 15, c: 'Médio inferior' },
      { eb: 2, p: 20, c: 'Médio inferior' },
      { eb: 2, p: 25, c: 'Médio inferior' },
      { eb: 2, p: 30, c: 'Médio' },
      { eb: 4, p: 35, c: 'Médio' },
      { eb: 4, p: 40, c: 'Médio' },
      { eb: 4, p: 45, c: 'Médio' },
      { eb: 4, p: 50, c: 'Médio' },
      { eb: 6, p: 55, c: 'Médio' },
      { eb: 6, p: 60, c: 'Médio' },
      { eb: 8, p: 65, c: 'Médio' },
      { eb: 10, p: 70, c: 'Médio' },
      { eb: 10, p: 75, c: 'Médio superior' },
      { eb: 10, p: 80, c: 'Médio superior' },
      { eb: 12, p: 85, c: 'Médio superior' },
      { eb: 12, p: 90, c: 'Médio superior' },
      { eb: 16, p: 95, c: 'Superior' },
      { eb: 18, p: 99, c: 'Superior' }
    ];

    for (const norma of escFundNormas) {
      await query(
        'INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
        [121, norma.eb, norma.eb, norma.p, norma.c]
      );
    }
    console.log(`✅ Escolaridade Fundamental - ${escFundNormas.length} normas`);

    // Médio
    const escMedNormas = [
      { eb: -4, p: 1, c: 'Inferior' },
      { eb: 0, p: 5, c: 'Inferior' },
      { eb: 2, p: 10, c: 'Médio inferior' },
      { eb: 4, p: 15, c: 'Médio inferior' },
      { eb: 4, p: 20, c: 'Médio inferior' },
      { eb: 6, p: 25, c: 'Médio inferior' },
      { eb: 8, p: 30, c: 'Médio' },
      { eb: 8, p: 35, c: 'Médio' },
      { eb: 10, p: 40, c: 'Médio' },
      { eb: 10, p: 45, c: 'Médio' },
      { eb: 10, p: 50, c: 'Médio' },
      { eb: 12, p: 55, c: 'Médio' },
      { eb: 12, p: 60, c: 'Médio' },
      { eb: 14, p: 65, c: 'Médio' },
      { eb: 14, p: 70, c: 'Médio' },
      { eb: 16, p: 75, c: 'Médio superior' },
      { eb: 16, p: 80, c: 'Médio superior' },
      { eb: 18, p: 85, c: 'Médio superior' },
      { eb: 22, p: 90, c: 'Médio superior' },
      { eb: 24, p: 95, c: 'Superior' },
      { eb: 24, p: 99, c: 'Superior' }
    ];

    for (const norma of escMedNormas) {
      await query(
        'INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
        [122, norma.eb, norma.eb, norma.p, norma.c]
      );
    }
    console.log(`✅ Escolaridade Médio - ${escMedNormas.length} normas`);

    // Superior
    const escSupNormas = [
      { eb: -6, p: 1, c: 'Inferior' },
      { eb: 0, p: 5, c: 'Inferior' },
      { eb: 4, p: 10, c: 'Médio inferior' },
      { eb: 4, p: 15, c: 'Médio inferior' },
      { eb: 6, p: 20, c: 'Médio inferior' },
      { eb: 8, p: 25, c: 'Médio inferior' },
      { eb: 8, p: 30, c: 'Médio' },
      { eb: 10, p: 35, c: 'Médio' },
      { eb: 10, p: 40, c: 'Médio' },
      { eb: 12, p: 45, c: 'Médio' },
      { eb: 12, p: 50, c: 'Médio' },
      { eb: 12, p: 55, c: 'Médio' },
      { eb: 14, p: 60, c: 'Médio' },
      { eb: 14, p: 65, c: 'Médio' },
      { eb: 16, p: 70, c: 'Médio' },
      { eb: 16, p: 75, c: 'Médio superior' },
      { eb: 18, p: 80, c: 'Médio superior' },
      { eb: 20, p: 85, c: 'Médio superior' },
      { eb: 20, p: 90, c: 'Médio superior' },
      { eb: 24, p: 95, c: 'Superior' },
      { eb: 24, p: 99, c: 'Superior' }
    ];

    for (const norma of escSupNormas) {
      await query(
        'INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
        [123, norma.eb, norma.eb, norma.p, norma.c]
      );
    }
    console.log(`✅ Escolaridade Superior - ${escSupNormas.length} normas\n`);

    // ========== TABELA 9 - IDADE (Página 61-62 do manual) ==========
    console.log('📋 Criando Tabela 9 - Faixa Etária...');

    // 14-24 anos
    const id14_24 = [
      { eb: -4, p: 1, c: 'Inferior' },
      { eb: -2, p: 5, c: 'Inferior' },
      { eb: 4, p: 10, c: 'Médio inferior' },
      { eb: 6, p: 15, c: 'Médio inferior' },
      { eb: 8, p: 20, c: 'Médio inferior' },
      { eb: 8, p: 25, c: 'Médio inferior' },
      { eb: 10, p: 30, c: 'Médio' },
      { eb: 10, p: 35, c: 'Médio' },
      { eb: 12, p: 40, c: 'Médio' },
      { eb: 12, p: 45, c: 'Médio' },
      { eb: 12, p: 50, c: 'Médio' },
      { eb: 14, p: 55, c: 'Médio' },
      { eb: 14, p: 60, c: 'Médio' },
      { eb: 14, p: 65, c: 'Médio' },
      { eb: 16, p: 70, c: 'Médio' },
      { eb: 16, p: 75, c: 'Médio superior' },
      { eb: 16, p: 80, c: 'Médio superior' },
      { eb: 18, p: 85, c: 'Médio superior' },
      { eb: 20, p: 90, c: 'Médio superior' },
      { eb: 20, p: 95, c: 'Superior' },
      { eb: 24, p: 99, c: 'Superior' }
    ];

    for (const norma of id14_24) {
      await query(
        'INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
        [124, norma.eb, norma.eb, norma.p, norma.c]
      );
    }
    console.log(`✅ Idade 14-24 - ${id14_24.length} normas`);

    // 25-34 anos
    const id25_34 = [
      { eb: -4, p: 1, c: 'Inferior' },
      { eb: -2, p: 5, c: 'Inferior' },
      { eb: 0, p: 10, c: 'Médio inferior' },
      { eb: 2, p: 15, c: 'Médio inferior' },
      { eb: 4, p: 20, c: 'Médio inferior' },
      { eb: 4, p: 25, c: 'Médio inferior' },
      { eb: 8, p: 30, c: 'Médio' },
      { eb: 8, p: 35, c: 'Médio' },
      { eb: 10, p: 40, c: 'Médio' },
      { eb: 10, p: 45, c: 'Médio' },
      { eb: 12, p: 50, c: 'Médio' },
      { eb: 12, p: 55, c: 'Médio' },
      { eb: 14, p: 60, c: 'Médio' },
      { eb: 14, p: 65, c: 'Médio' },
      { eb: 16, p: 70, c: 'Médio' },
      { eb: 16, p: 75, c: 'Médio superior' },
      { eb: 18, p: 80, c: 'Médio superior' },
      { eb: 20, p: 85, c: 'Médio superior' },
      { eb: 20, p: 90, c: 'Médio superior' },
      { eb: 24, p: 95, c: 'Superior' },
      { eb: 24, p: 99, c: 'Superior' }
    ];

    for (const norma of id25_34) {
      await query(
        'INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
        [125, norma.eb, norma.eb, norma.p, norma.c]
      );
    }
    console.log(`✅ Idade 25-34 - ${id25_34.length} normas`);

    // 35-44 anos
    const id35_44 = [
      { eb: -4, p: 1, c: 'Inferior' },
      { eb: -2, p: 5, c: 'Inferior' },
      { eb: 0, p: 10, c: 'Médio inferior' },
      { eb: 0, p: 15, c: 'Médio inferior' },
      { eb: 2, p: 20, c: 'Médio inferior' },
      { eb: 2, p: 25, c: 'Médio inferior' },
      { eb: 4, p: 30, c: 'Médio' },
      { eb: 4, p: 35, c: 'Médio' },
      { eb: 6, p: 40, c: 'Médio' },
      { eb: 6, p: 45, c: 'Médio' },
      { eb: 8, p: 50, c: 'Médio' },
      { eb: 8, p: 55, c: 'Médio' },
      { eb: 10, p: 60, c: 'Médio' },
      { eb: 10, p: 65, c: 'Médio' },
      { eb: 10, p: 70, c: 'Médio' },
      { eb: 12, p: 75, c: 'Médio superior' },
      { eb: 12, p: 80, c: 'Médio superior' },
      { eb: 14, p: 85, c: 'Médio superior' },
      { eb: 16, p: 90, c: 'Médio superior' },
      { eb: 16, p: 95, c: 'Superior' },
      { eb: 20, p: 99, c: 'Superior' }
    ];

    for (const norma of id35_44) {
      await query(
        'INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
        [126, norma.eb, norma.eb, norma.p, norma.c]
      );
    }
    console.log(`✅ Idade 35-44 - ${id35_44.length} normas`);

    // 45-54 anos
    const id45_54 = [
      { eb: -4, p: 1, c: 'Inferior' },
      { eb: -2, p: 5, c: 'Inferior' },
      { eb: 0, p: 10, c: 'Médio inferior' },
      { eb: 0, p: 15, c: 'Médio inferior' },
      { eb: 0, p: 20, c: 'Médio inferior' },
      { eb: 0, p: 25, c: 'Médio inferior' },
      { eb: 2, p: 30, c: 'Médio' },
      { eb: 3, p: 35, c: 'Médio' },
      { eb: 4, p: 40, c: 'Médio' },
      { eb: 4, p: 45, c: 'Médio' },
      { eb: 4, p: 50, c: 'Médio' },
      { eb: 6, p: 55, c: 'Médio' },
      { eb: 7, p: 60, c: 'Médio' },
      { eb: 8, p: 65, c: 'Médio' },
      { eb: 8, p: 70, c: 'Médio' },
      { eb: 10, p: 75, c: 'Médio superior' },
      { eb: 11, p: 80, c: 'Médio superior' },
      { eb: 12, p: 85, c: 'Médio superior' },
      { eb: 14, p: 90, c: 'Médio superior' },
      { eb: 15, p: 95, c: 'Superior' },
      { eb: 22, p: 99, c: 'Superior' }
    ];

    for (const norma of id45_54) {
      await query(
        'INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
        [127, norma.eb, norma.eb, norma.p, norma.c]
      );
    }
    console.log(`✅ Idade 45-54 - ${id45_54.length} normas`);

    // 55-64 anos
    const id55_64 = [
      { eb: -4, p: 1, c: 'Inferior' },
      { eb: -1, p: 5, c: 'Inferior' },
      { eb: 0, p: 10, c: 'Médio inferior' },
      { eb: 0, p: 15, c: 'Médio inferior' },
      { eb: 0, p: 20, c: 'Médio inferior' },
      { eb: 0, p: 25, c: 'Médio inferior' },
      { eb: 2, p: 30, c: 'Médio' },
      { eb: 3, p: 35, c: 'Médio' },
      { eb: 4, p: 40, c: 'Médio' },
      { eb: 4, p: 45, c: 'Médio' },
      { eb: 4, p: 50, c: 'Médio' },
      { eb: 6, p: 55, c: 'Médio' },
      { eb: 7, p: 60, c: 'Médio' },
      { eb: 8, p: 65, c: 'Médio' },
      { eb: 8, p: 70, c: 'Médio' },
      { eb: 10, p: 75, c: 'Médio superior' },
      { eb: 11, p: 80, c: 'Médio superior' },
      { eb: 12, p: 85, c: 'Médio superior' },
      { eb: 14, p: 90, c: 'Médio superior' },
      { eb: 15, p: 95, c: 'Superior' },
      { eb: 22, p: 99, c: 'Superior' }
    ];

    for (const norma of id55_64) {
      await query(
        'INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
        [128, norma.eb, norma.eb, norma.p, norma.c]
      );
    }
    console.log(`✅ Idade 55-64 - ${id55_64.length} normas\n`);

    // ========== TABELA 10 - GERAL (Página 62 do manual) ==========
    console.log('📋 Criando Tabela 10 - Geral (Amostra Total)...');
    const geralNormas = [
      { eb: -8, p: 1, c: 'Inferior' },
      { eb: 0, p: 5, c: 'Inferior' },
      { eb: 2, p: 10, c: 'Inferior' },
      { eb: 4, p: 15, c: 'Médio inferior' },
      { eb: 6, p: 20, c: 'Médio inferior' },
      { eb: 6, p: 25, c: 'Médio inferior' },
      { eb: 8, p: 30, c: 'Médio' },
      { eb: 8, p: 35, c: 'Médio' },
      { eb: 10, p: 40, c: 'Médio' },
      { eb: 10, p: 45, c: 'Médio' },
      { eb: 12, p: 50, c: 'Médio' },
      { eb: 12, p: 55, c: 'Médio' },
      { eb: 12, p: 60, c: 'Médio' },
      { eb: 14, p: 65, c: 'Médio' },
      { eb: 14, p: 70, c: 'Médio' },
      { eb: 16, p: 75, c: 'Médio' },
      { eb: 16, p: 80, c: 'Médio superior' },
      { eb: 18, p: 85, c: 'Médio' },
      { eb: 20, p: 90, c: 'Médio' },
      { eb: 22, p: 95, c: 'Superior' },
      { eb: 24, p: 99, c: 'Superior' }
    ];

    for (const norma of geralNormas) {
      await query(
        'INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
        [120, norma.eb, norma.eb, norma.p, norma.c]
      );
    }
    console.log(`✅ Tabela Geral - ${geralNormas.length} normas\n`);

    console.log('🎉 Todas as tabelas MEMORE foram corrigidas com os dados OFICIAIS do manual!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

fixMemoreTables();

