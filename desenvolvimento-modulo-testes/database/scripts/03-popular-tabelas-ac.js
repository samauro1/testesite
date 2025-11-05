/**
 * Script para Popular Tabelas Normativas do Teste AC
 * 
 * Este script popula o banco de dados com todas as tabelas de percentis
 * do Teste AC conforme documentação fornecida.
 */

// Esta função será chamada com a função query como parâmetro
// ou usará a configuração padrão do módulo
async function popularTabelasAC(customQuery = null) {
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

const tabelasAC = [
  {
    nome_tabela: "Tabela 14. Percentis do AC por nível de escolaridade e para a amostra total da região Sul",
    regiao: "Sul",
    dados_percentil: [
      {"classificacao": "Inferior", "percentil": 1, "ensino_fundamental": 18, "ensino_medio": 25, "ensino_superior": 16, "amostra_total": 22},
      {"classificacao": "Inferior", "percentil": 5, "ensino_fundamental": 31, "ensino_medio": 46, "ensino_superior": 50, "amostra_total": 41},
      {"classificacao": "Inferior", "percentil": 10, "ensino_fundamental": 41, "ensino_medio": 56, "ensino_superior": 59, "amostra_total": 53},
      {"classificacao": "Médio inferior", "percentil": 20, "ensino_fundamental": 54, "ensino_medio": 66, "ensino_superior": 70, "amostra_total": 63},
      {"classificacao": "Médio inferior", "percentil": 25, "ensino_fundamental": 58, "ensino_medio": 71, "ensino_superior": 74, "amostra_total": 68},
      {"classificacao": "Médio inferior", "percentil": 30, "ensino_fundamental": 61, "ensino_medio": 74, "ensino_superior": 78, "amostra_total": 71},
      {"classificacao": "Médio inferior", "percentil": 40, "ensino_fundamental": 67, "ensino_medio": 81, "ensino_superior": 84, "amostra_total": 77},
      {"classificacao": "Médio", "percentil": 50, "ensino_fundamental": 71, "ensino_medio": 88, "ensino_superior": 90, "amostra_total": 83},
      {"classificacao": "Médio", "percentil": 60, "ensino_fundamental": 75, "ensino_medio": 92, "ensino_superior": 97, "amostra_total": 90},
      {"classificacao": "Médio", "percentil": 70, "ensino_fundamental": 81, "ensino_medio": 98, "ensino_superior": 105, "amostra_total": 97},
      {"classificacao": "Médio", "percentil": 75, "ensino_fundamental": 84, "ensino_medio": 104, "ensino_superior": 108, "amostra_total": 101},
      {"classificacao": "Médio superior", "percentil": 80, "ensino_fundamental": 88, "ensino_medio": 108, "ensino_superior": 113, "amostra_total": 106},
      {"classificacao": "Médio superior", "percentil": 90, "ensino_fundamental": 102, "ensino_medio": 121, "ensino_superior": 125, "amostra_total": 118},
      {"classificacao": "Superior", "percentil": 95, "ensino_fundamental": 113, "ensino_medio": 131, "ensino_superior": 132, "amostra_total": 129},
      {"classificacao": "Muito superior", "percentil": 99, "ensino_fundamental": 130, "ensino_medio": 140, "ensino_superior": 143, "amostra_total": 141}
    ],
    estatisticas_resumo: {
      N: {"ensino_fundamental": 358, "ensino_medio": 728, "ensino_superior": 391, "amostra_total": 1477},
      Media: {"ensino_fundamental": 71.01, "ensino_medio": 86.76, "ensino_superior": 90.81, "amostra_total": 84.01},
      DP: {"ensino_fundamental": 23.30, "ensino_medio": 25.05, "ensino_superior": 25.05, "amostra_total": 25.75}
    }
  },
  {
    nome_tabela: "Tabela 15. Percentis do AC por nível de escolaridade e para a amostra total da região Sudeste",
    regiao: "Sudeste",
    dados_percentil: [
      {"classificacao": "Inferior", "percentil": 1, "ensino_fundamental": 22, "ensino_medio": 32, "ensino_superior": 40, "amostra_total": 30},
      {"classificacao": "Inferior", "percentil": 5, "ensino_fundamental": 39, "ensino_medio": 48, "ensino_superior": 54, "amostra_total": 47},
      {"classificacao": "Inferior", "percentil": 10, "ensino_fundamental": 48, "ensino_medio": 57, "ensino_superior": 62, "amostra_total": 57},
      {"classificacao": "Médio inferior", "percentil": 20, "ensino_fundamental": 61, "ensino_medio": 68, "ensino_superior": 71, "amostra_total": 66},
      {"classificacao": "Médio inferior", "percentil": 25, "ensino_fundamental": 63, "ensino_medio": 72, "ensino_superior": 76, "amostra_total": 70},
      {"classificacao": "Médio inferior", "percentil": 30, "ensino_fundamental": 65, "ensino_medio": 75, "ensino_superior": 79, "amostra_total": 73},
      {"classificacao": "Médio inferior", "percentil": 40, "ensino_fundamental": 69, "ensino_medio": 82, "ensino_superior": 85, "amostra_total": 79},
      {"classificacao": "Médio", "percentil": 50, "ensino_fundamental": 74, "ensino_medio": 88, "ensino_superior": 90, "amostra_total": 86},
      {"classificacao": "Médio", "percentil": 60, "ensino_fundamental": 78, "ensino_medio": 93, "ensino_superior": 96, "amostra_total": 91},
      {"classificacao": "Médio", "percentil": 70, "ensino_fundamental": 85, "ensino_medio": 101, "ensino_superior": 105, "amostra_total": 100},
      {"classificacao": "Médio", "percentil": 75, "ensino_fundamental": 88, "ensino_medio": 106, "ensino_superior": 109, "amostra_total": 104},
      {"classificacao": "Médio superior", "percentil": 80, "ensino_fundamental": 93, "ensino_medio": 111, "ensino_superior": 114, "amostra_total": 109},
      {"classificacao": "Médio superior", "percentil": 90, "ensino_fundamental": 110, "ensino_medio": 122, "ensino_superior": 127, "amostra_total": 121},
      {"classificacao": "Superior", "percentil": 95, "ensino_fundamental": 123, "ensino_medio": 131, "ensino_superior": 134, "amostra_total": 131},
      {"classificacao": "Muito superior", "percentil": 99, "ensino_fundamental": 135, "ensino_medio": 140, "ensino_superior": 143, "amostra_total": 141}
    ],
    estatisticas_resumo: {
      N: {"ensino_fundamental": 423, "ensino_medio": 1146, "ensino_superior": 525, "amostra_total": 2094},
      Media: {"ensino_fundamental": 76.59, "ensino_medio": 88.61, "ensino_superior": 91.94, "amostra_total": 87.01},
      DP: {"ensino_fundamental": 23.47, "ensino_medio": 24.55, "ensino_superior": 24.04, "amostra_total": 24.80}
    }
  },
  {
    nome_tabela: "Tabela 16. Percentis do AC por nível de escolaridade e para a amostra total da região Centro-oeste",
    regiao: "Centro-oeste",
    dados_percentil: [
      {"classificacao": "Inferior", "percentil": 1, "ensino_fundamental": 28, "ensino_medio": 39, "ensino_superior": 42, "amostra_total": 37},
      {"classificacao": "Inferior", "percentil": 5, "ensino_fundamental": 45, "ensino_medio": 57, "ensino_superior": 53, "amostra_total": 53},
      {"classificacao": "Inferior", "percentil": 10, "ensino_fundamental": 55, "ensino_medio": 63, "ensino_superior": 61, "amostra_total": 60},
      {"classificacao": "Médio inferior", "percentil": 20, "ensino_fundamental": 63, "ensino_medio": 71, "ensino_superior": 71, "amostra_total": 68},
      {"classificacao": "Médio inferior", "percentil": 25, "ensino_fundamental": 65, "ensino_medio": 73, "ensino_superior": 74, "amostra_total": 72},
      {"classificacao": "Médio inferior", "percentil": 30, "ensino_fundamental": 69, "ensino_medio": 76, "ensino_superior": 78, "amostra_total": 75},
      {"classificacao": "Médio inferior", "percentil": 40, "ensino_fundamental": 75, "ensino_medio": 80, "ensino_superior": 84, "amostra_total": 80},
      {"classificacao": "Médio", "percentil": 50, "ensino_fundamental": 80, "ensino_medio": 85, "ensino_superior": 90, "amostra_total": 85},
      {"classificacao": "Médio", "percentil": 60, "ensino_fundamental": 84, "ensino_medio": 91, "ensino_superior": 97, "amostra_total": 90},
      {"classificacao": "Médio", "percentil": 70, "ensino_fundamental": 89, "ensino_medio": 97, "ensino_superior": 103, "amostra_total": 97},
      {"classificacao": "Médio", "percentil": 75, "ensino_fundamental": 93, "ensino_medio": 102, "ensino_superior": 108, "amostra_total": 102},
      {"classificacao": "Médio superior", "percentil": 80, "ensino_fundamental": 98, "ensino_medio": 106, "ensino_superior": 114, "amostra_total": 107},
      {"classificacao": "Médio superior", "percentil": 90, "ensino_fundamental": 114, "ensino_medio": 116, "ensino_superior": 125, "amostra_total": 118},
      {"classificacao": "Superior", "percentil": 95, "ensino_fundamental": 123, "ensino_medio": 124, "ensino_superior": 134, "amostra_total": 126},
      {"classificacao": "Muito superior", "percentil": 99, "ensino_fundamental": 134, "ensino_medio": 137, "ensino_superior": 144, "amostra_total": 141}
    ],
    estatisticas_resumo: {
      N: {"ensino_fundamental": 366, "ensino_medio": 749, "ensino_superior": 368, "amostra_total": 1483},
      Media: {"ensino_fundamental": 80.71, "ensino_medio": 87.35, "ensino_superior": 91.67, "amostra_total": 86.78},
      DP: {"ensino_fundamental": 22.65, "ensino_medio": 20.77, "ensino_superior": 23.67, "amostra_total": 22.32}
    }
  },
  {
    nome_tabela: "Tabela 17. Percentis do AC por nível de escolaridade e para a amostra total da região Nordeste",
    regiao: "Nordeste",
    dados_percentil: [
      {"classificacao": "Inferior", "percentil": 1, "ensino_fundamental": 12, "ensino_medio": 29, "ensino_superior": 38, "amostra_total": 27},
      {"classificacao": "Inferior", "percentil": 5, "ensino_fundamental": 35, "ensino_medio": 46, "ensino_superior": 51, "amostra_total": 42},
      {"classificacao": "Inferior", "percentil": 10, "ensino_fundamental": 37, "ensino_medio": 53, "ensino_superior": 57, "amostra_total": 51},
      {"classificacao": "Médio inferior", "percentil": 20, "ensino_fundamental": 47, "ensino_medio": 62, "ensino_superior": 66, "amostra_total": 60},
      {"classificacao": "Médio inferior", "percentil": 25, "ensino_fundamental": 51, "ensino_medio": 65, "ensino_superior": 69, "amostra_total": 64},
      {"classificacao": "Médio inferior", "percentil": 30, "ensino_fundamental": 53, "ensino_medio": 68, "ensino_superior": 71, "amostra_total": 67},
      {"classificacao": "Médio inferior", "percentil": 40, "ensino_fundamental": 59, "ensino_medio": 74, "ensino_superior": 77, "amostra_total": 73},
      {"classificacao": "Médio", "percentil": 50, "ensino_fundamental": 67, "ensino_medio": 79, "ensino_superior": 84, "amostra_total": 78},
      {"classificacao": "Médio", "percentil": 60, "ensino_fundamental": 74, "ensino_medio": 84, "ensino_superior": 89, "amostra_total": 84},
      {"classificacao": "Médio", "percentil": 70, "ensino_fundamental": 79, "ensino_medio": 91, "ensino_superior": 95, "amostra_total": 90},
      {"classificacao": "Médio", "percentil": 75, "ensino_fundamental": 81, "ensino_medio": 94, "ensino_superior": 99, "amostra_total": 94},
      {"classificacao": "Médio superior", "percentil": 80, "ensino_fundamental": 86, "ensino_medio": 99, "ensino_superior": 102, "amostra_total": 98},
      {"classificacao": "Médio superior", "percentil": 90, "ensino_fundamental": 94, "ensino_medio": 111, "ensino_superior": 115, "amostra_total": 109},
      {"classificacao": "Superior", "percentil": 95, "ensino_fundamental": 103, "ensino_medio": 120, "ensino_superior": 125, "amostra_total": 120},
      {"classificacao": "Muito superior", "percentil": 99, "ensino_fundamental": 127, "ensino_medio": 135, "ensino_superior": 139, "amostra_total": 137}
    ],
    estatisticas_resumo: {
      N: {"ensino_fundamental": 451, "ensino_medio": 1379, "ensino_superior": 770, "amostra_total": 2600},
      Media: {"ensino_fundamental": 66.77, "ensino_medio": 80.25, "ensino_superior": 84.49, "amostra_total": 79.17},
      DP: {"ensino_fundamental": 22.39, "ensino_medio": 22.44, "ensino_superior": 22.31, "amostra_total": 23.17}
    }
  },
  {
    nome_tabela: "Tabela 18. Percentis do AC por nível de escolaridade e para a amostra total da região Norte",
    regiao: "Norte",
    dados_percentil: [
      {"classificacao": "Inferior", "percentil": 1, "ensino_fundamental": 26, "ensino_medio": 27, "ensino_superior": 56, "amostra_total": 30},
      {"classificacao": "Inferior", "percentil": 5, "ensino_fundamental": 37, "ensino_medio": 48, "ensino_superior": 61, "amostra_total": 48},
      {"classificacao": "Inferior", "percentil": 10, "ensino_fundamental": 48, "ensino_medio": 55, "ensino_superior": 66, "amostra_total": 56},
      {"classificacao": "Médio inferior", "percentil": 20, "ensino_fundamental": 57, "ensino_medio": 64, "ensino_superior": 71, "amostra_total": 64},
      {"classificacao": "Médio inferior", "percentil": 25, "ensino_fundamental": 61, "ensino_medio": 66, "ensino_superior": 73, "amostra_total": 66},
      {"classificacao": "Médio inferior", "percentil": 30, "ensino_fundamental": 63, "ensino_medio": 69, "ensino_superior": 75, "amostra_total": 69},
      {"classificacao": "Médio inferior", "percentil": 40, "ensino_fundamental": 69, "ensino_medio": 76, "ensino_superior": 80, "amostra_total": 75},
      {"classificacao": "Médio", "percentil": 50, "ensino_fundamental": 75, "ensino_medio": 82, "ensino_superior": 85, "amostra_total": 81},
      {"classificacao": "Médio", "percentil": 60, "ensino_fundamental": 80, "ensino_medio": 87, "ensino_superior": 90, "amostra_total": 87},
      {"classificacao": "Médio", "percentil": 70, "ensino_fundamental": 87, "ensino_medio": 93, "ensino_superior": 97, "amostra_total": 92},
      {"classificacao": "Médio", "percentil": 75, "ensino_fundamental": 90, "ensino_medio": 98, "ensino_superior": 99, "amostra_total": 97},
      {"classificacao": "Médio superior", "percentil": 80, "ensino_fundamental": 98, "ensino_medio": 103, "ensino_superior": 103, "amostra_total": 102},
      {"classificacao": "Médio superior", "percentil": 90, "ensino_fundamental": 113, "ensino_medio": 118, "ensino_superior": 118, "amostra_total": 114},
      {"classificacao": "Superior", "percentil": 95, "ensino_fundamental": 120, "ensino_medio": 121, "ensino_superior": 130, "amostra_total": 121},
      {"classificacao": "Muito superior", "percentil": 99, "ensino_fundamental": 130, "ensino_medio": 141, "ensino_superior": 145, "amostra_total": 141}
    ],
    estatisticas_resumo: {
      N: {"ensino_fundamental": 133, "ensino_medio": 632, "ensino_superior": 135, "amostra_total": 900},
      Media: {"ensino_fundamental": 76.80, "ensino_medio": 82.40, "ensino_superior": 88.13, "amostra_total": 82.43},
      DP: {"ensino_fundamental": 23.35, "ensino_medio": 22.81, "ensino_superior": 20.23, "amostra_total": 22.71}
    }
  },
  {
    nome_tabela: "Tabela 19. Percentis do AC por nível de escolaridade e para a amostra total – Tabela Geral",
    regiao: "Geral",
    dados_percentil: [
      {"classificacao": "Inferior", "percentil": 1, "ensino_fundamental": 19, "ensino_medio": 30, "ensino_superior": 40, "amostra_total": 27},
      {"classificacao": "Inferior", "percentil": 5, "ensino_fundamental": 37, "ensino_medio": 48, "ensino_superior": 53, "amostra_total": 46},
      {"classificacao": "Inferior", "percentil": 10, "ensino_fundamental": 44, "ensino_medio": 57, "ensino_superior": 60, "amostra_total": 55},
      {"classificacao": "Médio inferior", "percentil": 20, "ensino_fundamental": 55, "ensino_medio": 65, "ensino_superior": 69, "amostra_total": 64},
      {"classificacao": "Médio inferior", "percentil": 25, "ensino_fundamental": 59, "ensino_medio": 69, "ensino_superior": 73, "amostra_total": 67},
      {"classificacao": "Médio inferior", "percentil": 30, "ensino_fundamental": 62, "ensino_medio": 72, "ensino_superior": 76, "amostra_total": 71},
      {"classificacao": "Médio inferior", "percentil": 40, "ensino_fundamental": 68, "ensino_medio": 78, "ensino_superior": 82, "amostra_total": 77},
      {"classificacao": "Médio", "percentil": 50, "ensino_fundamental": 73, "ensino_medio": 83, "ensino_superior": 87, "amostra_total": 82},
      {"classificacao": "Médio", "percentil": 60, "ensino_fundamental": 78, "ensino_medio": 90, "ensino_superior": 94, "amostra_total": 88},
      {"classificacao": "Médio", "percentil": 70, "ensino_fundamental": 84, "ensino_medio": 96, "ensino_superior": 100, "amostra_total": 95},
      {"classificacao": "Médio", "percentil": 75, "ensino_fundamental": 87, "ensino_medio": 101, "ensino_superior": 104, "amostra_total": 99},
      {"classificacao": "Médio superior", "percentil": 80, "ensino_fundamental": 91, "ensino_medio": 105, "ensino_superior": 109, "amostra_total": 104},
      {"classificacao": "Médio superior", "percentil": 90, "ensino_fundamental": 105, "ensino_medio": 116, "ensino_superior": 122, "amostra_total": 116},
      {"classificacao": "Superior", "percentil": 95, "ensino_fundamental": 117, "ensino_medio": 125, "ensino_superior": 131, "amostra_total": 126},
      {"classificacao": "Muito superior", "percentil": 99, "ensino_fundamental": 133, "ensino_medio": 139, "ensino_superior": 143, "amostra_total": 140}
    ],
    estatisticas_resumo: {
      N: {"ensino_fundamental": 1731, "ensino_medio": 4634, "ensino_superior": 2189, "amostra_total": 8554},
      Media: {"ensino_fundamental": 73.76, "ensino_medio": 84.78, "ensino_superior": 88.84, "amostra_total": 83.59},
      DP: {"ensino_fundamental": 23.53, "ensino_medio": 23.45, "ensino_superior": 23.56, "amostra_total": 24.07}
    }
  }
];

  // Função interna que usa a query definida acima
  async function executarPopular() {
    try {
      console.log('🚀 Iniciando população das tabelas normativas do AC...\n');

      for (const tabela of tabelasAC) {
        console.log(`📊 Processando: ${tabela.nome_tabela}`);

        // Criar tabela normativa
        const criterio = `Região: ${tabela.regiao}`;
        const tabelaResult = await query(`
          INSERT INTO tabelas_normativas (nome, tipo, versao, criterio, descricao, ativa)
          VALUES ($1, 'ac', '1.0', $2, $3, true)
          ON CONFLICT (nome) DO UPDATE SET
            criterio = EXCLUDED.criterio,
            descricao = EXCLUDED.descricao,
            ativa = true
          RETURNING id
        `, [
          tabela.nome_tabela,
          criterio,
          `Tabela de percentis do AC para região ${tabela.regiao}`
        ]);

        const tabelaId = tabelaResult.rows[0].id;
        console.log(`  ✅ Tabela criada/atualizada: ID ${tabelaId}`);

        // Limpar normas existentes
        await query('DELETE FROM normas_ac WHERE tabela_id = $1', [tabelaId]);

        // Inserir normas
        for (const percentil of tabela.dados_percentil) {
          await query(`
            INSERT INTO normas_ac (
              tabela_id, classificacao, percentil,
              fundamental_min, fundamental_max,
              medio_min, medio_max,
              superior_min, superior_max,
              total_min, total_max
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            tabelaId,
            percentil.classificacao,
            percentil.percentil,
            percentil.ensino_fundamental,
            percentil.ensino_fundamental,
            percentil.ensino_medio,
            percentil.ensino_medio,
            percentil.ensino_superior,
            percentil.ensino_superior,
            percentil.amostra_total,
            percentil.amostra_total
          ]);
        }

        // Atualizar faixas (min/max) baseado em valores adjacentes
        const normas = await query('SELECT * FROM normas_ac WHERE tabela_id = $1 ORDER BY percentil', [tabelaId]);
        
        for (let i = 0; i < normas.rows.length; i++) {
          const atual = normas.rows[i];
          const anterior = i > 0 ? normas.rows[i - 1] : null;
          const proximo = i < normas.rows.length - 1 ? normas.rows[i + 1] : null;

          // Calcular faixas
          const fundMin = anterior ? anterior.fundamental_max + 1 : atual.fundamental_min;
          const fundMax = proximo ? proximo.fundamental_min - 1 : atual.fundamental_max;
          const medMin = anterior ? anterior.medio_max + 1 : atual.medio_min;
          const medMax = proximo ? proximo.medio_min - 1 : atual.medio_max;
          const supMin = anterior ? anterior.superior_max + 1 : atual.superior_min;
          const supMax = proximo ? proximo.superior_min - 1 : atual.superior_max;
          const totalMin = anterior ? anterior.total_max + 1 : atual.total_min;
          const totalMax = proximo ? proximo.total_min - 1 : atual.total_max;

          await query(`
            UPDATE normas_ac SET
              fundamental_min = $1, fundamental_max = $2,
              medio_min = $3, medio_max = $4,
              superior_min = $5, superior_max = $6,
              total_min = $7, total_max = $8
            WHERE id = $9
          `, [fundMin, fundMax, medMin, medMax, supMin, supMax, totalMin, totalMax, atual.id]);
        }

        console.log(`  ✅ ${tabela.dados_percentil.length} normas inseridas\n`);
      }

      console.log('✅ Todas as tabelas normativas do AC foram populadas com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao popular tabelas:', error);
      throw error;
    }
  }

  // Executar a função interna se query foi definida
  if (query) {
    await executarPopular();
  } else {
    throw new Error('Query não foi definida');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  popularTabelasAC()
    .then(() => {
      console.log('\n✅ População concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { popularTabelasAC };
