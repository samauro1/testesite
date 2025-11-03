const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Configurar JWT_SECRET padrão se não estiver definido
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'palografico_secret_key_2024';
  console.log('🔧 JWT_SECRET configurado com valor padrão');
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar se o usuário ainda existe e está ativo
    const result = await query(
      'SELECT id, nome, email, perfil, ativo, foto_url FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    
    if (!user.ativo) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Middleware para verificar se o usuário é administrador
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  if (req.user.perfil !== 'administrador') {
    return res.status(403).json({ 
      error: 'Acesso negado',
      message: 'Apenas administradores podem acessar este recurso'
    });
  }

  next();
};

// Middleware para verificar perfis permitidos
const requirePerfil = (...perfisPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!perfisPermitidos.includes(req.user.perfil)) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: `Acesso permitido apenas para: ${perfisPermitidos.join(', ')}`
      });
    }

    next();
  };
};

// Função helper para verificar se o usuário é admin
const isAdmin = (user) => {
  return user && user.perfil === 'administrador';
};

// Função helper para filtrar queries por usuário (exceto admin)
const addUserFilter = (user, baseQuery, params = []) => {
  if (isAdmin(user)) {
    // Admin vê tudo
    return { query: baseQuery, params };
  }

  // Outros perfis veem apenas seus próprios dados
  const userFilter = ' AND usuario_id = $' + (params.length + 1);
  return {
    query: baseQuery + userFilter,
    params: [...params, user.id]
  };
};

module.exports = {
  authenticateToken,
  generateToken,
  requireAdmin,
  requirePerfil,
  isAdmin,
  addUserFilter
};
