/**
 * CALCULADORAS COMPLETAS PARA TODOS OS 9 TESTES
 * 
 * Baseado no sistema principal (codigo/routes/tabelas.js)
 * Adaptado para o módulo isolado de desenvolvimento
 */

const { query } = require('../config/database');

/**
 * 1. AC - Atenção Concentrada
 */
async function calcularAC(tabelaId, dados) {
  const { acertos, erros, omissoes, escolaridade } = dados;
  const pb = acertos - erros - omissoes;

  const result = await query(`
    SELECT classificacao, percentil 
    FROM normas_ac 
    WHERE tabela_id = $1 AND 
    (
      ($2 = 'Ensino Fundamental' AND $3 BETWEEN fundamental_min AND fundamental_max) OR
      ($2 = 'Ensino Médio' AND $3 BETWEEN medio_min AND medio_max) OR
      ($2 = 'Ensino Superior' AND $3 BETWEEN superior_min AND superior_max)
    )
  `, [tabelaId, escolaridade || 'Total', pb]);

  if (result.rows.length === 0) {
    return { pb, percentil: null, classificacao: 'Fora da faixa normativa' };
  }

  return {
    pb,
    percentil: result.rows[0].percentil,
    classificacao: result.rows[0].classificacao,
    acertos,
    erros,
    omissoes
  };
}

/**
 * 2. BETA-III - Raciocínio Matricial
 */
async function calcularBetaIII(tabelaId, dados) {
  const { acertos } = dados;
  const resultadoFinal = (acertos / 25) * 100;

  const result = await query(`
    SELECT percentil, classificacao 
    FROM normas_beta_iii 
    WHERE tabela_id = $1 AND $2 BETWEEN acertos_min AND acertos_max
  `, [tabelaId, acertos]);

  if (result.rows.length === 0) {
    return { percentil: null, classificacao: 'Fora da faixa normativa' };
  }

  return {
    acertos,
    resultadoFinal,
    percentil: result.rows[0].percentil,
    classificacao: result.rows[0].classificacao
  };
}

/**
 * 3. BPA-2 - Atenção (Alternada, Concentrada, Dividida)
 * Conforme manual: AA (Atenção Alternada), AC (Atenção Concentrada), AD (Atenção Dividida)
 */
async function calcularBPA2(tabelasIds, dados) {
  const resultados = {};

  // tabelasIds pode ser um objeto { alternada, concentrada, dividida, geral } ou um número (compatibilidade)
  let tabelas = {
    alternada: null,
    concentrada: null,
    dividida: null,
    geral: null
  };
  
  // Compatibilidade: se for um número, usar para todas (modo antigo)
  if (typeof tabelasIds === 'number') {
    tabelas.alternada = tabelasIds;
    tabelas.concentrada = tabelasIds;
    tabelas.dividida = tabelasIds;
    tabelas.geral = tabelasIds;
  } else if (tabelasIds && typeof tabelasIds === 'object') {
    tabelas = tabelasIds;
  }

  // Atenção Alternada (AA)
  const acertos_alternada = dados.acertos_alternada || 0;
  const erros_alternada = dados.erros_alternada || 0;
  const omissoes_alternada = dados.omissoes_alternada || 0;
  const pontos_alternada = acertos_alternada - erros_alternada - omissoes_alternada;

  // Buscar percentil e classificação na tabela específica para AA
  if (!tabelas.alternada) {
    resultados.alternada = {
      pontos: pontos_alternada,
      percentil: null,
      classificacao: 'Tabela normativa não disponível',
      acertos: acertos_alternada,
      erros: erros_alternada,
      omissoes: omissoes_alternada
    };
  } else {
    try {
      // Buscar percentil e classificação
      // Se a pontuação estiver entre dois percentis, usar o percentil inferior (conforme manual)
      const valorCriterio = dados.valor_criterio || dados.idade || dados.escolaridade || 'Amostra Total';
      
      // Buscar normas - tentar com valor_criterio se fornecido, senão buscar "Amostra Total"
      let resultAlternada;
      
      console.log(`🔍 Buscando norma para AA: tabela_id=${tabelas.alternada}, pontos=${pontos_alternada}, valor_criterio=${valorCriterio}`);
      
      if (valorCriterio && valorCriterio !== 'Amostra Total') {
        // Buscar com valor_criterio específico
        resultAlternada = await query(`
          SELECT percentil, classificacao 
          FROM normas_bpa2 
          WHERE tabela_id = $1 
            AND tipo_atencao = 'Alternada' 
            AND (valor_criterio = $2 OR valor_criterio IS NULL)
            AND $3 >= pontos_min 
            AND ($3 <= pontos_max OR pontos_max = 999)
          ORDER BY 
            CASE WHEN valor_criterio = $2 THEN 1 ELSE 2 END,
            percentil DESC
          LIMIT 1
        `, [tabelas.alternada, valorCriterio, pontos_alternada]);
        
        // Se não encontrou com valor_criterio, buscar sem filtro (compatibilidade)
        if (resultAlternada.rows.length === 0) {
          resultAlternada = await query(`
            SELECT percentil, classificacao 
            FROM normas_bpa2 
            WHERE tabela_id = $1 
              AND tipo_atencao = 'Alternada' 
              AND $2 >= pontos_min 
              AND ($2 <= pontos_max OR pontos_max = 999)
            ORDER BY percentil DESC
            LIMIT 1
          `, [tabelas.alternada, pontos_alternada]);
        }
      } else {
        // Buscar por "Amostra Total" quando não há critério específico
        resultAlternada = await query(`
          SELECT percentil, classificacao 
          FROM normas_bpa2 
          WHERE tabela_id = $1 
            AND tipo_atencao = 'Alternada' 
            AND valor_criterio = 'Amostra Total'
            AND $2 >= pontos_min 
            AND ($2 <= pontos_max OR pontos_max = 999)
          ORDER BY percentil DESC
          LIMIT 1
        `, [tabelas.alternada, pontos_alternada]);
        
        // Se não encontrou "Amostra Total", buscar qualquer uma (compatibilidade)
        if (resultAlternada.rows.length === 0) {
          resultAlternada = await query(`
            SELECT percentil, classificacao 
            FROM normas_bpa2 
            WHERE tabela_id = $1 
              AND tipo_atencao = 'Alternada' 
              AND $2 >= pontos_min 
              AND ($2 <= pontos_max OR pontos_max = 999)
            ORDER BY percentil DESC
            LIMIT 1
          `, [tabelas.alternada, pontos_alternada]);
        }
      }
      
      console.log(`📊 Resultado AA: encontradas ${resultAlternada.rows.length} norma(s)`, resultAlternada.rows.length > 0 ? resultAlternada.rows[0] : 'Nenhuma');

      resultados.alternada = {
        pontos: pontos_alternada,
        percentil: resultAlternada.rows.length > 0 ? resultAlternada.rows[0].percentil : null,
        classificacao: resultAlternada.rows.length > 0 ? resultAlternada.rows[0].classificacao : 'Fora da faixa normativa',
        acertos: acertos_alternada,
        erros: erros_alternada,
        omissoes: omissoes_alternada
      };
    } catch (error) {
      console.error('Erro ao buscar norma para AA:', error);
      resultados.alternada = {
        pontos: pontos_alternada,
        percentil: null,
        classificacao: 'Erro ao buscar tabela normativa',
        acertos: acertos_alternada,
        erros: erros_alternada,
        omissoes: omissoes_alternada
      };
    }
  }

  // Atenção Concentrada (AC) - antes era "Sustentada"
  const acertos_concentrada = dados.acertos_concentrada || dados.acertos_sustentada || 0;
  const erros_concentrada = dados.erros_concentrada || dados.erros_sustentada || 0;
  const omissoes_concentrada = dados.omissoes_concentrada || dados.omissoes_sustentada || 0;
  const pontos_concentrada = acertos_concentrada - erros_concentrada - omissoes_concentrada;

  if (!tabelas.concentrada) {
    resultados.concentrada = {
      pontos: pontos_concentrada,
      percentil: null,
      classificacao: 'Tabela normativa não disponível',
      acertos: acertos_concentrada,
      erros: erros_concentrada,
      omissoes: omissoes_concentrada
    };
  } else {
    try {
      const valorCriterio = dados.valor_criterio || dados.idade || dados.escolaridade || 'Amostra Total';
      
      let resultConcentrada;
      
      if (valorCriterio && valorCriterio !== 'Amostra Total') {
        resultConcentrada = await query(`
          SELECT percentil, classificacao 
          FROM normas_bpa2 
          WHERE tabela_id = $1 
            AND tipo_atencao = 'Concentrada' 
            AND (valor_criterio = $2 OR valor_criterio IS NULL)
            AND $3 >= pontos_min 
            AND ($3 <= pontos_max OR pontos_max = 999)
          ORDER BY 
            CASE WHEN valor_criterio = $2 THEN 1 ELSE 2 END,
            percentil DESC
          LIMIT 1
        `, [tabelas.concentrada, valorCriterio, pontos_concentrada]);
        
        if (resultConcentrada.rows.length === 0) {
          resultConcentrada = await query(`
            SELECT percentil, classificacao 
            FROM normas_bpa2 
            WHERE tabela_id = $1 
              AND tipo_atencao = 'Concentrada' 
              AND $2 >= pontos_min 
              AND ($2 <= pontos_max OR pontos_max = 999)
            ORDER BY percentil DESC
            LIMIT 1
          `, [tabelas.concentrada, pontos_concentrada]);
        }
      } else {
        resultConcentrada = await query(`
          SELECT percentil, classificacao 
          FROM normas_bpa2 
          WHERE tabela_id = $1 
            AND tipo_atencao = 'Concentrada' 
            AND valor_criterio = 'Amostra Total'
            AND $2 >= pontos_min 
            AND ($2 <= pontos_max OR pontos_max = 999)
          ORDER BY percentil DESC
          LIMIT 1
        `, [tabelas.concentrada, pontos_concentrada]);
        
        if (resultConcentrada.rows.length === 0) {
          resultConcentrada = await query(`
            SELECT percentil, classificacao 
            FROM normas_bpa2 
            WHERE tabela_id = $1 
              AND tipo_atencao = 'Concentrada' 
              AND $2 >= pontos_min 
              AND ($2 <= pontos_max OR pontos_max = 999)
            ORDER BY percentil DESC
            LIMIT 1
          `, [tabelas.concentrada, pontos_concentrada]);
        }
      }

      resultados.concentrada = {
        pontos: pontos_concentrada,
        percentil: resultConcentrada.rows.length > 0 ? resultConcentrada.rows[0].percentil : null,
        classificacao: resultConcentrada.rows.length > 0 ? resultConcentrada.rows[0].classificacao : 'Fora da faixa normativa',
        acertos: acertos_concentrada,
        erros: erros_concentrada,
        omissoes: omissoes_concentrada
      };
    } catch (error) {
      console.error('Erro ao buscar norma para AC:', error);
      resultados.concentrada = {
        pontos: pontos_concentrada,
        percentil: null,
        classificacao: 'Erro ao buscar tabela normativa',
        acertos: acertos_concentrada,
        erros: erros_concentrada,
        omissoes: omissoes_concentrada
      };
    }
  }

  // Atenção Dividida (AD)
  const acertos_dividida = dados.acertos_dividida || 0;
  const erros_dividida = dados.erros_dividida || 0;
  const omissoes_dividida = dados.omissoes_dividida || 0;
  const pontos_dividida = acertos_dividida - erros_dividida - omissoes_dividida;

  if (!tabelas.dividida) {
    resultados.dividida = {
      pontos: pontos_dividida,
      percentil: null,
      classificacao: 'Tabela normativa não disponível',
      acertos: acertos_dividida,
      erros: erros_dividida,
      omissoes: omissoes_dividida
    };
  } else {
    try {
      const valorCriterio = dados.valor_criterio || dados.idade || dados.escolaridade || 'Amostra Total';
      
      let resultDividida;
      
      if (valorCriterio && valorCriterio !== 'Amostra Total') {
        resultDividida = await query(`
          SELECT percentil, classificacao 
          FROM normas_bpa2 
          WHERE tabela_id = $1 
            AND tipo_atencao = 'Dividida' 
            AND (valor_criterio = $2 OR valor_criterio IS NULL)
            AND $3 >= pontos_min 
            AND ($3 <= pontos_max OR pontos_max = 999)
          ORDER BY 
            CASE WHEN valor_criterio = $2 THEN 1 ELSE 2 END,
            percentil DESC
          LIMIT 1
        `, [tabelas.dividida, valorCriterio, pontos_dividida]);
        
        if (resultDividida.rows.length === 0) {
          resultDividida = await query(`
            SELECT percentil, classificacao 
            FROM normas_bpa2 
            WHERE tabela_id = $1 
              AND tipo_atencao = 'Dividida' 
              AND $2 >= pontos_min 
              AND ($2 <= pontos_max OR pontos_max = 999)
            ORDER BY percentil DESC
            LIMIT 1
          `, [tabelas.dividida, pontos_dividida]);
        }
      } else {
        resultDividida = await query(`
          SELECT percentil, classificacao 
          FROM normas_bpa2 
          WHERE tabela_id = $1 
            AND tipo_atencao = 'Dividida' 
            AND valor_criterio = 'Amostra Total'
            AND $2 >= pontos_min 
            AND ($2 <= pontos_max OR pontos_max = 999)
          ORDER BY percentil DESC
          LIMIT 1
        `, [tabelas.dividida, pontos_dividida]);
        
        if (resultDividida.rows.length === 0) {
          resultDividida = await query(`
            SELECT percentil, classificacao 
            FROM normas_bpa2 
            WHERE tabela_id = $1 
              AND tipo_atencao = 'Dividida' 
              AND $2 >= pontos_min 
              AND ($2 <= pontos_max OR pontos_max = 999)
            ORDER BY percentil DESC
            LIMIT 1
          `, [tabelas.dividida, pontos_dividida]);
        }
      }

      resultados.dividida = {
        pontos: pontos_dividida,
        percentil: resultDividida.rows.length > 0 ? resultDividida.rows[0].percentil : null,
        classificacao: resultDividida.rows.length > 0 ? resultDividida.rows[0].classificacao : 'Fora da faixa normativa',
        acertos: acertos_dividida,
        erros: erros_dividida,
        omissoes: omissoes_dividida
      };
    } catch (error) {
      console.error('Erro ao buscar norma para AD:', error);
      resultados.dividida = {
        pontos: pontos_dividida,
        percentil: null,
        classificacao: 'Erro ao buscar tabela normativa',
        acertos: acertos_dividida,
        erros: erros_dividida,
        omissoes: omissoes_dividida
      };
    }
  }

  // Atenção Geral: SOMA dos pontos (AA + AC + AD)
  // Conforme manual: "Pontos em AA + Pontos em AC + Pontos em AD = Pontos em Atenção Geral"
  const pontos_geral = pontos_alternada + pontos_concentrada + pontos_dividida;

  // Buscar percentil e classificação na tabela normativa específica para Atenção Geral
  if (!tabelas.geral) {
    resultados.geral = {
      pontos: pontos_geral,
      percentil: null,
      classificacao: 'Tabela normativa não disponível'
    };
  } else {
    try {
      const valorCriterio = dados.valor_criterio || dados.idade || dados.escolaridade || 'Amostra Total';
      
      let resultGeral;
      
      if (valorCriterio && valorCriterio !== 'Amostra Total') {
        resultGeral = await query(`
          SELECT percentil, classificacao 
          FROM normas_bpa2 
          WHERE tabela_id = $1 
            AND tipo_atencao = 'Geral' 
            AND (valor_criterio = $2 OR valor_criterio IS NULL)
            AND $3 >= pontos_min 
            AND ($3 <= pontos_max OR pontos_max = 999)
          ORDER BY 
            CASE WHEN valor_criterio = $2 THEN 1 ELSE 2 END,
            percentil DESC
          LIMIT 1
        `, [tabelas.geral, valorCriterio, pontos_geral]);
        
        if (resultGeral.rows.length === 0) {
          resultGeral = await query(`
            SELECT percentil, classificacao 
            FROM normas_bpa2 
            WHERE tabela_id = $1 
              AND tipo_atencao = 'Geral' 
              AND $2 >= pontos_min 
              AND ($2 <= pontos_max OR pontos_max = 999)
            ORDER BY percentil DESC
            LIMIT 1
          `, [tabelas.geral, pontos_geral]);
        }
      } else {
        resultGeral = await query(`
          SELECT percentil, classificacao 
          FROM normas_bpa2 
          WHERE tabela_id = $1 
            AND tipo_atencao = 'Geral' 
            AND valor_criterio = 'Amostra Total'
            AND $2 >= pontos_min 
            AND ($2 <= pontos_max OR pontos_max = 999)
          ORDER BY percentil DESC
          LIMIT 1
        `, [tabelas.geral, pontos_geral]);
        
        if (resultGeral.rows.length === 0) {
          resultGeral = await query(`
            SELECT percentil, classificacao 
            FROM normas_bpa2 
            WHERE tabela_id = $1 
              AND tipo_atencao = 'Geral' 
              AND $2 >= pontos_min 
              AND ($2 <= pontos_max OR pontos_max = 999)
            ORDER BY percentil DESC
            LIMIT 1
          `, [tabelas.geral, pontos_geral]);
        }
      }

      resultados.geral = {
        pontos: pontos_geral,
        percentil: resultGeral.rows.length > 0 ? resultGeral.rows[0].percentil : null,
        classificacao: resultGeral.rows.length > 0 ? resultGeral.rows[0].classificacao : 'Fora da faixa normativa'
      };
    } catch (error) {
      console.error('Erro ao buscar classificação Atenção Geral:', error);
      resultados.geral = {
        pontos: pontos_geral,
        percentil: null,
        classificacao: 'Erro ao buscar tabela normativa'
      };
    }
  }

  return resultados;
}

/**
 * 4. Rotas de Atenção (A, D, C)
 * @param {number|null} tabelaId - ID da tabela normativa (pode ser null para calcular apenas PBs)
 * @param {object} dados - Dados das rotas (acertos, erros, omissões)
 */
async function calcularRotas(tabelaId, dados) {
  const resultados = {};

  const tiposRota = [
    { tipo: 'A', prefixo: 'rota_a' },
    { tipo: 'D', prefixo: 'rota_d' },
    { tipo: 'C', prefixo: 'rota_c' }
  ];

  for (const rota of tiposRota) {
    const acertos = dados[`acertos_${rota.prefixo}`] || 0;
    const erros = dados[`erros_${rota.prefixo}`] || 0;
    const omissoes = dados[`omissoes_${rota.prefixo}`] || 0;
    const pb = acertos - erros - omissoes;

    // Se não há tabela, calcular apenas PB
    if (!tabelaId) {
      resultados[rota.tipo.toLowerCase()] = {
        acertos,
        erros,
        omissoes,
        pb,
        percentil: null,
        classificacao: 'Tabela normativa não disponível'
      };
    } else {
      // Buscar percentil e classificação na tabela normativa
      try {
        const result = await query(`
          SELECT percentil, classificacao 
          FROM normas_rotas 
          WHERE tabela_id = $1 AND rota_tipo = $2 AND $3 BETWEEN pontos_min AND pontos_max
        `, [tabelaId, rota.tipo, pb]);

        if (result.rows.length === 0) {
          resultados[rota.tipo.toLowerCase()] = {
            acertos,
            erros,
            omissoes,
            pb,
            percentil: null,
            classificacao: 'Fora da faixa normativa'
          };
        } else {
          resultados[rota.tipo.toLowerCase()] = {
            acertos,
            erros,
            omissoes,
            pb,
            percentil: result.rows[0].percentil,
            classificacao: result.rows[0].classificacao
          };
        }
      } catch (dbError) {
        console.error(`Erro ao buscar norma para rota ${rota.tipo}:`, dbError);
        resultados[rota.tipo.toLowerCase()] = {
          acertos,
          erros,
          omissoes,
          pb,
          percentil: null,
          classificacao: 'Erro ao buscar tabela normativa'
        };
      }
    }
  }

  // Nota: O teste Rotas de Atenção não possui MGA (Medida Geral de Atenção)
  // O MGA é específico do teste BPA-2

  return resultados;
}

/**
 * 5. MEMORE - Memória
 */
async function calcularMemore(tabelaId, dados) {
  const toInt = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const vp = toInt(dados.vp);
  const vn = toInt(dados.vn);
  const fn = toInt(dados.fn);
  const fp = toInt(dados.fp);

  const resultadoFinal = vp + vn - fn - fp;

  const result = await query(`
    SELECT percentil, classificacao 
    FROM normas_memore 
    WHERE tabela_id = $1 AND $2 BETWEEN resultado_min AND resultado_max
    ORDER BY percentil DESC
    LIMIT 1
  `, [tabelaId, resultadoFinal]);

  if (result.rows.length > 0) {
    return {
      vp,
      vn,
      fn,
      fp,
      resultadoFinal,
      percentil: result.rows[0].percentil,
      classificacao: result.rows[0].classificacao
    };
  }

  return {
    vp,
    vn,
    fn,
    fp,
    resultadoFinal,
    percentil: null,
    classificacao: 'Fora da faixa normativa'
  };
}

/**
 * 6. MIG - Avaliação Psicológica
 */
async function calcularMIG(tabelaId, dados) {
  const { acertos, idade, escolaridade } = dados;

  const result = await query(`
    SELECT percentil, classificacao 
    FROM normas_mig 
    WHERE tabela_id = $1 AND tipo_avaliacao = $2 AND $3 BETWEEN acertos_min AND acertos_max
  `, [tabelaId, escolaridade || 'Geral', acertos]);

  if (result.rows.length === 0) {
    return { percentil: null, classificacao: 'Fora da faixa normativa' };
  }

  return {
    acertos,
    percentil: result.rows[0].percentil,
    classificacao: result.rows[0].classificacao
  };
}

/**
 * 7. MVT - Memória Visual para o Trânsito
 */
async function calcularMVT(tabelaId, dados) {
  const { acertos, erros, omissao, tipo_cnh } = dados;
  const resultadoFinal = acertos - erros - omissao;

  const result = await query(`
    SELECT percentil, classificacao 
    FROM normas_mvt 
    WHERE tabela_id = $1 AND tipo_cnh = $2 AND $3 BETWEEN resultado_min AND resultado_max
  `, [tabelaId, tipo_cnh || 'Geral', resultadoFinal]);

  if (result.rows.length === 0) {
    return { percentil: null, classificacao: 'Fora da faixa normativa' };
  }

  return {
    acertos,
    erros,
    omissao,
    resultadoFinal,
    percentil: result.rows[0].percentil,
    classificacao: result.rows[0].classificacao
  };
}

/**
 * 8. R-1 - Raciocínio
 */
async function calcularR1(tabelaId, dados) {
  const { acertos, escolaridade } = dados;

  const result = await query(`
    SELECT percentil, classificacao 
    FROM normas_r1 
    WHERE tabela_id = $1 AND escolaridade = $2 AND $3 BETWEEN acertos_min AND acertos_max
  `, [tabelaId, escolaridade || 'Geral', acertos]);

  if (result.rows.length === 0) {
    return { percentil: null, classificacao: 'Fora da faixa normativa' };
  }

  return {
    acertos,
    percentil: result.rows[0].percentil,
    classificacao: result.rows[0].classificacao
  };
}

/**
 * 9. PALOGRÁFICO - Roteiro Completo (13 campos)
 * 
 * Campos quantitativos principais:
 * - produtividade (total de palos em 5 minutos)
 * - nor (nível oscilação rítmica)
 * - distancia_media (distância entre palos)
 * - media_tamanho_palos (tamanho médio dos palos)
 * - impulsividade (variação de tamanho)
 * 
 * Campos de análise:
 * - media_distancia_linhas
 * - media_margem_esquerda
 * - media_margem_direita
 * - media_margem_superior
 * - porcentagem_ganchos
 * - media_inclinacao
 * - media_direcao_linhas
 * - total_emotividade
 */
async function calcularPalografico(tabelaId, dados) {
  // Usar a calculadora específica do Palográfico
  const { calcularProdutividade, calcularNOR, calcularDistanciaMedia, calcularTamanhoPalos, calcularImpulsividade, calcularEmotividade, classificarPalografico, gerarInterpretacaoPalografico } = require('./palograficoCalculator');

  console.log('📊 calcularPalografico - Dados recebidos:', JSON.stringify(dados, null, 2));

  // Extrair tempos primeiro
  const tempos = dados.tempos || [dados.tempo1 || 0, dados.tempo2 || 0, dados.tempo3 || 0, dados.tempo4 || 0, dados.tempo5 || 0];
  const somaTempos = tempos.reduce((a, b) => a + b, 0);
  
  // Calcular produtividade - priorizar valor fornecido, depois calcular dos tempos
  let produtividade = null;
  if (dados.produtividade !== null && dados.produtividade !== undefined && dados.produtividade > 0) {
    produtividade = parseInt(dados.produtividade);
    console.log('📊 Produtividade fornecida diretamente:', produtividade);
  } else if (somaTempos > 0) {
    produtividade = calcularProdutividade(tempos);
    console.log('📊 Produtividade calculada dos tempos:', tempos, '→', produtividade);
  } else {
    produtividade = 0;
    console.log('⚠️ Nenhum dado de produtividade fornecido, usando 0');
  }
  
  // Calcular NOR - priorizar valor fornecido, depois calcular dos tempos
  let nor = null;
  if (dados.nor !== null && dados.nor !== undefined && dados.nor >= 0) {
    nor = parseFloat(dados.nor);
    console.log('📊 NOR fornecido diretamente:', nor);
  } else if (somaTempos > 0) {
    nor = calcularNOR(tempos);
    console.log('📊 NOR calculado dos tempos:', tempos, '→', nor);
  } else {
    nor = 0;
    console.log('⚠️ Nenhum dado de NOR fornecido, usando 0');
  }
  
  console.log('📊 Valores finais - Produtividade:', produtividade, 'NOR:', nor);

  // Calcular tamanho (se fornecido)
  let tamanho = null;
  if (dados.tamanhos_maiores && dados.tamanhos_menores) {
    tamanho = calcularTamanhoPalos(dados.tamanhos_maiores, dados.tamanhos_menores);
  } else if (dados.media_tamanho_palos) {
    tamanho = { media: dados.media_tamanho_palos };
  }

  // Calcular distância média (se fornecido)
  let distanciaMedia = null;
  if (dados.distancia_total && produtividade > 0) {
    distanciaMedia = calcularDistanciaMedia(dados.distancia_total, produtividade);
  } else if (dados.distancia_media) {
    distanciaMedia = dados.distancia_media;
  }

  // Calcular impulsividade (se fornecido)
  let impulsividade = null;
  if (dados.impulsividade) {
    impulsividade = dados.impulsividade;
  } else if (tamanho && tamanho.maiorValor && tamanho.menorValor) {
    impulsividade = calcularImpulsividade(tamanho.maiorValor, tamanho.menorValor);
  }

  // Calcular emotividade (se fornecido)
  let emotividade = 0;
  if (dados.total_emotividade !== undefined) {
    emotividade = dados.total_emotividade;
  } else if (dados.irregularidades) {
    emotividade = calcularEmotividade(dados.irregularidades);
  }

  // Buscar tabelas normativas e classificar
  let classificacoes = {};
  let tabelaSelecionada = null;

  if (tabelaId) {
    try {
      const tabelaResult = await query(`
        SELECT n.*, t.nome as tabela_nome
        FROM normas_palografico n
        JOIN tabelas_normativas t ON n.tabela_id = t.id
        WHERE n.tabela_id = $1
          AND ($2::VARCHAR IS NULL OR n.regiao = $2)
          AND ($3::VARCHAR IS NULL OR n.sexo = $3)
          AND ($4::VARCHAR IS NULL OR n.escolaridade = $4)
          AND ($5::INT IS NULL OR ($5 >= n.idade_minima AND $5 <= n.idade_maxima))
        LIMIT 1
      `, [tabelaId, dados.regiao || null, dados.sexo || null, dados.escolaridade || null, dados.idade || null]);

      if (tabelaResult.rows.length > 0) {
        const norma = tabelaResult.rows[0];
        tabelaSelecionada = norma.tabela_nome;

        // Classificar Produtividade
        classificacoes.produtividade = classificarPalografico(produtividade, {
          produtividade_muito_alta_min: norma.produtividade_muito_alta_min,
          produtividade_muito_alta_max: norma.produtividade_muito_alta_max,
          produtividade_alta_min: norma.produtividade_alta_min,
          produtividade_alta_max: norma.produtividade_alta_max,
          produtividade_media_min: norma.produtividade_media_min,
          produtividade_media_max: norma.produtividade_media_max,
          produtividade_baixa_min: norma.produtividade_baixa_min,
          produtividade_baixa_max: norma.produtividade_baixa_max,
          produtividade_muito_baixa_min: norma.produtividade_muito_baixa_min,
          produtividade_muito_baixa_max: norma.produtividade_muito_baixa_max
        });

        // Classificar NOR
        classificacoes.nor = classificarPalografico(nor, {
          nor_muito_alto_min: norma.nor_muito_alto_min,
          nor_muito_alto_max: norma.nor_muito_alto_max,
          nor_alto_min: norma.nor_alto_min,
          nor_alto_max: norma.nor_alto_max,
          nor_medio_min: norma.nor_medio_min,
          nor_medio_max: norma.nor_medio_max,
          nor_baixo_min: norma.nor_baixo_min,
          nor_baixo_max: norma.nor_baixo_max,
          nor_muito_baixo_min: norma.nor_muito_baixo_min,
          nor_muito_baixo_max: norma.nor_muito_baixo_max
        });

        // Classificar Tamanho (se disponível)
        if (tamanho && tamanho.media) {
          classificacoes.tamanho = classificarPalografico(tamanho.media, {
            tamanho_muito_grande_min: norma.tamanho_muito_grande_min,
            tamanho_grande_min: norma.tamanho_grande_min,
            tamanho_grande_max: norma.tamanho_grande_max,
            tamanho_medio_min: norma.tamanho_medio_min,
            tamanho_medio_max: norma.tamanho_medio_max,
            tamanho_pequeno_min: norma.tamanho_pequeno_min,
            tamanho_pequeno_max: norma.tamanho_pequeno_max,
            tamanho_muito_pequeno_min: norma.tamanho_muito_pequeno_min,
            tamanho_muito_pequeno_max: norma.tamanho_muito_pequeno_max
          });
        }

        // Classificar Distância (se disponível)
        if (distanciaMedia) {
          classificacoes.distancia = classificarPalografico(distanciaMedia, {
            distancia_muito_ampla_min: norma.distancia_muito_ampla_min,
            distancia_ampla_min: norma.distancia_ampla_min,
            distancia_ampla_max: norma.distancia_ampla_max,
            distancia_normal_min: norma.distancia_normal_min,
            distancia_normal_max: norma.distancia_normal_max,
            distancia_estreita_min: norma.distancia_estreita_min,
            distancia_estreita_max: norma.distancia_estreita_max,
            distancia_muito_estreita_min: norma.distancia_muito_estreita_min,
            distancia_muito_estreita_max: norma.distancia_muito_estreita_max
          });
        }
      }
    } catch (dbError) {
      console.log('⚠️ Erro ao buscar tabela normativa:', dbError.message);
    }
  }

  // Gerar interpretação completa
  const interpretacao = gerarInterpretacaoPalografico(
    {
      produtividade,
      nor,
      tamanho_medio: tamanho?.media,
      tamanho,
      distancia_media: distanciaMedia,
      impulsividade,
      emotividade,
      classificacao_produtividade: classificacoes.produtividade,
      classificacao_nor: classificacoes.nor
    },
    {
      inclinacao: dados.media_inclinacao ? interpretarInclinacao(dados.media_inclinacao) : null,
      margens_esquerda: dados.media_margem_esquerda ? interpretarMargem(dados.media_margem_esquerda) : null,
      pressao: null, // Não temos medida direta de pressão
      organizacao: dados.media_direcao_linhas ? interpretarOrganizacao(dados.media_direcao_linhas) : null
    },
    dados.contexto || 'transito'
  );

  return {
    // Valores calculados
    produtividade,
    nor,
    tamanho,
    distancia_media: distanciaMedia,
    impulsividade,
    emotividade,
    
    // Valores adicionais do roteiro
    media_distancia_linhas: dados.media_distancia_linhas || null,
    media_margem_esquerda: dados.media_margem_esquerda || null,
    media_margem_direita: dados.media_margem_direita || null,
    media_margem_superior: dados.media_margem_superior || null,
    porcentagem_ganchos: dados.porcentagem_ganchos || null,
    media_inclinacao: dados.media_inclinacao || null,
    media_direcao_linhas: dados.media_direcao_linhas || null,
    
    // Classificações
    classificacoes,
    
    // Interpretação
    interpretacao,
    
    // Metadados
    tabela_utilizada: tabelaSelecionada || 'Não disponível',
    tabela_id: tabelaId
  };
}

// Funções auxiliares para interpretação qualitativa
function interpretarInclinacao(valor) {
  if (valor > 70) return 'Direita';
  if (valor < 30) return 'Esquerda';
  return 'Vertical';
}

function interpretarMargem(valor) {
  if (valor > 20) return 'Ampla';
  if (valor < 10) return 'Estreita';
  return 'Normal';
}

function interpretarOrganizacao(valor) {
  if (valor > 80) return 'Ordenada';
  if (valor < 40) return 'Desorganizada';
  return 'Normal';
}

module.exports = {
  calcularAC,
  calcularBetaIII,
  calcularBPA2,
  calcularRotas,
  calcularMemore,
  calcularMIG,
  calcularMVT,
  calcularR1,
  calcularPalografico
};

