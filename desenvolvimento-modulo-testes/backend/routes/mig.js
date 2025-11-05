/**
 * Rotas para Teste MIG - Avaliação Psicológica
 */

const express = require('express');
const { query } = require('../config/database');
const { calcularMIG } = require('../utils/calculadoras');
const router = express.Router();

/**
 * POST /api/mig/calcular
 */
router.post('/calcular', async (req, res) => {
  try {
    const { acertos, idade, escolaridade, tabela_id } = req.body;

    if (acertos === undefined || acertos < 0 || acertos > 28) {
      return res.status(400).json({
        success: false,
        error: 'Acertos deve ser um número entre 0 e 28'
      });
    }

    // Se não foi informada tabela_id, tentar buscar uma tabela padrão
    let tabelaIdFinal = tabela_id;
    
    if (!tabelaIdFinal) {
      try {
        const tabelaPadrao = await query(`
          SELECT id FROM tabelas_normativas 
          WHERE tipo = 'mig' AND ativa = true 
          ORDER BY id ASC 
          LIMIT 1
        `);
        
        if (tabelaPadrao.rows.length > 0) {
          tabelaIdFinal = tabelaPadrao.rows[0].id;
          console.log('✅ Usando tabela padrão para MIG:', tabelaIdFinal);
        } else {
          console.log('⚠️ Nenhuma tabela normativa encontrada para MIG. Calculando sem percentil/classificação.');
          tabelaIdFinal = null;
        }
      } catch (dbError) {
        console.error('Erro ao buscar tabela padrão:', dbError);
        tabelaIdFinal = null;
      }
    }

    const resultado = await calcularMIG(tabelaIdFinal, {
      acertos,
      idade,
      escolaridade: escolaridade || 'Geral'
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
    console.error('Erro ao calcular MIG:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;

