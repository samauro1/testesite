/**
 * Script para popular tabelas normativas do Palográfico
 * 
 * Baseado em normas do Manual Técnico do Palográfico
 * Adaptado para diferentes regiões, sexos e escolaridades
 */

async function popularTabelasPalografico(customQuery = null) {
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

  console.log('📊 Iniciando população de tabelas normativas do Palográfico...');

  // Tabelas normativas do Palográfico
  // Valores baseados em normas do Manual Técnico do Palográfico
  const tabelasPalografico = [
    {
      nome_tabela: "Tabela Normativa Palográfico - Região Sudeste - Masculino - Ensino Superior",
      regiao: "Sudeste",
      sexo: "M",
      escolaridade: "Superior",
      idade_minima: 18,
      idade_maxima: 64,
      dados: {
        // Produtividade (palos em 5 minutos)
        produtividade: {
          muito_alta: { min: 900, max: Infinity },
          alta: { min: 750, max: 899 },
          media: { min: 600, max: 749 },
          baixa: { min: 450, max: 599 },
          muito_baixa: { min: 0, max: 449 }
        },
        // NOR (Nível Oscilação Rítmica)
        nor: {
          muito_alto: { min: 15.0, max: Infinity },
          alto: { min: 10.0, max: 14.9 },
          medio: { min: 5.0, max: 9.9 },
          baixo: { min: 2.0, max: 4.9 },
          muito_baixo: { min: 0, max: 1.9 }
        },
        // Tamanho (mm)
        tamanho: {
          muito_grande: { min: 12.0 },
          grande: { min: 10.5, max: 11.9 },
          medio: { min: 8.0, max: 10.4 },
          pequeno: { min: 6.0, max: 7.9 },
          muito_pequeno: { min: 0, max: 5.9 }
        },
        // Distância (mm)
        distancia: {
          muito_ampla: { min: 4.0 },
          ampla: { min: 3.0, max: 3.9 },
          normal: { min: 2.2, max: 2.9 },
          estreita: { min: 1.5, max: 2.1 },
          muito_estreita: { min: 0, max: 1.4 }
        }
      }
    },
    {
      nome_tabela: "Tabela Normativa Palográfico - Região Sudeste - Feminino - Ensino Superior",
      regiao: "Sudeste",
      sexo: "F",
      escolaridade: "Superior",
      idade_minima: 18,
      idade_maxima: 64,
      dados: {
        produtividade: {
          muito_alta: { min: 850, max: Infinity },
          alta: { min: 700, max: 849 },
          media: { min: 550, max: 699 },
          baixa: { min: 400, max: 549 },
          muito_baixa: { min: 0, max: 399 }
        },
        nor: {
          muito_alto: { min: 14.0, max: Infinity },
          alto: { min: 9.5, max: 13.9 },
          medio: { min: 4.5, max: 9.4 },
          baixo: { min: 1.8, max: 4.4 },
          muito_baixo: { min: 0, max: 1.7 }
        },
        tamanho: {
          muito_grande: { min: 11.5 },
          grande: { min: 10.0, max: 11.4 },
          medio: { min: 7.5, max: 9.9 },
          pequeno: { min: 5.5, max: 7.4 },
          muito_pequeno: { min: 0, max: 5.4 }
        },
        distancia: {
          muito_ampla: { min: 3.8 },
          ampla: { min: 2.8, max: 3.7 },
          normal: { min: 2.0, max: 2.7 },
          estreita: { min: 1.3, max: 1.9 },
          muito_estreita: { min: 0, max: 1.2 }
        }
      }
    },
    {
      nome_tabela: "Tabela Normativa Palográfico - Região Sudeste - Ambos - Ensino Médio",
      regiao: "Sudeste",
      sexo: "Ambos",
      escolaridade: "Médio",
      idade_minima: 18,
      idade_maxima: 64,
      dados: {
        produtividade: {
          muito_alta: { min: 800, max: Infinity },
          alta: { min: 650, max: 799 },
          media: { min: 500, max: 649 },
          baixa: { min: 350, max: 499 },
          muito_baixa: { min: 0, max: 349 }
        },
        nor: {
          muito_alto: { min: 13.0, max: Infinity },
          alto: { min: 8.5, max: 12.9 },
          medio: { min: 4.0, max: 8.4 },
          baixo: { min: 1.5, max: 3.9 },
          muito_baixo: { min: 0, max: 1.4 }
        },
        tamanho: {
          muito_grande: { min: 11.5 },
          grande: { min: 9.5, max: 11.4 },
          medio: { min: 7.0, max: 9.4 },
          pequeno: { min: 5.0, max: 6.9 },
          muito_pequeno: { min: 0, max: 4.9 }
        },
        distancia: {
          muito_ampla: { min: 3.5 },
          ampla: { min: 2.5, max: 3.4 },
          normal: { min: 1.8, max: 2.4 },
          estreita: { min: 1.2, max: 1.7 },
          muito_estreita: { min: 0, max: 1.1 }
        }
      }
    }
  ];

  // Limpar normas existentes antes de inserir
  await query('DELETE FROM normas_palografico');
  console.log('🧹 Normas antigas removidas');

  for (const tabela of tabelasPalografico) {
    console.log(`📝 Processando: ${tabela.nome_tabela}`);
    
    // Inserir ou atualizar tabela normativa
    const tabelaResult = await query(`
      INSERT INTO tabelas_normativas (nome, tipo, criterio, ativa)
      VALUES ($1, 'palografico', $2, true)
      ON CONFLICT (nome) DO UPDATE SET criterio = $2, ativa = true
      RETURNING id
    `, [
      tabela.nome_tabela,
      `${tabela.regiao} - ${tabela.sexo} - ${tabela.escolaridade}`
    ]);

    const tabelaId = tabelaResult.rows[0].id;
    console.log(`  ✅ Tabela criada/atualizada (ID: ${tabelaId})`);

    // Inserir normas
    const dados = tabela.dados;
    await query(`
      INSERT INTO normas_palografico (
        tabela_id, regiao, sexo, escolaridade, idade_minima, idade_maxima,
        produtividade_muito_alta_min, produtividade_muito_alta_max,
        produtividade_alta_min, produtividade_alta_max,
        produtividade_media_min, produtividade_media_max,
        produtividade_baixa_min, produtividade_baixa_max,
        produtividade_muito_baixa_min, produtividade_muito_baixa_max,
        nor_muito_alto_min, nor_muito_alto_max,
        nor_alto_min, nor_alto_max,
        nor_medio_min, nor_medio_max,
        nor_baixo_min, nor_baixo_max,
        nor_muito_baixo_min, nor_muito_baixo_max,
        tamanho_muito_grande_min,
        tamanho_grande_min, tamanho_grande_max,
        tamanho_medio_min, tamanho_medio_max,
        tamanho_pequeno_min, tamanho_pequeno_max,
        tamanho_muito_pequeno_min, tamanho_muito_pequeno_max,
        distancia_muito_ampla_min,
        distancia_ampla_min, distancia_ampla_max,
        distancia_normal_min, distancia_normal_max,
        distancia_estreita_min, distancia_estreita_max,
        distancia_muito_estreita_min, distancia_muito_estreita_max
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, $32, $33, $34,
        $35, $36, $37, $38, $39, $40, $41, $42
      )
    `, [
      tabelaId,
      tabela.regiao,
      tabela.sexo,
      tabela.escolaridade,
      tabela.idade_minima,
      tabela.idade_maxima,
      dados.produtividade.muito_alta.min,
      dados.produtividade.muito_alta.max || null,
      dados.produtividade.alta.min,
      dados.produtividade.alta.max,
      dados.produtividade.media.min,
      dados.produtividade.media.max,
      dados.produtividade.baixa.min,
      dados.produtividade.baixa.max,
      dados.produtividade.muito_baixa.min,
      dados.produtividade.muito_baixa.max,
      dados.nor.muito_alto.min,
      dados.nor.muito_alto.max || null,
      dados.nor.alto.min,
      dados.nor.alto.max,
      dados.nor.medio.min,
      dados.nor.medio.max,
      dados.nor.baixo.min,
      dados.nor.baixo.max,
      dados.nor.muito_baixo.min,
      dados.nor.muito_baixo.max,
      dados.tamanho.muito_grande.min,
      dados.tamanho.grande.min,
      dados.tamanho.grande.max,
      dados.tamanho.medio.min,
      dados.tamanho.medio.max,
      dados.tamanho.pequeno.min,
      dados.tamanho.pequeno.max,
      dados.tamanho.muito_pequeno.min,
      dados.tamanho.muito_pequeno.max,
      dados.distancia.muito_ampla.min,
      dados.distancia.ampla.min,
      dados.distancia.ampla.max,
      dados.distancia.normal.min,
      dados.distancia.normal.max,
      dados.distancia.estreita.min,
      dados.distancia.estreita.max,
      dados.distancia.muito_estreita.min,
      dados.distancia.muito_estreita.max
    ]);

    console.log(`  ✅ Normas inseridas`);
  }

  console.log('✅ Tabelas normativas do Palográfico populadas com sucesso!');
}

module.exports = {
  popularTabelasPalografico
};

