// image-analyzer.js
// Módulo Principal de Análise de Imagens com IA de Alta Precisão (Interno)

const Tesseract = require('tesseract.js');
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const stringSimilarity = require('string-similarity');
const config = require('./config');

let imageJsModule = null;

async function getImageJs() {
  if (!imageJsModule) {
    const imported = await import('image-js');
    const moduleRef =
      imported && imported.default && Object.keys(imported.default).length
        ? imported.default
        : imported;

    const read = moduleRef.read;
    const decode = moduleRef.decode;
    const encode = moduleRef.encode;

    if (typeof read !== 'function' || typeof decode !== 'function' || typeof encode !== 'function') {
      throw new Error('Biblioteca image-js não forneceu read/decode/encode como esperado');
    }

    imageJsModule = { read, decode, encode };
  }
  return imageJsModule;
}

function calcularConcordanciaTextual(textoA, textoB) {
  if (!textoA || !textoB) return 0;

  try {
    return stringSimilarity.compareTwoStrings(textoA.toLowerCase(), textoB.toLowerCase());
  } catch (error) {
    console.log('⚠️ Falha ao calcular concordância com string-similarity:', error.message);
    return 0;
  }
}

async function forensicPreprocess(imagePathOrBuffer, outputPath) {
  console.log('🔬 Iniciando Pré-processamento "Nível Perícia"...');
  try {
    let inputBuffer;

    if (typeof imagePathOrBuffer === 'string' && !imagePathOrBuffer.startsWith('data:')) {
      inputBuffer = await fs.readFile(imagePathOrBuffer);
    } else if (Buffer.isBuffer(imagePathOrBuffer)) {
      inputBuffer = imagePathOrBuffer;
    } else if (typeof imagePathOrBuffer === 'string' && imagePathOrBuffer.startsWith('data:')) {
      const base64Data = imagePathOrBuffer.split(',')[1];
      inputBuffer = Buffer.from(base64Data, 'base64');
    } else {
      inputBuffer = Buffer.from(imagePathOrBuffer);
    }

    const { read, decode, encode } = await getImageJs();

    let baseImage;
    if (typeof imagePathOrBuffer === 'string' && !imagePathOrBuffer.startsWith('data:')) {
      baseImage = await read(imagePathOrBuffer);
    } else {
      baseImage = decode(inputBuffer);
    }

    let deskewedImage = baseImage;
    try {
      const mask = baseImage.grey().mask({ algorithm: 'otsu' });
      const feret = mask.getFeret();
      const angle = feret?.maxDiameter?.angle ?? 0;
      if (Number.isFinite(angle) && Math.abs(angle) > 0.1) {
        deskewedImage = baseImage.rotate(-angle);
        console.log(`📐 Pré-processamento: ângulo corrigido em ${angle.toFixed(2)}°`);
      } else {
        console.log('📐 Pré-processamento: ângulo desprezível, sem rotação aplicada.');
      }
    } catch (deskewError) {
      console.log('⚠️ Falha ao aplicar deskew avançado (getFeret):', deskewError.message);
      try {
        const grey = baseImage.grey();
        if (typeof grey.getAngle === 'function') {
          const altAngle = grey.getAngle();
          if (Number.isFinite(altAngle) && Math.abs(altAngle) > 0.1) {
            deskewedImage = baseImage.rotate(-altAngle);
            console.log(`📐 Pré-processamento: fallback angle corrigido em ${altAngle.toFixed(2)}°`);
          }
        }
      } catch (fallbackDeskewError) {
        console.log('⚠️ Falha no fallback de deskew:', fallbackDeskewError.message);
      }
    }

    const encoded = encode(deskewedImage, { format: 'png' });
    const deskewedBuffer = Buffer.from(encoded);

    const { data } = await sharp(deskewedBuffer)
      .resize({ width: 1600, height: null, withoutEnlargement: true })
      .greyscale()
      .clahe({ width: 256, height: 256 })
      .median(3)
      .sharpen({ sigma: 1.0 })
      .normalise()
      .threshold(175)
      .png({ quality: 90 })
      .toBuffer({ resolveWithObject: true });

    await fs.writeFile(outputPath, data);
    console.log('✅ Imagem pré-processada (nível perícia):', outputPath);

    const debugPath = outputPath.replace(/\.png$/i, `_debug_${Date.now()}.png`);
    await fs.writeFile(debugPath, data);
    console.log('🗂️ Imagem pré-processada salva para depuração em:', debugPath);

    return outputPath;
  } catch (error) {
    console.log('⚠️ Erro no pré-processamento avançado. Usando fallback básico:', error.message);
    console.error('⚠️ Detalhes do erro de pré-processamento:', error);
    try {
      const fallbackOutputPath = outputPath.replace(/\.png$/i, `_fallback_${Date.now()}.png`);
      await sharp(imagePathOrBuffer)
        .resize({ width: 1200, height: null, withoutEnlargement: true })
        .greyscale()
        .normalize()
        .sharpen()
        .png({ quality: 90 })
        .toFile(fallbackOutputPath);
      console.log('✅ Imagem pré-processada (fallback básico):', fallbackOutputPath);
      return fallbackOutputPath;
    } catch (fallbackError) {
      console.error('❌ Falha total no pré-processamento, mesmo o fallback falhou:', fallbackError);
      return null;
    }
  }
}

async function runInternalEnsemble(imagePath) {
  console.log('🤝 Iniciando Ensemble Interno de OCR...');

  const createOcrJob = (psmMode, label) => {
    return Tesseract.recognize(imagePath, config.tesseract.lang, {
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress > 0) {
          console.log(`📝 OCR Progress (PSM ${label}): ${Math.round(m.progress * 100)}%`);
        }
      },
      tessedit_pageseg_mode: psmMode,
      tessedit_char_whitelist:
        '0123456789.,:;!?()-[]{} ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúçãõâêîôûÁÉÍÓÚÇÃÕÂÊÎÔÛ',
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
    }).then((r) => ({ ...r.data, psm: psmMode, label }));
  };

  const [autoResult, blockResult] = await Promise.all([
    createOcrJob(Tesseract.PSM.AUTO, 'AUTO'),
    createOcrJob(Tesseract.PSM.SINGLE_BLOCK, 'SINGLE_BLOCK')
  ]);

  const normalizeText = (text) => text.replace(/\n\s*\n/g, '\n').replace(/\s+/g, ' ').trim();
  const normalizedAutoText = normalizeText(autoResult.text);
  const normalizedBlockText = normalizeText(blockResult.text);
  const concordancia = calcularConcordanciaTextual(normalizedAutoText, normalizedBlockText);
  console.log(`🤝 Concordância entre execuções: ${(concordancia * 100).toFixed(1)}%`);

  let melhorResultado = autoResult;
  if (
    blockResult.text.length > autoResult.text.length * 0.9 &&
    blockResult.confidence > autoResult.confidence * 0.9
  ) {
    melhorResultado = blockResult;
  }
  if (
    melhorResultado.text.length < blockResult.text.length &&
    blockResult.confidence >= melhorResultado.confidence
  ) {
    melhorResultado = blockResult;
  }

  console.log(
    `🏆 Resultado escolhido: ${melhorResultado.label} (conf=${melhorResultado.confidence.toFixed(
      1
    )} | textLength=${melhorResultado.text.length})`
  );

  return {
    text: melhorResultado.text.trim(),
    confidence: melhorResultado.confidence,
    config: melhorResultado.label,
    agreement: concordancia,
    ensemble: {
      auto: {
        text: autoResult.text,
        confidence: autoResult.confidence,
        psm: autoResult.psm
      },
      singleBlock: {
        text: blockResult.text,
        confidence: blockResult.confidence,
        psm: blockResult.psm
      }
    }
  };
}

function contextualPostProcessing(text, validationRules) {
  console.log('🧠 Iniciando Pós-processamento Contextual...');
  const extractedData = {};
  const validationResults = { passed: 0, failed: 0, details: [] };

  validationRules.forEach((rule) => {
    const regexInstance = new RegExp(rule.regex.source, 'gi');
    const matches = [...text.matchAll(regexInstance)];

    if (matches.length > 0) {
      let value;
      if (rule.type === 'table_numbers') {
        value = matches.flatMap((match) => match.slice(1).map(Number)).filter((n) => !Number.isNaN(n));
      } else {
        const firstMatchGroups = matches[0].slice(1);
        value = firstMatchGroups.join(' ').trim().replace(/\s+/g, ' ');
        if (rule.type === 'date') {
          value = value.replace(/\s*\/\s*/g, '/');
        }
        if (rule.type === 'number') {
          const parsed = parseInt(value, 10);
          value = Number.isNaN(parsed) ? null : parsed;
        }
      }

      const hasValue =
        value !== null && (Array.isArray(value) ? value.length > 0 : String(value).trim().length > 0);

      if (hasValue) {
        extractedData[rule.key] = value;
        validationResults.passed++;
        validationResults.details.push({ key: rule.key, status: 'Encontrado', value });
      } else if (rule.required) {
        validationResults.failed++;
        validationResults.details.push({
          key: rule.key,
          status: 'Falha (Valor vazio)',
          rawMatches: matches.map((m) => m[0])
        });
      }
    } else if (rule.required) {
      validationResults.failed++;
      validationResults.details.push({ key: rule.key, status: 'Falha (Obrigatório não encontrado)' });
    } else {
      validationResults.details.push({ key: rule.key, status: 'Não encontrado (Opcional)' });
    }
  });

  console.log(
    `✅ Validação contextual: ${validationResults.passed} regras passaram, ${validationResults.failed} falharam.`
  );
  return { extractedData, validationResults };
}

function calculatePrecisionScore(ocrResult, validation, totalRules) {
  console.log('💯 Calculando Score de Precisão 10/10...');
  const scoringConfig = config.scoring;

  const scoreOCR = (ocrResult.confidence / 100) * scoringConfig.baseWeightOCR;
  const scoreAgreement = ocrResult.agreement * scoringConfig.agreementWeight;

  const requiredFields = config.validationRules.filter((r) => r.required).length;
  const requiredPassed = validation.details.filter(
    (d) => d.status === 'Encontrado' && config.validationRules.find((r) => r.key === d.key)?.required
  ).length;
  const allRequiredPassed = requiredFields > 0 && requiredPassed === requiredFields;

  let scoreValidation = 0;
  if (totalRules > 0) {
    scoreValidation = (validation.passed / totalRules) * scoringConfig.validationWeight;
  }

  const bonus = allRequiredPassed ? scoringConfig.requiredFieldBonus : 1;
  let finalScore = (scoreOCR + scoreAgreement + scoreValidation) * bonus * 10;
  finalScore = Math.min(10, Math.max(0, finalScore));
  console.log(`🎯 Score Final de Precisão: ${finalScore.toFixed(2)} / 10.0`);
  return finalScore;
}

async function analisarImagemTeste(imagemPath, testType) {
  console.log(`🚀 Iniciando análise de imagem para teste: ${testType}`);
  console.log(`📁 Caminho da imagem: ${imagemPath}`);
  console.log(`📁 Tipo: ${typeof imagemPath}, É Buffer: ${Buffer.isBuffer(imagemPath)}`);

  const tempDir = path.join(__dirname, 'temp');
  await fs.ensureDir(tempDir);
  const processedImagePath = path.join(tempDir, `processed_${Date.now()}.png`);

  try {
    const finalProcessedImagePath = await forensicPreprocess(imagemPath, processedImagePath);
    if (!finalProcessedImagePath) {
      throw new Error('Pré-processamento falhou, não há imagem para OCR.');
    }

    const ocrResult = await runInternalEnsemble(finalProcessedImagePath);
    if (!ocrResult || !ocrResult.text || ocrResult.text.trim().length === 0) {
      console.log('⚠️ OCR não extraiu texto válido');
      return {
        dadosExtraidos: {},
        confiancaIA: 0,
        ocr_extracted_text: ocrResult?.text || '',
        erro: 'OCR não conseguiu extrair texto da imagem'
      };
    }

    const { extractedData, validationResults } = contextualPostProcessing(
      ocrResult.text,
      config.validationRules
    );
    const confiancaIA = calculatePrecisionScore(ocrResult, validationResults, config.validationRules.length);

    console.log('✅ Análise concluída:', {
      dadosExtraidos: extractedData,
      confiancaIA,
      textoExtraidoLength: ocrResult.text.length,
      ocrAgreement: ocrResult.agreement
    });

    return {
      dadosExtraidos: extractedData,
      confiancaIA,
      ocr_extracted_text: ocrResult.text,
      debug: {
        ocrConfidence: ocrResult.confidence,
        textLength: ocrResult.text.length,
        textPreview: ocrResult.text.substring(0, 200),
        config: ocrResult.config,
        agreementScore: ocrResult.agreement,
        ensemble: ocrResult.ensemble,
        validation: validationResults.details
      }
    };
  } catch (error) {
    console.error('❌ Erro na análise da imagem:', error);
    console.error('❌ Stack trace completo:', error.stack);

    try {
      const logDir = path.join(__dirname, '../logs');
      await fs.ensureDir(logDir);
      const logMessage = [
        '==============================',
        `Data: ${new Date().toISOString()}`,
        `Teste: ${testType}`,
        `Imagem: ${typeof imagemPath === 'string' ? imagemPath : 'Buffer'}`,
        `Erro: ${error.message}`,
        `Stack: ${error.stack}`,
        ''
      ].join('\n');
      await fs.appendFile(path.join(logDir, 'palografico-ia.log'), `${logMessage}\n`);
    } catch (logError) {
      console.error('⚠️ Falha ao registrar log de erro:', logError);
    }

    return {
      dadosExtraidos: {},
      confiancaIA: 0,
      ocr_extracted_text: '',
      erro: error.message,
      stack: error.stack
    };
  } finally {
    try {
      if (processedImagePath && (await fs.pathExists(processedImagePath))) {
        await fs.unlink(processedImagePath);
      }
      if ((Buffer.isBuffer(imagemPath) || (typeof imagemPath === 'string' && imagemPath.startsWith('data:')))) {
        const tempFiles = await fs.readdir(tempDir);
        for (const file of tempFiles) {
          if (file.startsWith('temp_') && !file.includes('_processed')) {
            await fs.unlink(path.join(tempDir, file));
          }
        }
      }
    } catch (cleanupError) {
      console.log('⚠️ Erro ao limpar arquivos temporários na finalização:', cleanupError.message);
    }
  }
}

module.exports = {
  analisarImagemTeste
};

