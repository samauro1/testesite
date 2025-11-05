/**
 * Serviço de Cálculo do Teste AC (Atenção Concentrada)
 * 
 * Este serviço implementa:
 * - Cálculo de pontos: P = A - (E + O)
 * - Busca de percentil em tabelas normativas
 * - Classificação baseada em percentil
 */

const { query } = require('../config/database');

/**
 * Calcula o resultado do teste AC
 * @param {Object} dados - Dados de entrada { acertos, erros, omissoes, escolaridade }
 * @param {number} tabelaId - ID da tabela normativa a ser usada
 * @returns {Object} { pb, percentil, classificacao }
 */
async function calcularAC(tabelaId, dados) {
  const { acertos, erros, omissoes, escolaridade } = dados;
  
  // Validar dados de entrada
  if (acertos === undefined || erros === undefined || omissoes === undefined) {
    throw new Error('Dados incompletos: acertos, erros e omissoes são obrigatórios');
  }

  // Converter para números
  const A = Number(acertos) || 0;
  const E = Number(erros) || 0;
  const O = Number(omissoes) || 0;

  // Calcular pontos brutos (PB): P = A - (E + O)
  const pb = A - (E + O);

  // Verificar se os valores são razoáveis
  if (pb < 0) {
    return { 
      pb, 
      percentil: null, 
      classificacao: 'Valores inválidos (PB negativo)',
      acertos: A,
      erros: E,
      omissoes: O
    };
  }

  // Mapear escolaridade para o formato correto
  const escolaridadeMap = {
    'Ensino Fundamental': 'fundamental',
    'Ensino Médio': 'medio',
    'Ensino Superior': 'superior',
    'Total': 'total',
    'Fundamental': 'fundamental',
    'Médio': 'medio',
    'Superior': 'superior'
  };

  const nivelEscolaridade = escolaridadeMap[escolaridade] || 'total';

  // Buscar percentil na tabela normativa
  // As tabelas de AC usam faixas baseadas em escolaridade
  let result;
  try {
    let queryText = '';
    let queryParams = [tabelaId, pb];

    if (nivelEscolaridade === 'fundamental') {
      queryText = `
        SELECT classificacao, percentil 
        FROM normas_ac 
        WHERE tabela_id = $1 AND $2 BETWEEN fundamental_min AND fundamental_max
        ORDER BY percentil DESC
        LIMIT 1
      `;
    } else if (nivelEscolaridade === 'medio') {
      queryText = `
        SELECT classificacao, percentil 
        FROM normas_ac 
        WHERE tabela_id = $1 AND $2 BETWEEN medio_min AND medio_max
        ORDER BY percentil DESC
        LIMIT 1
      `;
    } else if (nivelEscolaridade === 'superior') {
      queryText = `
        SELECT classificacao, percentil 
        FROM normas_ac 
        WHERE tabela_id = $1 AND $2 BETWEEN superior_min AND superior_max
        ORDER BY percentil DESC
        LIMIT 1
      `;
    } else {
      // Total - buscar na coluna total
      queryText = `
        SELECT classificacao, percentil 
        FROM normas_ac 
        WHERE tabela_id = $1 AND $2 BETWEEN total_min AND total_max
        ORDER BY percentil DESC
        LIMIT 1
      `;
    }

    result = await query(queryText, queryParams);
  } catch (dbError) {
    // Se a tabela não existe ou não tem dados, retornar resultado básico
    console.log('⚠️ Tabela normativa não encontrada ou vazia:', dbError.message);
    return {
      pb,
      percentil: null,
      classificacao: 'Tabela normativa não disponível',
      acertos: A,
      erros: E,
      omissoes: O
    };
  }

  if (result.rows.length === 0) {
    // Tentar buscar usando amostra total como fallback
    try {
      const resultTotal = await query(`
        SELECT classificacao, percentil 
        FROM normas_ac 
        WHERE tabela_id = $1 AND $2 BETWEEN total_min AND total_max
        ORDER BY percentil DESC
        LIMIT 1
      `, [tabelaId, pb]);

      if (resultTotal.rows.length === 0) {
        return {
          pb,
          percentil: null,
          classificacao: 'Fora da faixa normativa ou tabela não populada',
          acertos: A,
          erros: E,
          omissoes: O
        };
      }

      return {
        pb,
        percentil: resultTotal.rows[0].percentil,
        classificacao: resultTotal.rows[0].classificacao,
        acertos: A,
        erros: E,
        omissoes: O
      };
    } catch (dbError) {
      console.log('⚠️ Erro ao buscar percentil:', dbError.message);
      return {
        pb,
        percentil: null,
        classificacao: 'Tabela normativa não disponível',
        acertos: A,
        erros: E,
        omissoes: O
      };
    }
  }

  return {
    pb,
    percentil: result.rows[0].percentil,
    classificacao: result.rows[0].classificacao,
    acertos: A,
    erros: E,
    omissoes: O
  };
}

/**
 * Busca tabelas normativas disponíveis para AC
 * @param {Object} criterios - { regiao, escolaridade, idade }
 * @returns {Array} Lista de tabelas normativas
 */
async function buscarTabelasNormativas(criterios = {}) {
  const { regiao, escolaridade } = criterios;

  let queryText = `
    SELECT id, nome, tipo, versao, criterio, descricao, ativa
    FROM tabelas_normativas
    WHERE tipo = 'ac' AND ativa = true
  `;

  const params = [];

  if (regiao) {
    params.push(regiao);
    queryText += ` AND criterio ILIKE $${params.length}`;
  }

  queryText += ' ORDER BY nome';

  const result = await query(queryText, params);
  return result.rows;
}

/**
 * Classifica percentil em categoria
 * @param {number} percentil - Percentil obtido
 * @returns {string} Classificação
 */
function classificarPercentil(percentil) {
  if (!percentil) return 'Fora da faixa normativa';

  if (percentil >= 99) return 'Muito Superior';
  if (percentil >= 95) return 'Superior';
  if (percentil >= 90) return 'Médio Superior';
  if (percentil >= 80) return 'Médio Superior';
  if (percentil >= 75) return 'Médio';
  if (percentil >= 70) return 'Médio';
  if (percentil >= 60) return 'Médio';
  if (percentil >= 50) return 'Médio';
  if (percentil >= 40) return 'Médio Inferior';
  if (percentil >= 30) return 'Médio Inferior';
  if (percentil >= 25) return 'Médio Inferior';
  if (percentil >= 20) return 'Médio Inferior';
  if (percentil >= 10) return 'Inferior';
  if (percentil >= 5) return 'Inferior';
  if (percentil >= 1) return 'Inferior';

  return 'Fora da faixa normativa';
}

module.exports = {
  calcularAC,
  buscarTabelasNormativas,
  classificarPercentil
};

