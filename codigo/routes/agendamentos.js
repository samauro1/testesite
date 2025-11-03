const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { processarTelefones } = require('../utils/phoneUtils');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Listar agendamentos
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 100, search = '', status, data_inicio, data_fim } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    // Filtro por usuário (exceto admin)
    if (!isAdmin(req.user)) {
      queryParams.push(req.user.id);
      whereClause += ` AND a.usuario_id = $${queryParams.length}`;
    }

    // Sem filtro de data padrão - mostrar todos os agendamentos
    // O filtro de data só é aplicado quando data_inicio e data_fim são especificados

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (a.nome ILIKE $${queryParams.length} OR a.cpf ILIKE $${queryParams.length} OR a.email ILIKE $${queryParams.length})`;
    }

    if (status) {
      queryParams.push(status);
      whereClause += ` AND a.status = $${queryParams.length}`;
    }

    if (data_inicio) {
      queryParams.push(data_inicio);
      whereClause += ` AND a.data_agendamento >= $${queryParams.length}`;
    }

    if (data_fim) {
      queryParams.push(data_fim);
      whereClause += ` AND a.data_agendamento <= $${queryParams.length}`;
    }

    const countQuery = `
      SELECT COUNT(*) 
      FROM agendamentos a 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT 
        a.*,
        p.nome as paciente_nome,
        u.nome as usuario_nome,
        (
          SELECT aptidao 
          FROM avaliacoes 
          WHERE paciente_id = a.paciente_id AND aptidao IS NOT NULL
          ORDER BY data_aplicacao DESC, created_at DESC 
          LIMIT 1
        ) as ultima_aptidao
      FROM agendamentos a 
      LEFT JOIN pacientes p ON a.paciente_id = p.id
      LEFT JOIN usuarios u ON a.created_at = u.created_at
      ${whereClause}
      ORDER BY a.data_agendamento ASC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const dataResult = await query(dataQuery, [...queryParams, limit, offset]);

    // Garantir status 200 (não 304)
    res.status(200).json({
      data: {
        agendamentos: dataResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Buscar agendamento por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Montar query com filtro de usuário se não for admin
    let whereClause = 'WHERE a.id = $1';
    let queryParams = [id];

    if (!isAdmin(req.user)) {
      queryParams.push(req.user.id);
      whereClause += ' AND a.usuario_id = $2';
    }

    const result = await query(`
      SELECT 
        a.*,
        p.nome as paciente_nome, p.cpf as paciente_cpf
      FROM agendamentos a 
      LEFT JOIN pacientes p ON a.paciente_id = p.id
      ${whereClause}
    `, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Agendamento não encontrado ou você não tem permissão para acessá-lo'
      });
    }

    res.json({
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Criar agendamento
router.post('/', async (req, res) => {
  try {
    const { 
      paciente_id, 
      nome, 
      cpf, 
      telefone, 
      email, 
      data_agendamento, 
      tipo_avaliacao, 
      observacoes,
      contexto,
      tipo_transito
    } = req.body;

    // Validar campos obrigatórios
    if (!nome || !data_agendamento) {
      return res.status(400).json({
        error: 'Nome e data de agendamento são obrigatórios'
      });
    }

    // Atribuir agendamento ao usuário logado
    const usuarioId = req.user.id;

    const result = await query(`
      INSERT INTO agendamentos (
        paciente_id, nome, cpf, telefone, email, 
        data_agendamento, tipo_avaliacao, observacoes, status,
        contexto, tipo_transito, categoria_cnh, usuario_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'agendado', $9, $10, $11, $12)
      RETURNING *
    `, [
      paciente_id || null,
      nome,
      cpf || null,
      telefone || null,
      email || null,
      data_agendamento,
      tipo_avaliacao || null,
      observacoes || null,
      contexto || null,
      tipo_transito || null,
      req.body.categoria_cnh || null,
      usuarioId
    ]);

    console.log(`✅ Agendamento criado e atribuído ao usuário ID ${usuarioId}`);

    res.status(201).json({
      message: 'Agendamento criado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Criar múltiplos agendamentos (importação em lote)
router.post('/importar-lote', async (req, res) => {
  try {
    const { agendamentos, data_base, psicologo_info } = req.body;

    console.log('📥 Importação em lote recebida:', {
      totalAgendamentos: agendamentos?.length,
      data_base,
      primeiroAgendamento: agendamentos?.[0]
    });

    if (!agendamentos || !Array.isArray(agendamentos)) {
      console.log('❌ Lista de agendamentos inválida');
      return res.status(400).json({
        error: 'Lista de agendamentos é obrigatória'
      });
    }

    const resultados = {
      sucesso: 0,
      erros: 0,
      duplicatas: 0,
      detalhes: []
    };

    // Atribuir todos os agendamentos ao usuário logado
    const usuarioId = req.user.id;

    for (const agend of agendamentos) {
      try {
        // Verificar se já existe um agendamento similar (mesmo nome, CPF e data)
        const existingCheck = await query(`
          SELECT id FROM agendamentos 
          WHERE UPPER(nome) = UPPER($1) 
            AND cpf = $2 
            AND data_agendamento = $3
            AND usuario_id = $4
        `, [
          agend.nome,
          agend.cpf || null,
          agend.data_agendamento,
          usuarioId
        ]);

        if (existingCheck.rows.length > 0) {
          console.log(`⚠️ Agendamento já existe: ${agend.nome} - pulando duplicata`);
          resultados.duplicatas++;
          resultados.detalhes.push({
            nome: agend.nome,
            status: 'duplicata',
            id: existingCheck.rows[0].id,
            mensagem: 'Agendamento já existe - duplicata ignorada'
          });
          continue;
        }

        const result = await query(`
          INSERT INTO agendamentos (
            nome, cpf, telefone, email, 
            data_agendamento, tipo_avaliacao, observacoes, status,
            contexto, tipo_transito, categoria_cnh, usuario_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'agendado', $8, $9, $10, $11)
          RETURNING id, nome
        `, [
          agend.nome,
          agend.cpf || null,
          agend.telefone || null,
          agend.email || null,
          agend.data_agendamento,
          agend.tipo_avaliacao || null,
          agend.observacoes || null,
          agend.contexto || 'Trânsito',
          agend.tipo_transito || null,
          agend.categoria_cnh || null,
          usuarioId
        ]);

        resultados.sucesso++;
        resultados.detalhes.push({
          nome: agend.nome,
          status: 'sucesso',
          id: result.rows[0].id
        });
      } catch (error) {
        console.error('❌ Erro ao inserir agendamento:', agend.nome, error.message);
        resultados.erros++;
        resultados.detalhes.push({
          nome: agend.nome,
          status: 'erro',
          erro: error.message
        });
      }
    }

    res.json({
      message: `Importação concluída: ${resultados.sucesso} sucesso, ${resultados.erros} erros, ${resultados.duplicatas} duplicatas ignoradas`,
      data: resultados
    });
  } catch (error) {
    console.error('Erro ao importar agendamentos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Atualizar agendamento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      paciente_id, 
      nome, 
      cpf, 
      telefone, 
      telefone_fixo,
      telefone_celular,
      email, 
      data_agendamento, 
      tipo_avaliacao, 
      observacoes,
      status,
      contexto,
      tipo_transito,
      categoria_cnh
    } = req.body;

    // Verificar se o agendamento existe e se o usuário tem permissão
    let checkQuery = 'SELECT * FROM agendamentos WHERE id = $1';
    let checkParams = [id];

    if (!isAdmin(req.user)) {
      checkQuery += ' AND usuario_id = $2';
      checkParams.push(req.user.id);
    }

    const existingAgendamento = await query(checkQuery, checkParams);

    if (existingAgendamento.rows.length === 0) {
      return res.status(404).json({
        error: 'Agendamento não encontrado ou você não tem permissão para editá-lo'
      });
    }

    // Processar telefones se fornecido (telefone ou telefone_fixo/celular)
    let telefonesProcessados = { telefone_fixo: null, telefone_celular: null };
    
    if (telefone_fixo !== undefined || telefone_celular !== undefined) {
      // Se telefone_fixo ou telefone_celular foram fornecidos diretamente
      telefonesProcessados.telefone_fixo = telefone_fixo !== undefined ? telefone_fixo : existingAgendamento.rows[0].telefone_fixo;
      telefonesProcessados.telefone_celular = telefone_celular !== undefined ? telefone_celular : existingAgendamento.rows[0].telefone_celular;
    } else if (telefone !== undefined) {
      // Se telefone foi fornecido, processar usando o utilitário
      telefonesProcessados = processarTelefones(telefone);
    } else {
      // Manter telefones existentes
      telefonesProcessados.telefone_fixo = existingAgendamento.rows[0].telefone_fixo;
      telefonesProcessados.telefone_celular = existingAgendamento.rows[0].telefone_celular;
    }

    // Atualização parcial
    const agendamentoAtual = existingAgendamento.rows[0];
    const dadosAtualizados = {
      paciente_id: paciente_id !== undefined ? paciente_id : agendamentoAtual.paciente_id,
      nome: nome !== undefined ? nome : agendamentoAtual.nome,
      cpf: cpf !== undefined ? cpf : agendamentoAtual.cpf,
      telefone: telefone !== undefined ? telefone : agendamentoAtual.telefone,
      telefone_fixo: telefonesProcessados.telefone_fixo,
      telefone_celular: telefonesProcessados.telefone_celular,
      email: email !== undefined ? email : agendamentoAtual.email,
      data_agendamento: data_agendamento !== undefined ? data_agendamento : agendamentoAtual.data_agendamento,
      tipo_avaliacao: tipo_avaliacao !== undefined ? tipo_avaliacao : agendamentoAtual.tipo_avaliacao,
      observacoes: observacoes !== undefined ? observacoes : agendamentoAtual.observacoes,
      status: status !== undefined ? status : agendamentoAtual.status,
      contexto: contexto !== undefined ? contexto : agendamentoAtual.contexto,
      tipo_transito: tipo_transito !== undefined ? tipo_transito : agendamentoAtual.tipo_transito,
      categoria_cnh: categoria_cnh !== undefined ? categoria_cnh : agendamentoAtual.categoria_cnh
    };

    const result = await query(`
      UPDATE agendamentos 
      SET 
        paciente_id = $1,
        nome = $2,
        cpf = $3,
        telefone = $4,
        telefone_fixo = $5,
        telefone_celular = $6,
        email = $7,
        data_agendamento = $8,
        tipo_avaliacao = $9,
        observacoes = $10,
        status = $11,
        contexto = $12,
        tipo_transito = $13,
        categoria_cnh = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `, [
      dadosAtualizados.paciente_id,
      dadosAtualizados.nome,
      dadosAtualizados.cpf,
      dadosAtualizados.telefone,
      dadosAtualizados.telefone_fixo,
      dadosAtualizados.telefone_celular,
      dadosAtualizados.email,
      dadosAtualizados.data_agendamento,
      dadosAtualizados.tipo_avaliacao,
      dadosAtualizados.observacoes,
      dadosAtualizados.status,
      dadosAtualizados.contexto,
      dadosAtualizados.tipo_transito,
      dadosAtualizados.categoria_cnh,
      id
    ]);

    res.json({
      message: 'Agendamento atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar agendamento:', error);
    console.error('❌ Mensagem:', error.message);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      error: 'Erro interno do servidor',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Deletar agendamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Montar query com filtro de usuário se não for admin
    let deleteQuery = 'DELETE FROM agendamentos WHERE id = $1';
    let deleteParams = [id];

    if (!isAdmin(req.user)) {
      deleteQuery += ' AND usuario_id = $2';
      deleteParams.push(req.user.id);
    }

    deleteQuery += ' RETURNING *';

    const result = await query(deleteQuery, deleteParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Agendamento não encontrado ou você não tem permissão para deletá-lo'
      });
    }

    res.json({
      message: 'Agendamento excluído com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Converter agendamento em paciente
router.post('/:id/converter-paciente', async (req, res) => {
  try {
    const { id } = req.params;
    const { dados_adicionais } = req.body;

    console.log('🔄 Convertendo agendamento ID:', id);
    console.log('📋 Dados adicionais:', dados_adicionais);
    console.log('📋 Request body completo:', req.body);
    console.log('📋 Tipo dos dados adicionais:', typeof dados_adicionais);

    // Buscar agendamento e verificar permissão
    let checkQuery = 'SELECT * FROM agendamentos WHERE id = $1';
    let checkParams = [id];

    if (!isAdmin(req.user)) {
      checkQuery += ' AND usuario_id = $2';
      checkParams.push(req.user.id);
    }

    const agendamento = await query(checkQuery, checkParams);

    if (agendamento.rows.length === 0) {
      return res.status(404).json({
        error: 'Agendamento não encontrado ou você não tem permissão para convertê-lo'
      });
    }

    const agend = agendamento.rows[0];
    console.log('📋 Agendamento encontrado:', agend);

    // Verificar se já foi convertido e se o paciente ainda existe
    if (agend.convertido_em_paciente) {
      // Se paciente_id é null, o paciente foi deletado - permitir reconversão
      if (!agend.paciente_id) {
        console.log('⚠️  Agendamento marcado como convertido, mas paciente_id é null (paciente foi deletado). Permitindo reconversão.');
        // Resetar o flag para permitir reconversão
        await query(
          'UPDATE agendamentos SET convertido_em_paciente = FALSE, status = $1 WHERE id = $2',
          ['agendado', id]
        );
        console.log('✅ Flag convertido_em_paciente resetado para permitir reconversão');
      } else {
        // Verificar se o paciente vinculado ainda existe
        const pacienteVinculado = await query(
          'SELECT id FROM pacientes WHERE id = $1',
          [agend.paciente_id]
        );
        
        // Se o paciente ainda existe, não permitir reconversão
        if (pacienteVinculado.rows.length > 0) {
          return res.status(400).json({
            error: 'Este agendamento já foi convertido em paciente',
            paciente_id: agend.paciente_id
          });
        }
        
        // Se chegou aqui, o paciente foi deletado - permitir reconversão
        console.log('⚠️  Agendamento marcado como convertido, mas paciente foi deletado. Permitindo reconversão.');
        // Resetar o flag
        await query(
          'UPDATE agendamentos SET convertido_em_paciente = FALSE, paciente_id = NULL, status = $1 WHERE id = $2',
          ['agendado', id]
        );
        console.log('✅ Flag convertido_em_paciente resetado e paciente_id limpo');
      }
    }

    // Processar telefones do agendamento
    const telefonesProcessados = processarTelefones(agend.telefone || agend.telefone_celular || agend.telefone_fixo || null);
    
    // Preparar dados do paciente
    const dadosPaciente = {
      nome: agend.nome,
      cpf: agend.cpf || null,
      telefone_fixo: telefonesProcessados.telefone_fixo,
      telefone_celular: telefonesProcessados.telefone_celular,
      email: agend.email || null,
      observacoes: agend.observacoes || null,
      contexto: dados_adicionais?.contexto || agend.contexto || null,
      escolaridade: dados_adicionais?.escolaridade || null,
      data_nascimento: dados_adicionais?.data_nascimento || null,
      endereco: dados_adicionais?.endereco || null,
      tipo_transito: dados_adicionais?.tipo_transito || agend.tipo_transito || null,
      categoria_cnh: dados_adicionais?.categoria_cnh || agend.categoria_cnh || null
    };
    
    // Calcular idade se tiver data_nascimento (obrigatório pois a coluna é NOT NULL)
    let idade = 0; // Valor padrão se não tiver data_nascimento
    if (dadosPaciente.data_nascimento) {
      const nascimento = new Date(dadosPaciente.data_nascimento);
      const hoje = new Date();
      idade = hoje.getFullYear() - nascimento.getFullYear();
      const mesDiff = hoje.getMonth() - nascimento.getMonth();
      if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
      }
    }
    dadosPaciente.idade = idade;

    console.log('💾 Criando paciente com dados:', dadosPaciente);

    // Normalizar CPF antes de salvar
    if (dadosPaciente.cpf && dadosPaciente.cpf.length === 11 && /^\d{11}$/.test(dadosPaciente.cpf)) {
      dadosPaciente.cpf = dadosPaciente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      console.log('📝 CPF normalizado para:', dadosPaciente.cpf);
    }

    // Verificar se já existe um paciente com este CPF
    const pacienteExistente = await query(
      'SELECT id, nome, cpf FROM pacientes WHERE cpf = $1',
      [dadosPaciente.cpf]
    );

    let pacienteFinal;

    if (pacienteExistente.rows.length > 0) {
      // Paciente já existe - vincular ao agendamento
      pacienteFinal = pacienteExistente.rows[0];
      console.log(`🔗 Paciente já existe (ID: ${pacienteFinal.id}) - vinculando ao agendamento`);
      
      // Atualizar dados do paciente existente com informações do agendamento se necessário
      await query(`
        UPDATE pacientes SET 
          telefone_fixo = COALESCE($1::text, telefone_fixo),
          telefone_celular = COALESCE($2::text, telefone_celular),
          email = COALESCE($3::text, email),
          observacoes = CASE 
            WHEN observacoes IS NULL OR observacoes = '' THEN $4::text
            ELSE CONCAT(observacoes, '\n', $4::text)
          END,
          contexto = COALESCE($5::text, contexto),
          escolaridade = COALESCE($6::text, escolaridade),
          data_nascimento = COALESCE($7::date, data_nascimento),
          idade = COALESCE($8::integer, idade),
          endereco = COALESCE($9::text, endereco),
          tipo_transito = COALESCE($10::text, tipo_transito),
          categoria_cnh = COALESCE($11::text, categoria_cnh),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $12::integer
      `, [
        dadosPaciente.telefone_fixo,
        dadosPaciente.telefone_celular,
        dadosPaciente.email,
        dadosPaciente.observacoes,
        dadosPaciente.contexto,
        dadosPaciente.escolaridade,
        dadosPaciente.data_nascimento,
        dadosPaciente.idade,
        dadosPaciente.endereco,
        dadosPaciente.tipo_transito,
        dadosPaciente.categoria_cnh,
        pacienteFinal.id
      ]);
    } else {
      // Criar novo paciente
      const usuarioId = agend.usuario_id || req.user.id;

      const pacienteResult = await query(`
        INSERT INTO pacientes (
          nome, cpf, telefone_fixo, telefone_celular, email, observacoes,
          contexto, escolaridade, data_nascimento, idade, endereco, tipo_transito, categoria_cnh, usuario_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        dadosPaciente.nome,
        dadosPaciente.cpf,
        dadosPaciente.telefone_fixo,
        dadosPaciente.telefone_celular,
        dadosPaciente.email,
        dadosPaciente.observacoes,
        dadosPaciente.contexto,
        dadosPaciente.escolaridade,
        dadosPaciente.data_nascimento,
        dadosPaciente.idade,
        dadosPaciente.endereco,
        dadosPaciente.tipo_transito,
        dadosPaciente.categoria_cnh,
        usuarioId
      ]);

      pacienteFinal = pacienteResult.rows[0];
      console.log(`✅ Paciente criado (ID: ${pacienteFinal.id}) e atribuído ao usuário ID ${usuarioId}`);
    }

    // Atualizar agendamento marcando como convertido
    await query(`
      UPDATE agendamentos 
      SET 
        paciente_id = $1,
        convertido_em_paciente = TRUE,
        status = 'realizado',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [pacienteFinal.id, id]);

    res.json({
      message: pacienteExistente.rows.length > 0 
        ? 'Agendamento vinculado ao paciente existente com sucesso'
        : 'Agendamento convertido em paciente com sucesso',
      data: {
        paciente: pacienteFinal,
        agendamento_id: id,
        vinculado_existente: pacienteExistente.rows.length > 0
      }
    });
  } catch (error) {
    console.error('❌ Erro ao converter agendamento em paciente:', error);
    console.error('❌ Mensagem de erro:', error.message);
    console.error('❌ Código de erro:', error.code);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Detalhes completos:', JSON.stringify(error, null, 2));
    
    // Verificar se é erro de CPF duplicado (não deveria mais acontecer com a nova lógica)
    if (error.message && error.message.includes('duplicate key')) {
      return res.status(400).json({
        error: 'Erro inesperado: CPF duplicado. Tente novamente.',
        detalhes: error.message
      });
    }
    
    // Verificar se é erro de coluna
    if (error.message && (error.message.includes('column') || error.message.includes('syntax error'))) {
      return res.status(500).json({
        error: 'Erro de estrutura do banco de dados',
        detalhes: error.message,
        code: error.code
      });
    }
    
    // Verificar se é erro de constraint ou foreign key
    if (error.code === '23503' || error.message.includes('foreign key')) {
      return res.status(400).json({
        error: 'Erro de integridade: Referência inválida',
        detalhes: error.message
      });
    }
    
    // Verificar se é erro de valor nulo em campo não nulo
    if (error.code === '23502' || error.message.includes('null value')) {
      return res.status(400).json({
        error: 'Campo obrigatório não preenchido',
        detalhes: error.message
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code || 'UNKNOWN'
    });
  }
});

module.exports = router;

