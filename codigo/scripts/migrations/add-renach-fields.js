const { query } = require('../../config/database');

async function up() {
  try {
    console.log('🔄 Adicionando campos RENACH à tabela pacientes...');
    
    // Adicionar colunas para dados extraídos do RENACH
    await query(`
      ALTER TABLE pacientes 
      ADD COLUMN IF NOT EXISTS numero_renach VARCHAR(20),
      ADD COLUMN IF NOT EXISTS sexo VARCHAR(20),
      ADD COLUMN IF NOT EXISTS categoria_cnh VARCHAR(10),
      ADD COLUMN IF NOT EXISTS nome_pai VARCHAR(255),
      ADD COLUMN IF NOT EXISTS nome_mae VARCHAR(255),
      ADD COLUMN IF NOT EXISTS naturalidade VARCHAR(100),
      ADD COLUMN IF NOT EXISTS nacionalidade VARCHAR(50),
      ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(20),
      ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(50),
      ADD COLUMN IF NOT EXISTS orgao_expedidor VARCHAR(20),
      ADD COLUMN IF NOT EXISTS uf_documento VARCHAR(2),
      ADD COLUMN IF NOT EXISTS logradouro VARCHAR(255),
      ADD COLUMN IF NOT EXISTS numero_endereco VARCHAR(20),
      ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
      ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
      ADD COLUMN IF NOT EXISTS municipio VARCHAR(100),
      ADD COLUMN IF NOT EXISTS codigo_municipio VARCHAR(10),
      ADD COLUMN IF NOT EXISTS atividade_remunerada BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS resultado_exame VARCHAR(20),
      ADD COLUMN IF NOT EXISTS data_exame DATE,
      ADD COLUMN IF NOT EXISTS numero_laudo_renach VARCHAR(20),
      ADD COLUMN IF NOT EXISTS crp_renach VARCHAR(20),
      ADD COLUMN IF NOT EXISTS credenciado_renach VARCHAR(20),
      ADD COLUMN IF NOT EXISTS regiao_renach VARCHAR(10)
    `);
    
    console.log('✅ Campos RENACH adicionados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar campos RENACH:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('🔄 Removendo campos RENACH da tabela pacientes...');
    
    await query(`
      ALTER TABLE pacientes 
      DROP COLUMN IF EXISTS numero_renach,
      DROP COLUMN IF EXISTS sexo,
      DROP COLUMN IF EXISTS categoria_cnh,
      DROP COLUMN IF EXISTS nome_pai,
      DROP COLUMN IF EXISTS nome_mae,
      DROP COLUMN IF EXISTS naturalidade,
      DROP COLUMN IF EXISTS nacionalidade,
      DROP COLUMN IF EXISTS tipo_documento,
      DROP COLUMN IF EXISTS numero_documento,
      DROP COLUMN IF EXISTS orgao_expedidor,
      DROP COLUMN IF EXISTS uf_documento,
      DROP COLUMN IF EXISTS logradouro,
      DROP COLUMN IF EXISTS numero_endereco,
      DROP COLUMN IF EXISTS bairro,
      DROP COLUMN IF EXISTS cep,
      DROP COLUMN IF EXISTS municipio,
      DROP COLUMN IF EXISTS codigo_municipio,
      DROP COLUMN IF EXISTS atividade_remunerada,
      DROP COLUMN IF EXISTS resultado_exame,
      DROP COLUMN IF EXISTS data_exame,
      DROP COLUMN IF EXISTS numero_laudo_renach,
      DROP COLUMN IF EXISTS crp_renach,
      DROP COLUMN IF EXISTS credenciado_renach,
      DROP COLUMN IF EXISTS regiao_renach
    `);
    
    console.log('✅ Campos RENACH removidos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao remover campos RENACH:', error);
    throw error;
  }
}

module.exports = { up, down };




