// image-analyzer.js
// Módulo principal de análise das imagens do Palográfico com IA interna.

const Tesseract = require('tesseract.js');
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const stringSimilarity = require('string-similarity');
const config = require('./config');

const TEMPO_MIN = 20;
const TEMPO_MAX = 220;

let imageJsModule = null;

async function getImageJs() {
  if (!imageJsModule) {
    const imported = await import('image-js');
    const moduleRef =
      imported && imported.default && Object.keys(imported.default).length
        ? imported.default
        : imported;

    const { read, decode, encode } = moduleRef;

    if (typeof read !== 'function' || typeof decode !== 'function' || typeof encode !== 'function') {
      throw new Error('Biblioteca image-js não forneceu read/decode/encode como esperado');
    }

    imageJsModule = { read, decode, encode };
  }
  return imageJsModule;
}

const cloneRegexWithGlobal = (regex) => {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  return new RegExp(regex.source, flags);
};

const normalizeBaseText = (texto) =>
  (texto || '')
    .replace(/\u00AA/g, 'a')
    .replace(/\u00BA/g, 'o')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[|]/g, ' ')
    .trim();

function calcularConcordanciaTextual(textoA, textoB) {
  if (!textoA || !textoB) return 0;
  try {
    return stringSimilarity.compareTwoStrings(textoA.toLowerCase(), textoB.toLowerCase());
  } catch (error) {
    console.log('⚠️ Falha ao calcular concordância com string-similarity:', error.message);
    return 0;
  }
}

function extractTemposFromText(textoNormalizado) {
  if (!textoNormalizado) {
    return { tempos: null, tokens: [] };
  }

  const somenteNumeros = textoNormalizado.replace(/[^\d\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = somenteNumeros
    .split(' ')
    .map((valor) => parseInt(valor, 10))
    .filter((numero) => !Number.isNaN(numero));

  if (tokens.length < 5) {
    return { tempos: null, tokens };
  }

  const candidatos = tokens.filter((numero) => numero >= 10 && numero <= 400);
  if (candidatos.length < 5) {
    return { tempos: null, tokens: candidatos };
  }

  let melhorGrupo = null;
  let melhorPontuacao = Number.POSITIVE_INFINITY;

  for (let i = 0; i <= candidatos.length - 5; i += 1) {
    const grupo = candidatos.slice(i, i + 5);
    if (!grupo.every((tempo) => tempo >= TEMPO_MIN && tempo <= TEMPO_MAX)) continue;

    const amplitude = Math.max(...grupo) - Math.min(...grupo);
    const somaDiferencas = grupo.slice(1).reduce((acc, tempo, indice) => acc + Math.abs(tempo - grupo[indice]), 0);
    const pontuacao = amplitude + somaDiferencas;

    if (pontuacao < melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorGrupo = grupo;
    }
  }

  return { tempos: melhorGrupo, tokens: candidatos };
}

function validateTempos(tempos) {
  if (!Array.isArray(tempos) || tempos.length !== 5) return false;
  if (!tempos.every((tempo) => tempo >= TEMPO_MIN && tempo <= TEMPO_MAX)) return false;
  const amplitude = Math.max(...tempos) - Math.min(...tempos);
  if (amplitude > 160) return false;
  return true;
}

async function runDigitsOCR(imagePath, rotation = 0) {
  let pipeline = sharp(imagePath);
  if (rotation) {
    pipeline = pipeline.rotate(rotation);
  }

  const buffer = await pipeline.greyscale().normalise().threshold(170).png().toBuffer();

  const { data } = await Tesseract.recognize(buffer, config.tesseract.lang, {
    tessedit_char_whitelist: '0123456789 ',
    tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT
  });

  return data.text || '';
}

async function extractTemposWithFallback(ocrResult, processedImagePath, textoNormalizado) {
  const attempts = [];

  const tentarTexto = (fonte, textoCru) => {
    if (!textoCru) {
      attempts.push({ fonte, numeros: [], tempos: [], valido: false });
      return null;
    }
    const normalizado = normalizeBaseText(textoCru);
    const extraido = extractTemposFromText(normalizado);
    const valido = validateTempos(extraido.tempos);
    attempts.push({
      fonte,
      numeros: extraido.tokens.slice(0, 20),
      tempos: extraido.tempos || [],
      valido
    });
    return valido ? extraido.tempos : null;
  };

  let tempos = tentarTexto('ocr-principal', textoNormalizado);
  if (tempos) return { tempos, attempts };

  tempos = tentarTexto('ocr-auto', ocrResult.ensemble?.auto?.text);
  if (tempos) return { tempos, attempts };

  tempos = tentarTexto('ocr-singleBlock', ocrResult.ensemble?.singleBlock?.text);
  if (tempos) return { tempos, attempts };

  try {
    const textoDigitos = await runDigitsOCR(processedImagePath);
    tempos = tentarTexto('ocr-digitos', textoDigitos);
    if (tempos) return { tempos, attempts };
  } catch (erro) {
    console.log('⚠️ Falha no OCR restrito a dígitos:', erro.message);
  }

  try {
    const textoDigitosRot = await runDigitsOCR(processedImagePath, 180);
    tempos = tentarTexto('ocr-digitos-rot180', textoDigitosRot);
    if (tempos) return { tempos, attempts };
  } catch (erro) {
    console.log('⚠️ Falha no OCR de dígitos com rotação 180°:', erro.message);
  }

  return { tempos: null, attempts };
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

    let imagemAjustada = baseImage;
    try {
      const mask = baseImage.grey().threshold({ algorithm: 'otsu' });
      const feret = mask.getFeret();
      const angle = feret?.maxDiameter?.angle ?? 0;
      if (Number.isFinite(angle) && Math.abs(angle) > 0.1) {
        imagemAjustada = baseImage.rotate(-angle);
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
            imagemAjustada = baseImage.rotate(-altAngle);
            console.log(`📐 Pré-processamento: fallback angle corrigido em ${altAngle.toFixed(2)}°`);
          }
        }
      } catch (fallbackDeskewError) {
        console.log('⚠️ Falha no fallback de deskew:', fallbackDeskewError.message);
      }
    }

    const encoded = encode(imagemAjustada, { format: 'png' });
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

  const criarTarefaOCR = (psmMode, label) =>
    Tesseract.recognize(imagePath, config.tesseract.lang, {
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress > 0) {
          console.log(`📝 OCR Progress (PSM ${label}): ${Math.round(m.progress * 100)}%`);
        }
      },
      tessedit_pageseg_mode: psmMode,
      tessedit_char_whitelist:
        '0123456789.,:;!?()-[]{} ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúçãõâêîôûÁÉÍÓÚÇÃÕÂÊÎÔÛ',
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
    }).then((resultado) => ({ ...resultado.data, psm: psmMode, label }));

  const [autoResult, blockResult] = await Promise.all([
    criarTarefaOCR(Tesseract.PSM.AUTO, 'AUTO'),
    criarTarefaOCR(Tesseract.PSM.SINGLE_BLOCK, 'SINGLE_BLOCK')
  ]);

  const normalizarTexto = (texto) => texto.replace(/\n\s*\n/g, '\n').replace(/\s+/g, ' ').trim();
  const textoAuto = normalizarTexto(autoResult.text);
  const textoBloco = normalizarTexto(blockResult.text);
  const concordancia = calcularConcordanciaTextual(textoAuto, textoBloco);
  console.log(`🤝 Concordância entre execuções: ${(concordancia * 100).toFixed(1)}%`);

  let melhor = autoResult;
  if (
    blockResult.text.length > autoResult.text.length * 0.9 &&
    blockResult.confidence > autoResult.confidence * 0.9
  ) {
    melhor = blockResult;
  }

  if (melhor.text.length < blockResult.text.length && blockResult.confidence >= melhor.confidence) {
    melhor = blockResult;
  }

  console.log(
    `🏆 Resultado escolhido: ${melhor.label} (conf=${melhor.confidence.toFixed(1)} | textLength=${melhor.text.length})`
  );

  return {
    text: melhor.text.trim(),
    confidence: melhor.confidence,
    config: melhor.label,
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

async function contextualPostProcessing(textoOriginal, ocrResult, processedImagePath) {
  console.log('🧠 Iniciando Pós-processamento Contextual...');
  const textoNormalizado = normalizeBaseText(textoOriginal);
  const extractedData = {};
  const validationResults = { passed: 0, failed: 0, details: [] };

  const regras = Object.entries(config.validationRules);

  // Tempos precisam de tratamento especial e assíncrono
  const regraTempos = config.validationRules.temposPalografico;
  const { tempos, attempts } = await extractTemposWithFallback(ocrResult, processedImagePath, textoNormalizado);

  if (tempos) {
    extractedData.temposPalografico = tempos;
    validationResults.passed += 1;
    validationResults.details.push({
      key: 'temposPalografico',
      status: 'Encontrado',
      value: tempos,
      tentativas: attempts
    });
  } else {
    if (regraTempos.required) {
      validationResults.failed += 1;
      validationResults.details.push({
        key: 'temposPalografico',
        status: 'Falha (Obrigatório não encontrado)',
        tentativas: attempts
      });
    } else {
      validationResults.details.push({
        key: 'temposPalografico',
        status: 'Não encontrado (Opcional)',
        tentativas: attempts
      });
    }
  }

  for (const [campo, regra] of regras) {
    if (campo === 'temposPalografico') continue;

    const pattern = regra.pattern;
    if (!pattern) {
      validationResults.details.push({ key: campo, status: 'Regra sem pattern configurado' });
      continue;
    }

    const regex = cloneRegexWithGlobal(pattern);
    const matches = [...textoNormalizado.matchAll(regex)];

    if (matches.length > 0) {
      const valoresCapturados = matches[0].slice(1).filter(Boolean);
      let valorExtraido = valoresCapturados.length ? valoresCapturados.join(' ').trim() : matches[0][0];

      if (regra.post && typeof regra.post === 'function') {
        valorExtraido = regra.post(valorExtraido);
      }

      const valido =
        valorExtraido !== null &&
        valorExtraido !== undefined &&
        (Array.isArray(valorExtraido) ? valorExtraido.length > 0 : String(valorExtraido).trim().length > 0);

      if (valido) {
        extractedData[campo] = valorExtraido;
        validationResults.passed += 1;
        validationResults.details.push({
          key: campo,
          status: 'Encontrado',
          value: valorExtraido
        });
      } else if (regra.required) {
        validationResults.failed += 1;
        validationResults.details.push({
          key: campo,
          status: 'Falha (Valor vazio)',
          rawMatches: matches.map((m) => m[0])
        });
      } else {
        validationResults.details.push({
          key: campo,
          status: 'Não encontrado (Opcional)',
          rawMatches: matches.map((m) => m[0])
        });
      }
    } else if (regra.required) {
      validationResults.failed += 1;
      validationResults.details.push({ key: campo, status: 'Falha (Obrigatório não encontrado)' });
    } else {
      validationResults.details.push({ key: campo, status: 'Não encontrado (Opcional)' });
    }
  }

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

  const regras = Object.entries(config.validationRules);
  const obrigatorias = regras.filter(([, regra]) => regra.required).length;
  const obrigatoriasEncontradas = validation.details.filter(
    (detalhe) => detalhe.status === 'Encontrado' && config.validationRules[detalhe.key]?.required
  ).length;
  const todosObrigatorios = obrigatorias > 0 && obrigatoriasEncontradas === obrigatorias;

  let scoreValidation = 0;
  if (totalRules > 0) {
    scoreValidation = (validation.passed / totalRules) * scoringConfig.validationWeight;
  }

  const bonus = todosObrigatorios ? scoringConfig.requiredFieldBonus : 1;
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

    const { extractedData, validationResults } = await contextualPostProcessing(
      ocrResult.text,
      ocrResult,
      finalProcessedImagePath
    );
    const totalRules = Object.keys(config.validationRules).length;
    const confiancaIA = calculatePrecisionScore(ocrResult, validationResults, totalRules);

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
      if (Buffer.isBuffer(imagemPath) || (typeof imagemPath === 'string' && imagemPath.startsWith('data:'))) {
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

