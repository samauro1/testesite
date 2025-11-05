/**
 * Script para criar tabelas necessárias para o módulo de testes
 * Uso: node scripts/create-tables.js
 */

require('dotenv').config();
const { query } = require('../config/database');

async function createTables() {
  console.log('🔄 Criando tabelas do módulo de testes...\n');
  
  try {
    // 1. Criar tabela tabelas_normativas se não existir
    console.log('📋 Criando tabela tabelas_normativas...');
    await query(`
      CREATE TABLE IF NOT EXISTS tabelas_normativas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        versao VARCHAR(20) DEFAULT '1.0',
        criterio VARCHAR(50),
        descricao TEXT,
        ativa BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela tabelas_normativas criada/verificada\n');

    // 2. Criar tabela normas_rotas se não existir
    console.log('📋 Criando tabela normas_rotas...');
    await query(`
      CREATE TABLE IF NOT EXISTS normas_rotas (
        id SERIAL PRIMARY KEY,
        tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
        rota_tipo VARCHAR(10) NOT NULL,
        pontos_min INTEGER NOT NULL,
        pontos_max INTEGER NOT NULL,
        percentil INTEGER NOT NULL,
        classificacao VARCHAR(50) NOT NULL
      )
    `);
    console.log('✅ Tabela normas_rotas criada/verificada\n');

    // 3. Criar índices para performance
    console.log('📋 Criando índices...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_normas_rotas_tabela_id ON normas_rotas(tabela_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tabelas_normativas_tipo ON tabelas_normativas(tipo)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tabelas_normativas_ativa ON tabelas_normativas(ativa)
    `);
    console.log('✅ Índices criados/verificados\n');

    console.log('✅ Todas as tabelas foram criadas/verificadas com sucesso!');
    
    // Verificar se há tabelas normativas para Rotas
    const tabelas = await query(`
      SELECT COUNT(*) as count 
      FROM tabelas_normativas 
      WHERE tipo = 'rotas' AND ativa = true
    `);
    
    console.log(`\n📊 Tabelas normativas de Rotas encontradas: ${tabelas.rows[0].count}`);
    
    if (tabelas.rows[0].count === 0) {
      console.log('⚠️  Nenhuma tabela normativa para Rotas encontrada.');
      console.log('💡 Execute um script de população de tabelas para adicionar dados.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    console.error('❌ Mensagem:', error.message);
    console.error('❌ Stack:', error.stack);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createTables();
}

module.exports = { createTables };

