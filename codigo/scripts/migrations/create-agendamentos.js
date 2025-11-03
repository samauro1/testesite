const { query } = require('../../config/database');

async function createAgendamentosTable() {
  try {
    console.log('📅 Criando tabela de agendamentos...');

    await query(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id SERIAL PRIMARY KEY,
        paciente_id INTEGER REFERENCES pacientes(id) ON DELETE SET NULL,
        nome VARCHAR(255) NOT NULL,
        cpf VARCHAR(14),
        telefone VARCHAR(20),
        email VARCHAR(255),
        data_agendamento TIMESTAMP NOT NULL,
        tipo_avaliacao VARCHAR(100),
        observacoes TEXT,
        status VARCHAR(50) DEFAULT 'agendado',
        convertido_em_paciente BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar índices
    await query(`
      CREATE INDEX IF NOT EXISTS idx_agendamentos_paciente_id 
      ON agendamentos(paciente_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_agendamentos_data 
      ON agendamentos(data_agendamento);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_agendamentos_status 
      ON agendamentos(status);
    `);

    console.log('✅ Tabela de agendamentos criada com sucesso!');
    console.log('📋 Campos criados:');
    console.log('  • id: Identificador único');
    console.log('  • paciente_id: Vínculo com paciente (opcional)');
    console.log('  • nome: Nome da pessoa (obrigatório)');
    console.log('  • cpf, telefone, email: Dados de contato');
    console.log('  • data_agendamento: Data e hora do agendamento');
    console.log('  • tipo_avaliacao: Tipo de avaliação agendada');
    console.log('  • observacoes: Notas sobre o agendamento');
    console.log('  • status: agendado, confirmado, realizado, cancelado');
    console.log('  • convertido_em_paciente: Se foi criado paciente a partir do agendamento');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    process.exit(1);
  }
}

createAgendamentosTable();

