/**
 * Script para verificar e corrigir tabelas do módulo de testes
 * Garante que todas as tabelas necessárias existem e estão corretas
 */

require('dotenv').config();
const { query } = require('../config/database');

async function verifyAndFixTables() {
  console.log('🔄 Verificando e corrigindo tabelas do módulo de testes...\n');
  
  try {
    // 1. Testar conexão
    console.log('📡 Testando conexão com banco...');
    const testResult = await query('SELECT NOW() as time, current_database() as db');
    console.log(`✅ Conectado ao banco: ${testResult.rows[0].db}`);
    console.log(`   Hora: ${testResult.rows[0].time}\n`);

    // 2. Criar tabela tabelas_normativas se não existir
    console.log('📋 Verificando tabela tabelas_normativas...');
    try {
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
      console.log('✅ Tabela tabelas_normativas OK\n');
    } catch (error) {
      console.error('❌ Erro ao criar tabelas_normativas:', error.message);
      throw error;
    }

    // 3. Criar tabela normas_rotas se não existir
    console.log('📋 Verificando tabela normas_rotas...');
    try {
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
      console.log('✅ Tabela normas_rotas OK\n');
    } catch (error) {
      console.error('❌ Erro ao criar normas_rotas:', error.message);
      throw error;
    }

    // 4. Criar índices
    console.log('📋 Criando índices...');
    try {
      await query(`CREATE INDEX IF NOT EXISTS idx_normas_rotas_tabela_id ON normas_rotas(tabela_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_tabelas_normativas_tipo ON tabelas_normativas(tipo)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_tabelas_normativas_ativa ON tabelas_normativas(ativa)`);
      console.log('✅ Índices criados/verificados\n');
    } catch (error) {
      console.error('⚠️  Erro ao criar índices (pode já existirem):', error.message);
    }

    // 5. Verificar se há tabelas normativas para Rotas
    console.log('📊 Verificando tabelas normativas de Rotas...');
    const tabelas = await query(`
      SELECT id, nome, tipo, ativa 
      FROM tabelas_normativas 
      WHERE tipo = 'rotas'
      ORDER BY id
    `);
    
    console.log(`   Encontradas ${tabelas.rows.length} tabela(s) normativa(s) para Rotas:`);
    tabelas.rows.forEach(t => {
      console.log(`   - ID: ${t.id}, Nome: ${t.nome}, Ativa: ${t.ativa}`);
    });
    
    // 6. Se não houver tabelas, criar uma padrão
    if (tabelas.rows.length === 0) {
      console.log('\n⚠️  Nenhuma tabela normativa encontrada. Criando tabela padrão...');
      const result = await query(`
        INSERT INTO tabelas_normativas (nome, tipo, versao, criterio, descricao, ativa)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nome
      `, [
        'Rotas - Tabela Padrão',
        'rotas',
        '1.0',
        'Geral',
        'Tabela normativa padrão para Rotas de Atenção',
        true
      ]);
      console.log(`✅ Tabela padrão criada: ID ${result.rows[0].id} - ${result.rows[0].nome}\n`);
    }

    // 7. Verificar se há normas de Rotas
    console.log('📊 Verificando normas de Rotas...');
    const normas = await query(`
      SELECT COUNT(*) as total 
      FROM normas_rotas
    `);
    console.log(`   Encontradas ${normas.rows[0].total} norma(s) de Rotas`);
    
    if (parseInt(normas.rows[0].total) === 0) {
      console.log('⚠️  Nenhuma norma encontrada. Tabela está vazia.');
      console.log('💡 Execute um script de população de normas quando necessário.\n');
    }

    // 8. Teste final: buscar tabelas ativas
    console.log('🧪 Teste final: buscando tabelas ativas de Rotas...');
    const tabelasAtivas = await query(`
      SELECT id, nome, tipo, ativa 
      FROM tabelas_normativas 
      WHERE tipo = 'rotas' AND ativa = true
      ORDER BY id
    `);
    
    console.log(`✅ Teste OK: ${tabelasAtivas.rows.length} tabela(s) ativa(s) encontrada(s)\n`);

    console.log('✅ Todas as verificações concluídas com sucesso!');
    console.log('\n📋 Resumo:');
    console.log(`   - Tabelas normativas de Rotas: ${tabelas.rows.length}`);
    console.log(`   - Tabelas ativas: ${tabelasAtivas.rows.length}`);
    console.log(`   - Normas cadastradas: ${normas.rows[0].total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro durante verificação:', error);
    console.error('❌ Mensagem:', error.message);
    console.error('❌ Stack:', error.stack);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  verifyAndFixTables();
}

module.exports = { verifyAndFixTables };

