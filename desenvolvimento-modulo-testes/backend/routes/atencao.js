/**
 * Rotas para Testes de Atenção (Expansão do AC)
 * 
 * Inclui:
 * - AC (já implementado)
 * - Rotas de Atenção (outros testes)
 * - BPA-2
 * - Rotas de Atenção
 */

const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

/**
 * POST /api/atencao/calcular
 * Calcula resultado de teste de atenção (genérico)
 * 
 * Body:
 * {
 *   tipo: 'ac' | 'bpa2' | 'rotas',
 *   dados: { acertos, erros, omissoes, ... },
 *   contexto: 'transito' | 'rh' | 'clinico'
 * }
 */
router.post('/calcular', async (req, res) => {
  try {
    const { tipo, dados, contexto } = req.body;

    if (!tipo || !dados) {
      return res.status(400).json({
        success: false,
        error: 'Tipo e dados são obrigatórios'
      });
    }

    // Redirecionar para AC se for teste AC
    if (tipo === 'ac') {
      // Redirecionar para rota do AC
      const acRoutes = require('./ac');
      return acRoutes.post('/calcular', req, res);
    }

    // Outros tipos de teste de atenção (implementar conforme necessário)
    res.json({
      success: true,
      message: `Cálculo de ${tipo} será implementado em breve`,
      tipo,
      dados
    });

  } catch (error) {
    console.error('Erro ao calcular atenção:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * GET /api/atencao/tipos
 * Lista tipos de testes de atenção disponíveis
 */
router.get('/tipos', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [
        {
          codigo: 'ac',
          nome: 'Teste AC (Atenção Concentrada)',
          descricao: 'Avaliação de atenção concentrada com acertos, erros e omissões',
          implementado: true
        },
        {
          codigo: 'bpa2',
          nome: 'BPA-2 (Bateria de Provas de Atenção)',
          descricao: 'Bateria completa de testes de atenção',
          implementado: false
        },
        {
          codigo: 'rotas',
          nome: 'Rotas de Atenção',
          descricao: 'Teste de atenção com timing e rotas',
          implementado: false
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

