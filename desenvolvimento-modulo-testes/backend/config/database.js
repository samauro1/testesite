/**
 * Configuração do Banco de Dados - Ambiente Isolado
 * 
 * IMPORTANTE: Use um banco de dados SEPARADO ou um SCHEMA SEPARADO
 * para não afetar o sistema principal durante o desenvolvimento.
 */

require('dotenv').config();
const { Pool } = require('pg');

// Opção 1: Banco de dados separado (RECOMENDADO)
// DB_NAME=sistema_testes_desenvolvimento

// Opção 2: Schema separado no mesmo banco
// Use SET search_path = 'testes_dev' nas queries

// Configuração do banco de dados
// Usa as mesmas credenciais do sistema principal
// Senha testada e funcionando: Lobito00
// Banco: sistema_avaliacao_psicologica
// FORÇAR valores corretos - não depender de .env que pode não existir
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'sistema_avaliacao_psicologica', // FORÇAR banco correto
  user: 'postgres', // FORÇAR usuário correto
  password: 'Lobito00', // FORÇAR senha que funciona
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Testar conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao banco de dados de DESENVOLVIMENTO (isolado)');
});

pool.on('error', (err) => {
  console.error('❌ Erro na conexão com o banco de dados:', err);
});

// Função para executar queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    // Se usar schema separado, adicionar: SET search_path = 'testes_dev';
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executada:', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Erro na query:', error);
    throw error;
  }
};

module.exports = {
  query,
  pool
};

