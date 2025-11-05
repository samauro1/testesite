/**
 * Rotas para Teste de Memória
 * 
 * Funcionalidades:
 * - Cálculo de evocação imediata e tardia
 * - Cálculo de retenção
 * - Cálculo de reconhecimento
 * - Classificação contra tabelas normativas
 */

const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

/**
 * POST /api/memoria/calcular
 * Calcula resultado do teste de memória
 * 
 * Body:
 * {
 *   evocacao_imediata: number,
 *   evocacao_tardia: number,
 *   retencao: number,
 *   reconhecimento: number,
 *   regiao?: string,
 *   escolaridade?: string,
 *   idade?: number,
 *   tabela_id?: number
 * }
 */
router.post('/calcular', async (req, res) => {
  try {
    console.log('📥 Recebida requisição POST /api/memoria/calcular');
    console.log('📦 Body:', req.body);

    const {
      evocacao_imediata,
      evocacao_tardia,
      retencao,
      reconhecimento,
      regiao,
      escolaridade,
      idade,
      tabela_id
    } = req.body;

    // Validar dados obrigatórios
    if (evocacao_imediata === undefined || evocacao_tardia === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos: evocação imediata e tardia são obrigatórias'
      });
    }

    // Calcular retenção se não fornecida
    const retencaoCalculada = retencao !== undefined 
      ? retencao 
      : evocacao_tardia; // Retenção = evocação tardia se não fornecida

    // Calcular percentual de retenção
    const percentualRetencao = evocacao_imediata > 0
      ? ((retencaoCalculada / evocacao_imediata) * 100).toFixed(1)
      : 0;

    // Buscar classificações se tabela fornecida
    let classificacoes = {};
    let tabelaSelecionada = null;

    if (tabela_id) {
      try {
        const tabelaResult = await query(`
          SELECT n.*, t.nome as tabela_nome
          FROM normas_memoria n
          JOIN tabelas_normativas t ON n.tabela_id = t.id
          WHERE n.tabela_id = $1
            AND ($2::VARCHAR IS NULL OR n.regiao = $2)
            AND ($3::VARCHAR IS NULL OR n.escolaridade = $3)
            AND ($4::INT IS NULL OR ($4 >= n.idade_minima AND $4 <= n.idade_maxima))
          LIMIT 1
        `, [tabela_id, regiao || null, escolaridade || null, idade || null]);

        if (tabelaResult.rows.length > 0) {
          const norma = tabelaResult.rows[0];
          tabelaSelecionada = norma.tabela_nome;

          // Classificar Evocação
          if (evocacao_tardia >= norma.evocacao_excelente_min) {
            classificacoes.evocacao = 'Excelente';
          } else if (evocacao_tardia >= norma.evocacao_bom_min && evocacao_tardia <= norma.evocacao_bom_max) {
            classificacoes.evocacao = 'Bom';
          } else if (evocacao_tardia >= norma.evocacao_medio_min && evocacao_tardia <= norma.evocacao_medio_max) {
            classificacoes.evocacao = 'Médio';
          } else {
            classificacoes.evocacao = 'Abaixo da Média';
          }

          // Classificar Retenção
          if (retencaoCalculada >= norma.retencao_excelente_min) {
            classificacoes.retencao = 'Excelente';
          } else if (retencaoCalculada >= norma.retencao_bom_min && retencaoCalculada <= norma.retencao_bom_max) {
            classificacoes.retencao = 'Bom';
          } else if (retencaoCalculada >= norma.retencao_medio_min && retencaoCalculada <= norma.retencao_medio_max) {
            classificacoes.retencao = 'Médio';
          } else {
            classificacoes.retencao = 'Abaixo da Média';
          }

          // Classificar Reconhecimento (se fornecido)
          if (reconhecimento !== undefined && norma.reconhecimento_excelente_min !== null) {
            if (reconhecimento >= norma.reconhecimento_excelente_min) {
              classificacoes.reconhecimento = 'Excelente';
            } else if (reconhecimento >= norma.reconhecimento_bom_min && reconhecimento <= norma.reconhecimento_bom_max) {
              classificacoes.reconhecimento = 'Bom';
            } else if (reconhecimento >= norma.reconhecimento_medio_min && reconhecimento <= norma.reconhecimento_medio_max) {
              classificacoes.reconhecimento = 'Médio';
            } else {
              classificacoes.reconhecimento = 'Abaixo da Média';
            }
          }
        }
      } catch (dbError) {
        console.log('⚠️ Erro ao buscar tabela normativa:', dbError.message);
      }
    }

    console.log('✅ Resultado calculado');

    res.json({
      success: true,
      data: {
        // Valores
        evocacao_imediata,
        evocacao_tardia,
        retencao: retencaoCalculada,
        reconhecimento,
        percentual_retencao: percentualRetencao,
        
        // Classificações
        classificacoes,
        
        // Metadados
        tabela_utilizada: tabelaSelecionada || 'Não disponível',
        tabela_id: tabela_id,
        interpretacao: gerarInterpretacaoMemoria(evocacao_imediata, evocacao_tardia, retencaoCalculada, reconhecimento, classificacoes)
      }
    });
  } catch (error) {
    console.error('❌ Erro ao calcular Memória:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * Gera interpretação do teste de memória
 */
function gerarInterpretacaoMemoria(evocacaoImediata, evocacaoTardia, retencao, reconhecimento, classificacoes) {
  const interpretacao = {
    evocacao: {
      valor: evocacaoTardia,
      classificacao: classificacoes.evocacao || 'Não classificada',
      interpretacao: interpretarEvocacao(evocacaoTardia, classificacoes.evocacao)
    },
    retencao: {
      valor: retencao,
      percentual: ((retencao / evocacaoImediata) * 100).toFixed(1),
      classificacao: classificacoes.retencao || 'Não classificada',
      interpretacao: interpretarRetencao(retencao, evocacaoImediata, classificacoes.retencao)
    }
  };

  if (reconhecimento !== undefined) {
    interpretacao.reconhecimento = {
      valor: reconhecimento,
      classificacao: classificacoes.reconhecimento || 'Não classificada',
      interpretacao: interpretarReconhecimento(reconhecimento, classificacoes.reconhecimento)
    };
  }

  return interpretacao;
}

function interpretarEvocacao(valor, classificacao) {
  if (classificacao === 'Excelente') {
    return 'Capacidade de evocação muito superior. Memória de trabalho excelente.';
  }
  if (classificacao === 'Bom') {
    return 'Capacidade de evocação acima da média. Boa memória de trabalho.';
  }
  if (classificacao === 'Médio') {
    return 'Capacidade de evocação dentro dos padrões normais.';
  }
  return 'Capacidade de evocação abaixo da média. Pode requerer atenção.';
}

function interpretarRetencao(valor, evocacaoImediata, classificacao) {
  const percentual = ((valor / evocacaoImediata) * 100).toFixed(1);
  
  if (classificacao === 'Excelente') {
    return `Retenção excelente (${percentual}% da evocação imediata). Memória de longo prazo muito eficiente.`;
  }
  if (classificacao === 'Bom') {
    return `Retenção boa (${percentual}% da evocação imediata). Memória de longo prazo adequada.`;
  }
  if (classificacao === 'Médio') {
    return `Retenção média (${percentual}% da evocação imediata). Memória de longo prazo dentro dos padrões.`;
  }
  return `Retenção abaixo da média (${percentual}% da evocação imediata). Pode indicar dificuldades de memória de longo prazo.`;
}

function interpretarReconhecimento(valor, classificacao) {
  if (classificacao === 'Excelente') {
    return 'Capacidade de reconhecimento muito superior. Memória de reconhecimento excelente.';
  }
  if (classificacao === 'Bom') {
    return 'Capacidade de reconhecimento acima da média.';
  }
  if (classificacao === 'Médio') {
    return 'Capacidade de reconhecimento dentro dos padrões normais.';
  }
  return 'Capacidade de reconhecimento abaixo da média.';
}

/**
 * GET /api/memoria/tabelas
 * Lista tabelas normativas disponíveis para Memória
 */
router.get('/tabelas', async (req, res) => {
  try {
    const { regiao, escolaridade } = req.query;
    
    let queryText = `
      SELECT DISTINCT
        t.id,
        t.nome,
        t.criterio,
        n.regiao,
        n.escolaridade,
        n.idade_minima,
        n.idade_maxima
      FROM tabelas_normativas t
      JOIN normas_memoria n ON n.tabela_id = t.id
      WHERE t.tipo = 'memoria' AND t.ativa = true
    `;

    const params = [];
    if (regiao) {
      params.push(regiao);
      queryText += ` AND n.regiao = $${params.length}`;
    }
    if (escolaridade) {
      params.push(escolaridade);
      queryText += ` AND n.escolaridade = $${params.length}`;
    }

    queryText += ' ORDER BY n.regiao, n.escolaridade';

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar tabelas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;

