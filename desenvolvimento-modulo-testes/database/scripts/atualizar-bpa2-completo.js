/**
 * Script para Atualizar Tabelas BPA-2 com campo valor_criterio
 * 
 * Este script:
 * 1. Adiciona o campo valor_criterio na tabela normas_bpa2
 * 2. Repopula todas as tabelas com o novo campo
 */

const fs = require('fs');
const path = require('path');

async function atualizarBPA2Completo() {
  let query;
  
  try {
    const dbConfig = require('../../backend/config/database');
    query = dbConfig.query;
    console.log('✅ Usando banco de dados do módulo isolado');
  } catch (e) {
    console.error('❌ Não foi possível carregar configuração do banco de dados');
    throw new Error('Configuração do banco não encontrada');
  }

  console.log('\n🚀 Iniciando atualização completa das tabelas BPA-2...\n');

  try {
    // 1. Executar script SQL de atualização do schema
    console.log('📋 Passo 1: Atualizando schema da tabela normas_bpa2...');
    const sqlPath = path.join(__dirname, '../schemas/08-bpa2-tables-update.sql');
    
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await query(sql);
      console.log('✅ Schema atualizado com sucesso');
    } else {
      console.warn('⚠️ Arquivo SQL não encontrado. Executando comandos diretamente...');
      
      // Adicionar coluna se não existir
      await query(`
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'normas_bpa2' AND column_name = 'valor_criterio'
            ) THEN
                ALTER TABLE normas_bpa2 ADD COLUMN valor_criterio VARCHAR(50);
            END IF;
        END $$;
      `);
      
      // Criar índice
      await query(`
        CREATE INDEX IF NOT EXISTS idx_normas_bpa2_criterio 
        ON normas_bpa2(tabela_id, tipo_atencao, valor_criterio);
      `);
      
      console.log('✅ Campo valor_criterio adicionado');
    }

    // 2. Limpar tabelas existentes (opcional - comentado para segurança)
    // console.log('\n📋 Passo 2: Limpando normas existentes...');
    // await query('DELETE FROM normas_bpa2');
    // console.log('✅ Normas limpas');

    // 3. Repopular tabelas usando o script completo
    console.log('\n📋 Passo 2: Repopulando tabelas com valor_criterio...');
    const popularScript = require('./06-popular-tabelas-bpa2-completo');
    await popularScript.popularTabelasBPA2Completo(query);
    
    console.log('\n✅ Atualização completa concluída com sucesso!');
    console.log('\n📊 Próximos passos:');
    console.log('   1. Teste o sistema selecionando uma tabela e uma idade/escolaridade');
    console.log('   2. Verifique se os percentis e classificações aparecem corretamente');
    console.log('   3. Se ainda houver problemas, verifique os logs do servidor');
    
  } catch (error) {
    console.error('\n❌ Erro durante atualização:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  atualizarBPA2Completo()
    .then(() => {
      console.log('\n✅ Script concluído');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { atualizarBPA2Completo };


