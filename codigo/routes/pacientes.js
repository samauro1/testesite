const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { validate, pacienteSchema } = require('../middleware/validation');
const RenachProcessor = require('../utils/renachProcessorUniversal');
const { sanitizeExtractedData, shouldUpdateValue } = require('../utils/renachDataNormalizer');
const { processarTelefones } = require('../utils/phoneUtils');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Listar pacientes
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'data', sortOrder = 'asc' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    // Filtro por usuário (exceto admin)
    if (!isAdmin(req.user)) {
      whereClause = 'WHERE p.usuario_id = $1';
      queryParams.push(req.user.id);
    }

    if (search) {
      // Busca flexível: nome, CPF formatado ou CPF sem formatação
      const cleanSearch = search.replace(/\D/g, ''); // Remove formatação
      const formattedSearch = cleanSearch.length === 11 ? 
        cleanSearch.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : search;
      
      const searchCondition = `(p.nome ILIKE $${queryParams.length + 1} OR p.cpf ILIKE $${queryParams.length + 1} OR p.cpf ILIKE $${queryParams.length + 2})`;
      whereClause = whereClause ? `${whereClause} AND ${searchCondition}` : `WHERE ${searchCondition}`;
      queryParams.push(`%${search}%`, `%${formattedSearch}%`);
    }

    // Garantir que as colunas nfs_valor_dinheiro e nfs_valor_pix existam
    try {
      await query(`
        ALTER TABLE pacientes
        ADD COLUMN IF NOT EXISTS nfs_valor_dinheiro DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS nfs_valor_pix DECIMAL(10,2)
      `);
    } catch (alterError) {
      // Ignorar erros de coluna já existente
      if (alterError.code !== '42701') {
        console.warn('Aviso ao adicionar colunas NFS-e na listagem:', alterError.message);
      }
    }

    const countQuery = `SELECT COUNT(*) FROM pacientes p ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT 
        p.id, p.nome, p.cpf, p.idade, p.data_nascimento, p.numero_laudo, p.contexto, 
        p.tipo_transito, p.escolaridade, p.telefone_fixo, p.telefone_celular, p.email, p.endereco, p.observacoes, 
        p.created_at, p.updated_at,
        p.numero_renach, p.sexo, p.categoria_cnh, p.nome_pai, p.nome_mae, 
        p.naturalidade, p.nacionalidade, p.rg, p.orgao_expedidor_rg, p.uf_rg, 
        p.tipo_documento_rg, p.resultado_exame, p.data_exame, p.data_primeira_habilitacao, p.numero_laudo_renach, 
        p.crp_renach, p.credenciado_renach, p.regiao_renach,
        p.logradouro, p.numero_endereco, p.bairro, p.cep, p.municipio,
        p.nfs_numero, p.nfs_forma_pagamento, p.nfs_valor, p.nfs_valor_dinheiro, p.nfs_valor_pix,
        (
          SELECT aptidao 
          FROM avaliacoes 
          WHERE paciente_id = p.id AND aptidao IS NOT NULL
          ORDER BY data_aplicacao DESC, created_at DESC 
          LIMIT 1
        ) as ultima_aptidao,
        (
          SELECT id 
          FROM avaliacoes 
          WHERE paciente_id = p.id AND aptidao IS NOT NULL
          ORDER BY data_aplicacao DESC, created_at DESC 
          LIMIT 1
        ) as ultima_avaliacao_id,
        (
          SELECT data_agendamento 
          FROM agendamentos 
          WHERE paciente_id = p.id 
          ORDER BY data_agendamento ASC 
          LIMIT 1
        ) as proximo_agendamento,
        (
          SELECT COUNT(*) 
          FROM avaliacoes 
          WHERE paciente_id = p.id
        ) as total_avaliacoes
      FROM pacientes p
      ${whereClause}
      ORDER BY ${getOrderByClause(sortBy, sortOrder)} 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const dataResult = await query(dataQuery, [...queryParams, limit, offset]);

    res.json({
      data: {
        pacientes: dataResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao listar pacientes:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Buscar paciente por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID
    if (!id || isNaN(parseInt(id))) {
      console.error('❌ ID inválido recebido:', id);
      return res.status(400).json({
        error: 'ID de paciente inválido',
        details: `O ID "${id}" não é um número válido`
      });
    }

    const pacienteId = parseInt(id);
    console.log('🔍 Buscando paciente ID:', pacienteId, '| Usuário:', req.user?.id, '| Admin:', isAdmin(req.user));

    // Montar query com filtro de usuário se não for admin
    let queryText = `SELECT id, nome, cpf, idade, data_nascimento, numero_laudo, contexto, tipo_transito, escolaridade, 
                     telefone, telefone_fixo, telefone_celular, email, endereco, observacoes, 
                     created_at, updated_at, usuario_id,
                     numero_renach, sexo, categoria_cnh, nome_pai, nome_mae, 
                     naturalidade, nacionalidade, rg, orgao_expedidor_rg, uf_rg, 
                     tipo_documento_rg, resultado_exame, data_exame, data_primeira_habilitacao, numero_laudo_renach, 
                     crp_renach, credenciado_renach, regiao_renach,
                     logradouro, numero_endereco, bairro, cep, municipio
                     FROM pacientes WHERE id = $1`;
    let queryParams = [pacienteId];

    if (!isAdmin(req.user)) {
      queryText += ' AND usuario_id = $2';
      queryParams.push(req.user.id);
    }

    console.log('📊 Query:', queryText, '| Params:', queryParams);

    const result = await query(queryText, queryParams);

    console.log('📦 Resultado da query:', result.rows.length, 'registros encontrados');

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente não encontrado ou você não tem permissão para acessá-lo'
      });
    }

    res.json({
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Erro ao buscar paciente:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Criar paciente
router.post('/', validate(pacienteSchema), async (req, res) => {
  try {
    let { nome, cpf, data_nascimento, numero_laudo, contexto, tipo_transito, escolaridade, telefone, email, endereco, observacoes } = req.body;

    // Normalizar campos vazios: converter strings vazias para null
    if (data_nascimento === '' || data_nascimento === undefined) data_nascimento = null;
    if (escolaridade === '' || escolaridade === undefined) escolaridade = null;
    if (numero_laudo === '' || numero_laudo === undefined) numero_laudo = null;
    if (contexto === '' || contexto === undefined) contexto = null;
    if (tipo_transito === '' || tipo_transito === undefined) tipo_transito = null;
    if (telefone === '' || telefone === undefined) telefone = null;
    if (email === '' || email === undefined) email = null;
    if (endereco === '' || endereco === undefined) endereco = null;
    if (observacoes === '' || observacoes === undefined) observacoes = null;

    console.log('📝 Dados recebidos:', { nome, cpf, data_nascimento, numero_laudo, contexto, tipo_transito, escolaridade, telefone, email, endereco, observacoes });
    
    // Processar telefones usando o utilitário padronizado
    const telefonesProcessados = processarTelefones(telefone || req.body.telefone_fixo || req.body.telefone_celular || null);
    console.log('📱 Telefones processados:', telefonesProcessados);

    // Verificar se o CPF já existe
    const existingPaciente = await query(
      'SELECT id FROM pacientes WHERE cpf = $1',
      [cpf]
    );

    if (existingPaciente.rows.length > 0) {
      console.log('❌ CPF já existe:', cpf);
      return res.status(400).json({
        error: 'CPF já está em uso'
      });
    }

    // Validar formato do número de laudo: LAU-(ano)-xxxx
    if (numero_laudo) {
      const laudoRegex = /^LAU-\d{4}-\d{4}$/;
      if (!laudoRegex.test(numero_laudo)) {
        return res.status(400).json({
          error: 'Número de laudo deve seguir o formato LAU-YYYY-XXXX (ex: LAU-2025-1234)'
        });
      }

      // Verificar se o número de laudo já existe PARA ESTE USUÁRIO
      // Cada usuário tem sua própria numeração de laudos
      const existingLaudo = await query(
        'SELECT id, nome, cpf FROM pacientes WHERE numero_laudo = $1 AND usuario_id = $2',
        [numero_laudo, req.user.id]
      );

      if (existingLaudo.rows.length > 0) {
        const existing = existingLaudo.rows[0];
        return res.status(400).json({
          error: 'Você já possui um paciente com este número de laudo',
          details: {
            existing_patient: {
              nome: existing.nome,
              cpf: existing.cpf,
              numero_laudo: numero_laudo
            }
          }
        });
      }
    }

    // Verificar se o telefone já existe PARA ESTE USUÁRIO - AVISAR MAS PERMITIR
    if (telefone) {
      const existingPhone = await query(
        'SELECT id, nome, cpf, telefone FROM pacientes WHERE telefone = $1 AND usuario_id = $2',
        [telefone, req.user.id]
      );

      if (existingPhone.rows.length > 0 && !req.body.allow_duplicate_phone) {
        const existing = existingPhone.rows[0];
        return res.status(400).json({
          error: 'Você já possui outro paciente com este telefone',
          details: {
            existing_patient: {
              nome: existing.nome,
              cpf: existing.cpf,
              telefone: existing.telefone
            }
          }
        });
      }
    }

    // Verificar se o email já existe PARA ESTE USUÁRIO - AVISAR MAS PERMITIR
    if (email) {
      const existingEmail = await query(
        'SELECT id, nome, cpf, email FROM pacientes WHERE email = $1 AND usuario_id = $2',
        [email, req.user.id]
      );

      if (existingEmail.rows.length > 0 && !req.body.allow_duplicate_email) {
        const existing = existingEmail.rows[0];
        return res.status(400).json({
          error: 'Você já possui outro paciente com este email',
          details: {
            existing_patient: {
              nome: existing.nome,
              cpf: existing.cpf,
              email: existing.email
            }
          }
        });
      }
    }

    // Verificar se há telefone ou email duplicado para adicionar observação
    if (telefone && req.body.allow_duplicate_phone) {
      const existingPhone = await query(
        'SELECT nome FROM pacientes WHERE telefone = $1',
        [telefone]
      );
      if (existingPhone.rows.length > 0) {
        const existingName = existingPhone.rows[0].nome;
        observacoes = observacoes ? 
          `${observacoes}\n\nNúmero de telefone associado a mais pessoas: ${existingName}` :
          `Número de telefone associado a mais pessoas: ${existingName}`;
      }
    }

    if (email && req.body.allow_duplicate_email) {
      const existingEmail = await query(
        'SELECT nome FROM pacientes WHERE email = $1',
        [email]
      );
      if (existingEmail.rows.length > 0) {
        const existingName = existingEmail.rows[0].nome;
        observacoes = observacoes ? 
          `${observacoes}\n\nEmail associado a mais pessoas: ${existingName}` :
          `Email associado a mais pessoas: ${existingName}`;
      }
    }

    // Atribuir paciente ao usuário logado
    const usuarioId = req.user.id;

    // Calcular idade a partir da data de nascimento
    let idade = null;
    if (data_nascimento) {
      const nascimento = new Date(data_nascimento);
      const hoje = new Date();
      idade = hoje.getFullYear() - nascimento.getFullYear();
      const mesDiff = hoje.getMonth() - nascimento.getMonth();
      if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
      }
    }

    const result = await query(
      'INSERT INTO pacientes (nome, cpf, data_nascimento, idade, numero_laudo, contexto, tipo_transito, escolaridade, telefone_fixo, telefone_celular, email, endereco, observacoes, usuario_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id, nome, cpf, data_nascimento, idade, numero_laudo, contexto, tipo_transito, escolaridade, telefone_fixo, telefone_celular, email, endereco, observacoes, usuario_id, created_at, updated_at',
      [nome, cpf, data_nascimento, idade, numero_laudo, contexto, tipo_transito, escolaridade, telefonesProcessados.telefone_fixo, telefonesProcessados.telefone_celular, email, endereco, observacoes, usuarioId]
    );

    console.log(`✅ Paciente criado e atribuído ao usuário ID ${usuarioId}`);

    res.status(201).json({
      message: 'Paciente criado com sucesso',
      paciente: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar paciente:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Atualizar paciente
router.put('/:id', validate(pacienteSchema), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 PUT /pacientes/:id - Body recebido:', JSON.stringify(req.body, null, 2));
    let { nome, cpf, data_nascimento, numero_laudo, contexto, tipo_transito, escolaridade, telefone, telefone_fixo, telefone_celular, email, endereco, observacoes } = req.body;
    
    // Normalizar CPF: garantir formato 000.000.000-00
    if (cpf && typeof cpf === 'string' && cpf.length === 11 && /^\d{11}$/.test(cpf)) {
      cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      console.log('📝 CPF normalizado de', req.body.cpf, 'para', cpf);
    } else {
      console.log('📝 CPF já está formatado ou inválido:', cpf);
    }

    // Normalizar campos vazios: converter strings vazias para null
    if (data_nascimento === '' || data_nascimento === undefined) {
      data_nascimento = null;
      console.log('📝 Data de nascimento vazia, convertida para null');
    }
    if (escolaridade === '' || escolaridade === undefined) {
      escolaridade = null;
    }
    if (numero_laudo === '' || numero_laudo === undefined) {
      numero_laudo = null;
    }
    if (contexto === '' || contexto === undefined) {
      contexto = null;
    }
    if (tipo_transito === '' || tipo_transito === undefined) {
      tipo_transito = null;
    }
    if (telefone === '' || telefone === undefined) {
      telefone = null;
    }
    // Normalizar telefone_fixo e telefone_celular
    if (telefone_fixo === '' || telefone_fixo === undefined) {
      telefone_fixo = null;
    }
    if (telefone_celular === '' || telefone_celular === undefined) {
      telefone_celular = null;
    }
    if (email === '' || email === undefined) {
      email = null;
    }
    if (endereco === '' || endereco === undefined) {
      endereco = null;
    }
    if (observacoes === '' || observacoes === undefined) {
      observacoes = null;
    }

    // Verificar se o paciente existe e se o usuário tem permissão para editá-lo
    let checkQuery = 'SELECT id, usuario_id FROM pacientes WHERE id = $1';
    let checkParams = [id];

    if (!isAdmin(req.user)) {
      checkQuery += ' AND usuario_id = $2';
      checkParams.push(req.user.id);
    }

    const existingPaciente = await query(checkQuery, checkParams);

    if (existingPaciente.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente não encontrado ou você não tem permissão para editá-lo'
      });
    }

    // Verificar se o CPF já está em uso por outro paciente
    const cpfCheck = await query(
      'SELECT id FROM pacientes WHERE cpf = $1 AND id != $2',
      [cpf, id]
    );

    if (cpfCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'CPF já está em uso por outro paciente'
      });
    }

    // Verificar se o número de laudo já existe PARA ESTE USUÁRIO
    if (numero_laudo) {
      const laudoCheck = await query(
        'SELECT id, nome FROM pacientes WHERE numero_laudo = $1 AND usuario_id = $2 AND id != $3',
        [numero_laudo, req.user.id, id]
      );

      if (laudoCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'Você já possui outro paciente com este número de laudo',
          details: {
            existing_patient: laudoCheck.rows[0].nome
          }
        });
      }
    }

    // Processar telefones usando o utilitário padronizado
    // Se telefone_fixo e telefone_celular vierem diretamente, usar eles; senão processar telefone
    let telefonesProcessados;
    if (telefone_fixo || telefone_celular) {
      // Se telefone_fixo e telefone_celular já vieram separados, processar individualmente
      telefonesProcessados = {
        telefone_fixo: telefone_fixo ? processarTelefones(telefone_fixo).telefone_fixo || null : null,
        telefone_celular: telefone_celular ? processarTelefones(telefone_celular).telefone_celular || null : null
      };
      console.log('📱 Telefones recebidos separados:', { telefone_fixo, telefone_celular });
    } else if (telefone) {
      // Se veio telefone único, processar normalmente
      telefonesProcessados = processarTelefones(telefone);
      console.log('📱 Telefone único processado:', telefone);
    } else {
      // Nenhum telefone fornecido
      telefonesProcessados = { telefone_fixo: null, telefone_celular: null };
      console.log('📱 Nenhum telefone fornecido');
    }
    console.log('📱 Telefones processados na atualização:', telefonesProcessados);
    
    // Calcular idade se tiver data_nascimento
    let idade = null;
    if (data_nascimento) {
      const nascimento = new Date(data_nascimento);
      const hoje = new Date();
      idade = hoje.getFullYear() - nascimento.getFullYear();
      const mesDiff = hoje.getMonth() - nascimento.getMonth();
      if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
      }
    }

    const result = await query(
      'UPDATE pacientes SET nome = $1, cpf = $2, data_nascimento = $3, idade = $4, numero_laudo = $5, contexto = $6, tipo_transito = $7, escolaridade = $8, telefone_fixo = $9, telefone_celular = $10, email = $11, endereco = $12, observacoes = $13, updated_at = CURRENT_TIMESTAMP WHERE id = $14 RETURNING id, nome, cpf, data_nascimento, idade, numero_laudo, contexto, tipo_transito, escolaridade, telefone_fixo, telefone_celular, email, endereco, observacoes, created_at, updated_at',
      [nome, cpf, data_nascimento, idade, numero_laudo, contexto, tipo_transito, escolaridade, telefonesProcessados.telefone_fixo, telefonesProcessados.telefone_celular, email, endereco, observacoes, id]
    );

    res.json({
      message: 'Paciente atualizado com sucesso',
      paciente: result.rows[0]
    });
  } catch (error) {
    console.error('❌ ERRO ao atualizar paciente:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Mensagem:', error.message);
    res.status(500).json({
      error: 'Erro interno do servidor',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Atualizar dados NFS-e do paciente
router.patch('/:id/nfs-e', async (req, res) => {
  try {
    const { id } = req.params;
    const { nfs_numero, nfs_forma_pagamento, nfs_valor, nfs_valor_dinheiro, nfs_valor_pix } = req.body;
    
    console.log('📝 PATCH /pacientes/:id/nfs-e - Dados NFS-e:', { 
      nfs_numero, 
      nfs_forma_pagamento, 
      nfs_valor, 
      nfs_valor_dinheiro, 
      nfs_valor_pix 
    });
    
    // Verificar se o paciente existe e se o usuário tem permissão
    let checkQuery = 'SELECT id, usuario_id FROM pacientes WHERE id = $1';
    let checkParams = [id];
    
    if (!isAdmin(req.user)) {
      checkQuery += ' AND usuario_id = $2';
      checkParams.push(req.user.id);
    }
    
    const existingPaciente = await query(checkQuery, checkParams);
    
    if (existingPaciente.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente não encontrado ou você não tem permissão para editá-lo'
      });
    }
    
    // Verificar se as colunas nfs_valor_dinheiro e nfs_valor_pix existem
    // Se não existirem, criar dinamicamente na primeira vez
    try {
      await query(`
        ALTER TABLE pacientes 
        ADD COLUMN IF NOT EXISTS nfs_valor_dinheiro DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS nfs_valor_pix DECIMAL(10,2)
      `);
    } catch (alterError) {
      // Ignorar erro se as colunas já existirem (código 42701)
      if (alterError.code !== '42701') {
        console.warn('Aviso ao adicionar colunas NFS-e:', alterError.message);
      }
    }
    
    // Normalizar valores numéricos
    const normalizeValue = (val, allowZero = false) => {
      if (val === null || val === undefined || val === '') return allowZero ? 0 : null;
      if (typeof val === 'number') {
        if (isNaN(val)) return allowZero ? 0 : null;
        return val < 0 ? null : (val === 0 && !allowZero ? null : val);
      }
      if (typeof val === 'string') {
        const num = parseFloat(val.replace(',', '.').replace(/[^\d.]/g, ''));
        if (isNaN(num)) return allowZero ? 0 : null;
        if (num < 0) return null;
        return (num === 0 && !allowZero) ? null : num;
      }
      return allowZero ? 0 : null;
    };
    
    const nfsValorNum = normalizeValue(nfs_valor, false);
    const nfsValorDinheiroNum = normalizeValue(nfs_valor_dinheiro, true); // Permite zero no modo misto
    const nfsValorPixNum = normalizeValue(nfs_valor_pix, true); // Permite zero no modo misto
    
    // Validar que pelo menos forma de pagamento e valor estão presentes
    if (!nfs_forma_pagamento) {
      return res.status(400).json({
        error: 'Forma de pagamento é obrigatória'
      });
    }
    
    if (!nfsValorNum || nfsValorNum <= 0) {
      return res.status(400).json({
        error: 'Valor da NFS-e deve ser maior que zero'
      });
    }
    
    // Atualizar dados NFS-e
    // Se for misto, salvar valores separados, caso contrário, salvar apenas nfs_valor
    if (nfs_forma_pagamento === 'misto') {
      // Para modo misto, aceitar valores zerados desde que o total (nfs_valor) seja válido
      // O total já foi validado acima, então não precisa validar os valores separados aqui
      
      const result = await query(
        `UPDATE pacientes 
         SET nfs_numero = $1, 
             nfs_forma_pagamento = $2, 
             nfs_valor = $3,
             nfs_valor_dinheiro = $4,
             nfs_valor_pix = $5, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $6 
         RETURNING id, nfs_numero, nfs_forma_pagamento, nfs_valor, nfs_valor_dinheiro, nfs_valor_pix`,
        [
          nfs_numero || null, 
          nfs_forma_pagamento, 
          nfsValorNum,
          nfsValorDinheiroNum,
          nfsValorPixNum,
          id
        ]
      );
      
      res.json({
        message: 'Dados NFS-e atualizados com sucesso',
        nfs_e: result.rows[0]
      });
    } else {
      // Para dinheiro ou pix, limpar valores separados
      const result = await query(
        `UPDATE pacientes 
         SET nfs_numero = $1, 
             nfs_forma_pagamento = $2, 
             nfs_valor = $3,
             nfs_valor_dinheiro = NULL,
             nfs_valor_pix = NULL,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 
         RETURNING id, nfs_numero, nfs_forma_pagamento, nfs_valor`,
        [nfs_numero || null, nfs_forma_pagamento, nfsValorNum, id]
      );
      
      res.json({
        message: 'Dados NFS-e atualizados com sucesso',
        nfs_e: result.rows[0]
      });
    }
    
  } catch (error) {
    console.error('❌ ERRO ao atualizar dados NFS-e:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Deletar paciente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o paciente existe e se o usuário tem permissão para deletá-lo
    let checkQuery = 'SELECT id, usuario_id FROM pacientes WHERE id = $1';
    let checkParams = [id];

    if (!isAdmin(req.user)) {
      checkQuery += ' AND usuario_id = $2';
      checkParams.push(req.user.id);
    }

    const existingPaciente = await query(checkQuery, checkParams);

    if (existingPaciente.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente não encontrado ou você não tem permissão para deletá-lo'
      });
    }

    // Verificar se há avaliações associadas
    const avaliacoes = await query(
      'SELECT id FROM avaliacoes WHERE paciente_id = $1',
      [id]
    );

    if (avaliacoes.rows.length > 0) {
      return res.status(400).json({
        error: 'Não é possível deletar paciente com avaliações associadas'
      });
    }

    await query('DELETE FROM pacientes WHERE id = $1', [id]);

    res.json({
      message: 'Paciente deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar paciente:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Upload de arquivo RENACH (PDF em base64)
router.put('/:id/renach', async (req, res) => {
  // Definir timeout maior para processamento de PDF
  req.setTimeout(180000); // 3 minutos
  res.setTimeout(180000);
  
  // Garantir que a resposta não seja fechada antes do término
  let responseSent = false;
  const sendResponse = (status, data) => {
    if (!responseSent) {
      responseSent = true;
      return res.status(status).json(data);
    }
  };
  
  // Timeout de segurança para garantir que a resposta seja enviada
  const timeoutId = setTimeout(() => {
    if (!responseSent) {
      console.error('⚠️ Timeout de segurança alcançado - enviando resposta de erro');
      sendResponse(504, {
        error: 'Timeout ao processar RENACH',
        message: 'O processamento está demorando mais do que o esperado. Tente novamente com um arquivo menor.'
      });
    }
  }, 170000); // 170 segundos (pouco antes do timeout da requisição)
  
  // Declarar variáveis fora do try para acesso no catch
  const { id } = req.params;
  let renach_arquivo;
  
  try {
    renach_arquivo = req.body.renach_arquivo;

    console.log('📥 Recebendo upload de RENACH...');
    console.log('📄 Tamanho do arquivo:', renach_arquivo ? `${(renach_arquivo.length / 1024 / 1024).toFixed(2)} MB` : 'N/A');

    // Validar arquivo
    if (!renach_arquivo) {
      clearTimeout(timeoutId);
      return sendResponse(400, { error: 'Arquivo RENACH não fornecido' });
    }

    // Verificar permissão
    if (!isAdmin(req.user)) {
      const paciente = await query(
        'SELECT usuario_id FROM pacientes WHERE id = $1',
        [id]
      );
      
      if (paciente.rows.length === 0) {
        clearTimeout(timeoutId);
        return sendResponse(404, { error: 'Paciente não encontrado' });
      }
      
      if (paciente.rows[0].usuario_id !== req.user.id) {
        clearTimeout(timeoutId);
        return sendResponse(403, { error: 'Sem permissão para atualizar este paciente' });
      }
    }

    // Processar RENACH para extrair dados automaticamente
    console.log('🔄 INICIANDO PROCESSAMENTO RENACH...');
    console.log('📄 Tamanho do arquivo RENACH:', renach_arquivo ? `${(renach_arquivo.length / 1024 / 1024).toFixed(2)} MB` : 'N/A');
    
    let processResult;
    try {
      const processor = new RenachProcessor();
      
      // Processar com timeout de 90 segundos
      processResult = await Promise.race([
        processor.processRenach(renach_arquivo),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao processar RENACH (90s)')), 90000)
        )
      ]);
      
      console.log('✅ Processamento concluído');
      console.log('📊 RESULTADO DO PROCESSAMENTO (sucesso):');
      console.log('  ✅ Success:', processResult.success);
      console.log('  📸 Foto extraída:', !!processResult.data?.foto);
      console.log('  🔑 Total de campos em data:', Object.keys(processResult.data || {}).length);
      console.log('  📋 Campos em data:', Object.keys(processResult.data || {}).join(', ') || 'NENHUM');
      
      // Log detalhado dos dados extraídos
      if (processResult.data && Object.keys(processResult.data).length > 0) {
        console.log('  ✅ DADOS EXTRAÍDOS:');
        Object.entries(processResult.data).forEach(([key, value]) => {
          if (key !== 'foto') { // Não logar foto (muito grande)
            console.log(`     ${key}: ${value || 'null'}`);
          }
        });
      } else {
        console.log('  ⚠️ ATENÇÃO: processResult.data está VAZIO ou não existe!');
        console.log('  ⚠️ Isso significa que nenhum dado foi extraído do PDF!');
      }
    } catch (processError) {
      console.error('❌ Erro no processamento:', processError.message);
      console.error('❌ Stack:', processError.stack);
      // Continuar mesmo se processamento falhar - salvar arquivo mesmo assim
      processResult = {
        success: false,
        error: processError.message,
        data: {}
      };
      console.log('⚠️ Continuando para salvar arquivo mesmo com erro no processamento...');
      console.log('⚠️ processResult.data será vazio devido ao erro');
    }
    
    console.log('\n📊 RESUMO FINAL DO PROCESSAMENTO:');
    console.log('  ✅ Success:', processResult.success);
    console.log('  📸 Foto extraída:', !!processResult.data?.foto);
    console.log('  📏 Tamanho da foto:', processResult.data?.foto?.length || 'N/A');
    console.log('  🔑 Campos extraídos:', Object.keys(processResult.data || {}).length);
    console.log('  📋 Lista de campos:', Object.keys(processResult.data || {}).join(', ') || 'NENHUM');
    
    // Log completo apenas se houver dados (sem foto para não poluir)
    if (processResult.data && Object.keys(processResult.data).length > 0) {
      const dataSemFoto = { ...processResult.data };
      delete dataSemFoto.foto; // Remover foto do log
      console.log('  📋 Dados completos (sem foto):', JSON.stringify(dataSemFoto, null, 2));
    } else {
      console.log('  ⚠️ NENHUM DADO FOI EXTRAÍDO DO PDF!');
    }
    
    let renach_foto = null;
    let extractedData = {};
    
    // IMPORTANTE: Sempre tentar usar os dados extraídos, mesmo se success = false
    // O processador pode ter extraído dados parcialmente mesmo com erro
    if (processResult && processResult.data && Object.keys(processResult.data).length > 0) {
      renach_foto = processResult.data.foto;
      extractedData = processResult.data;
      console.log('✅ Usando dados extraídos (mesmo que success = false)');
    } else if (processResult.success) {
      renach_foto = processResult.data?.foto;
      extractedData = processResult.data || {};
      
      console.log('✅ Usando dados extraídos para atualização');
    }
    
    // Sanitizar e normalizar dados extraídos
    const cleanedData = sanitizeExtractedData(extractedData);
    console.log('🧹 DADOS SANITIZADOS E NORMALIZADOS:');
    console.log('  🔑 Total de campos limpos:', Object.keys(cleanedData).length);
    console.log('  📋 Campos limpos:', Object.keys(cleanedData).join(', '));
    console.log('  ✅ Nome do Pai:', cleanedData.nome_pai || '❌ NÃO ENCONTRADO');
    console.log('  ✅ Nome da Mãe:', cleanedData.nome_mae || '❌ NÃO ENCONTRADO');
    console.log('  ✅ Categoria CNH:', cleanedData.categoria_cnh || '❌ NÃO ENCONTRADO');
    console.log('  ✅ Contexto (Tipo Processo):', cleanedData.contexto || '❌ NÃO ENCONTRADO');
    console.log('  ✅ Data Primeira Habilitacao:', cleanedData.data_primeira_habilitacao || '❌ NÃO ENCONTRADO');
    console.log('  ✅ Numero Laudo:', cleanedData.numero_laudo_renach || '❌ NÃO ENCONTRADO');
    console.log('  ✅ Numero Endereco:', cleanedData.numero_endereco || '❌ NÃO ENCONTRADO');
    
    // Atualizar dados do paciente com informações extraídas (usando dados sanitizados)
    if (Object.keys(cleanedData).length > 0) {
        console.log('🔄 INICIANDO ATUALIZAÇÃO DOS DADOS DO PACIENTE...');
        
        // Buscar dados atuais do paciente para comparar antes de atualizar
        const currentPatient = await query(
          `SELECT cpf, nome, telefone_fixo, telefone_celular, 
                  nome_pai, nome_mae, categoria_cnh, numero_laudo_renach, numero_laudo,
                  data_primeira_habilitacao, data_exame, contexto, numero_endereco,
                  logradouro, bairro, municipio, cep, complemento
           FROM pacientes WHERE id = $1`,
          [id]
        );
        
        if (currentPatient.rows.length === 0) {
          console.error('⚠️ Paciente não encontrado para atualização!');
        } else {
          console.log('📊 DADOS ATUAIS DO PACIENTE (para comparação):');
          console.log(`  Nome Pai: ${currentPatient.rows[0].nome_pai || 'NULL'}`);
          console.log(`  Nome Mae: ${currentPatient.rows[0].nome_mae || 'NULL'}`);
          console.log(`  Categoria CNH: ${currentPatient.rows[0].categoria_cnh || 'NULL'}`);
          console.log(`  Numero Laudo: ${currentPatient.rows[0].numero_laudo_renach || 'NULL'}`);
        }
        
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;
        
        // Processar telefone extraído do RENACH (se houver)
        let telefoneRenachFixo = null;
        let telefoneRenachCelular = null;
        
        if (extractedData.telefone) {
          console.log('📱 Processando telefone extraído do RENACH:', extractedData.telefone);
          const telefonesRenach = processarTelefones(extractedData.telefone);
          telefoneRenachFixo = telefonesRenach.telefone_fixo;
          telefoneRenachCelular = telefonesRenach.telefone_celular;
          console.log(`  ✅ Telefone do RENACH processado:`);
          console.log(`     Fixo: ${telefoneRenachFixo || 'Não identificado'}`);
          console.log(`     Celular: ${telefoneRenachCelular || 'Não identificado'}`);
        }
        
        // Buscar telefones do agendamento
        let telefoneFixo = currentPatient.rows[0]?.telefone_fixo;
        let telefoneCelular = currentPatient.rows[0]?.telefone_celular;
        
        // Buscar telefones do agendamento se paciente não tem telefones
        if (!telefoneFixo && !telefoneCelular) {
          console.log('📱 Paciente não tem telefones - buscando do agendamento...');
          const agendamentoResult = await query(
            `SELECT telefone_fixo, telefone_celular 
             FROM agendamentos 
             WHERE paciente_id = $1 
             AND (telefone_fixo IS NOT NULL OR telefone_celular IS NOT NULL)
             ORDER BY created_at DESC
             LIMIT 1`,
            [id]
          );
          
          if (agendamentoResult.rows.length > 0) {
            telefoneFixo = agendamentoResult.rows[0].telefone_fixo;
            telefoneCelular = agendamentoResult.rows[0].telefone_celular;
            console.log(`  ✅ Telefones encontrados no agendamento:`);
            console.log(`     Fixo: ${telefoneFixo || 'Não cadastrado'}`);
            console.log(`     Celular: ${telefoneCelular || 'Não cadastrado'}`);
          } else {
            console.log('  ⚠️ Nenhum telefone encontrado no agendamento');
          }
        } else {
          console.log('📱 Telefones existentes no paciente:');
          console.log(`  Fixo: ${telefoneFixo || 'Não cadastrado'}`);
          console.log(`  Celular: ${telefoneCelular || 'Não cadastrado'}`);
        }
        
        // Prioridade: RENACH > Agendamento > Existente
        // Só atualizar se não existir ou se o RENACH trouxer um telefone
        const telefoneFixoFinal = telefoneRenachFixo || telefoneFixo;
        const telefoneCelularFinal = telefoneRenachCelular || telefoneCelular;
        
        // Adicionar telefones à atualização se foram encontrados
        if (telefoneFixoFinal && shouldUpdateValue(currentPatient.rows[0]?.telefone_fixo, telefoneFixoFinal)) {
          console.log(`  ✅ Atualizando telefone_fixo: "${currentPatient.rows[0]?.telefone_fixo || 'NULL'}" -> "${telefoneFixoFinal}"`);
          updateFields.push(`telefone_fixo = $${paramCount++}`);
          updateValues.push(telefoneFixoFinal);
        } else if (telefoneFixoFinal) {
          console.log(`  ⏭️  Telefone fixo: IGNORADO (valor já existe ou não precisa atualizar)`);
        }
        
        if (telefoneCelularFinal && shouldUpdateValue(currentPatient.rows[0]?.telefone_celular, telefoneCelularFinal)) {
          console.log(`  ✅ Atualizando telefone_celular: "${currentPatient.rows[0]?.telefone_celular || 'NULL'}" -> "${telefoneCelularFinal}"`);
          updateFields.push(`telefone_celular = $${paramCount++}`);
          updateValues.push(telefoneCelularFinal);
        } else if (telefoneCelularFinal) {
          console.log(`  ⏭️  Telefone celular: IGNORADO (valor já existe ou não precisa atualizar)`);
        }
        
        // Mapear todos os campos sanitizados para colunas do banco
        // Usar shouldUpdateValue para decidir se atualiza cada campo
        const fieldMapping = {
          numero_renach: 'numero_renach',
          nome: 'nome',
          data_nascimento: 'data_nascimento',
          sexo: 'sexo',
          categoria_cnh: 'categoria_cnh',
          nome_pai: 'nome_pai',
          nome_mae: 'nome_mae',
          contexto: 'contexto',
          naturalidade: 'naturalidade',
          nacionalidade: 'nacionalidade',
          logradouro: 'logradouro',
          numero_endereco: 'numero_endereco',
          complemento: 'complemento',
          bairro: 'bairro',
          cep: 'cep',
          codigo_municipio: 'codigo_municipio',
          municipio: 'municipio',
          resultado_exame: 'resultado_exame',
          data_exame: 'data_exame',
          data_primeira_habilitacao: 'data_primeira_habilitacao',
          numero_laudo_renach: 'numero_laudo_renach',
          numero_laudo: 'numero_laudo',
          rg: 'rg',
          orgao_expedidor_rg: 'orgao_expedidor_rg',
          uf_rg: 'uf_rg',
          atividade_remunerada: 'atividade_remunerada'
        };
        
        // Adicionar campos que devem ser atualizados (usando dados sanitizados)
        console.log('🔍 MAPEANDO CAMPOS PARA ATUALIZAÇÃO (com validação shouldUpdateValue):');
        const current = currentPatient.rows[0] || {};
        
        for (const [cleanedField, dbField] of Object.entries(fieldMapping)) {
          const cleanedValue = cleanedData[cleanedField];
          const currentValue = current[dbField];
          
          if (cleanedValue !== undefined && cleanedValue !== null) {
            // Usar shouldUpdateValue para decidir se atualiza
            if (shouldUpdateValue(currentValue, cleanedValue)) {
              console.log(`  ✅ ${cleanedField} -> ${dbField}: "${currentValue || 'NULL'}" -> "${cleanedValue}"`);
              updateFields.push(`${dbField} = $${paramCount++}`);
              updateValues.push(cleanedValue);
            } else {
              console.log(`  ⏭️  ${cleanedField} -> ${dbField}: IGNORADO (valor já é igual ou não precisa atualizar)`);
            }
          } else {
            console.log(`  ❌ ${cleanedField}: NÃO DISPONÍVEL EM DADOS SANITIZADOS`);
          }
        }
        
        console.log(`📊 TOTAL DE CAMPOS PARA ATUALIZAR: ${updateFields.length}`);
        
        // Atualizar endereço completo se temos dados de endereço (usar dados sanitizados)
        if (cleanedData.logradouro || cleanedData.bairro || cleanedData.municipio) {
          console.log('🏠 CONSTRUINDO ENDEREÇO COMPLETO:');
          console.log(`  📍 Logradouro: "${cleanedData.logradouro || 'N/A'}"`);
          console.log(`  🔢 Número: "${cleanedData.numero_endereco || 'N/A'}"`);
          console.log(`  🏢 Complemento: "${cleanedData.complemento || 'N/A'}"`);
          console.log(`  🏘️ Bairro: "${cleanedData.bairro || 'N/A'}"`);
          console.log(`  📮 CEP: "${cleanedData.cep || 'N/A'}"`);
          console.log(`  🏛️ Município: "${cleanedData.municipio || 'N/A'}"`);
          
          const enderecoCompleto = [
            cleanedData.logradouro,
            cleanedData.numero_endereco,
            cleanedData.complemento,
            cleanedData.bairro,
            cleanedData.cep,
            cleanedData.codigo_municipio,
            cleanedData.municipio
          ].filter(Boolean).join(' ');
          
          if (enderecoCompleto && shouldUpdateValue(current.endereco, enderecoCompleto)) {
            console.log(`  ✅ Endereço completo: "${enderecoCompleto}"`);
            updateFields.push(`endereco = $${paramCount++}`);
            updateValues.push(enderecoCompleto);
          } else {
            console.log(`  ⏭️  Endereço: IGNORADO (já atualizado ou vazio)`);
          }
        }
        
        if (updateFields.length > 0) {
          console.log('💾 EXECUTANDO ATUALIZAÇÃO NO BANCO:');
          console.log(`  📝 Query: UPDATE pacientes SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`);
          console.log(`  📊 Valores (${updateValues.length}):`, updateValues);
          console.log(`  🔢 ParamCount: ${paramCount}, ID: ${id}`);
          
          updateValues.push(id);
          
          try {
            const updateResult = await query(
              `UPDATE pacientes SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
              updateValues
            );
            
            console.log(`  ✅ Atualização executada: ${updateResult.rowCount} linha(s) afetada(s)`);
            
            if (updateResult.rowCount === 0) {
              console.error('  ⚠️ ATENÇÃO: UPDATE executado mas nenhuma linha foi afetada!');
              console.error('  ⚠️ Possíveis causas: ID do paciente incorreto ou registro não existe');
            }
          } catch (updateError) {
            console.error('  ❌ ERRO NO UPDATE:');
            console.error('  📝 Mensagem:', updateError.message);
            console.error('  📊 Stack:', updateError.stack);
            console.error('  🔑 Código SQL:', updateError.code);
            throw updateError; // Re-throw para ser capturado no catch externo
          }
        } else {
          console.log('⚠️ NENHUM CAMPO PARA ATUALIZAR - dados extraídos vazios');
          console.log('  📋 cleanedData completo:', JSON.stringify(cleanedData, null, 2));
        }
    }

    // Salvar RENACH no banco
    console.log('💾 SALVANDO RENACH NO BANCO:');
    console.log(`  📄 Arquivo RENACH: ${renach_arquivo ? `${renach_arquivo.length} caracteres` : 'N/A'}`);
    console.log(`  📸 Foto RENACH: ${renach_foto ? `${renach_foto.length} caracteres` : 'N/A'}`);
    console.log(`  👤 Paciente ID: ${id}`);
    
    const saveResult = await query(
      `UPDATE pacientes 
       SET renach_arquivo = $1, 
           renach_foto = $2,
           renach_data_upload = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [renach_arquivo, renach_foto, id]
    );
    
    console.log(`✅ RENACH salvo no banco com sucesso! (${saveResult.rowCount} linha(s) afetada(s))`);

    console.log('🎉 PROCESSAMENTO RENACH CONCLUÍDO COM SUCESSO!');
    console.log('📊 RESUMO FINAL:');
    console.log(`  ✅ Processamento: ${processResult.success ? 'SUCESSO' : 'FALHOU'}`);
    console.log(`  📸 Foto extraída: ${renach_foto ? 'SIM' : 'NÃO'}`);
    console.log(`  🔑 Campos extraídos (brutos): ${Object.keys(extractedData).length}`);
    console.log(`  🧹 Campos sanitizados: ${Object.keys(cleanedData).length}`);
    console.log(`  📋 Campos brutos: ${Object.keys(extractedData).join(', ')}`);
    console.log(`  📋 Campos limpos: ${Object.keys(cleanedData).join(', ')}`);
    
    clearTimeout(timeoutId);
    sendResponse(200, {
      message: 'Arquivo RENACH salvo com sucesso',
      data: {
        renach_data_upload: new Date(),
        extracted_data: extractedData,
        processing_success: processResult.success
      }
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ ERRO NO PROCESSAMENTO RENACH:');
    console.error('  📍 Local:', 'routes/pacientes.js - PUT /:id/renach');
    console.error('  💥 Tipo:', error.name || 'Unknown');
    console.error('  📝 Mensagem:', error.message);
    console.error('  📊 Stack trace:', error.stack);
    console.error('  🔍 Paciente ID:', id || req.params?.id || 'N/A');
    console.error('  📄 RENACH length:', renach_arquivo ? renach_arquivo.length : 'N/A');
    
    // Verificar se é erro de timeout
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT') || error.code === 'ETIMEDOUT') {
      return sendResponse(504, {
        error: 'Timeout ao processar RENACH. O arquivo pode ser muito grande.',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    
    // Verificar se é erro de memória
    if (error.message.includes('memory') || error.message.includes('heap') || error.message.includes('allocation')) {
      return sendResponse(500, {
        error: 'Erro de memória ao processar RENACH. Tente um arquivo menor.',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    
    sendResponse(500, {
      error: 'Erro ao salvar arquivo RENACH',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Obter arquivo RENACH
router.get('/:id/renach', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar permissão
    if (!isAdmin(req.user)) {
      const paciente = await query(
        'SELECT usuario_id FROM pacientes WHERE id = $1',
        [id]
      );
      
      if (paciente.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }
      
      if (paciente.rows[0].usuario_id !== req.user.id) {
        return res.status(403).json({ error: 'Sem permissão para visualizar este paciente' });
      }
    }

    const result = await query(
      'SELECT renach_arquivo, renach_foto, renach_data_upload FROM pacientes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    res.json({
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar arquivo RENACH:', error);
    res.status(500).json({
      error: 'Erro ao buscar arquivo RENACH'
    });
  }
});

// Função para gerar cláusula ORDER BY baseada nos filtros
function getOrderByClause(sortBy, sortOrder) {
  const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
  
  switch (sortBy) {
    case 'nome':
      return `p.nome ${order}`;
    case 'data_criacao':
      return `p.created_at ${order}`;
    case 'data_agendamento':
      return `CASE 
        WHEN (
          SELECT data_agendamento 
          FROM agendamentos 
          WHERE paciente_id = p.id 
          ORDER BY data_agendamento ASC 
          LIMIT 1
        ) IS NOT NULL 
        THEN (
          SELECT data_agendamento 
          FROM agendamentos 
          WHERE paciente_id = p.id 
          ORDER BY data_agendamento ASC 
          LIMIT 1
        )
        ELSE '9999-12-31'::date
      END ${order}, p.created_at DESC`;
    case 'data':
    default:
      return `CASE 
        WHEN (
          SELECT data_agendamento 
          FROM agendamentos 
          WHERE paciente_id = p.id 
          ORDER BY data_agendamento ASC 
          LIMIT 1
        ) IS NOT NULL 
        THEN (
          SELECT data_agendamento 
          FROM agendamentos 
          WHERE paciente_id = p.id 
          ORDER BY data_agendamento ASC 
          LIMIT 1
        )
        ELSE '9999-12-31'::date
      END ${order}, p.created_at DESC`;
  }
}

module.exports = router;
