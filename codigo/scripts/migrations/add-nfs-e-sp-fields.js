const { pool } = require('../../config/database');

async function addNfsESpFields() {
  try {
    console.log('🔧 Adicionando campos para API oficial NFS-e SP...');
    
    // Adicionar campos necessários para API oficial da Prefeitura de São Paulo
    await pool.query(`
      ALTER TABLE configuracoes_nfs_e 
      ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20),
      ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(20),
      ADD COLUMN IF NOT EXISTS ambiente VARCHAR(20) DEFAULT 'homologacao'
    `);
    
    console.log('✅ Campos adicionados com sucesso!');
    console.log('📊 Novos campos:');
    console.log('  - cnpj: VARCHAR(20)');
    console.log('  - inscricao_municipal: VARCHAR(20)');
    console.log('  - ambiente: VARCHAR(20) DEFAULT "homologacao"');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar campos NFS-e SP:', error.message);
    process.exit(1);
  }
}

addNfsESpFields();

