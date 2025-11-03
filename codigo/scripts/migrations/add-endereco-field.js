const { query } = require('../../config/database');

async function addEnderecoField() {
  try {
    console.log('🔄 Iniciando migração: Adicionar campo endereco...');

    // Adicionar campo endereco se não existir
    await query(`
      ALTER TABLE pacientes 
      ADD COLUMN IF NOT EXISTS endereco VARCHAR(500);
    `);

    console.log('✅ Campo endereco adicionado com sucesso!');

    // Criar índice para o campo (opcional, para melhor performance em buscas)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_pacientes_endereco 
      ON pacientes(endereco);
    `);

    console.log('✅ Índice criado com sucesso!');
    console.log('✅ Migração concluída!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

addEnderecoField();

