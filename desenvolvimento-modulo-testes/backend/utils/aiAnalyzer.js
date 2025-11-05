/**
 * Analisador de Imagens com IA
 * 
 * Funcionalidades:
 * - OCR com Tesseract.js
 * - Análise visual com OpenAI Vision ou Claude
 * - Extração automática de dados
 * - Validação de dados extraídos
 */

const Tesseract = require('tesseract.js');
const { OpenAI } = require('openai');
const fs = require('fs-extra');
const path = require('path');

// Inicializar OpenAI (se API key estiver disponível)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/**
 * Analisa imagem do teste com IA
 * @param {string} imagemPath - Caminho local ou buffer/base64 da imagem
 * @param {string} testType - Tipo de teste ('palografico', 'atencao', 'memoria')
 * @returns {Promise<object>} Dados extraídos e análise
 */
async function analisarImagemTeste(imagemPath, testType) {
  try {
    console.log(`📸 Iniciando análise de imagem para teste ${testType}`);
    
    // 1. OCR com Tesseract
    const ocrResult = await extrairTextoOCR(imagemPath);
    console.log(`✅ OCR concluído. Confiança: ${ocrResult.confidence}%`);
    
    // 2. Análise visual com OpenAI Vision (se disponível)
    let visionResult = null;
    if (openai) {
      try {
        visionResult = await analisarComVision(imagemPath, testType);
        console.log(`✅ Análise visual concluída. Confiança: ${visionResult.confidence}%`);
      } catch (error) {
        console.warn('⚠️ Erro na análise visual (continuando com OCR):', error.message);
      }
    } else {
      console.log('ℹ️ OpenAI não configurado. Usando apenas OCR.');
    }
    
    // 3. Extrair dados numéricos
    const dadosExtraidos = extrairDados(ocrResult, visionResult, testType);
    
    // 4. Calcular confiança geral
    const confiancaIA = calcularConfianca(ocrResult, visionResult);
    
    return {
      ocr_extracted_text: ocrResult.text,
      ia_extracted_text: visionResult?.description || ocrResult.text,
      dadosExtraidos,
      confiancaIA,
      analiseCompleta: {
        status: 'success',
        ocr_confidence: ocrResult.confidence,
        vision_confidence: visionResult?.confidence || 0,
        message: 'Análise concluída com sucesso'
      }
    };
    
  } catch (erro) {
    console.error('❌ Erro ao analisar imagem:', erro);
    throw erro;
  }
}

/**
 * Extrai texto com Tesseract OCR
 * @param {string|Buffer} imagemPath - Caminho da imagem ou buffer/base64
 * @returns {Promise<object>} Texto extraído e confiança
 */
async function extrairTextoOCR(imagemPath) {
  try {
    console.log('🔍 Iniciando OCR com Tesseract...');
    
    // Converter base64 para buffer se necessário
    let imageData = imagemPath;
    if (typeof imagemPath === 'string' && imagemPath.startsWith('data:image')) {
      // Base64 data URL
      const base64Data = imagemPath.split(',')[1];
      imageData = Buffer.from(base64Data, 'base64');
    }
    
    const { data: { text, confidence } } = await Tesseract.recognize(
      imageData,
      'por', // Português
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`📊 Progresso OCR: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    
    console.log(`✅ OCR concluído. Texto extraído: ${text.length} caracteres`);
    
    return {
      text: text.trim(),
      confidence: Math.round(confidence),
      status: 'success'
    };
    
  } catch (erro) {
    console.error('❌ Erro OCR:', erro);
    return { 
      text: '', 
      confidence: 0,
      status: 'error',
      error: erro.message
    };
  }
}

/**
 * Análise com OpenAI Vision
 * @param {string|Buffer} imagemPath - Caminho ou buffer da imagem
 * @param {string} testType - Tipo de teste
 * @returns {Promise<object>} Análise da IA
 */
async function analisarComVision(imagemPath, testType) {
  try {
    if (!openai) {
      return {
        description: '',
        confidence: 0,
        status: 'not_configured',
        message: 'OpenAI não configurado'
      };
    }
    
    console.log('🔍 Iniciando análise com OpenAI Vision...');
    
    // Preparar imagem para OpenAI
    let imageData = imagemPath;
    let imageFormat = 'png';
    
    if (typeof imagemPath === 'string') {
      if (imagemPath.startsWith('data:image')) {
        // Base64 data URL
        const base64Data = imagemPath.split(',')[1];
        imageData = Buffer.from(base64Data, 'base64');
        imageFormat = imagemPath.match(/data:image\/(\w+);/)?.[1] || 'png';
      } else if (fs.existsSync(imagemPath)) {
        // Caminho de arquivo
        imageData = fs.readFileSync(imagemPath);
        imageFormat = path.extname(imagemPath).slice(1) || 'png';
      }
    }
    
    // Converter para base64 para OpenAI
    const base64Image = imageData.toString('base64');
    const imageUrl = `data:image/${imageFormat};base64,${base64Image}`;
    
    // Prompt específico por tipo de teste
    const prompts = {
      palografico: `Analise esta imagem de um teste Palográfico. Identifique:
        1. Número de palos por minuto (5 minutos)
        2. Tamanho médio dos palos em mm
        3. Distância entre palos
        4. Irregularidades (inclinação, pressão, margens)
        Retorne apenas números e dados objetivos no formato JSON:
        {"tempos": [min1, min2, min3, min4, min5], "tamanho_medio": X, "distancia_media": Y, "irregularidades": {...}}`,
      
      atencao: `Analise esta imagem de um teste de atenção (AC ou similar). Identifique:
        1. Número de acertos
        2. Número de erros
        3. Número de omissões
        Retorne apenas números no formato JSON:
        {"acertos": X, "erros": Y, "omissoes": Z}`,
      
      memoria: `Analise esta imagem de um teste de memória. Identifique:
        1. Evocação imediata
        2. Evocação tardia
        3. Retenção
        4. Reconhecimento
        Retorne apenas números no formato JSON:
        {"evocacao_imediata": X, "evocacao_tardia": Y, "retencao": Z, "reconhecimento": W}`
    };
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompts[testType] || prompts.atencao },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });
    
    const description = response.choices[0]?.message?.content || '';
    
    // Tentar extrair JSON da resposta
    let parsedData = null;
    try {
      const jsonMatch = description.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Não foi possível parsear JSON da resposta da IA');
    }
    
    return {
      description,
      parsedData,
      confidence: 85, // Confiança padrão da OpenAI Vision
      status: 'success'
    };
    
  } catch (erro) {
    console.error('❌ Erro Vision AI:', erro);
    return { 
      description: '', 
      confidence: 0,
      status: 'error',
      error: erro.message
    };
  }
}

/**
 * Extrai dados numéricos das análises
 * @param {object} ocrResult - Resultado do OCR
 * @param {object} visionResult - Resultado da análise visual
 * @param {string} testType - Tipo de teste
 * @returns {object} Dados extraídos
 */
function extrairDados(ocrResult, visionResult, testType) {
  const dados = {};
  
  // Priorizar dados da Vision AI (mais confiável)
  if (visionResult?.parsedData) {
    Object.assign(dados, visionResult.parsedData);
  }
  
  // Complementar com OCR se necessário
  const texto = ocrResult.text || '';
  const numerosEncontrados = texto.match(/\d+/g) || [];
  
  if (testType === 'palografico') {
    // Buscar padrões de tempos/palos
    const palosMatch = texto.match(/(\d+)\s*(palos?|traços?|pontos?)/gi);
    if (palosMatch && palosMatch.length >= 5 && !dados.tempos) {
      dados.tempos = palosMatch.slice(0, 5).map(m => parseInt(m.match(/\d+/)[0]));
    }
    
    // Buscar tamanhos
    const tamanhosMatch = texto.match(/tamanho[\s:]*(\d+[\.,]\d*)/gi);
    if (tamanhosMatch && !dados.tamanho_medio) {
      dados.tamanho_medio = parseFloat(tamanhosMatch[0].replace(/[^\d,.]/g, '').replace(',', '.'));
    }
    
    // Buscar distâncias
    const distanciasMatch = texto.match(/dist[âa]ncia[\s:]*(\d+[\.,]\d*)/gi);
    if (distanciasMatch && !dados.distancia_media) {
      dados.distancia_media = parseFloat(distanciasMatch[0].replace(/[^\d,.]/g, '').replace(',', '.'));
    }
    
  } else if (testType === 'atencao') {
    // Extrair números de acertos, erros, omissões
    if (numerosEncontrados.length >= 3 && !dados.acertos) {
      dados.acertos = parseInt(numerosEncontrados[0]);
      dados.erros = parseInt(numerosEncontrados[1]);
      dados.omissoes = parseInt(numerosEncontrados[2]);
    }
  } else if (testType === 'memoria') {
    // Extrair dados de memória
    if (numerosEncontrados.length >= 2 && !dados.evocacao_imediata) {
      dados.evocacao_imediata = parseInt(numerosEncontrados[0]);
      dados.evocacao_tardia = parseInt(numerosEncontrados[1]);
      if (numerosEncontrados.length >= 3) {
        dados.retencao = parseInt(numerosEncontrados[2]);
      }
      if (numerosEncontrados.length >= 4) {
        dados.reconhecimento = parseInt(numerosEncontrados[3]);
      }
    }
  }
  
  return dados;
}

/**
 * Calcula confiança geral da análise
 */
function calcularConfianca(ocrResult, visionResult) {
  if (visionResult && visionResult.confidence > 0) {
    // Se temos Vision AI, usar média ponderada
    return Math.round((ocrResult.confidence * 0.3 + visionResult.confidence * 0.7));
  }
  // Caso contrário, usar apenas OCR
  return ocrResult.confidence || 0;
}

/**
 * Compara dados extraídos com análise manual
 * @param {object} dadosExtraidos - Dados extraídos pela IA
 * @param {object} dadosManual - Dados inseridos manualmente
 * @returns {object} Comparação com diferenças
 */
function compararComManual(dadosExtraidos, dadosManual) {
  const comparacao = {
    match_total: true,
    diferencas: [],
    precisao: 100
  };
  
  let totalCampos = 0;
  let camposCorretos = 0;
  
  for (const chave in dadosExtraidos) {
    if (dadosManual[chave] !== undefined) {
      totalCampos++;
      const diferenca = Math.abs(dadosExtraidos[chave] - dadosManual[chave]);
      if (diferenca > 0) {
        comparacao.match_total = false;
        comparacao.diferencas.push({
          campo: chave,
          extraido: dadosExtraidos[chave],
          manual: dadosManual[chave],
          diferenca
        });
      } else {
        camposCorretos++;
      }
    }
  }
  
  if (totalCampos > 0) {
    comparacao.precisao = Math.round((camposCorretos / totalCampos) * 100);
  }
  
  return comparacao;
}

module.exports = {
  analisarImagemTeste,
  extrairTextoOCR,
  analisarComVision,
  extrairDados,
  compararComManual
};
