const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Middleware de autorização
const checkPermission = (recurso, acao) => {
  return async (req, res, next) => {
    try {
      const usuario = req.user;
      
      // Admin tem todas as permissões
      if (usuario.perfil === 'administrador') {
        return next();
      }

      // Verificar permissão específica
      const result = await query(
        `SELECT * FROM permissoes 
         WHERE perfil = $1 AND recurso = $2`,
        [usuario.perfil, recurso]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Sem permissão para acessar este recurso' });
      }

      const permissao = result.rows[0];
      let temPermissao = false;

      switch (acao) {
        case 'visualizar':
          temPermissao = permissao.pode_visualizar;
          break;
        case 'criar':
          temPermissao = permissao.pode_criar;
          break;
        case 'editar':
          temPermissao = permissao.pode_editar;
          break;
        case 'excluir':
          temPermissao = permissao.pode_excluir;
          break;
      }

      if (!temPermissao) {
        return res.status(403).json({ 
          error: `Sem permissão para ${acao} ${recurso}`,
          perfil: usuario.perfil,
          acao,
          recurso
        });
      }

      next();
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
  };
};

// Listar todos os usuários (apenas admin)
router.get('/', authenticateToken, checkPermission('usuarios', 'visualizar'), async (req, res) => {
  try {
    const result = await query(`
      SELECT id, nome, email, perfil, ativo, created_at, updated_at
      FROM usuarios
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Criar novo usuário (apenas admin)
router.post('/', authenticateToken, checkPermission('usuarios', 'criar'), async (req, res) => {
  try {
    const { nome, email, senha, perfil } = req.body;

    // Validações
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    // Verificar se email já existe
    const existingUser = await query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Criar usuário
    const result = await query(`
      INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, nome, email, perfil, ativo, created_at
    `, [nome, email, hashedPassword, perfil || 'psicologo']);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Usuário criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Atualizar usuário
router.put('/:id', authenticateToken, checkPermission('usuarios', 'editar'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, perfil, ativo, senha } = req.body;

    // Construir query dinamicamente
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (nome) {
      updateFields.push(`nome = $${paramCount++}`);
      values.push(nome);
    }
    if (email) {
      updateFields.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (perfil) {
      updateFields.push(`perfil = $${paramCount++}`);
      values.push(perfil);
    }
    if (ativo !== undefined) {
      updateFields.push(`ativo = $${paramCount++}`);
      values.push(ativo);
    }
    if (senha) {
      const hashedPassword = await bcrypt.hash(senha, 10);
      updateFields.push(`senha_hash = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    values.push(id);

    const result = await query(`
      UPDATE usuarios
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, nome, email, perfil, ativo, updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Usuário atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Excluir usuário (desativar)
router.delete('/:id', authenticateToken, checkPermission('usuarios', 'excluir'), async (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir excluir o próprio usuário
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Você não pode desativar seu próprio usuário' });
    }

    const result = await query(`
      UPDATE usuarios
      SET ativo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, nome, email
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Usuário desativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    res.status(500).json({ error: 'Erro ao desativar usuário' });
  }
});

// Desativar usuário (soft delete)
router.patch('/:id/desativar', authenticateToken, checkPermission('usuarios', 'excluir'), async (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir desativar o próprio usuário
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Você não pode desativar seu próprio usuário' });
    }

    const result = await query(`
      UPDATE usuarios
      SET ativo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, nome, email, ativo
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Usuário desativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Ativar usuário
router.patch('/:id/ativar', authenticateToken, checkPermission('usuarios', 'excluir'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE usuarios
      SET ativo = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, nome, email, ativo
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Usuário ativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao ativar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir usuário permanentemente (hard delete)
router.delete('/:id/permanente', authenticateToken, checkPermission('usuarios', 'excluir'), async (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir excluir o próprio usuário
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
    }

    // Verificar se o usuário existe
    const userCheck = await query('SELECT id, nome, email FROM usuarios WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Excluir permanentemente
    await query('DELETE FROM usuarios WHERE id = $1', [id]);

    res.json({
      success: true,
      data: userCheck.rows[0],
      message: 'Usuário excluído permanentemente'
    });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar perfis disponíveis
router.get('/perfis/disponiveis', authenticateToken, async (req, res) => {
  try {
    const perfis = [
      { id: 'administrador', nome: 'Administrador', descricao: 'Acesso total ao sistema' },
      { id: 'psicologo', nome: 'Psicólogo', descricao: 'Acesso a pacientes, avaliações e testes' },
      { id: 'psicologo_externo', nome: 'Psicólogo Externo', descricao: 'Acesso a testes sem descontar estoque da clínica' },
      { id: 'recepcionista', nome: 'Recepcionista', descricao: 'Acesso a pacientes e agendamentos' },
      { id: 'estagiario', nome: 'Estagiário', descricao: 'Acesso somente leitura' }
    ];

    res.json({
      success: true,
      data: perfis
    });
  } catch (error) {
    console.error('Erro ao listar perfis:', error);
    res.status(500).json({ error: 'Erro ao listar perfis' });
  }
});

// Obter permissões de um perfil
router.get('/permissoes/:perfil', authenticateToken, async (req, res) => {
  try {
    const { perfil } = req.params;

    const result = await query(`
      SELECT recurso, pode_visualizar, pode_criar, pode_editar, pode_excluir
      FROM permissoes
      WHERE perfil = $1
      ORDER BY recurso
    `, [perfil]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar permissões:', error);
    res.status(500).json({ error: 'Erro ao buscar permissões' });
  }
});

// Atualizar perfil do usuário logado
router.put('/perfil/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome, email, foto_url, crp, especialidade, perfil, senha } = req.body;

    // Construir query dinamicamente
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (nome) {
      updateFields.push(`nome = $${paramCount++}`);
      values.push(nome);
    }
    if (email) {
      // Verificar se o email já está em uso por outro usuário
      const existingUser = await query(
        'SELECT id FROM usuarios WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado para outro usuário' });
      }
      updateFields.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (foto_url !== undefined) {
      updateFields.push(`foto_url = $${paramCount++}`);
      values.push(foto_url);
    }
    if (crp !== undefined) {
      updateFields.push(`crp = $${paramCount++}`);
      values.push(crp);
    }
    if (especialidade !== undefined) {
      updateFields.push(`especialidade = $${paramCount++}`);
      values.push(especialidade);
    }
    if (perfil) {
      // Validar perfil
      const validPerfis = ['administrador', 'psicologo', 'psicologo_externo', 'recepcionista', 'estagiario'];
      if (!validPerfis.includes(perfil)) {
        return res.status(400).json({ error: 'Tipo de usuário inválido' });
      }
      updateFields.push(`perfil = $${paramCount++}`);
      values.push(perfil);
    }
    if (senha) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(senha, 10);
      updateFields.push(`senha_hash = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId); // Para o WHERE

    const result = await query(`
      UPDATE usuarios
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, nome, email, perfil, ativo, foto_url, crp, especialidade, created_at, updated_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Perfil atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

module.exports = router;
module.exports.checkPermission = checkPermission;

