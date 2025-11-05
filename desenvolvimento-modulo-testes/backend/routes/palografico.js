/**
 * Rotas específicas para o Teste Palográfico
 * 
 * Funcionalidades:
 * - Entrada manual de dados (tempos por minuto, tamanhos, distâncias)
 * - Cálculo automático de Produtividade, NOR, Tamanho, Distância
 * - Classificação contra tabelas normativas
 * - Processamento de imagem (futuro)
 */

const express = require('express');
const { query } = require('../config/database');
const { calcularPalografico } = require('../utils/calculadoras');
const {
  calcularProdutividade,
  calcularNOR,
  calcularDistanciaMedia,
  calcularTamanhoPalos,
  calcularImpulsividade,
  calcularEmotividade,
  classificarPalografico,
  gerarInterpretacaoPalografico
} = require('../utils/palograficoCalculator');

const router = express.Router();

/**
 * POST /api/palografico/calcular
 * Calcula resultado do teste Palográfico a partir de dados manuais
 * 
 * Body (ROTEIRO COMPLETO - 13 campos):
 * {
 *   // Campos quantitativos principais (calculados ou fornecidos)
 *   tempos?: [min1, min2, min3, min4, min5], // Para calcular produtividade e NOR
 *   produtividade?: number, // Ou fornecer diretamente
 *   nor?: number, // Ou calcular dos tempos
 *   
 *   // Tamanho e distância
 *   tamanhos_maiores?: number[],
 *   tamanhos_menores?: number[],
 *   media_tamanho_palos?: number, // Ou fornecer diretamente
 *   distancia_total?: number, // Para calcular distância média
 *   distancia_media?: number, // Ou fornecer diretamente
 *   
 *   // Campos do roteiro completo
 *   impulsividade?: number,
 *   media_distancia_linhas?: number,
 *   media_margem_esquerda?: number,
 *   media_margem_direita?: number,
 *   media_margem_superior?: number,
 *   porcentagem_ganchos?: number,
 *   media_inclinacao?: number,
 *   media_direcao_linhas?: number,
 *   total_emotividade?: number,
 *   irregularidades?: object, // Para calcular emotividade
 *   
 *   // Critérios para tabela normativa
 *   regiao?: string,
 *   sexo?: string,
 *   escolaridade?: string,
 *   idade?: number,
 *   tabela_id?: number,
 *   contexto?: string
 * }
 */
router.post('/calcular', async (req, res) => {
  try {
    console.log('📥 Recebida requisição POST /api/palografico/calcular');
    console.log('📦 Body:', req.body);

    const dados = req.body;

    // Usar a calculadora completa que aceita todos os 13 campos
    const resultado = await calcularPalografico(dados.tabela_id || null, {
      tempos: dados.tempos,
      tamanhos_maiores: dados.tamanhos_maiores,
      tamanhos_menores: dados.tamanhos_menores,
      distancia_total: dados.distancia_total,
      irregularidades: dados.irregularidades,
      regiao: dados.regiao,
      sexo: dados.sexo,
      escolaridade: dados.escolaridade,
      idade: dados.idade,
      contexto: dados.contexto,
      // Campos do roteiro completo (13 campos)
      produtividade: dados.produtividade,
      nor: dados.nor,
      media_tamanho_palos: dados.media_tamanho_palos,
      distancia_media: dados.distancia_media,
      impulsividade: dados.impulsividade,
      media_distancia_linhas: dados.media_distancia_linhas,
      media_margem_esquerda: dados.media_margem_esquerda,
      media_margem_direita: dados.media_margem_direita,
      media_margem_superior: dados.media_margem_superior,
      porcentagem_ganchos: dados.porcentagem_ganchos,
      media_inclinacao: dados.media_inclinacao,
      media_direcao_linhas: dados.media_direcao_linhas,
      total_emotividade: dados.total_emotividade
    });

    console.log('✅ Resultado calculado');

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('❌ Erro ao calcular Palográfico:', error);
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
 * GET /api/palografico/tabelas
 * Lista tabelas normativas disponíveis para Palográfico
 */
router.get('/tabelas', async (req, res) => {
  try {
    const { regiao, sexo, escolaridade } = req.query;
    
    let queryText = `
      SELECT DISTINCT
        t.id,
        t.nome,
        t.criterio,
        n.regiao,
        n.sexo,
        n.escolaridade,
        n.idade_minima,
        n.idade_maxima
      FROM tabelas_normativas t
      JOIN normas_palografico n ON n.tabela_id = t.id
      WHERE t.tipo = 'palografico' AND t.ativa = true
    `;

    const params = [];
    if (regiao) {
      params.push(regiao);
      queryText += ` AND n.regiao = $${params.length}`;
    }
    if (sexo) {
      params.push(sexo);
      queryText += ` AND n.sexo = $${params.length}`;
    }
    if (escolaridade) {
      params.push(escolaridade);
      queryText += ` AND n.escolaridade = $${params.length}`;
    }

    queryText += ' ORDER BY n.regiao, n.sexo, n.escolaridade';

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

