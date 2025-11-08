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
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
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

// Configurar multer para upload de imagens (armazenamento em memória)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG ou PDF.'));
    }
  }
});

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

/**
 * POST /api/palografico/analisar-ia
 * Analisa imagem do teste Palográfico usando Inteligência Artificial
 * 
 * FormData:
 * - imagem: Arquivo de imagem (JPG, PNG, PDF)
 * - regiao: Região do examinando
 * - sexo: Sexo do examinando
 * - escolaridade: Escolaridade do examinando
 * - idade: Idade do examinando
 * - contexto: Contexto de aplicação
 */
router.post('/analisar-ia', upload.single('imagem'), async (req, res) => {
  try {
    console.log('📤 Recebida requisição de análise IA para Palográfico');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem foi enviada',
        analise_ia: { dados_extraidos: {}, confianca: 0 }
      });
    }
    
    // Extrair dados da requisição
    const { regiao, sexo, escolaridade, idade, contexto } = req.body;
    
    console.log('📋 Dados da requisição:', {
      regiao, sexo, escolaridade, idade, contexto,
      arquivo: req.file.originalname,
      tamanho: req.file.size
    });
    
    // Salvar imagem temporariamente
    const tempDir = path.join(__dirname, '../temp');
    await fs.ensureDir(tempDir);
    const tempImagePath = path.join(tempDir, `temp_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`);
    await fs.writeFile(tempImagePath, req.file.buffer);
    
    console.log('💾 Imagem salva temporariamente:', tempImagePath);
    
    // Analisar imagem com IA
    let analiseResult;
    try {
      const { analisarImagemTeste } = require('../utils/aiAnalyzer');
      console.log('🔍 Chamando analisarImagemTeste com:', tempImagePath);
      analiseResult = await analisarImagemTeste(tempImagePath, 'palografico');
      console.log('🤖 Resultado da análise IA:', JSON.stringify(analiseResult, null, 2));
    } catch (analiseError) {
      console.error('❌ Erro ao chamar analisarImagemTeste:', analiseError);
      console.error('❌ Stack:', analiseError.stack);
      throw analiseError; // Re-lançar para ser capturado pelo catch externo
    }
    
    // Limpar arquivo temporário
    try {
      if (await fs.pathExists(tempImagePath)) {
        await fs.unlink(tempImagePath);
      }
      // Também limpar imagem processada se existir
      const processedPath = tempImagePath.replace(/\.(jpg|jpeg|png)$/i, '_processed.png');
      if (await fs.pathExists(processedPath)) {
        await fs.unlink(processedPath);
      }
    } catch (cleanupError) {
      console.log('⚠️ Erro ao limpar arquivos temporários:', cleanupError.message);
    }
    
    const dadosExtraidos = analiseResult.dadosExtraidos || {};
    const confiancaIA = typeof analiseResult.confiancaIA === 'number' ? analiseResult.confiancaIA : 0;
    const temposExtraidos = Array.isArray(dadosExtraidos.temposPalografico)
      ? dadosExtraidos.temposPalografico.slice(0, 5).map((v) => parseInt(v, 10)).filter((v) => !Number.isNaN(v))
      : [];
    const possuiTempos = temposExtraidos.length === 5;
    const produtividadeCalculada = possuiTempos ? temposExtraidos.reduce((a, b) => a + b, 0) : null;

    console.log('📊 Avaliação dos dados:', {
      possuiTempos,
      confiancaIA,
      dadosExtraidos
    });

    const analiseIA = {
      dados_extraidos: dadosExtraidos,
      confianca: confiancaIA,
      texto_extraido: analiseResult.ocr_extracted_text,
      calculo_automatico: false,
      debug: analiseResult.debug,
      precision_score: confiancaIA
    };

    if (confiancaIA >= 9 && possuiTempos) {
      console.log('✅ Confiança alta. Tentando cálculo automático...');
      try {
        const resultado = await calcularPalografico(null, {
          tempos: temposExtraidos,
          produtividade: produtividadeCalculada,
          nor: dadosExtraidos.nor ?? null,
          regiao,
          sexo,
          escolaridade,
          idade: idade ? parseInt(idade, 10) : null,
          contexto: contexto || 'transito'
        });

        console.log('📈 Resultado calculado automaticamente:', resultado);

        return res.json({
          success: true,
          data: resultado,
          analise_ia: { ...analiseIA, calculo_automatico: true },
          message: `Dados extraídos automaticamente com precisão ${confiancaIA.toFixed(2)}/10`
        });
      } catch (calcError) {
        console.error('❌ Erro no cálculo automático:', calcError);
        return res.json({
          success: false,
          analise_ia: analiseIA,
          message:
            'Dados extraídos, mas houve erro no cálculo automático. Verifique os valores e calcule manualmente.',
          erro_calculo: calcError.message
        });
      }
    }

    if (confiancaIA >= 5 && possuiTempos) {
      console.log('⚠️ Dados extraídos com confiança moderada, requer validação manual.');
      return res.json({
        success: false,
        analise_ia: analiseIA,
        message:
          'Dados extraídos com confiança moderada. Revise os valores sugeridos e finalize o cálculo manualmente.',
        preenchimento_assistido: true
      });
    }

    console.log('❌ Dados insuficientes ou precisão muito baixa.');
    return res.json({
      success: false,
      analise_ia: analiseIA,
      message:
        'Não foi possível extrair dados confiáveis da imagem. Por favor, preencha os dados manualmente.',
      erro: analiseResult.erro
    });
    
  } catch (error) {
    console.error('❌ Erro na rota de análise IA:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor durante análise da imagem',
      analise_ia: {
        dados_extraidos: {},
        confianca: 0,
        texto_extraido: '',
        debug: { erro: error.message }
      },
      erro: error.message
    });
  }
});

module.exports = router;

