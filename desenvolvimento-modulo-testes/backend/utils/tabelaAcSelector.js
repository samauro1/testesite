/**
 * Utilitário para Seleção Inteligente de Tabelas Normativas do AC
 * 
 * Baseado em:
 * - Região geográfica
 * - Escolaridade
 * - Idade (18-64 anos)
 */

const { query } = require('../config/database');

/**
 * Seleciona a melhor tabela normativa para o teste AC
 * 
 * @param {Object} criterios - { regiao, escolaridade, idade }
 * @returns {Object} { tabelaId, tabelaNome, sugestoes[] }
 */
async function selecionarTabelaAC(criterios = {}) {
  try {
    const { regiao, escolaridade, idade } = criterios;

    console.log('🔍 Selecionando tabela AC:', { regiao, escolaridade, idade });

    // Validar idade (deve estar entre 18-64)
    if (idade && (idade < 18 || idade > 64)) {
      console.log('⚠️ Idade fora da faixa válida (18-64 anos)');
    }

    // Mapear região
    const regiaoMap = {
      'sul': 'Sul',
      'sudeste': 'Sudeste',
      'centro-oeste': 'Centro-oeste',
      'nordeste': 'Nordeste',
      'norte': 'Norte',
      'geral': 'Geral'
    };

    const regiaoNormalizada = regiao ? regiaoMap[regiao.toLowerCase()] || regiao : null;

    // Buscar tabelas disponíveis
    let queryText = `
      SELECT id, nome, criterio, descricao
      FROM tabelas_normativas
      WHERE tipo = 'ac' AND ativa = true
    `;

    const params = [];

    if (regiaoNormalizada) {
      params.push(`%${regiaoNormalizada}%`);
      queryText += ` AND (criterio ILIKE $${params.length} OR nome ILIKE $${params.length})`;
    }

    queryText += ' ORDER BY CASE WHEN criterio ILIKE \'%Geral%\' OR criterio ILIKE \'%Total%\' THEN 2 ELSE 1 END, nome';

    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      return {
        tabelaId: null,
        tabelaNome: null,
        sugestoes: [],
        mensagem: 'Nenhuma tabela normativa encontrada para o AC'
      };
    }

    // Priorizar tabela da região específica
    let tabelaRecomendada = null;
    if (regiaoNormalizada && regiaoNormalizada !== 'Geral') {
      tabelaRecomendada = result.rows.find(t => 
        t.criterio?.includes(regiaoNormalizada) || 
        t.nome?.includes(regiaoNormalizada)
      );
    }

    // Se não encontrou específica, usar Geral
    if (!tabelaRecomendada) {
      tabelaRecomendada = result.rows.find(t => 
        t.criterio?.includes('Geral') || 
        t.nome?.includes('Geral') ||
        t.nome?.includes('Tabela 19')
      );
    }

    // Se ainda não encontrou, usar a primeira
    if (!tabelaRecomendada) {
      tabelaRecomendada = result.rows[0];
    }

    return {
      tabelaId: tabelaRecomendada.id,
      tabelaNome: tabelaRecomendada.nome,
      sugestoes: result.rows.map(t => ({
        id: t.id,
        nome: t.nome,
        criterio: t.criterio,
        recomendada: t.id === tabelaRecomendada.id
      })),
      criteriosUsados: { regiao: regiaoNormalizada, escolaridade }
    };
  } catch (error) {
    console.error('❌ Erro ao selecionar tabela AC:', error);
    throw error;
  }
}

module.exports = { selecionarTabelaAC };

