const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // 1. Criar usuário padrão
    console.log('👤 Criando usuário padrão...');
    const existingUser = await query('SELECT id FROM usuarios WHERE email = $1', ['admin@teste.com']);
    
    if (existingUser.rows.length === 0) {
      const senhaHash = await bcrypt.hash('123456', 12);
      const userResult = await query(
        'INSERT INTO usuarios (nome, email, senha_hash, ativo) VALUES ($1, $2, $3, $4) RETURNING id',
        ['Administrador', 'admin@teste.com', senhaHash, true]
      );
      console.log('✅ Usuário padrão criado:', userResult.rows[0].id);
    } else {
      console.log('✅ Usuário padrão já existe');
    }

    // 2. Popular tabelas normativas básicas
    console.log('📊 Criando tabelas normativas...');
    
    // Verificar se já existem tabelas
    const existingTables = await query('SELECT COUNT(*) as count FROM tabelas_normativas');
    if (existingTables.rows[0].count > 0) {
      console.log('✅ Tabelas normativas já existem');
    } else {
      // Criar tabelas básicas para cada teste
      const tabelas = [
        { nome: 'AC - Atenção Concentrada', tipo: 'ac', criterio: 'Escolaridade' },
        { nome: 'BETA-III - Raciocínio Matricial', tipo: 'beta-iii', criterio: 'Geral' },
        { nome: 'BPA-2 - Atenção Sustentada', tipo: 'bpa2', criterio: 'Geral' },
        { nome: 'BPA-2 - Atenção Alternada', tipo: 'bpa2', criterio: 'Geral' },
        { nome: 'BPA-2 - Atenção Dividida', tipo: 'bpa2', criterio: 'Geral' },
        { nome: 'Rotas - Rota A', tipo: 'rotas', criterio: 'Geral' },
        { nome: 'Rotas - Rota D', tipo: 'rotas', criterio: 'Geral' },
        { nome: 'Rotas - Rota C', tipo: 'rotas', criterio: 'Geral' },
        { nome: 'MIG - Geral', tipo: 'mig', criterio: 'Geral' },
        { nome: 'MVT - Memória Visual', tipo: 'mvt', criterio: 'Geral' },
        { nome: 'R-1 - Raciocínio', tipo: 'r1', criterio: 'Escolaridade' },
        { nome: 'MEMORE - Geral', tipo: 'memore', criterio: 'Geral' }
      ];

      for (const tabela of tabelas) {
        await query(
          'INSERT INTO tabelas_normativas (nome, tipo, versao, criterio, descricao, ativa) VALUES ($1, $2, $3, $4, $5, $6)',
          [tabela.nome, tabela.tipo, '1.0', tabela.criterio, 'Tabela normativa padrão', true]
        );
      }
      console.log('✅ Tabelas normativas criadas');
    }

    // 3. Popular algumas normas básicas para teste
    console.log('📋 Criando normas básicas...');
    
    // Normas para AC
    const acTable = await query("SELECT id FROM tabelas_normativas WHERE tipo = 'ac' LIMIT 1");
    if (acTable.rows.length > 0) {
      const acTableId = acTable.rows[0].id;
      const acNormas = [
        { percentil: 95, classificacao: 'Superior', fundamental_min: 40, fundamental_max: 50, medio_min: 35, medio_max: 50, superior_min: 30, superior_max: 50 },
        { percentil: 75, classificacao: 'Médio Superior', fundamental_min: 30, fundamental_max: 39, medio_min: 25, medio_max: 34, superior_min: 20, superior_max: 29 },
        { percentil: 50, classificacao: 'Médio', fundamental_min: 20, fundamental_max: 29, medio_min: 15, medio_max: 24, superior_min: 10, superior_max: 19 },
        { percentil: 25, classificacao: 'Médio Inferior', fundamental_min: 10, fundamental_max: 19, medio_min: 5, medio_max: 14, superior_min: 0, superior_max: 9 },
        { percentil: 5, classificacao: 'Inferior', fundamental_min: 0, fundamental_max: 9, medio_min: 0, medio_max: 4, superior_min: 0, superior_max: 0 }
      ];

      for (const norma of acNormas) {
        await query(
          'INSERT INTO normas_ac (tabela_id, percentil, classificacao, fundamental_min, fundamental_max, medio_min, medio_max, superior_min, superior_max) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [acTableId, norma.percentil, norma.classificacao, norma.fundamental_min, norma.fundamental_max, norma.medio_min, norma.medio_max, norma.superior_min, norma.superior_max]
        );
      }
      console.log('✅ Normas AC criadas');
    }

    // Normas para BETA-III
    const betaTable = await query("SELECT id FROM tabelas_normativas WHERE tipo = 'beta-iii' LIMIT 1");
    if (betaTable.rows.length > 0) {
      const betaTableId = betaTable.rows[0].id;
      const betaNormas = [
        { acertos_min: 20, acertos_max: 25, percentil: 95, classificacao: 'Superior' },
        { acertos_min: 15, acertos_max: 19, percentil: 75, classificacao: 'Médio Superior' },
        { acertos_min: 10, acertos_max: 14, percentil: 50, classificacao: 'Médio' },
        { acertos_min: 5, acertos_max: 9, percentil: 25, classificacao: 'Médio Inferior' },
        { acertos_min: 0, acertos_max: 4, percentil: 5, classificacao: 'Inferior' }
      ];

      for (const norma of betaNormas) {
        await query(
          'INSERT INTO normas_beta_iii (tabela_id, acertos_min, acertos_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
          [betaTableId, norma.acertos_min, norma.acertos_max, norma.percentil, norma.classificacao]
        );
      }
      console.log('✅ Normas BETA-III criadas');
    }

    // Normas para MEMORE
    const memoreTable = await query("SELECT id FROM tabelas_normativas WHERE tipo = 'memore' LIMIT 1");
    if (memoreTable.rows.length > 0) {
      const memoreTableId = memoreTable.rows[0].id;
      const memoreNormas = [
        { resultado_min: 20, resultado_max: 24, percentil: 95, classificacao: 'Superior' },
        { resultado_min: 15, resultado_max: 19, percentil: 75, classificacao: 'Médio Superior' },
        { resultado_min: 10, resultado_max: 14, percentil: 50, classificacao: 'Médio' },
        { resultado_min: 5, resultado_max: 9, percentil: 25, classificacao: 'Médio Inferior' },
        { resultado_min: 0, resultado_max: 4, percentil: 5, classificacao: 'Inferior' }
      ];

      for (const norma of memoreNormas) {
        await query(
          'INSERT INTO normas_memore (tabela_id, resultado_min, resultado_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5)',
          [memoreTableId, norma.resultado_min, norma.resultado_max, norma.percentil, norma.classificacao]
        );
      }
      console.log('✅ Normas MEMORE criadas');
    }

    // 4. Criar alguns pacientes de exemplo
    console.log('👥 Criando pacientes de exemplo...');
    const existingPatients = await query('SELECT COUNT(*) as count FROM pacientes');
    if (existingPatients.rows[0].count === 0) {
      const pacientes = [
        { nome: 'João Silva', cpf: '123.456.789-00', data_nascimento: '1990-05-15', telefone: '(11) 99999-9999', email: 'joao@email.com' },
        { nome: 'Maria Santos', cpf: '987.654.321-00', data_nascimento: '1985-08-22', telefone: '(11) 88888-8888', email: 'maria@email.com' },
        { nome: 'Pedro Oliveira', cpf: '456.789.123-00', data_nascimento: '1992-12-10', telefone: '(11) 77777-7777', email: 'pedro@email.com' }
      ];

      for (const paciente of pacientes) {
        await query(
          'INSERT INTO pacientes (nome, cpf, data_nascimento, telefone, email) VALUES ($1, $2, $3, $4, $5)',
          [paciente.nome, paciente.cpf, paciente.data_nascimento, paciente.telefone, paciente.email]
        );
      }
      console.log('✅ Pacientes de exemplo criados');
    } else {
      console.log('✅ Pacientes já existem');
    }

    console.log('🎉 Seed do banco de dados concluído com sucesso!');
    console.log('📝 Credenciais de acesso:');
    console.log('   Email: admin@teste.com');
    console.log('   Senha: 123456');

  } catch (error) {
    console.error('❌ Erro no seed do banco de dados:', error);
  } finally {
    process.exit(0);
  }
}

seedDatabase();

