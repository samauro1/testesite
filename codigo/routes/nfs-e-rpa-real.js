const express = require('express');
const router = express.Router();
const NfsEServiceRPAReal = require('../utils/nfsEServiceRPAReal');
const { pool } = require('../config/database');

// Configuração do serviço RPA real
const nfsEServiceRPAReal = new NfsEServiceRPAReal({
  usuario: process.env.NFSE_USUARIO || 'seu_usuario',
  senha: process.env.NFSE_SENHA || 'sua_senha',
  cnpj: process.env.CNPJ || '12345678000190',
  inscricaoMunicipal: process.env.INSCRICAO_MUNICIPAL || '12345678',
  serieRPS: 'NF'
});

// Testar conexão REAL com portal da Prefeitura
router.post('/testar-conexao', async (req, res) => {
  try {
    console.log('🧪 POST /testar-conexao - Portal Prefeitura SP (RPA REAL)');
    
    const resultado = await nfsEServiceRPAReal.testarConexao();
    
    res.json(resultado);
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao testar conexão: ${error.message}`
    });
  }
});

// Emitir NFS-e REAL via RPA
router.post('/emitir-real', async (req, res) => {
  try {
    console.log('🧾 POST /emitir-real - NFS-e REAL via RPA');
    console.log('📊 req.body:', req.body);
    
    const { paciente_id, valor, observacoes } = req.body;
    
    if (!paciente_id || !valor) {
      return res.status(400).json({ 
        error: 'ID do paciente e valor são obrigatórios.' 
      });
    }
    
    // Buscar dados do paciente
    const pacienteResult = await pool.query(
      'SELECT * FROM pacientes WHERE id = $1',
      [paciente_id]
    );

    if (pacienteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }

    const paciente = pacienteResult.rows[0];
    console.log('📊 Paciente encontrado:', paciente.nome);

    // Preparar dados para NFS-e REAL
    const dadosRPS = {
      pacienteId: paciente_id,
      numero: Date.now(),
      serie: 'NF',
      dataEmissao: new Date().toISOString().split('T')[0],
      valorServicos: parseFloat(valor),
      valorDeducoes: 0,
      tributacao: 'T',
      issRetido: false,
      discriminacao: observacoes || 'Avaliação psicológica',
      tomador: {
        cpfCnpj: paciente.cpf,
        razaoSocial: paciente.nome,
        endereco: paciente.logradouro || '',
        numero: paciente.numero_endereco || '',
        bairro: paciente.bairro || '',
        cidade: paciente.municipio || 'São Paulo',
        uf: 'SP',
        cep: paciente.cep || '',
        telefone: paciente.telefone || '',
        email: paciente.email || ''
      }
    };

    console.log('📊 Dados RPS preparados para emissão REAL:', dadosRPS);

    // Emitir NFS-e REAL via RPA
    const resultado = await nfsEServiceRPAReal.emitirNfsE(dadosRPS);
    
    res.json({
      success: resultado.success,
      message: resultado.message,
      data: resultado.success ? {
        numero_nfs_e: resultado.numeroNfsE,
        codigo_verificacao: resultado.codigoVerificacao,
        data_emissao: resultado.dataEmissao,
        link_visualizacao: resultado.linkVisualizacao,
        status: resultado.status,
        observacoes: resultado.observacoes
      } : null,
      error: resultado.error || null
    });
    
  } catch (error) {
    console.error('❌ Erro ao emitir NFS-e REAL:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao emitir NFS-e: ${error.message}`,
      error: error.message
    });
  }
});

// Mostrar instruções para implementação RPA real
router.get('/instrucoes-rpa', async (req, res) => {
  try {
    console.log('📋 GET /instrucoes-rpa - Instruções para RPA real');
    
    const instrucoes = {
      status: 'implementacao_real',
      mensagem: 'Sistema RPA REAL implementado. Para usar:',
      passos: [
        '1. Configurar credenciais reais da Prefeitura no .env',
        '2. Testar conexão com portal',
        '3. Emitir NFS-e real via RPA',
        '4. Verificar no portal da Prefeitura',
        '5. Monitorar logs e screenshots'
      ],
      requisitos: [
        'Credenciais válidas da Prefeitura',
        'Puppeteer instalado no disco D',
        'Navegador Chromium funcionando',
        'Configuração de segurança'
      ],
      avisos: [
        '⚠️ Sistema abre navegador real',
        '⚠️ Requer intervenção manual se houver captcha',
        '⚠️ Screenshots são salvos em caso de erro',
        '⚠️ Testar em ambiente de desenvolvimento primeiro'
      ],
      formato_esperado: {
        nfs_e: '00001003',
        rps: '',
        emissao: '22/10/2025 10:04:10',
        data_fato_gerador: '22/10/2025',
        tomador: 'VINICIUS ESTEVAM MASSARO DE GOUVEIA',
        cpf: '399.912.518-71',
        valor_servicos: '142,53',
        iss_devido: '0,00',
        situacao: 'Normal'
      },
      vantagens: [
        '✅ NFS-e REAIS na Prefeitura',
        '✅ Números oficiais',
        '✅ Links funcionais',
        '✅ Integração completa',
        '✅ Automação real'
      ]
    };
    
    res.json(instrucoes);
  } catch (error) {
    console.error('❌ Erro ao obter instruções:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao obter instruções: ${error.message}`
    });
  }
});

module.exports = router;