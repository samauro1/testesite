const { query } = require('../../config/database');

async function addTelefoneSeparado() {
  try {
    console.log('🔄 Adicionando colunas telefone_fixo e telefone_celular...');
    
    // Verificar se as colunas já existem
    const checkColumns = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pacientes' 
      AND column_name IN ('telefone_fixo', 'telefone_celular')
    `);
    
    const existingColumns = checkColumns.rows.map(r => r.column_name);
    
    // Adicionar telefone_fixo se não existir
    if (!existingColumns.includes('telefone_fixo')) {
      await query(`
        ALTER TABLE pacientes 
        ADD COLUMN telefone_fixo VARCHAR(20)
      `);
      console.log('✅ Coluna telefone_fixo adicionada');
    } else {
      console.log('ℹ️  Coluna telefone_fixo já existe');
    }
    
    // Adicionar telefone_celular se não existir
    if (!existingColumns.includes('telefone_celular')) {
      await query(`
        ALTER TABLE pacientes 
        ADD COLUMN telefone_celular VARCHAR(20)
      `);
      console.log('✅ Coluna telefone_celular adicionada');
    } else {
      console.log('ℹ️  Coluna telefone_celular já existe');
    }
    
    // Migrar dados do campo telefone antigo para os novos campos
    console.log('🔄 Migrando dados do campo telefone...');
    
    const pacientes = await query(`
      SELECT id, telefone 
      FROM pacientes 
      WHERE telefone IS NOT NULL AND telefone != ''
    `);
    
    const { processarTelefones } = require('../../utils/phoneUtils');
    
    for (const paciente of pacientes.rows) {
      const telefonesProcessados = processarTelefones(paciente.telefone);
      
      if (telefonesProcessados.telefone_fixo || telefonesProcessados.telefone_celular) {
        await query(`
          UPDATE pacientes 
          SET telefone_fixo = $1, telefone_celular = $2
          WHERE id = $3
        `, [
          telefonesProcessados.telefone_fixo,
          telefonesProcessados.telefone_celular,
          paciente.id
        ]);
      }
    }
    
    console.log(`✅ ${pacientes.rows.length} registros migrados`);
    console.log('✅ Migração concluída!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

addTelefoneSeparado();

