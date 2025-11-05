/**
 * Script para popular tabelas normativas de Memória
 * 
 * Baseado em normas de testes de memória padrão
 * Adaptado para diferentes regiões e escolaridades
 */

async function popularTabelasMemoria(customQuery = null) {
  // Se query foi passada como parâmetro, usar ela
  // Senão, tentar carregar do módulo isolado ou sistema principal
  let query;
  
  if (customQuery) {
    query = customQuery;
  } else {
    try {
      // Tentar usar do sistema principal primeiro (tem as credenciais corretas)
      const dbConfig = require('../../../codigo/config/database');
      query = dbConfig.query;
      console.log('✅ Usando banco de dados do sistema principal');
    } catch (e) {
      // Se não existir, tentar usar do módulo isolado
      try {
        const dbConfig = require('../../backend/config/database');
        query = dbConfig.query;
        console.log('✅ Usando banco de dados do módulo isolado');
      } catch (e2) {
        console.error('❌ Não foi possível carregar configuração do banco de dados');
        throw new Error('Configuração do banco não encontrada');
      }
    }
  }

  console.log('📊 Iniciando população de tabelas normativas de Memória...');

  // Tabelas normativas de Memória
  // Valores baseados em normas padrão de testes de memória
  const tabelasMemoria = [
    {
      nome_tabela: "Tabela Normativa Memória - Região Sudeste - Ensino Superior",
      regiao: "Sudeste",
      escolaridade: "Superior",
      idade_minima: 18,
      idade_maxima: 64,
      dados: {
        evocacao: {
          excelente: { min: 12 },
          bom: { min: 9, max: 11 },
          medio: { min: 6, max: 8 },
          abaixo: { min: 0, max: 5 }
        },
        retencao: {
          excelente: { min: 10 },
          bom: { min: 7, max: 9 },
          medio: { min: 4, max: 6 },
          abaixo: { min: 0, max: 3 }
        },
        reconhecimento: {
          excelente: { min: 14 },
          bom: { min: 11, max: 13 },
          medio: { min: 8, max: 10 },
          abaixo: { min: 0, max: 7 }
        }
      }
    },
    {
      nome_tabela: "Tabela Normativa Memória - Região Sudeste - Ensino Médio",
      regiao: "Sudeste",
      escolaridade: "Médio",
      idade_minima: 18,
      idade_maxima: 64,
      dados: {
        evocacao: {
          excelente: { min: 11 },
          bom: { min: 8, max: 10 },
          medio: { min: 5, max: 7 },
          abaixo: { min: 0, max: 4 }
        },
        retencao: {
          excelente: { min: 9 },
          bom: { min: 6, max: 8 },
          medio: { min: 3, max: 5 },
          abaixo: { min: 0, max: 2 }
        },
        reconhecimento: {
          excelente: { min: 13 },
          bom: { min: 10, max: 12 },
          medio: { min: 7, max: 9 },
          abaixo: { min: 0, max: 6 }
        }
      }
    },
    {
      nome_tabela: "Tabela Normativa Memória - Região Sudeste - Ensino Fundamental",
      regiao: "Sudeste",
      escolaridade: "Fundamental",
      idade_minima: 18,
      idade_maxima: 64,
      dados: {
        evocacao: {
          excelente: { min: 10 },
          bom: { min: 7, max: 9 },
          medio: { min: 4, max: 6 },
          abaixo: { min: 0, max: 3 }
        },
        retencao: {
          excelente: { min: 8 },
          bom: { min: 5, max: 7 },
          medio: { min: 2, max: 4 },
          abaixo: { min: 0, max: 1 }
        },
        reconhecimento: {
          excelente: { min: 12 },
          bom: { min: 9, max: 11 },
          medio: { min: 6, max: 8 },
          abaixo: { min: 0, max: 5 }
        }
      }
    },
    {
      nome_tabela: "Tabela Normativa Memória - Região Sul - Ensino Superior",
      regiao: "Sul",
      escolaridade: "Superior",
      idade_minima: 18,
      idade_maxima: 64,
      dados: {
        evocacao: {
          excelente: { min: 11 },
          bom: { min: 8, max: 10 },
          medio: { min: 5, max: 7 },
          abaixo: { min: 0, max: 4 }
        },
        retencao: {
          excelente: { min: 9 },
          bom: { min: 6, max: 8 },
          medio: { min: 3, max: 5 },
          abaixo: { min: 0, max: 2 }
        },
        reconhecimento: {
          excelente: { min: 13 },
          bom: { min: 10, max: 12 },
          medio: { min: 7, max: 9 },
          abaixo: { min: 0, max: 6 }
        }
      }
    }
  ];

  // Limpar normas existentes antes de inserir
  await query('DELETE FROM normas_memoria');
  console.log('🧹 Normas antigas removidas');

  for (const tabela of tabelasMemoria) {
    console.log(`📝 Processando: ${tabela.nome_tabela}`);
    
    // Inserir ou atualizar tabela normativa
    const tabelaResult = await query(`
      INSERT INTO tabelas_normativas (nome, tipo, criterio, ativa)
      VALUES ($1, 'memoria', $2, true)
      ON CONFLICT (nome) DO UPDATE SET criterio = $2, ativa = true
      RETURNING id
    `, [
      tabela.nome_tabela,
      `${tabela.regiao} - ${tabela.escolaridade}`
    ]);

    const tabelaId = tabelaResult.rows[0].id;
    console.log(`  ✅ Tabela criada/atualizada (ID: ${tabelaId})`);

    // Inserir normas
    const dados = tabela.dados;
    await query(`
      INSERT INTO normas_memoria (
        tabela_id, regiao, escolaridade, idade_minima, idade_maxima,
        evocacao_excelente_min, evocacao_bom_min, evocacao_bom_max,
        evocacao_medio_min, evocacao_medio_max,
        evocacao_abaixo_min, evocacao_abaixo_max,
        retencao_excelente_min, retencao_bom_min, retencao_bom_max,
        retencao_medio_min, retencao_medio_max,
        retencao_abaixo_min, retencao_abaixo_max,
        reconhecimento_excelente_min, reconhecimento_bom_min, reconhecimento_bom_max,
        reconhecimento_medio_min, reconhecimento_medio_max,
        reconhecimento_abaixo_min, reconhecimento_abaixo_max
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26
      )
    `, [
      tabelaId,
      tabela.regiao,
      tabela.escolaridade,
      tabela.idade_minima,
      tabela.idade_maxima,
      dados.evocacao.excelente.min,
      dados.evocacao.bom.min,
      dados.evocacao.bom.max,
      dados.evocacao.medio.min,
      dados.evocacao.medio.max,
      dados.evocacao.abaixo.min,
      dados.evocacao.abaixo.max,
      dados.retencao.excelente.min,
      dados.retencao.bom.min,
      dados.retencao.bom.max,
      dados.retencao.medio.min,
      dados.retencao.medio.max,
      dados.retencao.abaixo.min,
      dados.retencao.abaixo.max,
      dados.reconhecimento.excelente.min,
      dados.reconhecimento.bom.min,
      dados.reconhecimento.bom.max,
      dados.reconhecimento.medio.min,
      dados.reconhecimento.medio.max,
      dados.reconhecimento.abaixo.min,
      dados.reconhecimento.abaixo.max
    ]);

    console.log(`  ✅ Normas inseridas`);
  }

  console.log('✅ Tabelas normativas de Memória populadas com sucesso!');
}

module.exports = {
  popularTabelasMemoria
};

