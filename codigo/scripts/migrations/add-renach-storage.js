const { query } = require('../../config/database');

async function up() {
  console.log('Adicionando suporte para armazenamento de arquivos RENACH...');
  
  // Adicionar colunas na tabela pacientes para arquivo RENACH e foto
  await query(`
    ALTER TABLE pacientes 
    ADD COLUMN IF NOT EXISTS renach_arquivo TEXT,
    ADD COLUMN IF NOT EXISTS renach_foto TEXT,
    ADD COLUMN IF NOT EXISTS renach_data_upload TIMESTAMP
  `);
  
  console.log('✅ Colunas RENACH adicionadas com sucesso!');
  
  // Adicionar colunas nas avaliações para anexos
  await query(`
    ALTER TABLE avaliacoes 
    ADD COLUMN IF NOT EXISTS renach_anexo TEXT,
    ADD COLUMN IF NOT EXISTS documentos_anexos TEXT[]
  `);
  
  console.log('✅ Colunas de anexos nas avaliações adicionadas!');
}

async function down() {
  console.log('Removendo colunas de RENACH...');
  
  await query(`
    ALTER TABLE pacientes 
    DROP COLUMN IF EXISTS renach_arquivo,
    DROP COLUMN IF EXISTS renach_foto,
    DROP COLUMN IF EXISTS renach_data_upload
  `);
  
  await query(`
    ALTER TABLE avaliacoes 
    DROP COLUMN IF EXISTS renach_anexo,
    DROP COLUMN IF EXISTS documentos_anexos
  `);
  
  console.log('✅ Colunas RENACH removidas!');
}

module.exports = { up, down };

// Executar se chamado diretamente
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migração concluída!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Erro na migração:', err);
      process.exit(1);
    });
}

