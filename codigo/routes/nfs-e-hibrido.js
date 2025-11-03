const express = require('express');
const router = express.Router();
const NfsEServiceHibrido = require('../utils/nfsEServiceHibrido');
const { pool } = require('../config/database');

// Configuração do serviço híbrido
const nfsEServiceHibrido = new NfsEServiceHibrido({
  usuario: process.env.NFSE_USUARIO || 'seu_usuario',
  senha: process.env.NFSE_SENHA || 'sua_senha',
  cnpj: process.env.CNPJ || '12345678000190',
  inscricaoMunicipal: process.env.INSCRICAO_MUNICIPAL || '12345678',
  serieRPS: 'NF'
});

// Testar conexão híbrida
router.post('/testar-conexao', async (req, res) => {
  try {
    console.log('🧪 POST /testar-conexao - Sistema Híbrido');
    
    const resultado = await nfsEServiceHibrido.testarConexao();
    
    res.json(resultado);
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao testar conexão: ${error.message}`
    });
  }
});

// Emitir NFS-e HÍBRIDA
router.post('/emitir-real', async (req, res) => {
  try {
    console.log('🧾 POST /emitir-real - NFS-e HÍBRIDA');
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

    // Preparar dados para NFS-e HÍBRIDA
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

    console.log('📊 Dados RPS preparados para emissão HÍBRIDA:', dadosRPS);

    // Emitir NFS-e HÍBRIDA
    const resultado = await nfsEServiceHibrido.emitirNfsE(dadosRPS);
    
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
    console.error('❌ Erro ao emitir NFS-e HÍBRIDA:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao emitir NFS-e: ${error.message}`,
      error: error.message
    });
  }
});

// Obter instruções para integração real
router.get('/instrucoes', async (req, res) => {
  try {
    console.log('📋 GET /instrucoes - Instruções para integração real');
    
    const instrucoes = await nfsEServiceHibrido.obterInstrucoes();
    
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
