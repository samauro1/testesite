/**
 * Rotas para Teste MEMORE - Memória
 */

const express = require('express');
const { query } = require('../config/database');
const { calcularMemore } = require('../utils/calculadoras');
const router = express.Router();

/**
 * POST /api/memore/calcular
 */
router.post('/calcular', async (req, res) => {
  try {
    const { vp, vn, fn, fp, tabela_id } = req.body;

    if (vp === undefined || vn === undefined || fn === undefined || fp === undefined) {
      return res.status(400).json({
        success: false,
        error: 'VP, VN, FN e FP são obrigatórios'
      });
    }

    // Se não foi informada tabela_id, tentar buscar uma tabela padrão
    let tabelaIdFinal = tabela_id;
    
    if (!tabelaIdFinal) {
      try {
        const tabelaPadrao = await query(`
          SELECT id FROM tabelas_normativas 
          WHERE tipo = 'memore' AND ativa = true 
          ORDER BY id ASC 
          LIMIT 1
        `);
        
        if (tabelaPadrao.rows.length > 0) {
          tabelaIdFinal = tabelaPadrao.rows[0].id;
          console.log('✅ Usando tabela padrão para MEMORE:', tabelaIdFinal);
        } else {
          console.log('⚠️ Nenhuma tabela normativa encontrada para MEMORE. Calculando sem percentil/classificação.');
          tabelaIdFinal = null;
        }
      } catch (dbError) {
        console.error('Erro ao buscar tabela padrão:', dbError);
        tabelaIdFinal = null;
      }
    }

    const resultado = await calcularMemore(tabelaIdFinal, {
      vp: parseInt(vp) || 0,
      vn: parseInt(vn) || 0,
      fn: parseInt(fn) || 0,
      fp: parseInt(fp) || 0
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
    console.error('Erro ao calcular MEMORE:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;

