/**
 * Script para testar conexão com banco de dados
 * Tenta diferentes senhas até encontrar uma que funcione
 */

require('dotenv').config();
const { Pool } = require('pg');

const senhas = ['Lobito00', 'Diogo'];

// Lista de possíveis nomes de banco
const bancos = [
  'sistema_avaliacao_psicologica',
  'sistema_principal',
  'sistema_testes_desenvolvimento'
];

async function testConnection(senha, banco, index) {
  console.log(`\n🔍 Testando: senha "${senha}", banco "${banco}"...`);
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: banco,
    user: process.env.DB_USER || 'postgres',
    password: senha,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  });

  try {
    const result = await pool.query('SELECT NOW() as current_time, current_database() as database_name');
    console.log('✅ CONEXÃO BEM-SUCEDIDA!');
    console.log(`   Banco: ${result.rows[0].database_name}`);
    console.log(`   Hora: ${result.rows[0].current_time}`);
    console.log(`   Senha que funcionou: "${senha}"`);
    
    // Verificar se as tabelas existem
    try {
      const tabelas = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('tabelas_normativas', 'normas_rotas')
        ORDER BY table_name
      `);
      
      console.log(`\n📋 Tabelas encontradas: ${tabelas.rows.length}`);
      tabelas.rows.forEach(t => console.log(`   - ${t.table_name}`));
      
      if (tabelas.rows.length === 0) {
        console.log('\n⚠️  Tabelas não encontradas. Execute: node scripts/create-tables.js');
      }
    } catch (err) {
      console.log('   ⚠️  Não foi possível verificar tabelas:', err.message);
    }
    
    await pool.end();
    return true;
  } catch (error) {
    console.log(`   ❌ Falhou: ${error.message}`);
    await pool.end();
    return false;
  }
}

async function testAllConnections() {
  console.log('🔐 Testando conexões com diferentes senhas e bancos...\n');
  
  for (const senha of senhas) {
    for (const banco of bancos) {
      const sucesso = await testConnection(senha, banco, 0);
      if (sucesso) {
        console.log(`\n✅ CONFIGURAÇÃO QUE FUNCIONOU:`);
        console.log(`   DB_PASSWORD=${senha}`);
        console.log(`   DB_NAME=${banco}`);
        console.log(`\n💡 Use estas configurações no arquivo .env ou database.js`);
        process.exit(0);
      }
    }
  }
  
  console.log('\n❌ Nenhuma combinação funcionou. Verifique:');
  console.log('   1. Se o PostgreSQL está rodando');
  console.log('   2. Se algum dos bancos existe');
  console.log('   3. Se o usuário está correto');
  process.exit(1);
}

testAllConnections();

