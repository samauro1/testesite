const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sistema_avaliacao_psicologica',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const query = (text, params) => pool.query(text, params);

const seedMIGNormas = async () => {
  try {
    console.log('🌱 Iniciando seed das normas MIG...');

    // Criar tabelas normativas para MIG
    const tabelasNormativas = [
      {
        nome: 'MIG - Tabela Geral',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para a População Brasileira (Amostra Total)',
        criterio: 'geral',
        ativo: true
      },
      {
        nome: 'MIG - Por Faixa Etária (15-25 anos)',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para a Faixa Etária de 15-25 anos',
        criterio: 'idade',
        ativo: true
      },
      {
        nome: 'MIG - Por Faixa Etária (26-35 anos)',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para a Faixa Etária de 26-35 anos',
        criterio: 'idade',
        ativo: true
      },
      {
        nome: 'MIG - Por Faixa Etária (36-45 anos)',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para a Faixa Etária de 36-45 anos',
        criterio: 'idade',
        ativo: true
      },
      {
        nome: 'MIG - Por Faixa Etária (46-55 anos)',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para a Faixa Etária de 46-55 anos',
        criterio: 'idade',
        ativo: true
      },
      {
        nome: 'MIG - Por Faixa Etária (56-64 anos)',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para a Faixa Etária de 56-64 anos',
        criterio: 'idade',
        ativo: true
      },
      {
        nome: 'MIG - Por Escolaridade (Ensino Fundamental)',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para o Ensino Fundamental',
        criterio: 'escolaridade',
        ativo: true
      },
      {
        nome: 'MIG - Por Escolaridade (Ensino Médio)',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para o Ensino Médio',
        criterio: 'escolaridade',
        ativo: true
      },
      {
        nome: 'MIG - Por Escolaridade (Ensino Superior)',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para o Ensino Superior',
        criterio: 'escolaridade',
        ativo: true
      },
      {
        nome: 'MIG - Trânsito (Primeira Habilitação)',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para Avaliação Psicológica de Condutores - Primeira Habilitação',
        criterio: 'transito',
        ativo: true
      },
      {
        nome: 'MIG - Trânsito (Renovação/Mudança)',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para Avaliação Psicológica de Condutores - Renovação/Mudança',
        criterio: 'transito',
        ativo: true
      },
      {
        nome: 'MIG - Trânsito (Motoristas Profissionais)',
        tipo: 'mig',
        descricao: 'Normas estatísticas da Bateria MIG para Avaliação Psicológica de Condutores - Motoristas Profissionais',
        criterio: 'transito',
        ativo: true
      }
    ];

    // Inserir tabelas normativas
    const tabelaIds = {};
    for (const tabela of tabelasNormativas) {
      const result = await query(`
        INSERT INTO tabelas_normativas (nome, tipo, descricao, criterio, ativa)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (nome) DO UPDATE SET
          tipo = EXCLUDED.tipo,
          descricao = EXCLUDED.descricao,
          criterio = EXCLUDED.criterio,
          ativa = EXCLUDED.ativa
        RETURNING id
      `, [tabela.nome, tabela.tipo, tabela.descricao, tabela.criterio, tabela.ativo]);
      
      tabelaIds[tabela.nome] = result.rows[0].id;
      console.log(`✅ Tabela criada: ${tabela.nome} (ID: ${result.rows[0].id})`);
    }

    // Limpar normas existentes
    await query('DELETE FROM normas_mig');

    // Tabela Geral (Amostra Total)
    const normasGerais = [
      { acertos_min: 24, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 22, acertos_max: 23, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 21, acertos_max: 21, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 20, acertos_max: 20, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 19, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 18, acertos_max: 18, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 17, acertos_max: 17, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 16, acertos_max: 16, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 15, acertos_max: 15, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 14, acertos_max: 14, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 13, acertos_max: 13, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 12, acertos_max: 12, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 11, acertos_max: 11, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 10, acertos_max: 10, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 9, acertos_max: 9, percentil: 20, classificacao: 'Médio Inferior' },
      { acertos_min: 8, acertos_max: 8, percentil: 15, classificacao: 'Médio Inferior' },
      { acertos_min: 7, acertos_max: 7, percentil: 10, classificacao: 'Inferior' },
      { acertos_min: 6, acertos_max: 6, percentil: 5, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 5, percentil: 1, classificacao: 'Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Tabela Geral'], normasGerais, 'geral');

    // Tabela por Faixa Etária (15-25 anos)
    const normas15_25 = [
      { acertos_min: 24, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 22, acertos_max: 23, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 21, acertos_max: 21, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 20, acertos_max: 20, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 19, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 18, acertos_max: 18, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 17, acertos_max: 17, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 16, acertos_max: 16, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 15, acertos_max: 15, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 14, acertos_max: 14, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 13, acertos_max: 13, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 12, acertos_max: 12, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 11, acertos_max: 11, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 10, acertos_max: 10, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 9, acertos_max: 9, percentil: 20, classificacao: 'Médio Inferior' },
      { acertos_min: 8, acertos_max: 8, percentil: 15, classificacao: 'Médio Inferior' },
      { acertos_min: 7, acertos_max: 7, percentil: 10, classificacao: 'Inferior' },
      { acertos_min: 6, acertos_max: 6, percentil: 5, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 5, percentil: 1, classificacao: 'Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Por Faixa Etária (15-25 anos)'], normas15_25, 'idade_15_25');

    // Tabela por Faixa Etária (26-35 anos)
    const normas26_35 = [
      { acertos_min: 24, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 22, acertos_max: 23, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 21, acertos_max: 21, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 20, acertos_max: 20, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 19, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 18, acertos_max: 18, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 17, acertos_max: 17, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 16, acertos_max: 16, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 15, acertos_max: 15, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 14, acertos_max: 14, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 13, acertos_max: 13, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 12, acertos_max: 12, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 11, acertos_max: 11, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 10, acertos_max: 10, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 9, acertos_max: 9, percentil: 20, classificacao: 'Médio Inferior' },
      { acertos_min: 8, acertos_max: 8, percentil: 15, classificacao: 'Médio Inferior' },
      { acertos_min: 7, acertos_max: 7, percentil: 10, classificacao: 'Inferior' },
      { acertos_min: 6, acertos_max: 6, percentil: 5, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 5, percentil: 1, classificacao: 'Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Por Faixa Etária (26-35 anos)'], normas26_35, 'idade_26_35');

    // Tabela por Faixa Etária (36-45 anos)
    const normas36_45 = [
      { acertos_min: 24, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 22, acertos_max: 23, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 21, acertos_max: 21, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 20, acertos_max: 20, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 19, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 18, acertos_max: 18, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 17, acertos_max: 17, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 16, acertos_max: 16, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 15, acertos_max: 15, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 14, acertos_max: 14, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 13, acertos_max: 13, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 12, acertos_max: 12, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 11, acertos_max: 11, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 10, acertos_max: 10, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 9, acertos_max: 9, percentil: 20, classificacao: 'Médio Inferior' },
      { acertos_min: 8, acertos_max: 8, percentil: 15, classificacao: 'Médio Inferior' },
      { acertos_min: 7, acertos_max: 7, percentil: 10, classificacao: 'Inferior' },
      { acertos_min: 6, acertos_max: 6, percentil: 5, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 5, percentil: 1, classificacao: 'Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Por Faixa Etária (36-45 anos)'], normas36_45, 'idade_36_45');

    // Tabela por Faixa Etária (46-55 anos)
    const normas46_55 = [
      { acertos_min: 24, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 22, acertos_max: 23, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 21, acertos_max: 21, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 20, acertos_max: 20, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 19, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 18, acertos_max: 18, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 17, acertos_max: 17, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 16, acertos_max: 16, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 15, acertos_max: 15, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 14, acertos_max: 14, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 13, acertos_max: 13, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 12, acertos_max: 12, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 11, acertos_max: 11, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 10, acertos_max: 10, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 9, acertos_max: 9, percentil: 20, classificacao: 'Médio Inferior' },
      { acertos_min: 8, acertos_max: 8, percentil: 15, classificacao: 'Médio Inferior' },
      { acertos_min: 7, acertos_max: 7, percentil: 10, classificacao: 'Inferior' },
      { acertos_min: 6, acertos_max: 6, percentil: 5, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 5, percentil: 1, classificacao: 'Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Por Faixa Etária (46-55 anos)'], normas46_55, 'idade_46_55');

    // Tabela por Faixa Etária (56-64 anos)
    const normas56_64 = [
      { acertos_min: 24, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 22, acertos_max: 23, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 21, acertos_max: 21, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 20, acertos_max: 20, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 19, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 18, acertos_max: 18, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 17, acertos_max: 17, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 16, acertos_max: 16, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 15, acertos_max: 15, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 14, acertos_max: 14, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 13, acertos_max: 13, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 12, acertos_max: 12, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 11, acertos_max: 11, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 10, acertos_max: 10, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 9, acertos_max: 9, percentil: 20, classificacao: 'Médio Inferior' },
      { acertos_min: 8, acertos_max: 8, percentil: 15, classificacao: 'Médio Inferior' },
      { acertos_min: 7, acertos_max: 7, percentil: 10, classificacao: 'Inferior' },
      { acertos_min: 6, acertos_max: 6, percentil: 5, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 5, percentil: 1, classificacao: 'Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Por Faixa Etária (56-64 anos)'], normas56_64, 'idade_56_64');

    // Tabela por Escolaridade (Ensino Fundamental)
    const normasFundamental = [
      { acertos_min: 14, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 13, acertos_max: 13, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 12, acertos_max: 12, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 11, acertos_max: 11, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 10, acertos_max: 10, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 9, acertos_max: 9, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 8, acertos_max: 8, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 7, acertos_max: 7, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 6, acertos_max: 6, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 5, acertos_max: 5, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 4, acertos_max: 4, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 3, acertos_max: 3, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 2, acertos_max: 2, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 1, acertos_max: 1, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 0, acertos_max: 0, percentil: 20, classificacao: 'Médio Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Por Escolaridade (Ensino Fundamental)'], normasFundamental, 'escolaridade_fundamental');

    // Tabela por Escolaridade (Ensino Médio)
    const normasMedio = [
      { acertos_min: 24, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 22, acertos_max: 23, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 21, acertos_max: 21, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 20, acertos_max: 20, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 19, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 18, acertos_max: 18, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 17, acertos_max: 17, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 16, acertos_max: 16, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 15, acertos_max: 15, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 14, acertos_max: 14, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 13, acertos_max: 13, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 12, acertos_max: 12, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 11, acertos_max: 11, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 10, acertos_max: 10, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 9, acertos_max: 9, percentil: 20, classificacao: 'Médio Inferior' },
      { acertos_min: 8, acertos_max: 8, percentil: 15, classificacao: 'Médio Inferior' },
      { acertos_min: 7, acertos_max: 7, percentil: 10, classificacao: 'Inferior' },
      { acertos_min: 6, acertos_max: 6, percentil: 5, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 5, percentil: 1, classificacao: 'Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Por Escolaridade (Ensino Médio)'], normasMedio, 'escolaridade_medio');

    // Tabela por Escolaridade (Ensino Superior)
    const normasSuperior = [
      { acertos_min: 24, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 22, acertos_max: 23, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 21, acertos_max: 21, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 20, acertos_max: 20, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 19, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 18, acertos_max: 18, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 17, acertos_max: 17, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 16, acertos_max: 16, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 15, acertos_max: 15, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 14, acertos_max: 14, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 13, acertos_max: 13, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 12, acertos_max: 12, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 11, acertos_max: 11, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 10, acertos_max: 10, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 9, acertos_max: 9, percentil: 20, classificacao: 'Médio Inferior' },
      { acertos_min: 8, acertos_max: 8, percentil: 15, classificacao: 'Médio Inferior' },
      { acertos_min: 7, acertos_max: 7, percentil: 10, classificacao: 'Inferior' },
      { acertos_min: 6, acertos_max: 6, percentil: 5, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 5, percentil: 1, classificacao: 'Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Por Escolaridade (Ensino Superior)'], normasSuperior, 'escolaridade_superior');

    // Tabela Trânsito (Primeira Habilitação)
    const normasTransito1 = [
      { acertos_min: 24, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 22, acertos_max: 23, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 21, acertos_max: 21, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 20, acertos_max: 20, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 19, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 18, acertos_max: 18, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 17, acertos_max: 17, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 16, acertos_max: 16, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 15, acertos_max: 15, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 14, acertos_max: 14, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 13, acertos_max: 13, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 12, acertos_max: 12, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 11, acertos_max: 11, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 10, acertos_max: 10, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 9, acertos_max: 9, percentil: 20, classificacao: 'Médio Inferior' },
      { acertos_min: 8, acertos_max: 8, percentil: 15, classificacao: 'Médio Inferior' },
      { acertos_min: 7, acertos_max: 7, percentil: 10, classificacao: 'Inferior' },
      { acertos_min: 6, acertos_max: 6, percentil: 5, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 5, percentil: 1, classificacao: 'Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Trânsito (Primeira Habilitação)'], normasTransito1, 'transito_primeira_habilitacao');

    // Tabela Trânsito (Renovação/Mudança)
    const normasTransito2 = [
      { acertos_min: 24, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 22, acertos_max: 23, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 21, acertos_max: 21, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 20, acertos_max: 20, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 19, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 18, acertos_max: 18, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 17, acertos_max: 17, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 16, acertos_max: 16, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 15, acertos_max: 15, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 14, acertos_max: 14, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 13, acertos_max: 13, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 12, acertos_max: 12, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 11, acertos_max: 11, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 10, acertos_max: 10, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 9, acertos_max: 9, percentil: 20, classificacao: 'Médio Inferior' },
      { acertos_min: 8, acertos_max: 8, percentil: 15, classificacao: 'Médio Inferior' },
      { acertos_min: 7, acertos_max: 7, percentil: 10, classificacao: 'Inferior' },
      { acertos_min: 6, acertos_max: 6, percentil: 5, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 5, percentil: 1, classificacao: 'Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Trânsito (Renovação/Mudança)'], normasTransito2, 'transito_renovacao_mudanca');

    // Tabela Trânsito (Motoristas Profissionais)
    const normasTransito3 = [
      { acertos_min: 24, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
      { acertos_min: 22, acertos_max: 23, percentil: 90, classificacao: 'Superior' },
      { acertos_min: 21, acertos_max: 21, percentil: 85, classificacao: 'Médio Superior' },
      { acertos_min: 20, acertos_max: 20, percentil: 80, classificacao: 'Médio Superior' },
      { acertos_min: 19, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
      { acertos_min: 18, acertos_max: 18, percentil: 70, classificacao: 'Médio' },
      { acertos_min: 17, acertos_max: 17, percentil: 65, classificacao: 'Médio' },
      { acertos_min: 16, acertos_max: 16, percentil: 60, classificacao: 'Médio' },
      { acertos_min: 15, acertos_max: 15, percentil: 50, classificacao: 'Médio' },
      { acertos_min: 14, acertos_max: 14, percentil: 45, classificacao: 'Médio' },
      { acertos_min: 13, acertos_max: 13, percentil: 40, classificacao: 'Médio' },
      { acertos_min: 12, acertos_max: 12, percentil: 35, classificacao: 'Médio Inferior' },
      { acertos_min: 11, acertos_max: 11, percentil: 30, classificacao: 'Médio Inferior' },
      { acertos_min: 10, acertos_max: 10, percentil: 25, classificacao: 'Médio Inferior' },
      { acertos_min: 9, acertos_max: 9, percentil: 20, classificacao: 'Médio Inferior' },
      { acertos_min: 8, acertos_max: 8, percentil: 15, classificacao: 'Médio Inferior' },
      { acertos_min: 7, acertos_max: 7, percentil: 10, classificacao: 'Inferior' },
      { acertos_min: 6, acertos_max: 6, percentil: 5, classificacao: 'Inferior' },
      { acertos_min: 0, acertos_max: 5, percentil: 1, classificacao: 'Inferior' }
    ];

    await seedNormasMIG(tabelaIds['MIG - Trânsito (Motoristas Profissionais)'], normasTransito3, 'transito_motoristas_profissionais');

    console.log('✅ Seed das normas MIG concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro no seed das normas MIG:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

const seedNormasMIG = async (tabelaId, normas, tipoAvaliacao = 'geral') => {
  for (const norma of normas) {
    await query(`
      INSERT INTO normas_mig (tabela_id, tipo_avaliacao, acertos_min, acertos_max, percentil, classificacao)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tabelaId, tipoAvaliacao, norma.acertos_min, norma.acertos_max, norma.percentil, norma.classificacao]);
  }
};

// Executar o seed
if (require.main === module) {
  seedMIGNormas().catch(console.error);
}

module.exports = { seedMIGNormas };
