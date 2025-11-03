const { query } = require('../config/database');
require('dotenv').config();

/**
 * Script para atualizar as tabelas normativas do MIG conforme manual técnico oficial
 * Baseado nas Tabelas 1, 2, 3, 4 e 5 do manual
 */

async function fixMigTablesOfficial() {
  console.log('🔧 Iniciando atualização das tabelas MIG...\n');

  try {
    // 1. Deletar todas as normas MIG existentes
    console.log('🗑️  Deletando normas MIG antigas...');
    await query('DELETE FROM normas_mig');
    console.log('✅ Normas antigas deletadas\n');

    // 2. Deletar tabelas normativas MIG antigas
    console.log('🗑️  Deletando tabelas normativas MIG antigas...');
    await query("DELETE FROM tabelas_normativas WHERE tipo = 'mig'");
    console.log('✅ Tabelas antigas deletadas\n');

    // 3. Criar tabelas normativas conforme manual
    console.log('📊 Criando tabelas normativas...\n');

    // TABELA 1 - Geral (amostra total)
    const tabelaGeral = await query(`
      INSERT INTO tabelas_normativas (nome, tipo, ativa, descricao)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      'MIG - Geral',
      'mig',
      true,
      'Tabela geral - amostra total (N=1326)'
    ]);
    const geralId = tabelaGeral.rows[0].id;
    console.log(`✅ Tabela Geral criada (ID: ${geralId})`);

    // TABELA 2 - Por Faixas Etárias
    const faixasEtarias = [
      { nome: 'MIG - Idade 15-25', faixa: '15-25', n: 860, media: 16, dp: 5.09 },
      { nome: 'MIG - Idade 26-35', faixa: '26-35', n: 246, media: 15, dp: 5.63 },
      { nome: 'MIG - Idade 36-45', faixa: '36-45', n: 131, media: 11.8, dp: 5.06 },
      { nome: 'MIG - Idade 46-55', faixa: '46-55', n: 67, media: 10.5, dp: 5.03 },
      { nome: 'MIG - Idade 56-64', faixa: '56-64', n: 12, media: 8.92, dp: 5.47 }
    ];

    const idadeIds = {};
    for (const faixa of faixasEtarias) {
      const result = await query(`
        INSERT INTO tabelas_normativas (nome, tipo, ativa, descricao, criterio)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        faixa.nome,
        'mig',
        true,
        `Faixa etária ${faixa.faixa} anos (N=${faixa.n}, M=${faixa.media}, DP=${faixa.dp})`,
        `idade:${faixa.faixa}`
      ]);
      idadeIds[faixa.faixa] = result.rows[0].id;
      console.log(`✅ ${faixa.nome} criada (ID: ${result.rows[0].id})`);
    }

    // TABELA 3 - Por Escolaridade
    const escolaridades = [
      { nome: 'MIG - Ensino Fundamental', esc: 'Ensino Fundamental', n: 63, media: 8.27, dp: 4.15 },
      { nome: 'MIG - Ensino Médio', esc: 'Ensino Médio', n: 427, media: 15, dp: 5.43 },
      { nome: 'MIG - Ensino Superior', esc: 'Ensino Superior', n: 792, media: 15.6, dp: 5.21 }
    ];

    const escolaridadeIds = {};
    for (const esc of escolaridades) {
      const result = await query(`
        INSERT INTO tabelas_normativas (nome, tipo, ativa, descricao, criterio)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        esc.nome,
        'mig',
        true,
        `Escolaridade: ${esc.esc} (N=${esc.n}, M=${esc.media}, DP=${esc.dp})`,
        `escolaridade:${esc.esc}`
      ]);
      escolaridadeIds[esc.esc] = result.rows[0].id;
      console.log(`✅ ${esc.nome} criada (ID: ${result.rows[0].id})`);
    }

    // TABELA 4 - Trânsito
    const transitos = [
      { nome: 'MIG - Trânsito - Primeira Habilitação', contexto: 'Primeira Habilitação', n: 104, media: 13.9, dp: 6.31 },
      { nome: 'MIG - Trânsito - Renovação/Mudança', contexto: 'Renovação ou Mudança de Categoria', n: 78, media: 13.5, dp: 6.1 },
      { nome: 'MIG - Trânsito - Motorista Profissional', contexto: 'Motoristas Profissionais', n: 173, media: 10.6, dp: 4.7 }
    ];

    const transitoIds = {};
    for (const transito of transitos) {
      const result = await query(`
        INSERT INTO tabelas_normativas (nome, tipo, ativa, descricao, criterio)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        transito.nome,
        'mig',
        true,
        `Trânsito: ${transito.contexto} (N=${transito.n}, M=${transito.media}, DP=${transito.dp})`,
        `transito:${transito.contexto}`
      ]);
      transitoIds[transito.contexto] = result.rows[0].id;
      console.log(`✅ ${transito.nome} criada (ID: ${result.rows[0].id})`);
    }

    // TABELA 5 - QI (Escore Padrão Normalizado)
    const tabelaQI = await query(`
      INSERT INTO tabelas_normativas (nome, tipo, ativa, descricao)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      'MIG - Conversão QI',
      'mig',
      true,
      'Conversão para Escore Padrão Normalizado (QI)'
    ]);
    const qiId = tabelaQI.rows[0].id;
    console.log(`✅ Tabela QI criada (ID: ${qiId})\n`);

    // 4. Inserir normas conforme manual
    console.log('📝 Inserindo normas...\n');

    // TABELA 1 - Normas Gerais
    const normasGerais = [
      { percentil: 5, pontos: 6, classificacao: 'Inferior' },
      { percentil: 10, pontos: 7, classificacao: 'Inferior' },
      { percentil: 15, pontos: 9, classificacao: 'Médio inferior' },
      { percentil: 20, pontos: 10, classificacao: 'Médio inferior' },
      { percentil: 25, pontos: 11, classificacao: 'Médio inferior' },
      { percentil: 30, pontos: 12, classificacao: 'Médio' },
      { percentil: 35, pontos: 13, classificacao: 'Médio' },
      { percentil: 40, pontos: 14, classificacao: 'Médio' },
      { percentil: 45, pontos: 14, classificacao: 'Médio' },
      { percentil: 50, pontos: 15, classificacao: 'Médio' },
      { percentil: 55, pontos: 16, classificacao: 'Médio' },
      { percentil: 60, pontos: 17, classificacao: 'Médio' },
      { percentil: 65, pontos: 18, classificacao: 'Médio' },
      { percentil: 70, pontos: 18, classificacao: 'Médio' },
      { percentil: 75, pontos: 19, classificacao: 'Médio superior' },
      { percentil: 80, pontos: 20, classificacao: 'Médio superior' },
      { percentil: 85, pontos: 21, classificacao: 'Médio superior' },
      { percentil: 90, pontos: 22, classificacao: 'Superior' },
      { percentil: 95, pontos: 24, classificacao: 'Superior' }
    ];

    for (const norma of normasGerais) {
      await query(`
        INSERT INTO normas_mig (tabela_id, tipo_avaliacao, acertos_min, acertos_max, percentil, classificacao)
        VALUES ($1, 'geral', $2, $3, $4, $5)
      `, [geralId, norma.pontos, norma.pontos, norma.percentil, norma.classificacao]);
    }
    console.log(`✅ ${normasGerais.length} normas gerais inseridas`);

    // TABELA 2 - Normas por Idade
    const normasPorIdade = {
      '15-25': [
        { percentil: 5, pontos: 7, classificacao: 'Inferior' },
        { percentil: 10, pontos: 9, classificacao: 'Inferior' },
        { percentil: 15, pontos: 11, classificacao: 'Médio inferior' },
        { percentil: 20, pontos: 12, classificacao: 'Médio inferior' },
        { percentil: 25, pontos: 13, classificacao: 'Médio inferior' },
        { percentil: 30, pontos: 13, classificacao: 'Médio' },
        { percentil: 35, pontos: 14, classificacao: 'Médio' },
        { percentil: 40, pontos: 15, classificacao: 'Médio' },
        { percentil: 45, pontos: 15, classificacao: 'Médio' },
        { percentil: 50, pontos: 16, classificacao: 'Médio' },
        { percentil: 55, pontos: 17, classificacao: 'Médio' },
        { percentil: 60, pontos: 18, classificacao: 'Médio' },
        { percentil: 65, pontos: 18, classificacao: 'Médio' },
        { percentil: 70, pontos: 19, classificacao: 'Médio' },
        { percentil: 75, pontos: 20, classificacao: 'Médio superior' },
        { percentil: 80, pontos: 21, classificacao: 'Médio superior' },
        { percentil: 85, pontos: 22, classificacao: 'Médio superior' },
        { percentil: 90, pontos: 22, classificacao: 'Superior' },
        { percentil: 95, pontos: 24, classificacao: 'Superior' }
      ],
      '26-35': [
        { percentil: 5, pontos: 5, classificacao: 'Inferior' },
        { percentil: 10, pontos: 7, classificacao: 'Inferior' },
        { percentil: 15, pontos: 8, classificacao: 'Médio inferior' },
        { percentil: 20, pontos: 10, classificacao: 'Médio inferior' },
        { percentil: 25, pontos: 11, classificacao: 'Médio inferior' },
        { percentil: 30, pontos: 12, classificacao: 'Médio' },
        { percentil: 35, pontos: 14, classificacao: 'Médio' },
        { percentil: 40, pontos: 14, classificacao: 'Médio' },
        { percentil: 45, pontos: 15, classificacao: 'Médio' },
        { percentil: 50, pontos: 15, classificacao: 'Médio' },
        { percentil: 55, pontos: 16, classificacao: 'Médio' },
        { percentil: 60, pontos: 17, classificacao: 'Médio' },
        { percentil: 65, pontos: 18, classificacao: 'Médio' },
        { percentil: 70, pontos: 19, classificacao: 'Médio' },
        { percentil: 75, pontos: 19, classificacao: 'Médio superior' },
        { percentil: 80, pontos: 20, classificacao: 'Médio superior' },
        { percentil: 85, pontos: 21, classificacao: 'Médio superior' },
        { percentil: 90, pontos: 22, classificacao: 'Superior' },
        { percentil: 95, pontos: 23, classificacao: 'Superior' }
      ],
      '36-45': [
        { percentil: 5, pontos: 4, classificacao: 'Inferior' },
        { percentil: 10, pontos: 5, classificacao: 'Inferior' },
        { percentil: 15, pontos: 7, classificacao: 'Médio inferior' },
        { percentil: 20, pontos: 8, classificacao: 'Médio inferior' },
        { percentil: 25, pontos: 9, classificacao: 'Médio inferior' },
        { percentil: 30, pontos: 9, classificacao: 'Médio' },
        { percentil: 35, pontos: 10, classificacao: 'Médio' },
        { percentil: 40, pontos: 10, classificacao: 'Médio' },
        { percentil: 45, pontos: 11, classificacao: 'Médio' },
        { percentil: 50, pontos: 11, classificacao: 'Médio' },
        { percentil: 55, pontos: 12, classificacao: 'Médio' },
        { percentil: 60, pontos: 12, classificacao: 'Médio' },
        { percentil: 65, pontos: 13, classificacao: 'Médio' },
        { percentil: 70, pontos: 14, classificacao: 'Médio' },
        { percentil: 75, pontos: 15, classificacao: 'Médio superior' },
        { percentil: 80, pontos: 16, classificacao: 'Médio superior' },
        { percentil: 85, pontos: 17, classificacao: 'Médio superior' },
        { percentil: 90, pontos: 19, classificacao: 'Superior' },
        { percentil: 95, pontos: 22, classificacao: 'Superior' }
      ],
      '46-55': [
        { percentil: 5, pontos: 4, classificacao: 'Inferior' },
        { percentil: 10, pontos: 5, classificacao: 'Inferior' },
        { percentil: 15, pontos: 5, classificacao: 'Médio inferior' },
        { percentil: 20, pontos: 6, classificacao: 'Médio inferior' },
        { percentil: 25, pontos: 7, classificacao: 'Médio inferior' },
        { percentil: 30, pontos: 8, classificacao: 'Médio' },
        { percentil: 35, pontos: 9, classificacao: 'Médio' },
        { percentil: 40, pontos: 9, classificacao: 'Médio' },
        { percentil: 45, pontos: 10, classificacao: 'Médio' },
        { percentil: 50, pontos: 10, classificacao: 'Médio' },
        { percentil: 55, pontos: 10, classificacao: 'Médio' },
        { percentil: 60, pontos: 11, classificacao: 'Médio' },
        { percentil: 65, pontos: 11, classificacao: 'Médio' },
        { percentil: 70, pontos: 12, classificacao: 'Médio' },
        { percentil: 75, pontos: 14, classificacao: 'Médio superior' },
        { percentil: 80, pontos: 14, classificacao: 'Médio superior' },
        { percentil: 85, pontos: 15, classificacao: 'Médio superior' },
        { percentil: 90, pontos: 17, classificacao: 'Superior' },
        { percentil: 95, pontos: 21, classificacao: 'Superior' }
      ],
      '56-64': [
        { percentil: 5, pontos: 3, classificacao: 'Inferior' },
        { percentil: 10, pontos: 4, classificacao: 'Inferior' },
        { percentil: 15, pontos: 5, classificacao: 'Médio inferior' },
        { percentil: 20, pontos: 5, classificacao: 'Médio inferior' },
        { percentil: 25, pontos: 6, classificacao: 'Médio inferior' },
        { percentil: 30, pontos: 6, classificacao: 'Médio' },
        { percentil: 35, pontos: 6, classificacao: 'Médio' },
        { percentil: 40, pontos: 6, classificacao: 'Médio' },
        { percentil: 45, pontos: 7, classificacao: 'Médio' },
        { percentil: 50, pontos: 8, classificacao: 'Médio' },
        { percentil: 55, pontos: 8, classificacao: 'Médio' },
        { percentil: 60, pontos: 9, classificacao: 'Médio' },
        { percentil: 65, pontos: 9, classificacao: 'Médio' },
        { percentil: 70, pontos: 10, classificacao: 'Médio' },
        { percentil: 75, pontos: 12, classificacao: 'Médio superior' },
        { percentil: 80, pontos: 13, classificacao: 'Médio superior' },
        { percentil: 85, pontos: 15, classificacao: 'Médio superior' },
        { percentil: 90, pontos: 18, classificacao: 'Superior' },
        { percentil: 95, pontos: 18, classificacao: 'Superior' }
      ]
    };

    for (const [faixa, normas] of Object.entries(normasPorIdade)) {
      for (const norma of normas) {
        await query(`
          INSERT INTO normas_mig (tabela_id, tipo_avaliacao, acertos_min, acertos_max, percentil, classificacao)
          VALUES ($1, 'geral', $2, $3, $4, $5)
        `, [idadeIds[faixa], norma.pontos, norma.pontos, norma.percentil, norma.classificacao]);
      }
      console.log(`✅ ${normas.length} normas inseridas para idade ${faixa}`);
    }

    // TABELA 3 - Normas por Escolaridade
    const normasPorEscolaridade = {
      'Ensino Fundamental': [
        { percentil: 5, pontos: 2, classificacao: 'Inferior' },
        { percentil: 10, pontos: 3, classificacao: 'Inferior' },
        { percentil: 15, pontos: 4, classificacao: 'Médio inferior' },
        { percentil: 20, pontos: 5, classificacao: 'Médio inferior' },
        { percentil: 25, pontos: 5, classificacao: 'Médio inferior' },
        { percentil: 30, pontos: 6, classificacao: 'Médio' },
        { percentil: 35, pontos: 6, classificacao: 'Médio' },
        { percentil: 40, pontos: 7, classificacao: 'Médio' },
        { percentil: 45, pontos: 7, classificacao: 'Médio' },
        { percentil: 50, pontos: 8, classificacao: 'Médio' },
        { percentil: 55, pontos: 9, classificacao: 'Médio' },
        { percentil: 60, pontos: 9, classificacao: 'Médio' },
        { percentil: 65, pontos: 10, classificacao: 'Médio' },
        { percentil: 70, pontos: 10, classificacao: 'Médio' },
        { percentil: 75, pontos: 11, classificacao: 'Médio superior' },
        { percentil: 80, pontos: 12, classificacao: 'Médio superior' },
        { percentil: 85, pontos: 12, classificacao: 'Médio superior' },
        { percentil: 90, pontos: 13, classificacao: 'Superior' },
        { percentil: 95, pontos: 14, classificacao: 'Superior' }
      ],
      'Ensino Médio': [
        { percentil: 5, pontos: 6, classificacao: 'Inferior' },
        { percentil: 10, pontos: 8, classificacao: 'Inferior' },
        { percentil: 15, pontos: 9, classificacao: 'Médio inferior' },
        { percentil: 20, pontos: 10, classificacao: 'Médio inferior' },
        { percentil: 25, pontos: 11, classificacao: 'Médio inferior' },
        { percentil: 30, pontos: 12, classificacao: 'Médio' },
        { percentil: 35, pontos: 13, classificacao: 'Médio' },
        { percentil: 40, pontos: 14, classificacao: 'Médio' },
        { percentil: 45, pontos: 15, classificacao: 'Médio' },
        { percentil: 50, pontos: 15, classificacao: 'Médio' },
        { percentil: 55, pontos: 16, classificacao: 'Médio' },
        { percentil: 60, pontos: 16, classificacao: 'Médio' },
        { percentil: 65, pontos: 17, classificacao: 'Médio' },
        { percentil: 70, pontos: 18, classificacao: 'Médio' },
        { percentil: 75, pontos: 19, classificacao: 'Médio superior' },
        { percentil: 80, pontos: 20, classificacao: 'Médio superior' },
        { percentil: 85, pontos: 21, classificacao: 'Médio superior' },
        { percentil: 90, pontos: 22, classificacao: 'Superior' },
        { percentil: 95, pontos: 24, classificacao: 'Superior' }
      ],
      'Ensino Superior': [
        { percentil: 5, pontos: 6, classificacao: 'Inferior' },
        { percentil: 10, pontos: 8, classificacao: 'Inferior' },
        { percentil: 15, pontos: 10, classificacao: 'Médio inferior' },
        { percentil: 20, pontos: 11, classificacao: 'Médio inferior' },
        { percentil: 25, pontos: 12, classificacao: 'Médio inferior' },
        { percentil: 30, pontos: 12, classificacao: 'Médio' },
        { percentil: 35, pontos: 13, classificacao: 'Médio' },
        { percentil: 40, pontos: 14, classificacao: 'Médio' },
        { percentil: 45, pontos: 15, classificacao: 'Médio' },
        { percentil: 50, pontos: 15, classificacao: 'Médio' },
        { percentil: 55, pontos: 16, classificacao: 'Médio' },
        { percentil: 60, pontos: 17, classificacao: 'Médio' },
        { percentil: 65, pontos: 18, classificacao: 'Médio' },
        { percentil: 70, pontos: 19, classificacao: 'Médio' },
        { percentil: 75, pontos: 19, classificacao: 'Médio superior' },
        { percentil: 80, pontos: 20, classificacao: 'Médio superior' },
        { percentil: 85, pontos: 21, classificacao: 'Médio superior' },
        { percentil: 90, pontos: 22, classificacao: 'Superior' },
        { percentil: 95, pontos: 24, classificacao: 'Superior' }
      ]
    };

    for (const [esc, normas] of Object.entries(normasPorEscolaridade)) {
      for (const norma of normas) {
        await query(`
          INSERT INTO normas_mig (tabela_id, tipo_avaliacao, acertos_min, acertos_max, percentil, classificacao)
          VALUES ($1, 'geral', $2, $3, $4, $5)
        `, [escolaridadeIds[esc], norma.pontos, norma.pontos, norma.percentil, norma.classificacao]);
      }
      console.log(`✅ ${normas.length} normas inseridas para ${esc}`);
    }

    // TABELA 4 - Normas para Trânsito
    const normasPorTransito = {
      'Primeira Habilitação': [
        { percentil: 5, pontos: 4, classificacao: 'Inferior' },
        { percentil: 10, pontos: 5, classificacao: 'Inferior' },
        { percentil: 15, pontos: 6, classificacao: 'Médio inferior' },
        { percentil: 20, pontos: 8, classificacao: 'Médio inferior' },
        { percentil: 25, pontos: 10, classificacao: 'Médio inferior' },
        { percentil: 30, pontos: 11, classificacao: 'Médio' },
        { percentil: 35, pontos: 12, classificacao: 'Médio' },
        { percentil: 40, pontos: 12, classificacao: 'Médio' },
        { percentil: 45, pontos: 13, classificacao: 'Médio' },
        { percentil: 50, pontos: 13, classificacao: 'Médio' },
        { percentil: 55, pontos: 15, classificacao: 'Médio' },
        { percentil: 60, pontos: 16, classificacao: 'Médio' },
        { percentil: 65, pontos: 17, classificacao: 'Médio' },
        { percentil: 70, pontos: 18, classificacao: 'Médio' },
        { percentil: 75, pontos: 19, classificacao: 'Médio superior' },
        { percentil: 80, pontos: 21, classificacao: 'Médio superior' },
        { percentil: 85, pontos: 22, classificacao: 'Médio superior' },
        { percentil: 90, pontos: 22, classificacao: 'Superior' },
        { percentil: 95, pontos: 24, classificacao: 'Superior' }
      ],
      'Renovação ou Mudança de Categoria': [
        { percentil: 5, pontos: 4, classificacao: 'Inferior' },
        { percentil: 10, pontos: 6, classificacao: 'Inferior' },
        { percentil: 15, pontos: 8, classificacao: 'Médio inferior' },
        { percentil: 20, pontos: 8, classificacao: 'Médio inferior' },
        { percentil: 25, pontos: 9, classificacao: 'Médio inferior' },
        { percentil: 30, pontos: 9, classificacao: 'Médio' },
        { percentil: 35, pontos: 10, classificacao: 'Médio' },
        { percentil: 40, pontos: 11, classificacao: 'Médio' },
        { percentil: 45, pontos: 12, classificacao: 'Médio' },
        { percentil: 50, pontos: 14, classificacao: 'Médio' },
        { percentil: 55, pontos: 14, classificacao: 'Médio' },
        { percentil: 60, pontos: 15, classificacao: 'Médio' },
        { percentil: 65, pontos: 16, classificacao: 'Médio' },
        { percentil: 70, pontos: 17, classificacao: 'Médio' },
        { percentil: 75, pontos: 19, classificacao: 'Médio superior' },
        { percentil: 80, pontos: 20, classificacao: 'Médio superior' },
        { percentil: 85, pontos: 20, classificacao: 'Médio superior' },
        { percentil: 90, pontos: 23, classificacao: 'Superior' },
        { percentil: 95, pontos: 24, classificacao: 'Superior' }
      ],
      'Motoristas Profissionais': [
        { percentil: 5, pontos: 3, classificacao: 'Inferior' },
        { percentil: 10, pontos: 4, classificacao: 'Inferior' },
        { percentil: 15, pontos: 6, classificacao: 'Médio inferior' },
        { percentil: 20, pontos: 7, classificacao: 'Médio inferior' },
        { percentil: 25, pontos: 7, classificacao: 'Médio inferior' },
        { percentil: 30, pontos: 8, classificacao: 'Médio' },
        { percentil: 35, pontos: 9, classificacao: 'Médio' },
        { percentil: 40, pontos: 9, classificacao: 'Médio' },
        { percentil: 45, pontos: 10, classificacao: 'Médio' },
        { percentil: 50, pontos: 10, classificacao: 'Médio' },
        { percentil: 55, pontos: 11, classificacao: 'Médio' },
        { percentil: 60, pontos: 11, classificacao: 'Médio' },
        { percentil: 65, pontos: 12, classificacao: 'Médio' },
        { percentil: 70, pontos: 13, classificacao: 'Médio' },
        { percentil: 75, pontos: 14, classificacao: 'Médio superior' },
        { percentil: 80, pontos: 15, classificacao: 'Médio superior' },
        { percentil: 85, pontos: 16, classificacao: 'Médio superior' },
        { percentil: 90, pontos: 16, classificacao: 'Superior' },
        { percentil: 95, pontos: 19, classificacao: 'Superior' }
      ]
    };

    for (const [contexto, normas] of Object.entries(normasPorTransito)) {
      for (const norma of normas) {
        await query(`
          INSERT INTO normas_mig (tabela_id, tipo_avaliacao, acertos_min, acertos_max, percentil, classificacao)
          VALUES ($1, 'geral', $2, $3, $4, $5)
        `, [transitoIds[contexto], norma.pontos, norma.pontos, norma.percentil, norma.classificacao]);
      }
      console.log(`✅ ${normas.length} normas inseridas para Trânsito - ${contexto}`);
    }

    // TABELA 5 - Conversão QI
    const normasQI = [
      { pontos: 0, qi: 65, classificacao: 'Extremamente baixo' },
      { pontos: 1, qi: 65, classificacao: 'Extremamente baixo' },
      { pontos: 2, qi: 65, classificacao: 'Extremamente baixo' },
      { pontos: 3, qi: 68, classificacao: 'Extremamente baixo' },
      { pontos: 4, qi: 71, classificacao: 'Limítrofe' },
      { pontos: 5, qi: 74, classificacao: 'Limítrofe' },
      { pontos: 6, qi: 77, classificacao: 'Limítrofe' },
      { pontos: 7, qi: 80, classificacao: 'Médio inferior' },
      { pontos: 8, qi: 82, classificacao: 'Médio inferior' },
      { pontos: 9, qi: 84, classificacao: 'Médio inferior' },
      { pontos: 10, qi: 87, classificacao: 'Médio inferior' },
      { pontos: 11, qi: 89, classificacao: 'Médio inferior' },
      { pontos: 12, qi: 91, classificacao: 'Médio' },
      { pontos: 13, qi: 94, classificacao: 'Médio' },
      { pontos: 14, qi: 97, classificacao: 'Médio' },
      { pontos: 15, qi: 100, classificacao: 'Médio' },
      { pontos: 16, qi: 102, classificacao: 'Médio' },
      { pontos: 17, qi: 105, classificacao: 'Médio' },
      { pontos: 18, qi: 107, classificacao: 'Médio' },
      { pontos: 19, qi: 110, classificacao: 'Médio Superior' },
      { pontos: 20, qi: 112, classificacao: 'Médio Superior' },
      { pontos: 21, qi: 115, classificacao: 'Médio Superior' },
      { pontos: 22, qi: 119, classificacao: 'Médio Superior' },
      { pontos: 23, qi: 123, classificacao: 'Superior' },
      { pontos: 24, qi: 127, classificacao: 'Superior' },
      { pontos: 25, qi: 132, classificacao: 'Muito superior' },
      { pontos: 26, qi: 132, classificacao: 'Muito superior' },
      { pontos: 27, qi: 132, classificacao: 'Muito superior' },
      { pontos: 28, qi: 132, classificacao: 'Muito superior' }
    ];

    for (const norma of normasQI) {
      await query(`
        INSERT INTO normas_mig (tabela_id, tipo_avaliacao, acertos_min, acertos_max, percentil, classificacao, qi)
        VALUES ($1, 'qi', $2, $3, $4, $5, $6)
      `, [qiId, norma.pontos, norma.pontos, null, norma.classificacao, norma.qi]);
    }
    console.log(`✅ ${normasQI.length} conversões QI inseridas\n`);

    console.log('✅ Atualização concluída com sucesso!\n');
    console.log('📊 Resumo:');
    console.log(`   - 1 tabela geral`);
    console.log(`   - 5 tabelas por idade`);
    console.log(`   - 3 tabelas por escolaridade`);
    console.log(`   - 3 tabelas para trânsito`);
    console.log(`   - 1 tabela de conversão QI`);
    console.log(`   Total: 13 tabelas normativas`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao atualizar tabelas MIG:', error);
    process.exit(1);
  }
}

fixMigTablesOfficial();

