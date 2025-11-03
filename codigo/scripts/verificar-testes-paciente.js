const { query } = require('../config/database');

async function verificarTestesPaciente() {
  try {
    const nomePaciente = 'GILVANIA VIEIRA DA SILVA';
    
    console.log(`🔍 Verificando testes para: ${nomePaciente}\n`);

    // 1. Buscar paciente
    const pacienteResult = await query(
      'SELECT id, nome, cpf FROM pacientes WHERE nome ILIKE $1',
      [`%${nomePaciente}%`]
    );
    
    if (pacienteResult.rows.length === 0) {
      console.log('❌ Paciente não encontrado!');
      process.exit(1);
    }
    
    const paciente = pacienteResult.rows[0];
    console.log(`✅ Paciente encontrado:`);
    console.log(`   ID: ${paciente.id}`);
    console.log(`   Nome: ${paciente.nome}`);
    console.log(`   CPF: ${paciente.cpf}\n`);

    // 2. Buscar avaliações do paciente
    const avaliacoes = await query(
      'SELECT id, numero_laudo, data_aplicacao, created_at FROM avaliacoes WHERE paciente_id = $1 ORDER BY created_at DESC',
      [paciente.id]
    );
    
    console.log(`📋 Avaliações encontradas: ${avaliacoes.rows.length}`);
    avaliacoes.rows.forEach(av => {
      console.log(`   - Avaliação ID: ${av.id}, Laudo: ${av.numero_laudo}, Data: ${av.data_aplicacao}`);
    });
    console.log('');

    // 3. Verificar testes por tipo
    const tiposTestes = [
      { tabela: 'resultados_memore', nome: 'MEMORE' },
      { tabela: 'resultados_ac', nome: 'AC' },
      { tabela: 'resultados_mig', nome: 'MIG' },
      { tabela: 'resultados_r1', nome: 'R-1' },
      { tabela: 'resultados_mvt', nome: 'MVT' },
      { tabela: 'resultados_beta_iii', nome: 'BETA-III' },
      { tabela: 'resultados_bpa2', nome: 'BPA2' },
      { tabela: 'resultados_rotas', nome: 'ROTAS' },
      { tabela: 'resultados_palografico', nome: 'Palográfico' }
    ];

    console.log('🧪 Testes encontrados por tipo:');
    for (const avaliacao of avaliacoes.rows) {
      console.log(`\n   Para Avaliação ID ${avaliacao.id} (Laudo: ${avaliacao.numero_laudo}):`);
      
      for (const tipo of tiposTestes) {
        try {
          // Primeiro verificar se existe algum resultado
          const countResult = await query(
            `SELECT COUNT(*) as total FROM ${tipo.tabela} WHERE avaliacao_id = $1`,
            [avaliacao.id]
          );
          
          const total = parseInt(countResult.rows[0].total);
          
          if (total > 0) {
            console.log(`      ✅ ${tipo.nome}: ${total} resultado(s)`);
            // Mostrar dados do primeiro resultado
            const primeiroResultado = await query(
              `SELECT * FROM ${tipo.tabela} WHERE avaliacao_id = $1 ORDER BY created_at DESC LIMIT 1`,
              [avaliacao.id]
            );
            if (primeiroResultado.rows.length > 0) {
              const dados = primeiroResultado.rows[0];
              console.log(`         ID: ${dados.id}, Created: ${dados.created_at}`);
              if (dados.acertos !== undefined) console.log(`         Acertos: ${dados.acertos}`);
              if (dados.resultado_final !== undefined) console.log(`         Resultado Final: ${dados.resultado_final}`);
              if (dados.percentil !== undefined) console.log(`         Percentil: ${dados.percentil}`);
              if (dados.classificacao !== undefined) console.log(`         Classificação: ${dados.classificacao}`);
            }
          } else {
            console.log(`      ❌ ${tipo.nome}: Nenhum resultado encontrado`);
          }
        } catch (err) {
          // Tabela pode não existir ou erro
          if (!err.message.includes('does not exist')) {
            console.log(`      ⚠️ ${tipo.nome}: Erro - ${err.message}`);
          }
        }
      }
    }

    // 4. Verificar se há testes sem avaliação (problema de vinculação)
    console.log('\n\n🔍 Verificando se há testes órfãos (sem avaliacao_id válido):');
    for (const tipo of tiposTestes) {
      try {
        const result = await query(
          `SELECT COUNT(*) as total FROM ${tipo.tabela} WHERE avaliacao_id IS NULL OR avaliacao_id NOT IN (SELECT id FROM avaliacoes WHERE paciente_id = $1)`,
          [paciente.id]
        );
        if (result.rows[0].total > 0) {
          console.log(`   ⚠️ ${tipo.nome}: ${result.rows[0].total} teste(s) órfão(s)`);
        }
      } catch (err) {
        // Ignorar erros de tabela não existente
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar testes:', error);
  } finally {
    process.exit(0);
  }
}

verificarTestesPaciente();

