const { query } = require('../../config/database');

async function addAvaliacaoIdColumn() {
  try {
    console.log('🔄 Iniciando migração: Adicionar avaliacao_id em movimentacoes_estoque...');

    // Adicionar coluna avaliacao_id
    await query(`
      ALTER TABLE movimentacoes_estoque 
      ADD COLUMN IF NOT EXISTS avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE SET NULL;
    `);
    console.log('✅ Coluna avaliacao_id adicionada com sucesso!');

    // Criar índice para melhor performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_movimentacoes_avaliacao 
      ON movimentacoes_estoque(avaliacao_id);
    `);
    console.log('✅ Índice criado com sucesso!');

    console.log('✅ Migração concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

addAvaliacaoIdColumn();

