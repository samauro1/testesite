const { query } = require('../../config/database');

async function addUserPhoto() {
  try {
    console.log('🔄 Adicionando campo foto_url na tabela usuarios...');

    await query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS foto_url TEXT;
    `);

    console.log('✅ Campo foto_url adicionado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar campo foto_url:', error);
    process.exit(1);
  }
}

addUserPhoto();

