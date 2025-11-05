/**
 * Rotas para Teste MVT - Memória Visual para o Trânsito
 */

const express = require('express');
const { query } = require('../config/database');
const { calcularMVT } = require('../utils/calculadoras');
const router = express.Router();

/**
 * POST /api/mvt/calcular
 */
router.post('/calcular', async (req, res) => {
  try {
    const { acertos, erros, omissao, tipo_cnh, tabela_id } = req.body;

    if (acertos === undefined || erros === undefined || omissao === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Acertos, erros e omissão são obrigatórios'
      });
    }

    // Se não foi informada tabela_id, tentar buscar uma tabela padrão
    let tabelaIdFinal = tabela_id;
    
    if (!tabelaIdFinal) {
      try {
        const tabelaPadrao = await query(`
          SELECT id FROM tabelas_normativas 
          WHERE tipo = 'mvt' AND ativa = true 
          ORDER BY id ASC 
          LIMIT 1
        `);
        
        if (tabelaPadrao.rows.length > 0) {
          tabelaIdFinal = tabelaPadrao.rows[0].id;
          console.log('✅ Usando tabela padrão para MVT:', tabelaIdFinal);
        } else {
          console.log('⚠️ Nenhuma tabela normativa encontrada para MVT. Calculando sem percentil/classificação.');
          tabelaIdFinal = null;
        }
      } catch (dbError) {
        console.error('Erro ao buscar tabela padrão:', dbError);
        tabelaIdFinal = null;
      }
    }

    const resultado = await calcularMVT(tabelaIdFinal, {
      acertos,
      erros,
      omissao,
      tipo_cnh: tipo_cnh || 'Geral'
    });

    const response = {
      success: true,
      data: resultado
    };
    
    if (!tabelaIdFinal) {
      response.aviso = 'Nenhuma tabela normativa encontrada. Resultados calculados sem percentil/classificação. Popule as tabelas normativas para obter classificação completa.';
    }

    res.json(response);
  } catch (error) {
    console.error('Erro ao calcular MVT:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;

