const { query } = require('../config/database');

async function seedRotas2Normas() {
  try {
    console.log('🌱 Iniciando seed das tabelas normativas ROTAS-2...');
    
    // 1. Tabela Geral (Amostra Total)
    await insertTabelaNormativa(
      'ROTAS-2 - População Brasileira (Amostra Total)',
      'rotas',
      'Geral',
      'Normas estatísticas da Bateria ROTAS-2 para a População Brasileira (N = 22.333)'
    );

    // 2. Tabelas por Faixa Etária
    const faixasEtarias = [
      { nome: 'ROTAS-2 - Faixa Etária 16-23 anos', criterio: 'Idade', valor: '16-23' },
      { nome: 'ROTAS-2 - Faixa Etária 24-31 anos', criterio: 'Idade', valor: '24-31' },
      { nome: 'ROTAS-2 - Faixa Etária 32-39 anos', criterio: 'Idade', valor: '32-39' },
      { nome: 'ROTAS-2 - Faixa Etária 40-47 anos', criterio: 'Idade', valor: '40-47' },
      { nome: 'ROTAS-2 - Faixa Etária 48-55 anos', criterio: 'Idade', valor: '48-55' },
      { nome: 'ROTAS-2 - Faixa Etária 56-63 anos', criterio: 'Idade', valor: '56-63' },
      { nome: 'ROTAS-2 - Faixa Etária 64-71 anos', criterio: 'Idade', valor: '64-71' },
      { nome: 'ROTAS-2 - Faixa Etária 72-92 anos', criterio: 'Idade', valor: '72-92' }
    ];

    for (const faixa of faixasEtarias) {
      await insertTabelaNormativa(faixa.nome, 'rotas', faixa.criterio, `Normas para faixa etária ${faixa.valor} anos`);
    }

    // 3. Tabelas por Escolaridade
    const escolaridades = [
      { nome: 'ROTAS-2 - Ensino Fundamental', criterio: 'Escolaridade', valor: 'Fundamental' },
      { nome: 'ROTAS-2 - Ensino Médio', criterio: 'Escolaridade', valor: 'Médio' },
      { nome: 'ROTAS-2 - Ensino Superior', criterio: 'Escolaridade', valor: 'Superior' }
    ];

    for (const escolaridade of escolaridades) {
      await insertTabelaNormativa(escolaridade.nome, 'rotas', escolaridade.criterio, `Normas para ${escolaridade.valor}`);
    }

    // 4. Tabelas por Região
    const regioes = [
      { nome: 'ROTAS-2 - Região Centro-Oeste', criterio: 'Região', valor: 'Centro-Oeste' },
      { nome: 'ROTAS-2 - Região Nordeste', criterio: 'Região', valor: 'Nordeste' },
      { nome: 'ROTAS-2 - Região Norte', criterio: 'Região', valor: 'Norte' },
      { nome: 'ROTAS-2 - Região Sudeste', criterio: 'Região', valor: 'Sudeste' },
      { nome: 'ROTAS-2 - Região Sul', criterio: 'Região', valor: 'Sul' }
    ];

    for (const regiao of regioes) {
      await insertTabelaNormativa(regiao.nome, 'rotas', regiao.criterio, `Normas para ${regiao.valor}`);
    }

    // 5. Tabelas por Estado
    const estados = [
      { nome: 'ROTAS-2 - Bahia', criterio: 'Estado', valor: 'BA' },
      { nome: 'ROTAS-2 - Ceará', criterio: 'Estado', valor: 'CE' },
      { nome: 'ROTAS-2 - Mato Grosso', criterio: 'Estado', valor: 'MT' },
      { nome: 'ROTAS-2 - Minas Gerais', criterio: 'Estado', valor: 'MG' },
      { nome: 'ROTAS-2 - Paraná', criterio: 'Estado', valor: 'PR' },
      { nome: 'ROTAS-2 - Pernambuco', criterio: 'Estado', valor: 'PE' },
      { nome: 'ROTAS-2 - Rio de Janeiro', criterio: 'Estado', valor: 'RJ' },
      { nome: 'ROTAS-2 - Rio Grande do Sul', criterio: 'Estado', valor: 'RS' },
      { nome: 'ROTAS-2 - Santa Catarina', criterio: 'Estado', valor: 'SC' },
      { nome: 'ROTAS-2 - São Paulo', criterio: 'Estado', valor: 'SP' }
    ];

    for (const estado of estados) {
      await insertTabelaNormativa(estado.nome, 'rotas', estado.criterio, `Normas para ${estado.valor}`);
    }

    // 6. Tabelas para Contextos Específicos
    const contextos = [
      { nome: 'ROTAS-2 - 1ª Habilitação CNH (Geral)', criterio: 'Contexto', valor: '1ª Habilitação' },
      { nome: 'ROTAS-2 - 1ª Habilitação CNH (18-29 anos)', criterio: 'Contexto', valor: '1ª Habilitação 18-29' },
      { nome: 'ROTAS-2 - 1ª Habilitação CNH (30-59 anos)', criterio: 'Contexto', valor: '1ª Habilitação 30-59' },
      { nome: 'ROTAS-2 - 1ª Habilitação CNH (60-92 anos)', criterio: 'Contexto', valor: '1ª Habilitação 60-92' },
      { nome: 'ROTAS-2 - Motoristas Profissionais (Geral)', criterio: 'Contexto', valor: 'Motoristas Profissionais' },
      { nome: 'ROTAS-2 - Motoristas Profissionais (18-29 anos)', criterio: 'Contexto', valor: 'Motoristas Profissionais 18-29' },
      { nome: 'ROTAS-2 - Motoristas Profissionais (30-59 anos)', criterio: 'Contexto', valor: 'Motoristas Profissionais 30-59' },
      { nome: 'ROTAS-2 - Motoristas Profissionais (60-92 anos)', criterio: 'Contexto', valor: 'Motoristas Profissionais 60-92' },
      { nome: 'ROTAS-2 - Renovação/Mudança CNH (Geral)', criterio: 'Contexto', valor: 'Renovação CNH' },
      { nome: 'ROTAS-2 - Renovação/Mudança CNH (18-29 anos)', criterio: 'Contexto', valor: 'Renovação CNH 18-29' },
      { nome: 'ROTAS-2 - Renovação/Mudança CNH (30-59 anos)', criterio: 'Contexto', valor: 'Renovação CNH 30-59' },
      { nome: 'ROTAS-2 - Renovação/Mudança CNH (60-92 anos)', criterio: 'Contexto', valor: 'Renovação CNH 60-92' },
      { nome: 'ROTAS-2 - Posse/Porte de Arma (Geral)', criterio: 'Contexto', valor: 'Posse/Porte Arma' },
      { nome: 'ROTAS-2 - Posse/Porte de Arma (18-29 anos)', criterio: 'Contexto', valor: 'Posse/Porte Arma 18-29' },
      { nome: 'ROTAS-2 - Posse/Porte de Arma (30-59 anos)', criterio: 'Contexto', valor: 'Posse/Porte Arma 30-59' },
      { nome: 'ROTAS-2 - Posse/Porte de Arma (60-92 anos)', criterio: 'Contexto', valor: 'Posse/Porte Arma 60-92' },
      { nome: 'ROTAS-2 - Riscos Psicossociais Trabalho', criterio: 'Contexto', valor: 'Riscos Psicossociais' }
    ];

    for (const contexto of contextos) {
      await insertTabelaNormativa(contexto.nome, 'rotas', contexto.criterio, `Normas para ${contexto.valor}`);
    }

    console.log('✅ Seed das tabelas normativas ROTAS-2 concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  }
}

async function insertTabelaNormativa(nome, tipo, criterio, descricao) {
  try {
    // Verificar se a tabela já existe
    const existingTable = await query(
      'SELECT id FROM tabelas_normativas WHERE nome = $1',
      [nome]
    );

    let tabelaId;
    
    if (existingTable.rows.length > 0) {
      // Atualizar tabela existente
      tabelaId = existingTable.rows[0].id;
      await query(
        'UPDATE tabelas_normativas SET criterio = $1, descricao = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [criterio, descricao, tabelaId]
      );
      console.log(`📝 Tabela atualizada: ${nome}`);
    } else {
      // Inserir nova tabela
      const result = await query(
        'INSERT INTO tabelas_normativas (nome, tipo, criterio, descricao) VALUES ($1, $2, $3, $4) RETURNING id',
        [nome, tipo, criterio, descricao]
      );
      tabelaId = result.rows[0].id;
      console.log(`➕ Nova tabela criada: ${nome}`);
    }

    // Inserir normas para cada tipo de rota
    await insertNormasRotas(tabelaId, nome);
    
  } catch (error) {
    console.error(`❌ Erro ao inserir tabela ${nome}:`, error);
    throw error;
  }
}

async function insertNormasRotas(tabelaId, nomeTabela) {
  // Dados das normas baseados nas tabelas fornecidas
  const normasData = getNormasData(nomeTabela);
  
  if (!normasData) {
    console.log(`⚠️ Dados não encontrados para ${nomeTabela}`);
    return;
  }

  // Limpar normas existentes para esta tabela
  await query('DELETE FROM normas_rotas WHERE tabela_id = $1', [tabelaId]);

  // Inserir novas normas
  for (const norma of normasData) {
    await query(
      `INSERT INTO normas_rotas (tabela_id, rota_tipo, pontos_min, pontos_max, percentil, classificacao) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tabelaId, norma.rota_tipo, norma.pontos_min, norma.pontos_max, norma.percentil, norma.classificacao]
    );
  }

  console.log(`📊 ${normasData.length} normas inseridas para ${nomeTabela}`);
}

function getNormasData(nomeTabela) {
  // Dados específicos para Riscos Psicossociais Trabalho
  if (nomeTabela.includes('Riscos Psicossociais')) {
    return [
      // Rota A (Alternada) - ranges mais restritivos para riscos psicossociais
      { rota_tipo: 'A', pontos_min: 0, pontos_max: 89, percentil: 5, classificacao: 'Inferior' },
      { rota_tipo: 'A', pontos_min: 90, pontos_max: 99, percentil: 10, classificacao: 'Inferior' },
      { rota_tipo: 'A', pontos_min: 100, pontos_max: 109, percentil: 15, classificacao: 'Inferior' },
      { rota_tipo: 'A', pontos_min: 110, pontos_max: 119, percentil: 20, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 120, pontos_max: 129, percentil: 25, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 130, pontos_max: 139, percentil: 30, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 140, pontos_max: 149, percentil: 35, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 150, pontos_max: 159, percentil: 40, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 160, pontos_max: 169, percentil: 45, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 170, pontos_max: 179, percentil: 50, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 180, pontos_max: 189, percentil: 55, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 190, pontos_max: 199, percentil: 60, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 200, pontos_max: 209, percentil: 65, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 210, pontos_max: 219, percentil: 70, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 220, pontos_max: 229, percentil: 75, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 230, pontos_max: 239, percentil: 80, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 240, pontos_max: 249, percentil: 85, classificacao: 'Superior' },
      { rota_tipo: 'A', pontos_min: 250, pontos_max: 259, percentil: 90, classificacao: 'Superior' },
      { rota_tipo: 'A', pontos_min: 260, pontos_max: 999, percentil: 95, classificacao: 'Superior' },
      
      // Rota D (Dividida) - ranges mais restritivos para riscos psicossociais
      { rota_tipo: 'D', pontos_min: 0, pontos_max: 79, percentil: 5, classificacao: 'Inferior' },
      { rota_tipo: 'D', pontos_min: 80, pontos_max: 89, percentil: 10, classificacao: 'Inferior' },
      { rota_tipo: 'D', pontos_min: 90, pontos_max: 99, percentil: 15, classificacao: 'Inferior' },
      { rota_tipo: 'D', pontos_min: 100, pontos_max: 105, percentil: 20, classificacao: 'Médio Inferior' },
      { rota_tipo: 'D', pontos_min: 106, pontos_max: 111, percentil: 40, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 112, pontos_max: 117, percentil: 45, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 118, pontos_max: 123, percentil: 50, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 124, pontos_max: 129, percentil: 55, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 130, pontos_max: 135, percentil: 60, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 136, pontos_max: 141, percentil: 65, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 142, pontos_max: 147, percentil: 70, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 148, pontos_max: 153, percentil: 75, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 154, pontos_max: 159, percentil: 80, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 160, pontos_max: 165, percentil: 85, classificacao: 'Superior' },
      { rota_tipo: 'D', pontos_min: 166, pontos_max: 171, percentil: 90, classificacao: 'Superior' },
      { rota_tipo: 'D', pontos_min: 172, pontos_max: 177, percentil: 95, classificacao: 'Superior' },
      { rota_tipo: 'D', pontos_min: 178, pontos_max: 999, percentil: 95, classificacao: 'Superior' },
      
      // Rota C (Concentrada) - ranges mais restritivos para riscos psicossociais
      { rota_tipo: 'C', pontos_min: 0, pontos_max: 119, percentil: 5, classificacao: 'Inferior' },
      { rota_tipo: 'C', pontos_min: 120, pontos_max: 129, percentil: 10, classificacao: 'Inferior' },
      { rota_tipo: 'C', pontos_min: 130, pontos_max: 139, percentil: 15, classificacao: 'Inferior' },
      { rota_tipo: 'C', pontos_min: 140, pontos_max: 147, percentil: 20, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 148, pontos_max: 155, percentil: 25, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 156, pontos_max: 163, percentil: 30, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 164, pontos_max: 171, percentil: 35, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 172, pontos_max: 179, percentil: 40, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 180, pontos_max: 187, percentil: 45, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 188, pontos_max: 195, percentil: 50, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 196, pontos_max: 203, percentil: 55, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 204, pontos_max: 211, percentil: 60, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 212, pontos_max: 219, percentil: 65, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 220, pontos_max: 227, percentil: 70, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 228, pontos_max: 235, percentil: 75, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 236, pontos_max: 243, percentil: 80, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 244, pontos_max: 251, percentil: 85, classificacao: 'Superior' },
      { rota_tipo: 'C', pontos_min: 252, pontos_max: 259, percentil: 90, classificacao: 'Superior' },
      { rota_tipo: 'C', pontos_min: 260, pontos_max: 999, percentil: 95, classificacao: 'Superior' }
    ];
  } else {
    // Dados da tabela geral (amostra total) - usar dados detalhados para outras tabelas
    return [
      // Rota C (Concentrada) - usando ranges baseados na tabela geral
      { rota_tipo: 'C', pontos_min: 0, pontos_max: 84, percentil: 5, classificacao: 'Inferior' },
      { rota_tipo: 'C', pontos_min: 85, pontos_max: 98, percentil: 10, classificacao: 'Inferior' },
      { rota_tipo: 'C', pontos_min: 99, pontos_max: 106, percentil: 15, classificacao: 'Inferior' },
      { rota_tipo: 'C', pontos_min: 107, pontos_max: 114, percentil: 20, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 115, pontos_max: 120, percentil: 25, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 121, pontos_max: 126, percentil: 30, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 127, pontos_max: 131, percentil: 35, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 132, pontos_max: 135, percentil: 40, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 136, pontos_max: 142, percentil: 45, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 143, pontos_max: 146, percentil: 50, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 147, pontos_max: 151, percentil: 55, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 152, pontos_max: 156, percentil: 60, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 157, pontos_max: 161, percentil: 65, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 162, pontos_max: 166, percentil: 70, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 167, pontos_max: 172, percentil: 75, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 173, pontos_max: 178, percentil: 80, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 179, pontos_max: 185, percentil: 85, classificacao: 'Superior' },
      { rota_tipo: 'C', pontos_min: 186, pontos_max: 195, percentil: 90, classificacao: 'Superior' },
      { rota_tipo: 'C', pontos_min: 196, pontos_max: 999, percentil: 95, classificacao: 'Superior' },
      
      // Rota D (Dividida) - usando ranges baseados na tabela geral
      { rota_tipo: 'D', pontos_min: 0, pontos_max: 53, percentil: 5, classificacao: 'Inferior' },
      { rota_tipo: 'D', pontos_min: 54, pontos_max: 66, percentil: 10, classificacao: 'Inferior' },
      { rota_tipo: 'D', pontos_min: 67, pontos_max: 73, percentil: 15, classificacao: 'Inferior' },
      { rota_tipo: 'D', pontos_min: 74, pontos_max: 78, percentil: 20, classificacao: 'Médio Inferior' },
      { rota_tipo: 'D', pontos_min: 79, pontos_max: 82, percentil: 25, classificacao: 'Médio Inferior' },
      { rota_tipo: 'D', pontos_min: 83, pontos_max: 87, percentil: 30, classificacao: 'Médio Inferior' },
      { rota_tipo: 'D', pontos_min: 88, pontos_max: 91, percentil: 35, classificacao: 'Médio Inferior' },
      { rota_tipo: 'D', pontos_min: 92, pontos_max: 94, percentil: 40, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 95, pontos_max: 97, percentil: 45, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 98, pontos_max: 101, percentil: 50, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 102, pontos_max: 103, percentil: 55, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 104, pontos_max: 107, percentil: 60, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 108, pontos_max: 111, percentil: 65, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 112, pontos_max: 115, percentil: 70, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 116, pontos_max: 119, percentil: 75, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 120, pontos_max: 123, percentil: 80, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 124, pontos_max: 129, percentil: 85, classificacao: 'Superior' },
      { rota_tipo: 'D', pontos_min: 130, pontos_max: 138, percentil: 90, classificacao: 'Superior' },
      { rota_tipo: 'D', pontos_min: 139, pontos_max: 999, percentil: 95, classificacao: 'Superior' },
      
      // Rota A (Alternada) - usando ranges baseados na tabela geral
      { rota_tipo: 'A', pontos_min: 0, pontos_max: 53, percentil: 5, classificacao: 'Inferior' },
      { rota_tipo: 'A', pontos_min: 54, pontos_max: 76, percentil: 10, classificacao: 'Inferior' },
      { rota_tipo: 'A', pontos_min: 77, pontos_max: 89, percentil: 15, classificacao: 'Inferior' },
      { rota_tipo: 'A', pontos_min: 90, pontos_max: 98, percentil: 20, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 99, pontos_max: 105, percentil: 25, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 106, pontos_max: 112, percentil: 30, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 113, pontos_max: 118, percentil: 35, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 119, pontos_max: 122, percentil: 40, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 123, pontos_max: 128, percentil: 45, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 129, pontos_max: 133, percentil: 50, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 134, pontos_max: 138, percentil: 55, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 139, pontos_max: 143, percentil: 60, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 144, pontos_max: 148, percentil: 65, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 149, pontos_max: 154, percentil: 70, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 155, pontos_max: 160, percentil: 75, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 161, pontos_max: 166, percentil: 80, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 167, pontos_max: 174, percentil: 85, classificacao: 'Superior' },
      { rota_tipo: 'A', pontos_min: 175, pontos_max: 183, percentil: 90, classificacao: 'Superior' },
      { rota_tipo: 'A', pontos_min: 184, pontos_max: 999, percentil: 95, classificacao: 'Superior' }
    ];
  }

  // Para outras tabelas, retornar dados básicos (pode ser expandido)
  return [
    { rota_tipo: 'C', pontos_min: 0, pontos_max: 50, percentil: 5, classificacao: 'Inferior' },
    { rota_tipo: 'C', pontos_min: 51, pontos_max: 100, percentil: 50, classificacao: 'Médio' },
    { rota_tipo: 'C', pontos_min: 101, pontos_max: 200, percentil: 95, classificacao: 'Superior' },
    { rota_tipo: 'D', pontos_min: 0, pontos_max: 50, percentil: 5, classificacao: 'Inferior' },
    { rota_tipo: 'D', pontos_min: 51, pontos_max: 100, percentil: 50, classificacao: 'Médio' },
    { rota_tipo: 'D', pontos_min: 101, pontos_max: 200, percentil: 95, classificacao: 'Superior' },
    { rota_tipo: 'A', pontos_min: 0, pontos_max: 50, percentil: 5, classificacao: 'Inferior' },
    { rota_tipo: 'A', pontos_min: 51, pontos_max: 100, percentil: 50, classificacao: 'Médio' },
    { rota_tipo: 'A', pontos_min: 101, pontos_max: 200, percentil: 95, classificacao: 'Superior' }
  ];
  }
}

// Executar o seed
if (require.main === module) {
  seedRotas2Normas()
    .then(() => {
      console.log('✅ Seed concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no seed:', error);
      process.exit(1);
    });
}

module.exports = { seedRotas2Normas };
