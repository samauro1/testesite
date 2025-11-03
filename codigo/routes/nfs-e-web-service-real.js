const express = require('express');
const router = express.Router();
const NfsEServiceWebServiceReal = require('../utils/nfsEServiceWebServiceReal');
const { authenticateToken } = require('../middleware/auth');

// Instanciar serviço
const nfsEService = new NfsEServiceWebServiceReal();

/**
 * Testar conexão com Web Service
 */
router.post('/testar-conexao', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 Testando conexão Web Service real...');
    
    const resultado = await nfsEService.testarConexao();
    
    res.json({
      sucesso: resultado.sucesso,
      message: resultado.message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error.message);
    res.status(500).json({
      sucesso: false,
      message: `Erro no teste de conexão: ${error.message}`
    });
  }
});

/**
 * Emitir NFS-e real via Web Service
 */
router.post('/emitir-real', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Emitindo NFS-e real via Web Service...');
    
    const { paciente_id, avaliacao_id, valor, observacoes } = req.body;
    
    if (!paciente_id) {
      return res.status(400).json({
        sucesso: false,
        message: 'ID do paciente é obrigatório'
      });
    }

    // Buscar dados do paciente (simulado)
    const dadosPaciente = {
      cpf: '12345678901', // CPF do paciente
      nome: 'Paciente Teste',
      email: 'paciente@teste.com',
      valor: valor || 0.50
    };

    console.log('📊 Dados do paciente:', dadosPaciente);
    
    const resultado = await nfsEService.emitirNfsE(dadosPaciente);
    
    if (resultado.sucesso) {
      // Salvar no banco de dados
      const db = require('../config/database');
      
      const nfsEmitida = {
        numero_nfs_e: resultado.numeroNfsE,
        codigo_verificacao: resultado.codigoVerificacao,
        link_consulta: resultado.link,
        valor: dadosPaciente.valor,
        paciente_id: paciente_id,
        avaliacao_id: avaliacao_id,
        usuario_id: req.user.id,
        status: 'emitida',
        data_emissao: new Date(),
        observacoes: observacoes || 'Emitida via Web Service oficial'
      };

      await db.query(
        `INSERT INTO nfs_e_emitidas 
         (numero_nfs_e, codigo_verificacao, link_consulta, valor, paciente_id, avaliacao_id, usuario_id, status, data_emissao, observacoes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          nfsEmitida.numero_nfs_e,
          nfsEmitida.codigo_verificacao,
          nfsEmitida.link_consulta,
          nfsEmitida.valor,
          nfsEmitida.paciente_id,
          nfsEmitida.avaliacao_id,
          nfsEmitida.usuario_id,
          nfsEmitida.status,
          nfsEmitida.data_emissao,
          nfsEmitida.observacoes
        ]
      );

      console.log('✅ NFS-e salva no banco de dados');
      
      res.json({
        sucesso: true,
        message: `NFS-e ${resultado.numeroNfsE} emitida com sucesso!`,
        numeroNfsE: resultado.numeroNfsE,
        codigoVerificacao: resultado.codigoVerificacao,
        link: resultado.link
      });
    } else {
      res.status(400).json({
        sucesso: false,
        message: 'Erro na emissão da NFS-e',
        erros: resultado.erros,
        alertas: resultado.alertas
      });
    }
  } catch (error) {
    console.error('❌ Erro ao emitir NFS-e:', error.message);
    res.status(500).json({
      sucesso: false,
      message: `Erro ao emitir NFS-e: ${error.message}`
    });
  }
});

/**
 * Instruções para configuração
 */
router.get('/instrucoes', (req, res) => {
  res.json({
    titulo: 'Integração Real com Web Service da Prefeitura de São Paulo',
    descricao: 'Configuração para emissão real de NFS-e via Web Service oficial',
    requisitos: [
      'Certificado digital A1, A3 ou A4 com CNPJ da empresa',
      'Inscrição Municipal (CCM) ativa na Prefeitura de São Paulo',
      'Autorização para emissão de NFS-e configurada no portal',
      'Configuração das variáveis de ambiente'
    ],
    configuracao: {
      certificado: {
        path: 'CERTIFICADO_PATH - Caminho para o arquivo .pfx',
        senha: 'CERTIFICADO_SENHA - Senha do certificado'
      },
      empresa: {
        cnpj: 'NFSE_CNPJ - CNPJ da empresa (14 dígitos)',
        inscricao: 'NFSE_INSCRICAO_MUNICIPAL - Inscrição Municipal (CCM)',
        serie: 'NFSE_SERIE_RPS - Série do RPS (ex: NF)'
      }
    },
    endpoints: {
      wsdl: 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx?WSDL',
      consultas: 'https://nfe.prefeitura.sp.gov.br/contribuinte/consultas.aspx'
    },
    manual: 'Manual oficial disponível no portal da Prefeitura de São Paulo',
    observacoes: [
      'Certificado deve conter o CNPJ da empresa',
      'Assinatura digital segue padrão W3C XML Digital Signature',
      'RPS deve ser assinado conforme especificação oficial',
      'Comunicação via SOAP com autenticação SSL mútua'
    ]
  });
});

module.exports = router;
