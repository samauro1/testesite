const { query } = require('../config/database');

async function fixProfilesMigration() {
  try {
    console.log('🔄 Executando migração de correção de perfis...');
    
    // 1. Adicionar constraint para garantir perfis válidos
    console.log('📋 Adicionando constraint para perfis válidos...');
    
    await query(`
      ALTER TABLE usuarios 
      ADD CONSTRAINT check_perfil_valido 
      CHECK (perfil IN ('administrador', 'psicologo', 'psicologo_externo', 'recepcionista', 'estagiario'))
    `);
    
    console.log('✅ Constraint de perfis válidos adicionada');
    
    // 2. Definir perfil padrão para usuários sem perfil
    console.log('🔧 Definindo perfil padrão para usuários sem perfil...');
    
    await query(`
      UPDATE usuarios 
      SET perfil = 'psicologo' 
      WHERE perfil IS NULL OR perfil = ''
    `);
    
    console.log('✅ Perfil padrão definido');
    
    // 3. Adicionar valor padrão para a coluna perfil
    console.log('⚙️ Adicionando valor padrão para coluna perfil...');
    
    await query(`
      ALTER TABLE usuarios 
      ALTER COLUMN perfil SET DEFAULT 'psicologo'
    `);
    
    console.log('✅ Valor padrão adicionado');
    
    // 4. Verificar resultado
    console.log('🔍 Verificando resultado...');
    
    const result = await query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN perfil = 'administrador' THEN 1 END) as administradores,
             COUNT(CASE WHEN perfil = 'psicologo' THEN 1 END) as psicologos,
             COUNT(CASE WHEN perfil = 'psicologo_externo' THEN 1 END) as psicologos_externos,
             COUNT(CASE WHEN perfil = 'recepcionista' THEN 1 END) as recepcionistas,
             COUNT(CASE WHEN perfil = 'estagiario' THEN 1 END) as estagiarios
      FROM usuarios
    `);
    
    const stats = result.rows[0];
    console.log('\n📊 Estatísticas de perfis:');
    console.log(`- Total de usuários: ${stats.total}`);
    console.log(`- Administradores: ${stats.administradores}`);
    console.log(`- Psicólogos: ${stats.psicologos}`);
    console.log(`- Psicólogos Externos: ${stats.psicologos_externos}`);
    console.log(`- Recepcionistas: ${stats.recepcionistas}`);
    console.log(`- Estagiários: ${stats.estagiarios}`);
    
    console.log('\n✅ Migração de perfis concluída com sucesso!');
    process.exit(0);
    
  } catch (error) {
    if (error.code === '23514') {
      console.log('⚠️ Constraint já existe, pulando...');
      console.log('✅ Migração já foi executada anteriormente');
      process.exit(0);
    } else {
      console.error('❌ Erro na migração:', error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  fixProfilesMigration();
}

module.exports = { fixProfilesMigration };
