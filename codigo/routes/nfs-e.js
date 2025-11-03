const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Middleware de autenticação
router.use(authenticateToken);

// Buscar configurações NFS-e do usuário
router.get('/configuracoes', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query('SELECT * FROM configuracoes_nfs_e WHERE usuario_id = $1', [userId]);
    
    if (result.rows.length > 0) {
      res.json({ data: result.rows[0] });
    } else {
      res.status(404).json({ error: 'Configurações NFS-e não encontradas' });
    }
  } catch (error) {
    console.error('Erro ao buscar configurações NFS-e:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configurações NFS-e
router.put('/configuracoes', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      api_url,
      usuario_api,
      senha_api,
      cnpj,
      inscricao_municipal,
      valor_padrao,
      ambiente,
      regime_tributacao,
      incentivador_cultural,
      emissao_rps,
      serie_rps,
      numero_rps,
      aliquota_iss,
      iss_retido,
      cnae,
      item_lista_servico,
      codigo_servico,
      discriminacao_servico
    } = req.body;

    // Verificar se já existe configuração
    const existing = await query('SELECT id FROM configuracoes_nfs_e WHERE usuario_id = $1', [userId]);
    
    if (existing.rows.length > 0) {
      // Atualizar configuração existente
      const result = await query(`
        UPDATE configuracoes_nfs_e SET
          api_url = $2,
          usuario_api = $3,
          senha_api = $4,
          cnpj = $5,
          inscricao_municipal = $6,
          valor_padrao = $7,
          ambiente = $8,
          regime_tributacao = $9,
          incentivador_cultural = $10,
          emissao_rps = $11,
          serie_rps = $12,
          numero_rps = $13,
          aliquota_iss = $14,
          iss_retido = $15,
          cnae = $16,
          item_lista_servico = $17,
          codigo_servico = $18,
          discriminacao_servico = $19,
          updated_at = CURRENT_TIMESTAMP
        WHERE usuario_id = $1
        RETURNING *
      `, [
        userId, api_url, usuario_api, senha_api, cnpj, inscricao_municipal,
        valor_padrao, ambiente, regime_tributacao, incentivador_cultural,
        emissao_rps, serie_rps, numero_rps, aliquota_iss, iss_retido,
        cnae, item_lista_servico, codigo_servico, discriminacao_servico
      ]);
      
      res.json({ data: result.rows[0] });
    } else {
      // Criar nova configuração
      const result = await query(`
        INSERT INTO configuracoes_nfs_e (
          usuario_id, api_url, usuario_api, senha_api, cnpj, inscricao_municipal,
          valor_padrao, ambiente, regime_tributacao, incentivador_cultural,
          emissao_rps, serie_rps, numero_rps, aliquota_iss, iss_retido,
          cnae, item_lista_servico, codigo_servico, discriminacao_servico
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        userId, api_url, usuario_api, senha_api, cnpj, inscricao_municipal,
        valor_padrao, ambiente, regime_tributacao, incentivador_cultural,
        emissao_rps, serie_rps, numero_rps, aliquota_iss, iss_retido,
        cnae, item_lista_servico, codigo_servico, discriminacao_servico
      ]);
      
      res.json({ data: result.rows[0] });
    }
  } catch (error) {
    console.error('Erro ao salvar configurações NFS-e:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Emitir NFS-e para um paciente
router.post('/emitir', async (req, res) => {
  try {
    const userId = req.user.id;
    const { paciente_id, numero_nfs_e, valor_servico, forma_pagamento, observacoes } = req.body;

    console.log('📝 POST /emitir - Dados recebidos:', { paciente_id, numero_nfs_e, valor_servico, forma_pagamento, observacoes });
    console.log('📝 POST /emitir - User ID:', userId);

    // Buscar configurações NFS-e do usuário
    const configResult = await query('SELECT * FROM configuracoes_nfs_e WHERE usuario_id = $1', [userId]);
    
    console.log('📝 Configurações encontradas:', configResult.rows.length);
    
    if (configResult.rows.length === 0) {
      console.log('❌ Configurações NFS-e não encontradas para usuário:', userId);
      return res.status(400).json({ error: 'Configurações NFS-e não encontradas' });
    }

    const config = configResult.rows[0];
    console.log('📝 Configuração:', { codigo_servico: config.codigo_servico, discriminacao_servico: config.discriminacao_servico, valor_padrao: config.valor_padrao });

    // Buscar dados do paciente
    const pacienteResult = await query('SELECT * FROM pacientes WHERE id = $1', [paciente_id]);
    
    if (pacienteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const paciente = pacienteResult.rows[0];

    // Inserir NFS-e na tabela
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 30); // 30 dias
    
    console.log('📝 Inserindo NFS-e com dados:', {
      paciente_id,
      userId,
      numero_nfs_e,
      codigo_servico: config.codigo_servico || '05118',
      discriminacao_servico: config.discriminacao_servico,
      valor_servico: valor_servico || config.valor_padrao,
      forma_pagamento: forma_pagamento || 'dinheiro',
      observacoes,
      dataVencimento
    });
    
    // Tratar valores NULL e garantir que todos os campos necessários estão presentes
    const numeroNfsE = numero_nfs_e || '0000';
    const codigoServico = config.codigo_servico || '05118';
    const discriminacaoServico = config.discriminacao_servico || 'Avaliação Psicológica';
    const valorFinal = valor_servico || config.valor_padrao || 150.00;
    const observacoesFinal = observacoes || `Avaliação psicológica para ${paciente.nome}`;
    
    console.log('📝 Valores finais para INSERT:', {
      paciente_id,
      userId,
      numero_nfs_e: numeroNfsE,
      codigo_servico: codigoServico,
      discriminacao_servico: discriminacaoServico,
      valor: valorFinal,
      observacoes: observacoesFinal
    });
    
    // Usar apenas as colunas que existem na tabela nfs_e_emitidas
    // A tabela tem: discriminacao (não discriminacao_servico)
    // E não tem codigo_servico (está apenas em configuracoes_nfs_e)
    const result = await query(`
      INSERT INTO nfs_e_emitidas (
        paciente_id, usuario_id, numero_nfs_e, valor, 
        discriminacao, observacoes, data_emissao, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      paciente_id,
      userId,
      numeroNfsE,
      valorFinal,
      discriminacaoServico, // Usar discriminacao (nome correto da coluna)
      observacoesFinal || null,
      new Date(),
      'emitida' // Status padrão
    ]);
    
    console.log('✅ NFS-e inserida com sucesso:', result.rows[0]);

    res.json({
      message: 'NFS-e emitida com sucesso',
      nfs_e: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao emitir NFS-e:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar NFS-e emitidas
router.get('/emitidas', async (req, res) => {
  try {
    const userId = req.user.id;
    const { paciente_id, page = 1, limit = 10, date_filter, date_start, date_end, search } = req.query;
    
    let whereClause = 'WHERE n.usuario_id = $1';
    let queryParams = [userId];
    let paramIndex = 1;
    
    if (paciente_id) {
      paramIndex++;
      whereClause += ` AND n.paciente_id = $${paramIndex}`;
      queryParams.push(paciente_id);
    }
    
    // Filtro de busca
    if (search) {
      paramIndex++;
      whereClause += ` AND (p.nome ILIKE $${paramIndex} OR p.cpf ILIKE $${paramIndex} OR n.numero_nfs_e ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
    }
    
    // Filtros de data
    if (date_filter && date_filter !== 'todos') {
      const hoje = new Date();
      let dataInicio, dataFim;
      
      switch (date_filter) {
        case 'hoje':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
          dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
          break;
        case 'semana':
          const inicioSemana = new Date(hoje);
          inicioSemana.setDate(hoje.getDate() - hoje.getDay());
          inicioSemana.setHours(0, 0, 0, 0);
          dataInicio = inicioSemana;
          dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
          break;
        case 'mes':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
          break;
        case 'ano':
          dataInicio = new Date(hoje.getFullYear(), 0, 1);
          dataFim = new Date(hoje.getFullYear(), 11, 31, 23, 59, 59);
          break;
        case 'personalizada':
          if (date_start) dataInicio = new Date(date_start);
          if (date_end) {
            dataFim = new Date(date_end);
            dataFim.setHours(23, 59, 59, 999);
          }
          break;
      }
      
      if (dataInicio) {
        paramIndex++;
        whereClause += ` AND n.data_emissao >= $${paramIndex}`;
        queryParams.push(dataInicio);
      }
      if (dataFim) {
        paramIndex++;
        whereClause += ` AND n.data_emissao <= $${paramIndex}`;
        queryParams.push(dataFim);
      }
    }

    const offset = (page - 1) * limit;
    
    const dataQuery = `
      SELECT 
        n.*, 
        p.nome as paciente_nome, 
        p.cpf as paciente_cpf,
        p.cep,
        p.municipio,
        p.bairro,
        p.numero_endereco,
        p.email
      FROM nfs_e_emitidas n
      JOIN pacientes p ON n.paciente_id = p.id
      ${whereClause}
      ORDER BY n.data_emissao DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(*) 
      FROM nfs_e_emitidas n
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      query(dataQuery, [...queryParams, limit, offset]),
      query(countQuery, queryParams)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Erro ao listar NFS-e:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Limpar todas as NFS-e (apenas administradores)
router.delete('/limpar', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verificar se o usuário é administrador
    const userResult = await query('SELECT perfil FROM usuarios WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const user = userResult.rows[0];
    
    if (user.perfil !== 'administrador') {
      return res.status(403).json({ 
        error: 'Acesso negado. Apenas administradores podem limpar as NFS-e.' 
      });
    }
    
    // Contar NFS-e antes de deletar
    const countResult = await query('SELECT COUNT(*) FROM nfs_e_emitidas');
    const totalNfsE = parseInt(countResult.rows[0].count);
    
    if (totalNfsE === 0) {
      return res.json({ 
        message: 'Base de dados já está limpa',
        deleted: 0 
      });
    }
    
    // Deletar todas as NFS-e
    const deleteResult = await query('DELETE FROM nfs_e_emitidas');
    
    console.log(`🗑️ Administrador ${userId} limpou ${deleteResult.rowCount} NFS-e`);
    
    res.json({
      message: `Base de dados limpa com sucesso! ${deleteResult.rowCount} NFS-e foram removidas.`,
      deleted: deleteResult.rowCount
    });
    
  } catch (error) {
    console.error('Erro ao limpar NFS-e:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Limpar NFS-e selecionadas (apenas administradores)
router.delete('/limpar-selecionadas', async (req, res) => {
  try {
    const userId = req.user.id;
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs das NFS-e são obrigatórios' });
    }
    
    // Verificar se o usuário é administrador
    const userResult = await query('SELECT perfil FROM usuarios WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const user = userResult.rows[0];
    
    if (user.perfil !== 'administrador') {
      return res.status(403).json({ 
        error: 'Acesso negado. Apenas administradores podem limpar as NFS-e.' 
      });
    }
    
    // Verificar se as NFS-e existem
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const checkResult = await query(`SELECT id FROM nfs_e_emitidas WHERE id IN (${placeholders})`, ids);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhuma NFS-e encontrada com os IDs fornecidos' });
    }
    
    // Deletar NFS-e selecionadas
    const deleteResult = await query(`DELETE FROM nfs_e_emitidas WHERE id IN (${placeholders})`, ids);
    
    console.log(`🗑️ Administrador ${userId} limpou ${deleteResult.rowCount} NFS-e selecionadas`);
    
    res.json({
      message: `${deleteResult.rowCount} NFS-e selecionada(s) foram removida(s) com sucesso!`,
      deleted: deleteResult.rowCount
    });
    
  } catch (error) {
    console.error('Erro ao limpar NFS-e selecionadas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Exportar NFS-e para Excel
router.get('/exportar-excel', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        p.cpf,
        p.nome,
        p.cep,
        p.municipio as cidade,
        p.bairro,
        p.numero_endereco as numero,
        p.email,
        n.codigo_servico,
        n.discriminacao_servico,
        n.valor_servico,
        n.forma_pagamento,
        n.data_emissao,
        n.numero_nfs_e
      FROM nfs_e_emitidas n
      JOIN pacientes p ON n.paciente_id = p.id
      WHERE n.usuario_id = $1
      ORDER BY n.data_emissao DESC
    `, [userId]);

    // Configurar headers para download do Excel
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="nfs-e-emitidas.xlsx"');

    // Aqui você pode usar uma biblioteca como 'xlsx' para gerar o Excel
    // Por enquanto, retornando JSON para desenvolvimento
    res.json({
      message: 'Dados para exportação Excel',
      data: result.rows
    });

  } catch (error) {
    console.error('Erro ao exportar NFS-e:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;