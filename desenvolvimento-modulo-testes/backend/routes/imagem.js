/**
 * Rotas para análise de imagens
 * 
 * Funcionalidades:
 * - Upload de imagem
 * - Análise com OCR e IA
 * - Extração de dados
 */

const express = require('express');
const multer = require('multer');
const { analisarImagemTeste } = require('../utils/aiAnalyzer');

const router = express.Router();

// Configurar multer para upload de imagens
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  }
});

/**
 * POST /api/imagem/analisar
 * Analisa imagem de teste com OCR e IA
 * 
 * Body (multipart/form-data):
 * - imagem: arquivo de imagem
 * - tipo_teste: 'palografico' | 'atencao' | 'memoria'
 */
router.post('/analisar', upload.single('imagem'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma imagem foi enviada'
      });
    }

    const { tipo_teste } = req.body;
    
    if (!tipo_teste || !['palografico', 'atencao', 'memoria'].includes(tipo_teste)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de teste inválido. Use: palografico, atencao ou memoria'
      });
    }

    console.log(`📸 Analisando imagem do tipo: ${tipo_teste}`);
    console.log(`📊 Tamanho da imagem: ${req.file.size} bytes`);

    // Converter buffer para base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Analisar imagem
    const resultado = await analisarImagemTeste(base64Image, tipo_teste);

    res.json({
      success: true,
      data: resultado
    });

  } catch (error) {
    console.error('❌ Erro ao analisar imagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao analisar imagem',
      message: error.message
    });
  }
});

/**
 * POST /api/imagem/analisar-base64
 * Analisa imagem em base64
 * 
 * Body:
 * {
 *   imagem_base64: string (data URL),
 *   tipo_teste: string
 * }
 */
router.post('/analisar-base64', async (req, res) => {
  try {
    const { imagem_base64, tipo_teste } = req.body;

    if (!imagem_base64) {
      return res.status(400).json({
        success: false,
        error: 'Imagem em base64 não fornecida'
      });
    }

    if (!tipo_teste || !['palografico', 'atencao', 'memoria'].includes(tipo_teste)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de teste inválido'
      });
    }

    console.log(`📸 Analisando imagem base64 do tipo: ${tipo_teste}`);

    // Analisar imagem
    const resultado = await analisarImagemTeste(imagem_base64, tipo_teste);

    res.json({
      success: true,
      data: resultado
    });

  } catch (error) {
    console.error('❌ Erro ao analisar imagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao analisar imagem',
      message: error.message
    });
  }
});

module.exports = router;

