const { query } = require('../../config/database');

async function addTipoTransitoField() {
  try {
    console.log('🔧 Adicionando campo tipo_transito na tabela agendamentos...');

    // Adicionar coluna tipo_transito
    await query(`
      ALTER TABLE agendamentos 
      ADD COLUMN IF NOT EXISTS tipo_transito VARCHAR(100)
    `);

    // Adicionar coluna contexto
    await query(`
      ALTER TABLE agendamentos 
      ADD COLUMN IF NOT EXISTS contexto VARCHAR(100)
    `);

    console.log('✅ Campos adicionados com sucesso!');
    console.log('📋 Novos campos:');
    console.log('  • contexto: Trânsito/Clínico/Organizacional');
    console.log('  • tipo_transito: Renovação/1ª Habilitação/etc');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

addTipoTransitoField();

