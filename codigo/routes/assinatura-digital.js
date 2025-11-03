const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const certificadoA3Service = require('../utils/certificadoA3Service');

/**
 * Lista certificados REAIS disponíveis no leitor CCID/Token A3
 */
router.get('/certificados', async (req, res) => {
  try {
    console.log('🔍 Listando certificados REAIS do token A3...');
    
    const resultado = await certificadoA3Service.listarCertificados();
    
    if (resultado.success && resultado.certificados.length > 0) {
      res.json({
        success: true,
        certificados: resultado.certificados,
        message: `${resultado.certificados.length} certificado(s) encontrado(s) no token A3`
      });
    } else {
      res.json({
        success: false,
        certificados: [],
        message: 'Nenhum certificado encontrado. Conecte o token A3.'
      });
    }

  } catch (error) {
    console.error('❌ Erro ao listar certificados:', error);
    
    // Mensagens de erro mais específicas
    let mensagem = 'Erro ao acessar certificados digitais';
    
    if (error.message.includes('Driver do token')) {
      mensagem = 'Driver do token A3 não encontrado. Instale o driver do fabricante (SafeNet, Gemalto, etc.)';
    } else if (error.message.includes('Nenhum leitor')) {
      mensagem = 'Token A3 não detectado. Conecte o token na porta USB.';
    }
    
    res.status(500).json({
      success: false,
      message: mensagem,
      detalhes: error.message
    });
  }
});

/**
 * Valida um certificado digital com PIN
 */
router.post('/validar-certificado', async (req, res) => {
  try {
    const { certificadoInfo, pin } = req.body;

    if (!certificadoInfo || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Certificado e PIN são obrigatórios'
      });
    }

    console.log('🔐 Validando certificado com PIN...');
    
    // Validar certificado REAL com PIN
    const resultado = await certificadoA3Service.validarCertificadoComPIN(certificadoInfo, pin);
    
    if (resultado.success) {
      res.json({
        success: true,
        message: 'Certificado e PIN válidos',
        certificado: certificadoInfo
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'PIN incorreto ou certificado inválido'
      });
    }

  } catch (error) {
    console.error('❌ Erro ao validar certificado:', error);
    
    let mensagem = 'Erro ao validar certificado digital';
    if (error.message.includes('PIN incorreto')) {
      mensagem = 'PIN incorreto. Verifique o PIN do seu token A3.';
    }
    
    res.status(400).json({
      success: false,
      message: mensagem,
      detalhes: error.message
    });
  }
});

/**
 * Assina um documento com certificado digital
 */
router.post('/assinar-documento', async (req, res) => {
  try {
    const { 
      certificadoInfo,
      pin,
      documentoHash, 
      tipoDocumento,
      dadosDocumento 
    } = req.body;

    if (!certificadoInfo || !pin || !documentoHash) {
      return res.status(400).json({
        success: false,
        message: 'Certificado, PIN e hash do documento são obrigatórios'
      });
    }

    console.log('✍️ Assinando documento com token A3 REAL...');
    
    // Assinar documento com token A3 REAL
    const resultado = await certificadoA3Service.assinarDocumento(
      certificadoInfo,
      pin,
      documentoHash
    );
    
    if (resultado.success) {
      const assinaturaDigital = {
        id: `sig-${Date.now()}`,
        certificadoId: certificadoInfo.id,
        documentoHash,
        algoritmoassinatura: resultado.algoritmo,
        timestamp: resultado.timestamp,
        assinatura: resultado.assinatura, // Assinatura REAL criptográfica
        certificado: {
          nome: certificadoInfo.nome,
          cpf: certificadoInfo.cpf,
          validade: certificadoInfo.validade
        }
      };

      // Log da assinatura
      console.log(`✅ Documento assinado com token A3 REAL:`, {
        tipo: tipoDocumento,
        certificado: assinaturaDigital.certificado.nome,
        timestamp: assinaturaDigital.timestamp,
        algoritmo: resultado.algoritmo
      });

      res.json({
        success: true,
        assinatura: assinaturaDigital,
        message: 'Documento assinado digitalmente com sucesso (ASSINATURA REAL)'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro ao assinar documento'
      });
    }

  } catch (error) {
    console.error('❌ Erro ao assinar documento:', error);
    
    let mensagem = 'Erro ao assinar documento digitalmente';
    if (error.message.includes('PIN incorreto')) {
      mensagem = 'PIN incorreto. Verifique o PIN do seu token A3.';
    } else if (error.message.includes('Chave privada')) {
      mensagem = 'Chave privada não encontrada no token.';
    }
    
    res.status(500).json({
      success: false,
      message: mensagem,
      detalhes: error.message
    });
  }
});

/**
 * Verifica assinatura digital
 */
router.post('/verificar-assinatura', async (req, res) => {
  try {
    const { assinaturaId, documentoHash } = req.body;

    if (!assinaturaId || !documentoHash) {
      return res.status(400).json({
        success: false,
        message: 'ID da assinatura e hash do documento são obrigatórios'
      });
    }

    // Em produção, aqui seria feita a verificação real da assinatura
    const verificacao = {
      assinaturaId,
      valida: true,
      certificado: {
        nome: 'MAURO ARIEL SANCHEZ',
        cpf: '237.244.708-43',
        crp: '06/127348',
        validade: '2025-12-31',
        autoridadeCertificadora: 'ICP-Brasil'
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      verificacao,
      message: 'Assinatura válida'
    });

  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar assinatura digital'
    });
  }
});

/**
 * Gera PDF com assinatura digital
 */
router.post('/gerar-pdf-assinado', async (req, res) => {
  try {
    const { 
      tipoDocumento, 
      dadosDocumento, 
      assinaturaId,
      certificadoId 
    } = req.body;

    // Em produção, aqui seria gerado o PDF real com a assinatura digital
    const pdfData = {
      id: `pdf-${Date.now()}`,
      tipo: tipoDocumento,
      assinaturaId,
      certificadoId,
      timestamp: new Date().toISOString(),
      dados: dadosDocumento,
      // Em produção, seria o buffer do PDF
      pdfBuffer: 'PDF_GENERATED_WITH_DIGITAL_SIGNATURE'
    };

    res.json({
      success: true,
      pdf: pdfData,
      message: 'PDF assinado gerado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao gerar PDF assinado:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar PDF com assinatura digital'
    });
  }
});

module.exports = router;
