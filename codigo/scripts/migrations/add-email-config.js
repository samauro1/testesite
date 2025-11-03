const { query } = require('../../config/database');

async function up() {
  console.log('Criando tabela de configurações de e-mail...');
  
  // Criar tabela para configurações de e-mail por usuário
  await query(`
    CREATE TABLE IF NOT EXISTS configuracoes_email (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      smtp_host VARCHAR(255),
      smtp_port INTEGER DEFAULT 587,
      smtp_secure BOOLEAN DEFAULT false,
      smtp_usuario VARCHAR(255),
      smtp_senha TEXT,
      email_remetente VARCHAR(255),
      nome_remetente VARCHAR(255),
      email_copia VARCHAR(255),
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(usuario_id)
    )
  `);
  
  console.log('✅ Tabela configuracoes_email criada com sucesso!');
}

async function down() {
  console.log('Removendo tabela de configurações de e-mail...');
  
  await query(`
    DROP TABLE IF EXISTS configuracoes_email
  `);
  
  console.log('✅ Tabela configuracoes_email removida!');
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

