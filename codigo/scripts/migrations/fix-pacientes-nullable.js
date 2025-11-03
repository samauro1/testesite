const { query } = require('../../config/database');

async function fixNullableFields() {
  try {
    console.log('🔧 Removendo restrições NOT NULL de campos opcionais...');

    // Tornar escolaridade, contexto, tipo_transito nullable
    await query(`
      ALTER TABLE pacientes 
      ALTER COLUMN escolaridade DROP NOT NULL
    `);
    console.log('✅ escolaridade agora é nullable');

    await query(`
      ALTER TABLE pacientes 
      ALTER COLUMN contexto DROP NOT NULL
    `);
    console.log('✅ contexto agora é nullable');

    await query(`
      ALTER TABLE pacientes 
      ALTER COLUMN tipo_transito DROP NOT NULL
    `);
    console.log('✅ tipo_transito agora é nullable');

    console.log('✅ Todas as restrições removidas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    // Se der erro "column ... does not exist", pode ser que já esteja nullable
    if (error.message.includes('does not exist')) {
      console.log('ℹ️ Coluna pode já estar nullable ou não ter restrição');
    }
    process.exit(1);
  }
}

fixNullableFields();

