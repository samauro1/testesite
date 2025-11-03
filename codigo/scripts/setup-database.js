require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configurações do banco
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: 'postgres' // Conecta ao banco padrão para criar o banco
};

const targetDbName = process.env.DB_NAME || 'sistema_avaliacao_psicologica';

async function setupDatabase() {
  console.log('🗄️ Configurando banco de dados...\n');

  const client = new Client(dbConfig);

  try {
    // Conectar ao PostgreSQL
    console.log('📡 Conectando ao PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // Verificar se o banco já existe
    console.log(`🔍 Verificando se o banco '${targetDbName}' existe...`);
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDbName]
    );

    if (result.rows.length > 0) {
      console.log(`✅ Banco '${targetDbName}' já existe`);
    } else {
      // Criar o banco
      console.log(`📦 Criando banco '${targetDbName}'...`);
      await client.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`✅ Banco '${targetDbName}' criado com sucesso`);
    }

    await client.end();
    console.log('\n🎉 Configuração do banco concluída!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Execute: npm run migrate');
    console.log('2. Execute: npm run seed');
    console.log('3. Ou execute: npm run setup');

  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Soluções possíveis:');
      console.log('1. Verifique se o PostgreSQL está rodando');
      console.log('2. Verifique as configurações no arquivo .env');
      console.log('3. No Windows, inicie o PostgreSQL:');
      console.log('   - Abra "Serviços" (services.msc)');
      console.log('   - Procure por "postgresql" e inicie o serviço');
    } else if (error.code === '28P01') {
      console.log('\n💡 Erro de autenticação:');
      console.log('1. Verifique o usuário e senha no arquivo .env');
      console.log('2. Padrão: DB_USER=postgres, DB_PASSWORD=password');
    }
    
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
