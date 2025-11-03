const { query } = require('../../config/database');

async function removeLaudoUniqueConstraint() {
  try {
    console.log('🔧 Iniciando migration: Remover constraint UNIQUE do numero_laudo...\n');

    // 1. Remover a constraint UNIQUE do numero_laudo
    console.log('1. Removendo constraint UNIQUE do numero_laudo...');
    await query(`
      ALTER TABLE avaliacoes 
      DROP CONSTRAINT IF EXISTS avaliacoes_numero_laudo_key
    `);
    console.log('   ✅ Constraint removida\n');

    // 2. Adicionar index para performance (não unique)
    console.log('2. Adicionando index (não unique) para numero_laudo...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_avaliacoes_numero_laudo 
      ON avaliacoes(numero_laudo)
    `);
    console.log('   ✅ Index criado\n');

    // 3. Adicionar index composto para buscar avaliações por paciente e laudo
    console.log('3. Adicionando index composto paciente_id + numero_laudo...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_avaliacoes_paciente_laudo 
      ON avaliacoes(paciente_id, numero_laudo)
    `);
    console.log('   ✅ Index composto criado\n');

    // 4. Adicionar index para ordenação por data
    console.log('4. Adicionando index para data_aplicacao...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_avaliacoes_data_aplicacao 
      ON avaliacoes(data_aplicacao DESC)
    `);
    console.log('   ✅ Index de data criado\n');

    console.log('🎉 Migration concluída com sucesso!\n');
    console.log('📋 Agora é possível ter múltiplas avaliações com o mesmo número de laudo');
    console.log('   Exemplo: LAU-2025-0013 pode ter:');
    console.log('   - Avaliação 1: 17/10/2025 - Testes: Memória + Atenção');
    console.log('   - Avaliação 2: 20/10/2025 - Testes: Memória + Inteligência\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migration:', error);
    process.exit(1);
  }
}

removeLaudoUniqueConstraint();

