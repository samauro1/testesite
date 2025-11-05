/**
 * Rotas da API de Testes Psicológicos
 * Ambiente de Desenvolvimento Isolado
 * 
 * Este arquivo contém as rotas para o módulo de testes,
 * desenvolvido isoladamente para não afetar o sistema principal.
 */

const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// TODO: Adicionar autenticação quando necessário
// const { authenticateToken } = require('../middleware/auth');
// router.use(authenticateToken);

/**
 * GET /api/testes
 * Lista todos os tipos de testes disponíveis
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, codigo, nome, descricao, ativo, created_at
      FROM testes_tipos
      WHERE ativo = true
      ORDER BY nome
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar testes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/testes/:tipo
 * Obter informações sobre um tipo de teste específico
 */
router.get('/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params;

    // Buscar tipo de teste
    const tipoResult = await query(`
      SELECT id, codigo, nome, descricao, ativo
      FROM testes_tipos
      WHERE codigo = $1 AND ativo = true
    `, [tipo]);

    if (tipoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de teste não encontrado'
      });
    }

    // Buscar campos do teste
    const camposResult = await query(`
      SELECT nome, label, tipo, obrigatorio, min_valor, max_valor, opcoes, ordem
      FROM testes_campos
      WHERE teste_tipo_id = $1
      ORDER BY ordem
    `, [tipoResult.rows[0].id]);

    res.json({
      success: true,
      data: {
        ...tipoResult.rows[0],
        campos: camposResult.rows
      }
    });
  } catch (error) {
    console.error('Erro ao buscar teste:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/testes/:tipo/calcular
 * Calcular resultado de um teste
 * 
 * TODO: Implementar lógica de cálculo para cada tipo de teste
 */
router.post('/:tipo/calcular', async (req, res) => {
  try {
    const { tipo } = req.params;
    const dadosEntrada = req.body;

    // Validar tipo de teste
    const tipoResult = await query(`
      SELECT id FROM testes_tipos WHERE codigo = $1 AND ativo = true
    `, [tipo]);

    if (tipoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de teste não encontrado'
      });
    }

    // TODO: Implementar cálculo baseado no tipo
    // Por enquanto, retornar estrutura básica
    const resultado = {
      tipo: tipo,
      dados_entrada: dadosEntrada,
      resultado_calculado: {
        mensagem: 'Cálculo ainda não implementado para este teste'
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Erro ao calcular teste:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/testes/:tipo/campos
 * Obter campos de entrada de um teste específico
 */
router.get('/:tipo/campos', async (req, res) => {
  try {
    const { tipo } = req.params;

    const tipoResult = await query(`
      SELECT id FROM testes_tipos WHERE codigo = $1 AND ativo = true
    `, [tipo]);

    if (tipoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de teste não encontrado'
      });
    }

    const camposResult = await query(`
      SELECT nome, label, tipo, obrigatorio, min_valor, max_valor, opcoes, ordem
      FROM testes_campos
      WHERE teste_tipo_id = $1
      ORDER BY ordem
    `, [tipoResult.rows[0].id]);

    res.json({
      success: true,
      data: camposResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar campos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

