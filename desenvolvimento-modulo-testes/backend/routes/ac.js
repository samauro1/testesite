/**
 * Rotas específicas para o Teste AC (Atenção Concentrada)
 * 
 * Funcionalidades:
 * - Entrada manual de dados (acertos, erros, omissões)
 * - Cálculo automático de pontos, percentil e classificação
 * - Seleção inteligente de tabelas normativas
 * - Processamento de imagem (futuro)
 */

const express = require('express');
const { query } = require('../config/database');
const { calcularAC, buscarTabelasNormativas } = require('../services/acCalculatorService');
const { selecionarTabelaAC } = require('../utils/tabelaAcSelector');

const router = express.Router();

// TODO: Adicionar autenticação
// const { authenticateToken } = require('../middleware/auth');
// router.use(authenticateToken);

/**
 * POST /api/ac/calcular
 * Calcula resultado do teste AC a partir de dados manuais
 * 
 * Body:
 * {
 *   acertos: number,
 *   erros: number,
 *   omissoes: number,
 *   escolaridade?: string,
 *   regiao?: string,
 *   idade?: number,
 *   tabela_id?: number
 * }
 */
router.post('/calcular', async (req, res) => {
  try {
    console.log('📥 Recebida requisição POST /api/ac/calcular');
    console.log('📦 Body:', req.body);

    const { acertos, erros, omissoes, escolaridade, regiao, idade, tabela_id } = req.body;

    // Validar dados obrigatórios
    if (acertos === undefined || erros === undefined || omissoes === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos: acertos, erros e omissoes são obrigatórios'
      });
    }

    // Validar valores
    const A = Number(acertos);
    const E = Number(erros);
    const O = Number(omissoes);

    if (isNaN(A) || isNaN(E) || isNaN(O) || A < 0 || E < 0 || O < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valores inválidos: acertos, erros e omissões devem ser números não negativos'
      });
    }

    // Calcular pontos brutos (PB): P = A - (E + O)
    const pb = A - (E + O);

    console.log(`🧮 Cálculo: PB = ${A} - (${E} + ${O}) = ${pb}`);

    // Selecionar tabela normativa
    let tabelaId = tabela_id;
    let tabelaSelecionada = null;
    let sugestoes = [];

    // Se não foi informada tabela_id, usar seleção inteligente
    if (!tabelaId) {
      try {
        const selecao = await selecionarTabelaAC({
          regiao: regiao,
          escolaridade: escolaridade,
          idade: idade
        });
        tabelaId = selecao.tabelaId;
        tabelaSelecionada = selecao.tabelaNome;
        sugestoes = selecao.sugestoes;
        console.log('✅ Tabela selecionada automaticamente:', tabelaSelecionada);
      } catch (dbError) {
        console.log('⚠️ Erro ao selecionar tabela (banco pode não estar populado):', dbError.message);
      }
    } else {
      // Buscar informações da tabela informada
      try {
        const tabelaInfo = await query(`
          SELECT id, nome FROM tabelas_normativas WHERE id = $1 AND tipo = 'ac' AND ativa = true
        `, [tabelaId]);
        if (tabelaInfo.rows.length > 0) {
          tabelaSelecionada = tabelaInfo.rows[0].nome;
        }
      } catch (dbError) {
        console.log('⚠️ Erro ao buscar tabela:', dbError.message);
      }
    }

    // Calcular resultado
    let resultado = {
      pb,
      percentil: null,
      classificacao: 'Tabela normativa não disponível',
      acertos: A,
      erros: E,
      omissoes: O
    };

    if (tabelaId) {
      try {
        resultado = await calcularAC(tabelaId, {
          acertos: A,
          erros: E,
          omissoes: O,
          escolaridade: escolaridade || 'Total'
        });
      } catch (dbError) {
        console.log('⚠️ Erro ao calcular percentil:', dbError.message);
        // Continuar com resultado básico
      }
    }

    // Buscar informações da tabela usada (se disponível)
    if (!tabelaSelecionada && tabelaId) {
      try {
        const tabelaInfo = await query(`
          SELECT id, nome, criterio FROM tabelas_normativas WHERE id = $1
        `, [tabelaId]);
        
        if (tabelaInfo.rows.length > 0) {
          tabelaSelecionada = tabelaInfo.rows[0].nome || 'Desconhecida';
        }
      } catch (dbError) {
        console.log('⚠️ Erro ao buscar nome da tabela:', dbError.message);
      }
    }

    console.log('✅ Resultado calculado:', resultado);

    res.json({
      success: true,
      data: {
        ...resultado,
        formula: `P = A - (E + O) = ${A} - (${E} + ${O}) = ${pb}`,
        tabela_utilizada: tabelaSelecionada || 'Não disponível',
        tabela_id: tabelaId,
        sugestoes: sugestoes.length > 0 ? sugestoes : undefined
      }
    });
  } catch (error) {
    console.error('❌ Erro ao calcular AC:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/ac/sugerir-tabela
 * Sugere tabela normativa baseada em critérios
 * 
 * Body:
 * {
 *   regiao?: string,
 *   escolaridade?: string,
 *   idade?: number
 * }
 */
router.post('/sugerir-tabela', async (req, res) => {
  try {
    const { regiao, escolaridade, idade } = req.body;

    const selecao = await selecionarTabelaAC({
      regiao,
      escolaridade,
      idade
    });

    res.json({
      success: true,
      data: selecao
    });
  } catch (error) {
    console.error('Erro ao sugerir tabela:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * POST /api/ac/processar-imagem
 * Processa imagem do teste preenchido para correção automática
 * 
 * Body:
 * {
 *   imagem_teste: File (base64 ou FormData),
 *   imagem_crivo?: File (opcional, pode ser pré-carregado)
 * }
 * 
 * TODO: Implementar processamento de imagem
 */
router.post('/processar-imagem', async (req, res) => {
  try {
    // TODO: Implementar processamento de imagem
    // 1. Receber imagem do teste preenchido
    // 2. Receber imagem do crivo (ou usar pré-carregado)
    // 3. Detectar símbolos, marcas, círculos
    // 4. Comparar posições
    // 5. Calcular acertos, erros, omissões
    // 6. Retornar resultado

    res.status(501).json({
      success: false,
      error: 'Processamento de imagem ainda não implementado',
      message: 'Esta funcionalidade será implementada em breve'
    });
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * GET /api/ac/tabelas
 * Lista tabelas normativas disponíveis para AC
 * 
 * Query params:
 * - regiao?: string
 * - escolaridade?: string
 */
router.get('/tabelas', async (req, res) => {
  try {
    const { regiao, escolaridade } = req.query;
    
    const tabelas = await buscarTabelasNormativas({ regiao, escolaridade });

    res.json({
      success: true,
      data: tabelas
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
