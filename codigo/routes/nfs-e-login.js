const express = require('express');
const router = express.Router();
const NfsEServiceLogin = require('../utils/nfsEServiceLogin');
const { pool } = require('../config/database');

// Configuração do serviço com login
const nfsEServiceLogin = new NfsEServiceLogin({
  usuario: process.env.NFSE_USUARIO || 'seu_usuario',
  senha: process.env.NFSE_SENHA || 'sua_senha',
  cnpj: process.env.CNPJ || '12345678000190',
  inscricaoMunicipal: process.env.INSCRICAO_MUNICIPAL || '12345678',
  serieRPS: 'NF'
});

// Testar conexão com Prefeitura
router.post('/testar-conexao', async (req, res) => {
  try {
    console.log('🧪 POST /testar-conexao - Prefeitura SP (Login)');
    
    const resultado = await nfsEServiceLogin.testarConexao();
    
    res.json(resultado);
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao testar conexão: ${error.message}`
    });
  }
});

// Emitir NFS-e com login
router.post('/emitir-login', async (req, res) => {
  try {
    console.log('🧾 POST /emitir-login - NFS-e Real com Login');
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

    // Preparar dados para NFS-e
    const dadosRPS = {
      numero: Date.now(), // Número único baseado em timestamp
      serie: 'NF',
      dataEmissao: new Date().toISOString().split('T')[0],
      valorServicos: parseFloat(valor),
      valorDeducoes: 0,
      tributacao: 'T', // Tributado em São Paulo
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

    console.log('📊 Dados RPS preparados:', dadosRPS);

    // Emitir NFS-e via Prefeitura
    const resultado = await nfsEServiceLogin.emitirNfsE(dadosRPS);
    
    if (resultado.success) {
      // Salvar no banco de dados
      const insertQuery = `
        INSERT INTO nfs_e_emitidas 
        (usuario_id, paciente_id, numero_nfs_e, codigo_verificacao, status, valor, 
         discriminacao, data_emissao, link_visualizacao, observacoes, xml_nfs_e)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;
      
      const insertValues = [
        3, // usuario_id
        paciente_id,
        resultado.numeroNfsE,
        resultado.codigoVerificacao,
        'emitida',
        valor,
        dadosRPS.discriminacao,
        resultado.dataEmissao,
        resultado.linkVisualizacao,
        observacoes || '',
        JSON.stringify(resultado)
      ];
      
      const insertResult = await pool.query(insertQuery, insertValues);
      console.log('✅ NFS-e salva no banco:', insertResult.rows[0].id);
    }

    res.json(resultado);
    
  } catch (error) {
    console.error('❌ Erro ao emitir NFS-e com login:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao emitir NFS-e: ${error.message}`,
      error: error.message
    });
  }
});

module.exports = router;
