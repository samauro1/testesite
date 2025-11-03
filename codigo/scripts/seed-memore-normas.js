const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sistema_avaliacao_psicologica',
  user: 'postgres',
  password: 'password'
});

async function seedMemoreNormas() {
  try {
    console.log('🌱 Iniciando seed das normas MEMORE...');

    // 1. Criar tabelas normativas para MEMORE
    const tabelasMemore = [
      {
        nome: 'MEMORE - Trânsito - Escolaridade',
        tipo: 'memore',
        versao: '1.0',
        criterio: 'Escolaridade',
        descricao: 'Tabela normativa para MEMORE baseada em escolaridade para contexto de trânsito',
        ativa: true
      },
      {
        nome: 'MEMORE - Trânsito - Idade',
        tipo: 'memore',
        versao: '1.0',
        criterio: 'Idade',
        descricao: 'Tabela normativa para MEMORE baseada em idade para contexto de trânsito',
        ativa: true
      },
      {
        nome: 'MEMORE - São Paulo - Escolaridade',
        tipo: 'memore',
        versao: '1.0',
        criterio: 'Escolaridade',
        descricao: 'Tabela normativa para MEMORE baseada em escolaridade para São Paulo',
        ativa: true
      },
      {
        nome: 'MEMORE - São Paulo - Idade',
        tipo: 'memore',
        versao: '1.0',
        criterio: 'Idade',
        descricao: 'Tabela normativa para MEMORE baseada em idade para São Paulo',
        ativa: true
      },
      {
        nome: 'MEMORE - Região Sudeste - Escolaridade',
        tipo: 'memore',
        versao: '1.0',
        criterio: 'Escolaridade',
        descricao: 'Tabela normativa para MEMORE baseada em escolaridade para Região Sudeste',
        ativa: true
      },
      {
        nome: 'MEMORE - Região Sudeste - Idade',
        tipo: 'memore',
        versao: '1.0',
        criterio: 'Idade',
        descricao: 'Tabela normativa para MEMORE baseada em idade para Região Sudeste',
        ativa: true
      },
      {
        nome: 'MEMORE - Brasil - Escolaridade',
        tipo: 'memore',
        versao: '1.0',
        criterio: 'Escolaridade',
        descricao: 'Tabela normativa para MEMORE baseada em escolaridade para Brasil',
        ativa: true
      },
      {
        nome: 'MEMORE - Brasil - Idade',
        tipo: 'memore',
        versao: '1.0',
        criterio: 'Idade',
        descricao: 'Tabela normativa para MEMORE baseada em idade para Brasil',
        ativa: true
      }
    ];

    // Inserir tabelas normativas
    for (const tabela of tabelasMemore) {
      const result = await pool.query(`
        INSERT INTO tabelas_normativas (nome, tipo, versao, criterio, descricao, ativa, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `, [tabela.nome, tabela.tipo, tabela.versao, tabela.criterio, tabela.descricao, tabela.ativa]);
      
      const tabelaId = result.rows[0].id;
      console.log(`✅ Tabela criada: ${tabela.nome} (ID: ${tabelaId})`);

      // 2. Criar normas para cada tabela
      await seedNormasMemore(tabelaId, tabela.criterio, tabela.nome);
    }

    console.log('🎉 Seed das normas MEMORE concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro no seed das normas MEMORE:', error);
  } finally {
    await pool.end();
  }
}

async function seedNormasMemore(tabelaId, criterio, nomeTabela) {
  console.log(`📊 Criando normas para ${nomeTabela}...`);

  // Dados normativos fictícios para MEMORE baseados em EB (Eficiência Bruta)
  // EB = (VP + VN) - (FN + FP)
  // Faixas de EB: -24 a +24 (baseado em 24 itens de teste)
  
  const normas = [];

  if (criterio === 'Escolaridade') {
    // Normas por escolaridade
    const escolaridades = ['Fundamental', 'Médio', 'Superior'];
    
    for (const escolaridade of escolaridades) {
      // Percentis para cada escolaridade
      const percentis = [
        { percentil: 5, classificacao: 'Inferior', eb_min: -24, eb_max: -10 },
        { percentil: 10, classificacao: 'Inferior', eb_min: -9, eb_max: -5 },
        { percentil: 15, classificacao: 'Inferior', eb_min: -4, eb_max: -2 },
        { percentil: 20, classificacao: 'Médio Inferior', eb_min: -1, eb_max: 1 },
        { percentil: 25, classificacao: 'Médio Inferior', eb_min: 2, eb_max: 4 },
        { percentil: 30, classificacao: 'Médio Inferior', eb_min: 5, eb_max: 7 },
        { percentil: 35, classificacao: 'Médio', eb_min: 8, eb_max: 10 },
        { percentil: 40, classificacao: 'Médio', eb_min: 11, eb_max: 13 },
        { percentil: 45, classificacao: 'Médio', eb_min: 14, eb_max: 16 },
        { percentil: 50, classificacao: 'Médio', eb_min: 17, eb_max: 19 },
        { percentil: 55, classificacao: 'Médio Superior', eb_min: 20, eb_max: 22 },
        { percentil: 60, classificacao: 'Médio Superior', eb_min: 23, eb_max: 24 },
        { percentil: 65, classificacao: 'Médio Superior', eb_min: 25, eb_max: 26 },
        { percentil: 70, classificacao: 'Superior', eb_min: 27, eb_max: 28 },
        { percentil: 75, classificacao: 'Superior', eb_min: 29, eb_max: 30 },
        { percentil: 80, classificacao: 'Superior', eb_min: 31, eb_max: 32 },
        { percentil: 85, classificacao: 'Superior', eb_min: 33, eb_max: 34 },
        { percentil: 90, classificacao: 'Superior', eb_min: 35, eb_max: 36 },
        { percentil: 95, classificacao: 'Superior', eb_min: 37, eb_max: 40 }
      ];

      for (const norma of percentis) {
        normas.push({
          tabela_id: tabelaId,
          escolaridade: escolaridade,
          eb_min: norma.eb_min,
          eb_max: norma.eb_max,
          percentil: norma.percentil,
          classificacao: norma.classificacao
        });
      }
    }
  } else if (criterio === 'Idade') {
    // Normas por idade
    const faixasIdade = [
      { idade_min: 16, idade_max: 25, label: '16-25' },
      { idade_min: 26, idade_max: 35, label: '26-35' },
      { idade_min: 36, idade_max: 45, label: '36-45' },
      { idade_min: 46, idade_max: 55, label: '46-55' },
      { idade_min: 56, idade_max: 65, label: '56-65' },
      { idade_min: 66, idade_max: 75, label: '66-75' },
      { idade_min: 76, idade_max: 100, label: '76+' }
    ];

    for (const faixa of faixasIdade) {
      // Percentis para cada faixa etária
      const percentis = [
        { percentil: 5, classificacao: 'Inferior', eb_min: -24, eb_max: -10 },
        { percentil: 10, classificacao: 'Inferior', eb_min: -9, eb_max: -5 },
        { percentil: 15, classificacao: 'Inferior', eb_min: -4, eb_max: -2 },
        { percentil: 20, classificacao: 'Médio Inferior', eb_min: -1, eb_max: 1 },
        { percentil: 25, classificacao: 'Médio Inferior', eb_min: 2, eb_max: 4 },
        { percentil: 30, classificacao: 'Médio Inferior', eb_min: 5, eb_max: 7 },
        { percentil: 35, classificacao: 'Médio', eb_min: 8, eb_max: 10 },
        { percentil: 40, classificacao: 'Médio', eb_min: 11, eb_max: 13 },
        { percentil: 45, classificacao: 'Médio', eb_min: 14, eb_max: 16 },
        { percentil: 50, classificacao: 'Médio', eb_min: 17, eb_max: 19 },
        { percentil: 55, classificacao: 'Médio Superior', eb_min: 20, eb_max: 22 },
        { percentil: 60, classificacao: 'Médio Superior', eb_min: 23, eb_max: 24 },
        { percentil: 65, classificacao: 'Médio Superior', eb_min: 25, eb_max: 26 },
        { percentil: 70, classificacao: 'Superior', eb_min: 27, eb_max: 28 },
        { percentil: 75, classificacao: 'Superior', eb_min: 29, eb_max: 30 },
        { percentil: 80, classificacao: 'Superior', eb_min: 31, eb_max: 32 },
        { percentil: 85, classificacao: 'Superior', eb_min: 33, eb_max: 34 },
        { percentil: 90, classificacao: 'Superior', eb_min: 35, eb_max: 36 },
        { percentil: 95, classificacao: 'Superior', eb_min: 37, eb_max: 40 }
      ];

      for (const norma of percentis) {
        normas.push({
          tabela_id: tabelaId,
          idade_min: faixa.idade_min,
          idade_max: faixa.idade_max,
          eb_min: norma.eb_min,
          eb_max: norma.eb_max,
          percentil: norma.percentil,
          classificacao: norma.classificacao
        });
      }
    }
  }

  // Inserir normas no banco
  for (const norma of normas) {
    const campos = Object.keys(norma).filter(key => key !== 'tabela_id');
    const valores = Object.values(norma).filter((_, i) => i !== 0);
    const placeholders = campos.map((_, i) => `$${i + 2}`).join(', ');
    
    await pool.query(`
      INSERT INTO normas_memore (tabela_id, ${campos.join(', ')}, created_at)
      VALUES ($1, ${placeholders}, NOW())
    `, [tabelaId, ...valores]);
  }

  console.log(`✅ ${normas.length} normas criadas para ${nomeTabela}`);
}

// Executar seed
seedMemoreNormas();
