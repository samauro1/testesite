require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testando conexão com PostgreSQL...\n');

console.log('Configurações:');
console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
console.log(`  Port: ${process.env.DB_PORT || 5432}`);
console.log(`  Database: ${process.env.DB_NAME || 'sistema_avaliacao_psicologica'}`);
console.log(`  User: ${process.env.DB_USER || 'postgres'}`);
console.log(`  Password: ${process.env.DB_PASSWORD ? '***' : '(não configurada)'}\n`);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'sistema_avaliacao_psicologica',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  connectionTimeoutMillis: 5000,
});

pool.query('SELECT NOW() as current_time, current_database() as database')
  .then((res) => {
    console.log('✅ CONEXÃO COM BANCO DE DADOS OK!\n');
    console.log(`  Horário do servidor: ${res.rows[0].current_time}`);
    console.log(`  Banco conectado: ${res.rows[0].database}`);
    process.exit(0);
  })
  .catch((err) => {
    console.log('❌ ERRO NA CONEXÃO:\n');
    console.log(`  Código: ${err.code}`);
    console.log(`  Mensagem: ${err.message}\n`);
    
    if (err.code === '28P01') {
      console.log('💡 SOLUÇÃO:');
      console.log('   A senha do PostgreSQL está incorreta.');
      console.log('   Edite o arquivo .env e corrija DB_PASSWORD');
      console.log('   Ou altere a senha do usuário postgres no PostgreSQL.\n');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('💡 SOLUÇÃO:');
      console.log('   O PostgreSQL não está rodando ou não está na porta configurada.');
      console.log('   Verifique se o serviço PostgreSQL está iniciado.\n');
    } else if (err.code === '3D000') {
      console.log('💡 SOLUÇÃO:');
      console.log('   O banco de dados não existe.');
      console.log('   Execute: npm run db:create\n');
    }
    
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });

