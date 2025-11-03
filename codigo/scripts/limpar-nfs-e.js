const { query } = require('../config/database');

async function limparNfsE() {
  try {
    console.log('🧹 Iniciando limpeza de dados NFS-e...\n');

    // Limpar NFS-e emitidas
    console.log('1. Limpando tabela nfs_e_emitidas...');
    const resultNfsEmitidas = await query('DELETE FROM nfs_e_emitidas');
    console.log(`   ✅ ${resultNfsEmitidas.rowCount} registro(s) removido(s) de nfs_e_emitidas\n`);

    // Limpar dados NFS-e dos pacientes
    console.log('2. Limpando dados NFS-e dos pacientes...');
    const resultPacientes = await query(`
      UPDATE pacientes 
      SET 
        nfs_numero = NULL,
        nfs_forma_pagamento = NULL,
        nfs_valor = NULL,
        nfs_valor_dinheiro = NULL,
        nfs_valor_pix = NULL,
        updated_at = CURRENT_TIMESTAMP
    `);
    console.log(`   ✅ ${resultPacientes.rowCount} paciente(s) atualizado(s)\n`);

    console.log('✅ Limpeza concluída com sucesso!');
    console.log('\n📋 Resumo:');
    console.log('   • NFS-e emitidas: LIMPAS');
    console.log('   • Dados NFS-e dos pacientes: LIMPOS');
    console.log('\n⚠️  Nota: As configurações NFS-e não foram removidas.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar dados NFS-e:', error);
    process.exit(1);
  }
}

// Executar
limparNfsE();

