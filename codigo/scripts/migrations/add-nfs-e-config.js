const { query } = require('../../config/database');

async function up() {
  try {
    console.log('🔄 Criando tabelas para NFS-e...');
    
    // Tabela de configurações NFS-e
    await query(`
      CREATE TABLE IF NOT EXISTS configuracoes_nfs_e (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        api_url VARCHAR(255) NOT NULL,
        usuario_api VARCHAR(100) NOT NULL,
        senha_api VARCHAR(255) NOT NULL,
        codigo_servico VARCHAR(20) DEFAULT '05118',
        discriminacao_servico TEXT DEFAULT 'Avaliação Psicológica para Habilitação de Veículos',
        valor_padrao DECIMAL(10,2) DEFAULT 150.00,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id)
      )
    `);
    
    // Tabela de NFS-e emitidas
    await query(`
      CREATE TABLE IF NOT EXISTS nfs_e_emitidas (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE SET NULL,
        numero_nfs_e VARCHAR(50),
        codigo_verificacao VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pendente',
        valor DECIMAL(10,2) NOT NULL,
        discriminacao TEXT,
        data_emissao TIMESTAMP,
        data_cancelamento TIMESTAMP,
        xml_nfs_e TEXT,
        link_visualizacao TEXT,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Adicionar campos de endereço na tabela pacientes se não existirem
    await query(`
      ALTER TABLE pacientes 
      ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
      ADD COLUMN IF NOT EXISTS numero_endereco VARCHAR(20),
      ADD COLUMN IF NOT EXISTS complemento VARCHAR(100)
    `);
    
    console.log('✅ Tabelas NFS-e criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas NFS-e:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('🔄 Removendo tabelas NFS-e...');
    
    await query('DROP TABLE IF EXISTS nfs_e_emitidas');
    await query('DROP TABLE IF EXISTS configuracoes_nfs_e');
    
    console.log('✅ Tabelas NFS-e removidas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao remover tabelas NFS-e:', error);
    throw error;
  }
}

module.exports = { up, down };



