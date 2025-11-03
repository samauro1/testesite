const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { validate, avaliacaoSchema } = require('../middleware/validation');
const MessageService = require('../services/messageService');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Listar avaliações
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', paciente_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    // IMPORTANTE: Quando há paciente_id, mostrar TODAS as avaliações do paciente
    // O filtro de usuário só deve ser aplicado na listagem geral (sem paciente_id)
    // Isso permite que na ficha cadastral apareçam todas as avaliações do paciente
    // independentemente de quem as criou
    
    if (paciente_id) {
      // Quando visualizando avaliações de um paciente específico,
      // mostrar todas as avaliações desse paciente (sem filtro de usuário)
      whereClause = 'WHERE a.paciente_id = $1';
      queryParams.push(paciente_id);
    } else {
      // Na listagem geral, aplicar filtro de usuário (exceto admin)
      // Cada usuário vê apenas as avaliações que ELE aplicou
      if (!isAdmin(req.user)) {
        whereClause = 'WHERE a.usuario_id = $1';
        queryParams.push(req.user.id);
      }
    }

    if (search) {
      const searchCondition = `(a.numero_laudo ILIKE $${queryParams.length + 1} OR p.nome ILIKE $${queryParams.length + 1})`;
      whereClause = whereClause ? `${whereClause} AND ${searchCondition}` : `WHERE ${searchCondition}`;
      queryParams.push(`%${search}%`);
    }

    const countQuery = `
      SELECT COUNT(*) 
      FROM avaliacoes a 
      JOIN pacientes p ON a.paciente_id = p.id 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT 
        a.id, a.paciente_id, a.numero_laudo, a.data_aplicacao, a.aplicacao, 
        a.tipo_habilitacao, a.observacoes, a.aptidao, a.created_at,
        p.nome as paciente_nome, p.cpf as paciente_cpf,
        u.nome as usuario_nome
      FROM avaliacoes a 
      JOIN pacientes p ON a.paciente_id = p.id 
      JOIN usuarios u ON a.usuario_id = u.id
      ${whereClause}
      ORDER BY a.data_aplicacao DESC, a.created_at DESC 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const dataResult = await query(dataQuery, [...queryParams, limit, offset]);

    res.json({
      data: {
        avaliacoes: dataResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao listar avaliações:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Buscar avaliação por ID
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
        a.id, a.paciente_id, a.numero_laudo, a.data_aplicacao, a.aplicacao, 
        a.tipo_habilitacao, a.observacoes, a.aptidao, a.created_at,
        p.nome as paciente_nome, p.cpf as paciente_cpf, p.idade, p.escolaridade,
        u.nome as usuario_nome
      FROM avaliacoes a 
      JOIN pacientes p ON a.paciente_id = p.id 
      JOIN usuarios u ON a.usuario_id = u.id
      ${whereClause}
    `, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Avaliação não encontrada ou você não tem permissão para acessá-la'
      });
    }

    res.json({
      avaliacao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar avaliação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Criar avaliação
router.post('/', validate(avaliacaoSchema), async (req, res) => {
  try {
    const { paciente_id, numero_laudo, data_aplicacao, aplicacao, tipo_habilitacao, observacoes, aptidao } = req.body;
    const usuario_id = req.user.id;

    // Não mais verificar se laudo existe - agora um laudo pode ter múltiplas avaliações
    // Removida verificação de laudo único

    // Verificar se o paciente existe
    const paciente = await query(
      'SELECT id FROM pacientes WHERE id = $1',
      [paciente_id]
    );

    if (paciente.rows.length === 0) {
      return res.status(400).json({
        error: 'Paciente não encontrado'
      });
    }

    // Converter string vazia para null
    const aptidaoValue = aptidao && aptidao.trim() !== '' ? aptidao : null;
    
    console.log('📋 Criando avaliação com aptidão:', {
      aptidao_original: aptidao,
      aptidao_convertido: aptidaoValue,
      tipo_aptidao: typeof aptidaoValue
    });

    const result = await query(`
      INSERT INTO avaliacoes (paciente_id, usuario_id, numero_laudo, data_aplicacao, aplicacao, tipo_habilitacao, observacoes, aptidao) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, numero_laudo, data_aplicacao, aplicacao, tipo_habilitacao, observacoes, aptidao, created_at
    `, [paciente_id, usuario_id, numero_laudo, data_aplicacao, aplicacao, tipo_habilitacao, observacoes, aptidaoValue]);

    res.status(201).json({
      message: 'Avaliação criada com sucesso',
      avaliacao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Atualizar avaliação
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { paciente_id, numero_laudo, data_aplicacao, aplicacao, tipo_habilitacao, observacoes, aptidao } = req.body;

    // Verificar se a avaliação existe
    const existingAvaliacao = await query(
      'SELECT * FROM avaliacoes WHERE id = $1',
      [id]
    );

    if (existingAvaliacao.rows.length === 0) {
      return res.status(404).json({
        error: 'Avaliação não encontrada'
      });
    }

    // Se for uma atualização parcial (apenas aptidão), usar os dados existentes
    const avaliacaoAtual = existingAvaliacao.rows[0];
    const dadosAtualizados = {
      paciente_id: paciente_id !== undefined ? paciente_id : avaliacaoAtual.paciente_id,
      numero_laudo: numero_laudo !== undefined ? numero_laudo : avaliacaoAtual.numero_laudo,
      data_aplicacao: data_aplicacao !== undefined ? data_aplicacao : avaliacaoAtual.data_aplicacao,
      aplicacao: aplicacao !== undefined ? aplicacao : avaliacaoAtual.aplicacao,
      tipo_habilitacao: tipo_habilitacao !== undefined ? tipo_habilitacao : avaliacaoAtual.tipo_habilitacao,
      observacoes: observacoes !== undefined ? observacoes : avaliacaoAtual.observacoes,
      aptidao: aptidao !== undefined ? (aptidao && aptidao.trim() !== '' ? aptidao : null) : avaliacaoAtual.aptidao
    };

    // Se paciente_id foi fornecido, verificar se existe
    if (paciente_id !== undefined) {
      const paciente = await query(
        'SELECT id FROM pacientes WHERE id = $1',
        [paciente_id]
      );

      if (paciente.rows.length === 0) {
        return res.status(400).json({
          error: 'Paciente não encontrado'
        });
      }
    }

    const result = await query(`
      UPDATE avaliacoes 
      SET paciente_id = $1, numero_laudo = $2, data_aplicacao = $3, 
          aplicacao = $4, tipo_habilitacao = $5, observacoes = $6, 
          aptidao = $7, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $8 
      RETURNING id, numero_laudo, data_aplicacao, aplicacao, tipo_habilitacao, observacoes, aptidao, updated_at
    `, [
      dadosAtualizados.paciente_id, 
      dadosAtualizados.numero_laudo, 
      dadosAtualizados.data_aplicacao, 
      dadosAtualizados.aplicacao, 
      dadosAtualizados.tipo_habilitacao, 
      dadosAtualizados.observacoes, 
      dadosAtualizados.aptidao, 
      id
    ]);


    res.json({
      message: 'Avaliação atualizada com sucesso',
      avaliacao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar avaliação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Deletar avaliação
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a avaliação existe
    const existingAvaliacao = await query(
      'SELECT id FROM avaliacoes WHERE id = $1',
      [id]
    );

    if (existingAvaliacao.rows.length === 0) {
      return res.status(404).json({
        error: 'Avaliação não encontrada'
      });
    }

    await query('DELETE FROM avaliacoes WHERE id = $1', [id]);

    res.json({
      message: 'Avaliação deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar avaliação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Buscar testes realizados de uma avaliação
router.get('/:id/testes', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Buscando testes da avaliação ID: ${id}`);
    
    // Verificar se a avaliação existe
    const avaliacaoResult = await query(
      'SELECT id FROM avaliacoes WHERE id = $1',
      [id]
    );
    
    if (avaliacaoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    // Buscar todos os testes realizados para esta avaliação
    const testes = [];
    console.log(`✅ Avaliação encontrada, buscando testes...`);

    // Memore - retornar TODOS os resultados ordenados por data de criação
    try {
      console.log('🔍 Buscando MEMORE...');
      // Verificar se a coluna tabela_normativa_id existe antes de fazer JOIN
      const memoreResult = await query(`
        SELECT m.*
        FROM resultados_memore m
        WHERE m.avaliacao_id = $1
        ORDER BY m.created_at DESC
      `, [id]);
      
      // Tentar buscar nome da tabela normativa se a coluna existir
      for (let resultado of memoreResult.rows) {
        if (resultado.tabela_normativa_id) {
          try {
            const tabelaResult = await query('SELECT nome FROM tabelas_normativas WHERE id = $1', [resultado.tabela_normativa_id]);
            resultado.tabela_normativa_nome = tabelaResult.rows[0]?.nome || null;
          } catch (err) {
            resultado.tabela_normativa_nome = null;
          }
        } else {
          resultado.tabela_normativa_nome = null;
        }
      }
      
      console.log(`📊 MEMORE encontrados: ${memoreResult.rows.length}`);
      
      if (memoreResult.rows.length > 0) {
        // Agrupar todos os resultados de MEMORE
        memoreResult.rows.forEach((resultado, index) => {
          testes.push({
            tipo: 'memore',
            nome: `MEMORE - Memória ${memoreResult.rows.length > 1 ? `(${index + 1})` : ''}`,
            resultado: resultado,
            tabela_normativa: resultado?.tabela_normativa_nome || null,
            created_at: resultado.created_at
          });
        });
        console.log(`✅ MEMORE processados com sucesso`);
      }
    } catch (err) {
      console.error('❌ ERRO ao processar MEMORE:', err);
      // Não lança erro, apenas registra e continua
    }

    // AC
    try {
      const acResult = await query(`
        SELECT a.*
        FROM resultados_ac a
        WHERE a.avaliacao_id = $1
      `, [id]);
      
      // Tentar buscar nome da tabela normativa se a coluna existir
      for (let resultado of acResult.rows) {
        if (resultado.tabela_normativa_id) {
          try {
            const tabelaResult = await query('SELECT nome FROM tabelas_normativas WHERE id = $1', [resultado.tabela_normativa_id]);
            resultado.tabela_normativa_nome = tabelaResult.rows[0]?.nome || null;
          } catch (err) {
            resultado.tabela_normativa_nome = null;
          }
        } else {
          resultado.tabela_normativa_nome = null;
        }
      }
      
      if (acResult.rows.length > 0) {
        testes.push({
          tipo: 'ac',
          nome: 'AC - Atenção Concentrada',
          resultado: acResult.rows[0],
          tabela_normativa: acResult.rows[0]?.tabela_normativa_nome || null
        });
      }
    } catch (err) {
      console.error('❌ ERRO ao processar AC:', err);
      // Não lança erro, apenas registra e continua
    }

    // BETA-III
    try {
      const betaResult = await query(`
        SELECT b.*
        FROM resultados_beta_iii b
        WHERE b.avaliacao_id = $1
      `, [id]);
      
      // Tentar buscar nome da tabela normativa se a coluna existir
      for (let resultado of betaResult.rows) {
        if (resultado.tabela_normativa_id) {
          try {
            const tabelaResult = await query('SELECT nome FROM tabelas_normativas WHERE id = $1', [resultado.tabela_normativa_id]);
            resultado.tabela_normativa_nome = tabelaResult.rows[0]?.nome || null;
          } catch (err) {
            resultado.tabela_normativa_nome = null;
          }
        } else {
          resultado.tabela_normativa_nome = null;
        }
      }
      
      if (betaResult.rows.length > 0) {
        testes.push({
          tipo: 'beta-iii',
          nome: 'BETA-III - Raciocínio Matricial',
          resultado: betaResult.rows[0],
          tabela_normativa: betaResult.rows[0]?.tabela_normativa_nome || null
        });
      }
    } catch (err) {
      console.error('❌ ERRO ao processar BETA-III:', err);
      // Não lança erro, apenas registra e continua
    }

    // BPA-2
    try {
      const bpaResult = await query(
        'SELECT * FROM resultados_bpa2 WHERE avaliacao_id = $1 ORDER BY tipo_atencao',
        [id]
      );
      if (bpaResult.rows.length > 0) {
        // Agrupar resultados por modalidade
        const resultados = {};
        bpaResult.rows.forEach(row => {
          resultados[row.tipo_atencao.toLowerCase()] = row;
        });
        
        testes.push({
          tipo: 'bpa2',
          nome: 'BPA-2 - Atenção',
          resultado: resultados
        });
      }
    } catch (err) {
      console.error('❌ ERRO ao processar BPA-2:', err);
      // Não lança erro, apenas registra e continua
    }

    // Rotas - retornar TODOS os resultados (sem agrupamento por data por enquanto)
    try {
      console.log('🔍 Buscando ROTAS...');
      const rotasResult = await query(`
        SELECT r.*
        FROM resultados_rotas r
        WHERE r.avaliacao_id = $1 
        ORDER BY r.created_at DESC, r.rota_tipo
      `, [id]);
      
      // Tentar buscar nome da tabela normativa se a coluna existir
      for (let resultado of rotasResult.rows) {
        if (resultado.tabela_normativa_id) {
          try {
            const tabelaResult = await query('SELECT nome FROM tabelas_normativas WHERE id = $1', [resultado.tabela_normativa_id]);
            resultado.tabela_normativa_nome = tabelaResult.rows[0]?.nome || null;
          } catch (err) {
            resultado.tabela_normativa_nome = null;
          }
        } else {
          resultado.tabela_normativa_nome = null;
        }
      }
      
      console.log(`📊 ROTAS encontradas: ${rotasResult.rows.length}`);
      
      if (rotasResult.rows.length > 0) {
        // Por enquanto, retornar tudo como um único bloco (ROTAS A, C, D juntas)
        testes.push({
          tipo: 'rotas',
          nome: 'Rotas de Atenção',
          resultado: rotasResult.rows.sort((a, b) => a.rota_tipo.localeCompare(b.rota_tipo)),
          tabela_normativa: rotasResult.rows[0]?.tabela_normativa_nome || null,
          created_at: rotasResult.rows[0].created_at
        });
        console.log(`✅ ROTAS processadas com sucesso`);
      }
    } catch (err) {
      console.error('❌ ERRO ao processar ROTAS:', err);
      console.error('   Stack:', err.stack);
      // Não lança erro, apenas registra e continua
    }

    // MIG - retornar TODOS os resultados ordenados por data de criação
    try {
      console.log('🔍 Buscando MIG...');
      const migResult = await query(`
        SELECT m.*
        FROM resultados_mig m
        WHERE m.avaliacao_id = $1
        ORDER BY m.created_at DESC
      `, [id]);
      
      // Tentar buscar nome da tabela normativa se a coluna existir
      for (let resultado of migResult.rows) {
        if (resultado.tabela_normativa_id) {
          try {
            const tabelaResult = await query('SELECT nome FROM tabelas_normativas WHERE id = $1', [resultado.tabela_normativa_id]);
            resultado.tabela_normativa_nome = tabelaResult.rows[0]?.nome || null;
          } catch (err) {
            resultado.tabela_normativa_nome = null;
          }
        } else {
          resultado.tabela_normativa_nome = null;
        }
      }
      
      console.log(`📊 MIG encontrados: ${migResult.rows.length}`);
      
      if (migResult.rows.length > 0) {
        // Agrupar todos os resultados de MIG
        migResult.rows.forEach((resultado, index) => {
          testes.push({
            tipo: 'mig',
            nome: `MIG - Avaliação Psicológica ${migResult.rows.length > 1 ? `(${index + 1})` : ''}`,
            resultado: resultado,
            tabela_normativa: resultado?.tabela_normativa_nome || null,
            created_at: resultado.created_at
          });
        });
        console.log(`✅ MIG processados com sucesso`);
      }
    } catch (err) {
      console.error('❌ ERRO ao processar MIG:', err);
      // Não lança erro, apenas registra e continua
    }

    // MVT - retornar TODOS os resultados ordenados por data de criação
    try {
      const mvtResult = await query(`
        SELECT m.*
        FROM resultados_mvt m
        WHERE m.avaliacao_id = $1
        ORDER BY m.created_at DESC
      `, [id]);
      
      // Tentar buscar nome da tabela normativa se a coluna existir
      for (let resultado of mvtResult.rows) {
        if (resultado.tabela_normativa_id) {
          try {
            const tabelaResult = await query('SELECT nome FROM tabelas_normativas WHERE id = $1', [resultado.tabela_normativa_id]);
            resultado.tabela_normativa_nome = tabelaResult.rows[0]?.nome || null;
          } catch (err) {
            resultado.tabela_normativa_nome = null;
          }
        } else {
          resultado.tabela_normativa_nome = null;
        }
      }
      
      if (mvtResult.rows.length > 0) {
        // Agrupar todos os resultados de MVT
        mvtResult.rows.forEach((resultado, index) => {
          testes.push({
            tipo: 'mvt',
            nome: `MVT - Memória Visual para o Trânsito ${mvtResult.rows.length > 1 ? `(${index + 1})` : ''}`,
            resultado: resultado,
            tabela_normativa: resultado?.tabela_normativa_nome || null,
            created_at: resultado.created_at
          });
        });
      }
    } catch (err) {
      console.error('❌ ERRO ao processar MVT:', err);
      // Não lança erro, apenas registra e continua
    }

    // R-1 - retornar TODOS os resultados ordenados por data de criação
    try {
      const r1Result = await query(`
        SELECT r.*
        FROM resultados_r1 r
        WHERE r.avaliacao_id = $1
        ORDER BY r.created_at DESC
      `, [id]);
      
      // Tentar buscar nome da tabela normativa se a coluna existir
      for (let resultado of r1Result.rows) {
        if (resultado.tabela_normativa_id) {
          try {
            const tabelaResult = await query('SELECT nome FROM tabelas_normativas WHERE id = $1', [resultado.tabela_normativa_id]);
            resultado.tabela_normativa_nome = tabelaResult.rows[0]?.nome || null;
          } catch (err) {
            resultado.tabela_normativa_nome = null;
          }
        } else {
          resultado.tabela_normativa_nome = null;
        }
      }
      
      if (r1Result.rows.length > 0) {
        // Agrupar todos os resultados de R-1
        r1Result.rows.forEach((resultado, index) => {
          testes.push({
            tipo: 'r1',
            nome: `R-1 - Raciocínio ${r1Result.rows.length > 1 ? `(${index + 1})` : ''}`,
            resultado: resultado,
            tabela_normativa: resultado?.tabela_normativa_nome || null,
            created_at: resultado.created_at
          });
        });
      }
    } catch (err) {
      console.error('❌ ERRO ao processar R-1:', err);
      // Não lança erro, apenas registra e continua
    }

    // Palográfico - retornar TODOS os resultados ordenados por data de criação
    try {
      const palograficoResult = await query(`
        SELECT p.*
        FROM resultados_palografico p
        WHERE p.avaliacao_id = $1
        ORDER BY p.created_at DESC
      `, [id]);
      
      // Tentar buscar nome da tabela normativa se a coluna existir
      for (let resultado of palograficoResult.rows) {
        if (resultado.tabela_normativa_id) {
          try {
            const tabelaResult = await query('SELECT nome FROM tabelas_normativas WHERE id = $1', [resultado.tabela_normativa_id]);
            resultado.tabela_normativa_nome = tabelaResult.rows[0]?.nome || null;
          } catch (err) {
            resultado.tabela_normativa_nome = null;
          }
        } else {
          resultado.tabela_normativa_nome = null;
        }
      }
      
      if (palograficoResult.rows.length > 0) {
        // Agrupar todos os resultados de Palográfico
        palograficoResult.rows.forEach((resultado, index) => {
          testes.push({
            tipo: 'palografico',
            nome: `Palográfico ${palograficoResult.rows.length > 1 ? `(${index + 1})` : ''}`,
            resultado: resultado,
            tabela_normativa: resultado?.tabela_normativa_nome || null,
            created_at: resultado.created_at
          });
        });
      }
    } catch (err) {
      console.error('❌ ERRO ao processar Palográfico:', err);
      // Não lança erro, apenas registra e continua (tabela pode não existir)
    }

    // Ordenar todos os testes por data de criação (mais recente primeiro)
    testes.sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

    res.json({
      data: {
        testes
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar testes da avaliação:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Enviar mensagem manual do resultado
router.post('/:id/enviar-mensagem', async (req, res) => {
  try {
    const { id } = req.params;
    const { preferencia = 'whatsapp' } = req.body; // 'whatsapp', 'email', 'ambos'

    // Verificar se a avaliação existe e tem aptidão definida
    const avaliacao = await query(
      'SELECT * FROM avaliacoes WHERE id = $1',
      [id]
    );

    if (avaliacao.rows.length === 0) {
      return res.status(404).json({
        error: 'Avaliação não encontrada'
      });
    }

    const aptidao = avaliacao.rows[0].aptidao;
    if (!aptidao || aptidao.trim() === '') {
      return res.status(400).json({
        error: 'Aptidão não foi definida para esta avaliação'
      });
    }

    // Verificar se há avaliação mais recente para este paciente
    const pacienteId = avaliacao.rows[0].paciente_id;
    const dataAplicacao = avaliacao.rows[0].data_aplicacao;
    
    const avaliacaoMaisRecente = await query(
      `SELECT id, data_aplicacao, aptidao 
       FROM avaliacoes 
       WHERE paciente_id = $1 
         AND aptidao IS NOT NULL 
         AND (data_aplicacao > $2 OR (data_aplicacao = $2 AND id > $3))
       ORDER BY data_aplicacao DESC, id DESC
       LIMIT 1`,
      [pacienteId, dataAplicacao, id]
    );
    
    // Se há avaliação mais recente, não permitir envio desta (deve enviar a mais recente)
    if (avaliacaoMaisRecente.rows.length > 0) {
      return res.status(400).json({
        error: `Existe uma avaliação mais recente (ID ${avaliacaoMaisRecente.rows[0].id}). Envie o resultado da avaliação mais recente.`,
        avaliacaoMaisRecente: true,
        avaliacaoMaisRecenteId: avaliacaoMaisRecente.rows[0].id
      });
    }
    
    // Verificar se já foi enviada uma mensagem para esta avaliação
    const statusEnvio = await MessageService.wasMessageSent(id);
    if (statusEnvio.enviado) {
      return res.status(400).json({
        error: 'Mensagem já foi enviada para esta avaliação',
        alreadySent: true,
        data_envio: statusEnvio.data_envio,
        metodo_envio: statusEnvio.metodo_envio
      });
    }

    // Enviar mensagem
    const messageResult = await MessageService.sendEvaluationResult(id, aptidao, preferencia);
    
    res.json({
      message: 'Mensagem enviada com sucesso',
      result: messageResult
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Verificar status de mensagem enviada
router.get('/:id/status-mensagem', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar avaliação para verificar se é a mais recente
    const avaliacao = await query(
      'SELECT id, paciente_id, data_aplicacao, aptidao FROM avaliacoes WHERE id = $1',
      [id]
    );
    
    if (avaliacao.rows.length === 0) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }
    
    const aval = avaliacao.rows[0];
    
    // Verificar se há avaliação mais recente para este paciente com aptidão
    const avaliacaoMaisRecente = await query(
      `SELECT id, data_aplicacao, aptidao 
       FROM avaliacoes 
       WHERE paciente_id = $1 
         AND aptidao IS NOT NULL 
         AND (data_aplicacao > $2 OR (data_aplicacao = $2 AND id > $3))
       ORDER BY data_aplicacao DESC, id DESC
       LIMIT 1`,
      [aval.paciente_id, aval.data_aplicacao, aval.id]
    );
    
    // Se há avaliação mais recente, o status deve ser resetado (não enviado ainda)
    if (avaliacaoMaisRecente.rows.length > 0) {
      return res.json({
        messageSent: false,
        data_envio: null,
        metodo_envio: null,
        avaliacaoMaisRecente: true,
        avaliacaoMaisRecenteId: avaliacaoMaisRecente.rows[0].id
      });
    }
    
    // Buscar status de envio
    const statusEnvio = await MessageService.wasMessageSent(id);
    
    res.json({
      messageSent: statusEnvio.enviado,
      data_envio: statusEnvio.data_envio,
      metodo_envio: statusEnvio.metodo_envio,
      avaliacaoMaisRecente: false
    });

  } catch (error) {
    console.error('Erro ao verificar status da mensagem:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
