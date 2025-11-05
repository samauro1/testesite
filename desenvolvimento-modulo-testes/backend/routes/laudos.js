/**
 * Rotas para Geração de Laudos Periciais
 * 
 * Funcionalidades:
 * - Gerar laudo em PDF
 * - Gerar laudo em Word
 * - Assinar digitalmente
 * - Backup e arquivamento
 */

const express = require('express');
const { query } = require('../config/database');
const ReportGenerator = require('../utils/reportGenerator');

const router = express.Router();

/**
 * POST /api/laudos/gerar
 * Gera laudo pericial
 * 
 * Body:
 * {
 *   paciente_id: number,
 *   avaliador_id: number,
 *   contexto_id: number,
 *   testes_resultados_ids: number[],
 *   observacoes?: string
 * }
 */
router.post('/gerar', async (req, res) => {
  try {
    const {
      paciente_id,
      avaliador_id,
      contexto_id,
      testes_resultados_ids,
      observacoes
    } = req.body;

    // TODO: Buscar dados do paciente, avaliador, contexto
    // Por enquanto, usar dados mockados
    const pacienteData = { id: paciente_id, nome: 'Paciente Teste' };
    const avaliadorData = { id: avaliador_id, nome: 'Avaliador Teste' };
    const contextoData = { id: contexto_id, tipo: 'transito', nome: 'Trânsito' };

    // Buscar resultados dos testes
    const testesResultados = [];
    for (const id of testes_resultados_ids) {
      try {
        const result = await query('SELECT * FROM testes_resultados WHERE id = $1', [id]);
        if (result.rows.length > 0) {
          testesResultados.push(result.rows[0]);
        }
      } catch (error) {
        console.error(`Erro ao buscar resultado ${id}:`, error);
      }
    }

    // Instanciar gerador
    const gerador = new ReportGenerator(
      pacienteData,
      avaliadorData,
      contextoData
    );

    // Gerar PDF (placeholder por enquanto)
    const pdfBuffer = await gerador.gerarPDF(testesResultados);

    // Gerar número de laudo
    const numeroLaudo = `LAU-${Date.now()}`;

    // Salvar no banco
    const laudoResult = await query(`
      INSERT INTO laudos_periciais (
        paciente_id, avaliador_id, contexto_id,
        numero_laudo, titulo,
        testes_resultados,
        conclusao_texto, parecer, parecer_detalhado,
        observacoes, recomendacoes,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      paciente_id,
      avaliador_id,
      contexto_id,
      numeroLaudo,
      `Laudo Psicológico - ${pacienteData.nome}`,
      testes_resultados_ids,
      'Conclusão será gerada automaticamente',
      'apto', // Será determinado pelo gerador
      'Parecer detalhado será gerado',
      observacoes || null,
      [], // Recomendações
      'rascunho'
    ]);

    res.json({
      success: true,
      data: {
        id: laudoResult.rows[0].id,
        numero_laudo: numeroLaudo,
        status: 'rascunho',
        message: 'Laudo criado. Geração de PDF será implementada em breve.'
      }
    });

  } catch (error) {
    console.error('Erro ao gerar laudo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * GET /api/laudos/listar/:paciente_id
 * Lista laudos de um paciente
 */
router.get('/listar/:paciente_id', async (req, res) => {
  try {
    const { paciente_id } = req.params;

    const result = await query(`
      SELECT * FROM laudos_periciais
      WHERE paciente_id = $1
      ORDER BY created_at DESC
    `, [paciente_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/laudos/assinar/:laudo_id
 * Assina laudo digitalmente
 */
router.post('/assinar/:laudo_id', async (req, res) => {
  try {
    const { laudo_id } = req.params;
    const { assinatura_digital_key } = req.body;

    const result = await query(`
      UPDATE laudos_periciais
      SET assinado = true,
          assinatura_digital_key = $1,
          data_assinatura = CURRENT_TIMESTAMP,
          status = 'assinado'
      WHERE id = $2
      RETURNING *
    `, [assinatura_digital_key, laudo_id]);

    res.json({
      success: true,
      message: 'Laudo assinado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;

