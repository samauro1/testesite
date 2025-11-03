const { query } = require('../../config/database');

async function runMigration() {
  try {
    console.log('🔄 Iniciando migração: Configurações da Clínica...');

    // Criar tabela de configurações
    await query(`
      CREATE TABLE IF NOT EXISTS configuracoes_clinica (
        id SERIAL PRIMARY KEY,
        nome_clinica VARCHAR(255),
        cnpj VARCHAR(20),
        endereco TEXT,
        cidade VARCHAR(100),
        estado VARCHAR(2),
        cep VARCHAR(10),
        telefone VARCHAR(20),
        email VARCHAR(255),
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela configuracoes_clinica criada!');

    // Inserir registro padrão
    const result = await query('SELECT COUNT(*) FROM configuracoes_clinica');
    if (parseInt(result.rows[0].count) === 0) {
      await query(`
        INSERT INTO configuracoes_clinica (nome_clinica, cnpj, endereco, cidade, estado, cep, telefone, email)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'Clínica de Avaliação Psicológica',
        '12.345.678/0001-90',
        'Rua das Flores, 123',
        'São Paulo',
        'SP',
        '01234-567',
        '(11) 98765-4321',
        'contato@clinica.com'
      ]);
      console.log('✅ Configurações padrão inseridas!');
    }

    console.log('✅ Migração concluída!');
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

