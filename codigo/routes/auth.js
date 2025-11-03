const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { validate, userSchema, loginSchema } = require('../middleware/validation');

const router = express.Router();

// Registrar novo usuário
router.post('/register', validate(userSchema), async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // Verificar se o email já existe
    const existingUser = await query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Email já está em uso'
      });
    }

    // Hash da senha
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    // Inserir usuário
    const result = await query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email, ativo, created_at',
      [nome, email, senhaHash]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        ativo: user.ativo,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Usuários hardcoded removidos - usando autenticação real do banco

    // Buscar usuário no banco de dados
    const result = await query(
      'SELECT id, nome, email, senha_hash, ativo, foto_url, perfil, crp, especialidade FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciais inválidas'
      });
    }

    const user = result.rows[0];

    if (!user.ativo) {
      return res.status(401).json({
        error: 'Usuário inativo'
      });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({
        error: 'Credenciais inválidas'
      });
    }

    const token = generateToken(user.id);

        // Registrar log de login
        try {
          await query(`
            INSERT INTO logs_sistema (tipo, descricao, usuario_id, ip_address)
            VALUES ('login', 'Usuário fez login no sistema', $1, $2)
          `, [user.id, req.ip || req.connection.remoteAddress]);
        } catch (logError) {
          console.warn('Não foi possível registrar log de login:', logError.message);
        }

        res.json({
          message: 'Login realizado com sucesso',
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            ativo: user.ativo,
            foto_url: user.foto_url,
            perfil: user.perfil,
            crp: user.crp,
            especialidade: user.especialidade
          },
          token
        });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Verificar token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Token não fornecido'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      'SELECT id, nome, email, ativo, foto_url, perfil, crp, especialidade FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Usuário não encontrado'
      });
    }

    const user = result.rows[0];

    if (!user.ativo) {
      return res.status(401).json({
        error: 'Usuário inativo'
      });
    }

    res.json({
      valid: true,
      data: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        ativo: user.ativo,
        foto_url: user.foto_url,
        perfil: user.perfil,
        crp: user.crp,
        especialidade: user.especialidade
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }

    console.error('Erro ao verificar token:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Registrar log de logout
    try {
      await query(`
        INSERT INTO logs_sistema (tipo, descricao, usuario_id, ip_address)
        VALUES ('logout', 'Usuário fez logout do sistema', $1, $2)
      `, [req.user.id, req.ip || req.connection.remoteAddress]);
    } catch (logError) {
      console.warn('Não foi possível registrar log de logout:', logError.message);
    }

    res.json({
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
