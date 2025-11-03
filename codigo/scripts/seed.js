const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  console.log('🌱 Iniciando seed do banco de dados...');

  try {
    // Criar usuário padrão
    const senhaHash = await bcrypt.hash('admin123', 12);
    await query(`
      INSERT INTO usuarios (nome, email, senha_hash) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (email) DO NOTHING
    `, ['Administrador', 'admin@sistema.com', senhaHash]);

    // Criar tabelas normativas
    const tabelasNormativas = [
      { nome: 'AC - Atenção Concentrada', tipo: 'ac', versao: '1.0' },
      { nome: 'BETA-III - Raciocínio Matricial', tipo: 'beta-iii', versao: '1.0' },
      { nome: 'BPA-2 - Atenção', tipo: 'bpa2', versao: '1.0' },
      { nome: 'Rotas de Atenção', tipo: 'rotas', versao: '1.0' },
      { nome: 'MIG - Avaliação Psicológica', tipo: 'mig', versao: '1.0' },
      { nome: 'MVT - Memória Visual para o Trânsito', tipo: 'mvt', versao: '1.0' },
      { nome: 'R-1 - Raciocínio', tipo: 'r1', versao: '1.0' },
      { nome: 'Memore - Memória', tipo: 'memore', versao: '1.0' }
    ];

    for (const tabela of tabelasNormativas) {
      const result = await query(`
        INSERT INTO tabelas_normativas (nome, tipo, versao) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (tipo) DO NOTHING
        RETURNING id
      `, [tabela.nome, tabela.tipo, tabela.versao]);

      if (result.rows.length > 0) {
        const tabelaId = result.rows[0].id;
        await seedNormas(tabela.tipo, tabelaId);
      }
    }

    // Criar estoque inicial
    const testesEstoque = [
      { nome: 'AC - Atenção Concentrada', quantidade: 100, minima: 50 },
      { nome: 'BETA-III - Raciocínio Matricial', quantidade: 80, minima: 40 },
      { nome: 'BPA-2 - Atenção', quantidade: 90, minima: 45 },
      { nome: 'Rotas de Atenção', quantidade: 75, minima: 35 },
      { nome: 'MIG - Avaliação Psicológica', quantidade: 85, minima: 40 },
      { nome: 'MVT - Memória Visual', quantidade: 70, minima: 35 },
      { nome: 'R-1 - Raciocínio', quantidade: 95, minima: 45 },
      { nome: 'Memore - Memória', quantidade: 60, minima: 30 },
      { nome: 'Palográfico', quantidade: 50, minima: 25 }
    ];

    for (const teste of testesEstoque) {
      await query(`
        INSERT INTO testes_estoque (nome_teste, quantidade_atual, quantidade_minima) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (nome_teste) DO NOTHING
      `, [teste.nome, teste.quantidade, teste.minima]);
    }

    console.log('✅ Seed concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  }
};

const seedNormas = async (tipo, tabelaId) => {
  switch (tipo) {
    case 'ac':
      await seedNormasAC(tabelaId);
      break;
    case 'beta-iii':
      await seedNormasBetaIII(tabelaId);
      break;
    case 'bpa2':
      await seedNormasBPA2(tabelaId);
      break;
    case 'rotas':
      await seedNormasRotas(tabelaId);
      break;
    case 'mig':
      await seedNormasMIG(tabelaId);
      break;
    case 'mvt':
      await seedNormasMVT(tabelaId);
      break;
    case 'r1':
      await seedNormasR1(tabelaId);
      break;
    case 'memore':
      await seedNormasMemore(tabelaId);
      break;
  }
};

const seedNormasAC = async (tabelaId) => {
  const normas = [
    { classificacao: 'Superior', percentil: 95, fundamental_min: 16, fundamental_max: 20, medio_min: 18, medio_max: 22, superior_min: 20, superior_max: 24 },
    { classificacao: 'Acima da Média', percentil: 85, fundamental_min: 13, fundamental_max: 15, medio_min: 15, medio_max: 17, superior_min: 17, superior_max: 19 },
    { classificacao: 'Média Superior', percentil: 75, fundamental_min: 11, fundamental_max: 12, medio_min: 13, medio_max: 14, superior_min: 15, superior_max: 16 },
    { classificacao: 'Média', percentil: 50, fundamental_min: 9, fundamental_max: 10, medio_min: 11, medio_max: 12, superior_min: 13, superior_max: 14 },
    { classificacao: 'Média Inferior', percentil: 25, fundamental_min: 7, fundamental_max: 8, medio_min: 9, medio_max: 10, superior_min: 11, superior_max: 12 },
    { classificacao: 'Abaixo da Média', percentil: 15, fundamental_min: 5, fundamental_max: 6, medio_min: 7, medio_max: 8, superior_min: 9, superior_max: 10 },
    { classificacao: 'Inferior', percentil: 5, fundamental_min: 1, fundamental_max: 4, medio_min: 1, medio_max: 6, superior_min: 1, superior_max: 8 }
  ];

  for (const norma of normas) {
    await query(`
      INSERT INTO normas_ac (tabela_id, classificacao, percentil, fundamental_min, fundamental_max, medio_min, medio_max, superior_min, superior_max)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [tabelaId, norma.classificacao, norma.percentil, norma.fundamental_min, norma.fundamental_max, norma.medio_min, norma.medio_max, norma.superior_min, norma.superior_max]);
  }
};

const seedNormasBetaIII = async (tabelaId) => {
  const normas = [
    { acertos_min: 23, acertos_max: 25, percentil: 95, classificacao: 'Superior' },
    { acertos_min: 21, acertos_max: 22, percentil: 85, classificacao: 'Acima da Média' },
    { acertos_min: 19, acertos_max: 20, percentil: 75, classificacao: 'Média Superior' },
    { acertos_min: 16, acertos_max: 18, percentil: 50, classificacao: 'Média' },
    { acertos_min: 13, acertos_max: 15, percentil: 25, classificacao: 'Média Inferior' },
    { acertos_min: 10, acertos_max: 12, percentil: 15, classificacao: 'Abaixo da Média' },
    { acertos_min: 0, acertos_max: 9, percentil: 5, classificacao: 'Inferior' }
  ];

  for (const norma of normas) {
    await query(`
      INSERT INTO normas_beta_iii (tabela_id, acertos_min, acertos_max, percentil, classificacao)
      VALUES ($1, $2, $3, $4, $5)
    `, [tabelaId, norma.acertos_min, norma.acertos_max, norma.percentil, norma.classificacao]);
  }
};

const seedNormasBPA2 = async (tabelaId) => {
  // Normas para atenção concentrada por idade
  const normasConcentradaIdade = [
    { tipo_atencao: 'concentrada', criterio: 'idade', valor_criterio: '18-25', pontos_min: 16, pontos_max: 20, percentil: 95, classificacao: 'Superior' },
    { tipo_atencao: 'concentrada', criterio: 'idade', valor_criterio: '18-25', pontos_min: 13, pontos_max: 15, percentil: 85, classificacao: 'Acima da Média' },
    { tipo_atencao: 'concentrada', criterio: 'idade', valor_criterio: '18-25', pontos_min: 10, pontos_max: 12, percentil: 50, classificacao: 'Média' },
    { tipo_atencao: 'concentrada', criterio: 'idade', valor_criterio: '18-25', pontos_min: 7, pontos_max: 9, percentil: 25, classificacao: 'Média Inferior' },
    { tipo_atencao: 'concentrada', criterio: 'idade', valor_criterio: '18-25', pontos_min: 0, pontos_max: 6, percentil: 5, classificacao: 'Inferior' }
  ];

  for (const norma of normasConcentradaIdade) {
    await query(`
      INSERT INTO normas_bpa2 (tabela_id, tipo_atencao, criterio, valor_criterio, pontos_min, pontos_max, percentil, classificacao)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [tabelaId, norma.tipo_atencao, norma.criterio, norma.valor_criterio, norma.pontos_min, norma.pontos_max, norma.percentil, norma.classificacao]);
  }
};

const seedNormasRotas = async (tabelaId) => {
  const normas = [
    { rota_tipo: 'c', pontos_min: 16, pontos_max: 20, percentil: 95, classificacao: 'Superior' },
    { rota_tipo: 'c', pontos_min: 13, pontos_max: 15, percentil: 85, classificacao: 'Acima da Média' },
    { rota_tipo: 'c', pontos_min: 10, pontos_max: 12, percentil: 50, classificacao: 'Média' },
    { rota_tipo: 'c', pontos_min: 7, pontos_max: 9, percentil: 25, classificacao: 'Média Inferior' },
    { rota_tipo: 'c', pontos_min: 0, pontos_max: 6, percentil: 5, classificacao: 'Inferior' },
    { rota_tipo: 'a', pontos_min: 14, pontos_max: 18, percentil: 95, classificacao: 'Superior' },
    { rota_tipo: 'a', pontos_min: 11, pontos_max: 13, percentil: 85, classificacao: 'Acima da Média' },
    { rota_tipo: 'a', pontos_min: 8, pontos_max: 10, percentil: 50, classificacao: 'Média' },
    { rota_tipo: 'a', pontos_min: 5, pontos_max: 7, percentil: 25, classificacao: 'Média Inferior' },
    { rota_tipo: 'a', pontos_min: 0, pontos_max: 4, percentil: 5, classificacao: 'Inferior' },
    { rota_tipo: 'd', pontos_min: 12, pontos_max: 16, percentil: 95, classificacao: 'Superior' },
    { rota_tipo: 'd', pontos_min: 9, pontos_max: 11, percentil: 85, classificacao: 'Acima da Média' },
    { rota_tipo: 'd', pontos_min: 6, pontos_max: 8, percentil: 50, classificacao: 'Média' },
    { rota_tipo: 'd', pontos_min: 3, pontos_max: 5, percentil: 25, classificacao: 'Média Inferior' },
    { rota_tipo: 'd', pontos_min: 0, pontos_max: 2, percentil: 5, classificacao: 'Inferior' }
  ];

  for (const norma of normas) {
    await query(`
      INSERT INTO normas_rotas (tabela_id, rota_tipo, pontos_min, pontos_max, percentil, classificacao)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tabelaId, norma.rota_tipo, norma.pontos_min, norma.pontos_max, norma.percentil, norma.classificacao]);
  }
};

const seedNormasMIG = async (tabelaId) => {
  const normas = [
    { tipo_avaliacao: 'primeiraHabilitacao', acertos_min: 25, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
    { tipo_avaliacao: 'primeiraHabilitacao', acertos_min: 22, acertos_max: 24, percentil: 85, classificacao: 'Acima da Média' },
    { tipo_avaliacao: 'primeiraHabilitacao', acertos_min: 19, acertos_max: 21, percentil: 50, classificacao: 'Média' },
    { tipo_avaliacao: 'primeiraHabilitacao', acertos_min: 16, acertos_max: 18, percentil: 25, classificacao: 'Média Inferior' },
    { tipo_avaliacao: 'primeiraHabilitacao', acertos_min: 0, acertos_max: 15, percentil: 5, classificacao: 'Inferior' },
    { tipo_avaliacao: 'renovacaoMudanca', acertos_min: 23, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
    { tipo_avaliacao: 'renovacaoMudanca', acertos_min: 20, acertos_max: 22, percentil: 85, classificacao: 'Acima da Média' },
    { tipo_avaliacao: 'renovacaoMudanca', acertos_min: 17, acertos_max: 19, percentil: 50, classificacao: 'Média' },
    { tipo_avaliacao: 'renovacaoMudanca', acertos_min: 14, acertos_max: 16, percentil: 25, classificacao: 'Média Inferior' },
    { tipo_avaliacao: 'renovacaoMudanca', acertos_min: 0, acertos_max: 13, percentil: 5, classificacao: 'Inferior' },
    { tipo_avaliacao: 'motoristaProfissional', acertos_min: 26, acertos_max: 28, percentil: 95, classificacao: 'Superior' },
    { tipo_avaliacao: 'motoristaProfissional', acertos_min: 23, acertos_max: 25, percentil: 85, classificacao: 'Acima da Média' },
    { tipo_avaliacao: 'motoristaProfissional', acertos_min: 20, acertos_max: 22, percentil: 50, classificacao: 'Média' },
    { tipo_avaliacao: 'motoristaProfissional', acertos_min: 17, acertos_max: 19, percentil: 25, classificacao: 'Média Inferior' },
    { tipo_avaliacao: 'motoristaProfissional', acertos_min: 0, acertos_max: 16, percentil: 5, classificacao: 'Inferior' }
  ];

  for (const norma of normas) {
    await query(`
      INSERT INTO normas_mig (tabela_id, tipo_avaliacao, acertos_min, acertos_max, percentil, classificacao)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tabelaId, norma.tipo_avaliacao, norma.acertos_min, norma.acertos_max, norma.percentil, norma.classificacao]);
  }
};

const seedNormasMVT = async (tabelaId) => {
  const normas = [
    { tipo_cnh: '1ª Habilitação', resultado_min: 85.0, resultado_max: 100.0, percentil: 95, classificacao: 'Superior' },
    { tipo_cnh: '1ª Habilitação', resultado_min: 75.0, resultado_max: 84.9, percentil: 85, classificacao: 'Acima da Média' },
    { tipo_cnh: '1ª Habilitação', resultado_min: 60.0, resultado_max: 74.9, percentil: 50, classificacao: 'Média' },
    { tipo_cnh: '1ª Habilitação', resultado_min: 45.0, resultado_max: 59.9, percentil: 25, classificacao: 'Média Inferior' },
    { tipo_cnh: '1ª Habilitação', resultado_min: 0.0, resultado_max: 44.9, percentil: 5, classificacao: 'Inferior' },
    { tipo_cnh: 'Renovação/Mudança', resultado_min: 90.0, resultado_max: 100.0, percentil: 95, classificacao: 'Superior' },
    { tipo_cnh: 'Renovação/Mudança', resultado_min: 80.0, resultado_max: 89.9, percentil: 85, classificacao: 'Acima da Média' },
    { tipo_cnh: 'Renovação/Mudança', resultado_min: 65.0, resultado_max: 79.9, percentil: 50, classificacao: 'Média' },
    { tipo_cnh: 'Renovação/Mudança', resultado_min: 50.0, resultado_max: 64.9, percentil: 25, classificacao: 'Média Inferior' },
    { tipo_cnh: 'Renovação/Mudança', resultado_min: 0.0, resultado_max: 49.9, percentil: 5, classificacao: 'Inferior' },
    { tipo_cnh: 'Motorista Profissional', resultado_min: 95.0, resultado_max: 100.0, percentil: 95, classificacao: 'Superior' },
    { tipo_cnh: 'Motorista Profissional', resultado_min: 85.0, resultado_max: 94.9, percentil: 85, classificacao: 'Acima da Média' },
    { tipo_cnh: 'Motorista Profissional', resultado_min: 70.0, resultado_max: 84.9, percentil: 50, classificacao: 'Média' },
    { tipo_cnh: 'Motorista Profissional', resultado_min: 55.0, resultado_max: 69.9, percentil: 25, classificacao: 'Média Inferior' },
    { tipo_cnh: 'Motorista Profissional', resultado_min: 0.0, resultado_max: 54.9, percentil: 5, classificacao: 'Inferior' }
  ];

  for (const norma of normas) {
    await query(`
      INSERT INTO normas_mvt (tabela_id, tipo_cnh, resultado_min, resultado_max, percentil, classificacao)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tabelaId, norma.tipo_cnh, norma.resultado_min, norma.resultado_max, norma.percentil, norma.classificacao]);
  }
};

const seedNormasR1 = async (tabelaId) => {
  const normas = [
    { escolaridade: 'Ensino Fundamental', acertos_min: 28, acertos_max: 40, percentil: 95, classificacao: 'Superior' },
    { escolaridade: 'Ensino Fundamental', acertos_min: 24, acertos_max: 27, percentil: 85, classificacao: 'Acima da Média' },
    { escolaridade: 'Ensino Fundamental', acertos_min: 20, acertos_max: 23, percentil: 50, classificacao: 'Média' },
    { escolaridade: 'Ensino Fundamental', acertos_min: 16, acertos_max: 19, percentil: 25, classificacao: 'Média Inferior' },
    { escolaridade: 'Ensino Fundamental', acertos_min: 0, acertos_max: 15, percentil: 5, classificacao: 'Inferior' },
    { escolaridade: 'Ensino Médio', acertos_min: 32, acertos_max: 40, percentil: 95, classificacao: 'Superior' },
    { escolaridade: 'Ensino Médio', acertos_min: 28, acertos_max: 31, percentil: 85, classificacao: 'Acima da Média' },
    { escolaridade: 'Ensino Médio', acertos_min: 24, acertos_max: 27, percentil: 50, classificacao: 'Média' },
    { escolaridade: 'Ensino Médio', acertos_min: 20, acertos_max: 23, percentil: 25, classificacao: 'Média Inferior' },
    { escolaridade: 'Ensino Médio', acertos_min: 0, acertos_max: 19, percentil: 5, classificacao: 'Inferior' },
    { escolaridade: 'Ensino Superior', acertos_min: 35, acertos_max: 40, percentil: 95, classificacao: 'Superior' },
    { escolaridade: 'Ensino Superior', acertos_min: 31, acertos_max: 34, percentil: 85, classificacao: 'Acima da Média' },
    { escolaridade: 'Ensino Superior', acertos_min: 27, acertos_max: 30, percentil: 50, classificacao: 'Média' },
    { escolaridade: 'Ensino Superior', acertos_min: 23, acertos_max: 26, percentil: 25, classificacao: 'Média Inferior' },
    { escolaridade: 'Ensino Superior', acertos_min: 0, acertos_max: 22, percentil: 5, classificacao: 'Inferior' }
  ];

  for (const norma of normas) {
    await query(`
      INSERT INTO normas_r1 (tabela_id, escolaridade, acertos_min, acertos_max, percentil, classificacao)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tabelaId, norma.escolaridade, norma.acertos_min, norma.acertos_max, norma.percentil, norma.classificacao]);
  }
};

const seedNormasMemore = async (tabelaId) => {
  const normas = [
    { resultado_min: 16, resultado_max: 24, percentil: 95, classificacao: 'Superior' },
    { resultado_min: 12, resultado_max: 15, percentil: 85, classificacao: 'Acima da Média' },
    { resultado_min: 8, resultado_max: 11, percentil: 50, classificacao: 'Média' },
    { resultado_min: 4, resultado_max: 7, percentil: 25, classificacao: 'Média Inferior' },
    { resultado_min: 0, resultado_max: 3, percentil: 5, classificacao: 'Inferior' }
  ];

  for (const norma of normas) {
    await query(`
      INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao)
      VALUES ($1, $2, $3, $4, $5)
    `, [tabelaId, norma.resultado_min, norma.resultado_max, norma.percentil, norma.classificacao]);
  }
};

if (require.main === module) {
  seedData().then(() => {
    console.log('🎉 Seed concluído!');
    process.exit(0);
  });
}

module.exports = { seedData };
