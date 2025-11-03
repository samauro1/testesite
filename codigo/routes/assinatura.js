const express = require('express');
const forge = require('node-forge');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Validar certificado A3
router.post('/validar-certificado', async (req, res) => {
  try {
    const { certificado_base64 } = req.body;

    if (!certificado_base64) {
      return res.status(400).json({
        error: 'Certificado é obrigatório'
      });
    }

    try {
      // Decodificar o certificado Base64
      const certDer = forge.util.decode64(certificado_base64);
      const cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(certDer));

      // Extrair informações do certificado
      const subject = cert.subject.attributes.reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {});

      const issuer = cert.issuer.attributes.reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {});

      // Validar validade do certificado
      const now = new Date();
      const notBefore = cert.validity.notBefore;
      const notAfter = cert.validity.notAfter;

      if (now < notBefore || now > notAfter) {
        return res.status(400).json({
          error: 'Certificado expirado ou ainda não válido',
          details: {
            valido_de: notBefore,
            valido_ate: notAfter
          }
        });
      }

      // Retornar informações do certificado
      res.json({
        valido: true,
        dados: {
          nome: subject.commonName || subject.CN,
          cpf: extractCPFFromCertificate(subject),
          email: subject.emailAddress,
          organizacao: subject.organizationName || subject.O,
          valido_ate: notAfter,
          emissor: issuer.commonName || issuer.CN
        }
      });

    } catch (certError) {
      console.error('Erro ao processar certificado:', certError);
      return res.status(400).json({
        error: 'Certificado inválido ou formato incorreto',
        details: certError.message
      });
    }

  } catch (error) {
    console.error('Erro ao validar certificado:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Assinar documento (hash do PDF)
router.post('/assinar-documento', async (req, res) => {
  try {
    const { hash_documento, certificado_base64, senha } = req.body;

    if (!hash_documento || !certificado_base64) {
      return res.status(400).json({
        error: 'Hash do documento e certificado são obrigatórios'
      });
    }

    try {
      // Decodificar certificado
      const certDer = forge.util.decode64(certificado_base64);
      const cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(certDer));

      // Criar assinatura
      // NOTA: Em produção, a chave privada deve vir do token A3 via PKCS#11
      // Por enquanto, retornamos informações para validação no frontend
      
      const assinatura = {
        hash_assinado: hash_documento,
        certificado: certificado_base64,
        timestamp: new Date().toISOString(),
        algoritmo: 'SHA256withRSA',
        dados_certificado: {
          nome: cert.subject.getField('CN')?.value,
          cpf: extractCPFFromCertificate(cert.subject.attributes.reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {})),
          valido_ate: cert.validity.notAfter
        }
      };

      // Salvar log da assinatura
      await query(`
        INSERT INTO logs_assinaturas (
          usuario_id, tipo_documento, hash_documento, 
          certificado_cn, certificado_cpf, timestamp_assinatura
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        req.user.id,
        'laudo_psicologico',
        hash_documento,
        assinatura.dados_certificado.nome,
        assinatura.dados_certificado.cpf,
        assinatura.timestamp
      ]);

      res.json({
        sucesso: true,
        assinatura: assinatura
      });

    } catch (signError) {
      console.error('Erro ao assinar documento:', signError);
      return res.status(400).json({
        error: 'Erro ao processar assinatura',
        details: signError.message
      });
    }

  } catch (error) {
    console.error('Erro ao assinar documento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Helper para extrair CPF do certificado
function extractCPFFromCertificate(subject) {
  // CPF pode estar no CN ou em OID específico
  const cn = subject.commonName || subject.CN || '';
  const cpfMatch = cn.match(/\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2}/);
  return cpfMatch ? cpfMatch[0] : null;
}

module.exports = router;

