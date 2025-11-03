const { query } = require('../../config/database');

async function runMigration() {
  try {
    console.log('🔄 Iniciando migração: Sistema de Permissões de Usuários...');

    // 1. Adicionar coluna 'perfil' na tabela usuarios
    console.log('📝 Adicionando coluna perfil...');
    await query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS perfil VARCHAR(50) DEFAULT 'psicologo';
    `);
    console.log('✅ Coluna perfil adicionada!');

    // 2. Adicionar coluna 'ativo' se não existir
    console.log('📝 Verificando coluna ativo...');
    await query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
    `);
    console.log('✅ Coluna ativo verificada!');

    // 3. Criar tabela de permissões
    console.log('📝 Criando tabela de permissões...');
    await query(`
      CREATE TABLE IF NOT EXISTS permissoes (
        id SERIAL PRIMARY KEY,
        perfil VARCHAR(50) NOT NULL,
        recurso VARCHAR(100) NOT NULL,
        pode_visualizar BOOLEAN DEFAULT false,
        pode_criar BOOLEAN DEFAULT false,
        pode_editar BOOLEAN DEFAULT false,
        pode_excluir BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(perfil, recurso)
      );
    `);
    console.log('✅ Tabela permissoes criada!');

    // 4. Inserir permissões padrão
    console.log('📝 Inserindo permissões padrão...');
    
    const permissoesPadrao = [
      // ADMINISTRADOR - Acesso total
      { perfil: 'administrador', recurso: 'pacientes', visualizar: true, criar: true, editar: true, excluir: true },
      { perfil: 'administrador', recurso: 'avaliacoes', visualizar: true, criar: true, editar: true, excluir: true },
      { perfil: 'administrador', recurso: 'testes', visualizar: true, criar: true, editar: true, excluir: true },
      { perfil: 'administrador', recurso: 'estoque', visualizar: true, criar: true, editar: true, excluir: true },
      { perfil: 'administrador', recurso: 'relatorios', visualizar: true, criar: true, editar: true, excluir: true },
      { perfil: 'administrador', recurso: 'configuracoes', visualizar: true, criar: true, editar: true, excluir: true },
      { perfil: 'administrador', recurso: 'usuarios', visualizar: true, criar: true, editar: true, excluir: true },
      
      // PSICÓLOGO - Acesso a pacientes, avaliações e testes
      { perfil: 'psicologo', recurso: 'pacientes', visualizar: true, criar: true, editar: true, excluir: false },
      { perfil: 'psicologo', recurso: 'avaliacoes', visualizar: true, criar: true, editar: true, excluir: false },
      { perfil: 'psicologo', recurso: 'testes', visualizar: true, criar: true, editar: true, excluir: false },
      { perfil: 'psicologo', recurso: 'estoque', visualizar: true, criar: false, editar: false, excluir: false },
      { perfil: 'psicologo', recurso: 'relatorios', visualizar: true, criar: true, editar: false, excluir: false },
      { perfil: 'psicologo', recurso: 'configuracoes', visualizar: true, criar: false, editar: true, excluir: false },
      { perfil: 'psicologo', recurso: 'usuarios', visualizar: false, criar: false, editar: false, excluir: false },
      
      // RECEPCIONISTA - Acesso a pacientes e agendamentos
      { perfil: 'recepcionista', recurso: 'pacientes', visualizar: true, criar: true, editar: true, excluir: false },
      { perfil: 'recepcionista', recurso: 'avaliacoes', visualizar: true, criar: true, editar: false, excluir: false },
      { perfil: 'recepcionista', recurso: 'testes', visualizar: false, criar: false, editar: false, excluir: false },
      { perfil: 'recepcionista', recurso: 'estoque', visualizar: true, criar: false, editar: false, excluir: false },
      { perfil: 'recepcionista', recurso: 'relatorios', visualizar: true, criar: false, editar: false, excluir: false },
      { perfil: 'recepcionista', recurso: 'configuracoes', visualizar: false, criar: false, editar: false, excluir: false },
      { perfil: 'recepcionista', recurso: 'usuarios', visualizar: false, criar: false, editar: false, excluir: false },
      
      // ESTAGIÁRIO - Acesso limitado
      { perfil: 'estagiario', recurso: 'pacientes', visualizar: true, criar: false, editar: false, excluir: false },
      { perfil: 'estagiario', recurso: 'avaliacoes', visualizar: true, criar: false, editar: false, excluir: false },
      { perfil: 'estagiario', recurso: 'testes', visualizar: true, criar: false, editar: false, excluir: false },
      { perfil: 'estagiario', recurso: 'estoque', visualizar: true, criar: false, editar: false, excluir: false },
      { perfil: 'estagiario', recurso: 'relatorios', visualizar: true, criar: false, editar: false, excluir: false },
      { perfil: 'estagiario', recurso: 'configuracoes', visualizar: false, criar: false, editar: false, excluir: false },
      { perfil: 'estagiario', recurso: 'usuarios', visualizar: false, criar: false, editar: false, excluir: false },
    ];

    for (const perm of permissoesPadrao) {
      await query(`
        INSERT INTO permissoes (perfil, recurso, pode_visualizar, pode_criar, pode_editar, pode_excluir)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (perfil, recurso) DO UPDATE
        SET pode_visualizar = $3, pode_criar = $4, pode_editar = $5, pode_excluir = $6
      `, [perm.perfil, perm.recurso, perm.visualizar, perm.criar, perm.editar, perm.excluir]);
    }
    console.log('✅ Permissões padrão inseridas!');

    // 5. Atualizar usuário existente para administrador
    console.log('📝 Atualizando usuário existente...');
    await query(`
      UPDATE usuarios 
      SET perfil = 'administrador'
      WHERE id = (SELECT id FROM usuarios LIMIT 1);
    `);
    console.log('✅ Primeiro usuário definido como administrador!');

    console.log('✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;

