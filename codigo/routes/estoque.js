const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validate, estoqueSchema, movimentacaoEstoqueSchema } = require('../middleware/validation');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Listar estoque
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, nome_teste, quantidade_atual, quantidade_minima, ativo, created_at, updated_at
      FROM testes_estoque 
      WHERE ativo = true 
      ORDER BY nome_teste
    `);

    res.json({
      data: {
        estoque: result.rows
      }
    });
  } catch (error) {
    console.error('Erro ao listar estoque:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Listar itens com estoque baixo
router.get('/low-stock', async (req, res) => {
  try {
    const result = await query(`
      SELECT id, nome_teste, quantidade_atual, quantidade_minima, ativo, created_at, updated_at
      FROM testes_estoque 
      WHERE ativo = true AND quantidade_atual <= quantidade_minima
      ORDER BY nome_teste
    `);

    res.json({
      data: {
        estoque: result.rows
      }
    });
  } catch (error) {
    console.error('Erro ao listar estoque baixo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Buscar item do estoque por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT id, nome_teste, quantidade_atual, quantidade_minima, ativo, created_at, updated_at
      FROM testes_estoque 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Item do estoque não encontrado'
      });
    }

    res.json({
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar item do estoque:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Atualizar estoque
router.put('/:id', validate(estoqueSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome_teste, quantidade_atual, quantidade_minima } = req.body;

    // Verificar se o item existe
    const existingItem = await query(
      'SELECT id FROM testes_estoque WHERE id = $1',
      [id]
    );

    if (existingItem.rows.length === 0) {
      return res.status(404).json({
        error: 'Item do estoque não encontrado'
      });
    }

    const result = await query(`
      UPDATE testes_estoque 
      SET nome_teste = $1, quantidade_atual = $2, quantidade_minima = $3, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $4 
      RETURNING id, nome_teste, quantidade_atual, quantidade_minima, ativo, updated_at
    `, [nome_teste, quantidade_atual, quantidade_minima, id]);

    res.json({
      message: 'Estoque atualizado com sucesso',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Adicionar movimentação de estoque
router.post('/movements', validate(movimentacaoEstoqueSchema), async (req, res) => {
  try {
    const { teste_id, tipo_movimentacao, quantidade, observacoes } = req.body;
    const usuario_id = req.user.id;

    // Verificar se o teste existe
    const teste = await query(
      'SELECT id, quantidade_atual FROM testes_estoque WHERE id = $1',
      [teste_id]
    );

    if (teste.rows.length === 0) {
      return res.status(404).json({
        error: 'Teste não encontrado'
      });
    }

    const quantidadeAtual = teste.rows[0].quantidade_atual;
    let novaQuantidade;

    if (tipo_movimentacao === 'entrada') {
      novaQuantidade = quantidadeAtual + quantidade;
    } else if (tipo_movimentacao === 'saida') {
      if (quantidadeAtual < quantidade) {
        return res.status(400).json({
          error: 'Quantidade insuficiente em estoque'
        });
      }
      novaQuantidade = quantidadeAtual - quantidade;
    }

    // Iniciar transação
    const client = await require('../config/database').getClient();
    
    try {
      await client.query('BEGIN');

      // Inserir movimentação
      await client.query(`
        INSERT INTO movimentacoes_estoque (teste_id, tipo_movimentacao, quantidade, observacoes, usuario_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [teste_id, tipo_movimentacao, quantidade, observacoes, usuario_id]);

      // Atualizar quantidade do estoque
      await client.query(`
        UPDATE testes_estoque 
        SET quantidade_atual = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [novaQuantidade, teste_id]);

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Movimentação registrada com sucesso',
        nova_quantidade: novaQuantidade
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao registrar movimentação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Listar movimentações
router.get('/movements', async (req, res) => {
  try {
    const { page = 1, limit = 20, teste_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    if (teste_id) {
      whereClause = 'WHERE m.teste_id = $1';
      queryParams.push(teste_id);
    }

    const countQuery = `
      SELECT COUNT(*) 
      FROM movimentacoes_estoque m 
      JOIN testes_estoque t ON m.teste_id = t.id 
      JOIN usuarios u ON m.usuario_id = u.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT 
        m.id, m.tipo_movimentacao, m.quantidade, m.observacoes, m.created_at,
        t.nome_teste,
        u.nome as usuario_nome
      FROM movimentacoes_estoque m 
      JOIN testes_estoque t ON m.teste_id = t.id 
      JOIN usuarios u ON m.usuario_id = u.id
      ${whereClause}
      ORDER BY m.created_at DESC 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const dataResult = await query(dataQuery, [...queryParams, limit, offset]);

    res.json({
      movimentacoes: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar movimentações:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});


module.exports = router;
