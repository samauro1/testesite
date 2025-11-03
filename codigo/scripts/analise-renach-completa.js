const { query } = require('../config/database');

async function analisar() {
  console.log('🔍 ANÁLISE COMPLETA DO SISTEMA RENACH\n');
  console.log('='.repeat(80));
  
  // 1. Verificar colunas na tabela pacientes
  console.log('\n1️⃣ VERIFICANDO COLUNAS NA TABELA pacientes:');
  console.log('-'.repeat(80));
  try {
    const colunas = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pacientes' 
      AND column_name IN (
        'nome_pai', 'nome_mae', 'categoria_cnh', 'numero_laudo_renach', 
        'numero_laudo', 'data_primeira_habilitacao', 'data_exame', 
        'contexto', 'numero_endereco', 'tipo_processo'
      )
      ORDER BY column_name
    `);
    
    if (colunas.rows.length === 0) {
      console.log('  ❌ NENHUMA COLUNA ENCONTRADA - colunas críticas podem estar faltando!');
    } else {
      console.log(`  ✅ ${colunas.rows.length} coluna(s) encontrada(s):`);
      colunas.rows.forEach(c => {
        console.log(`     - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
      });
    }
  } catch (error) {
    console.error('  ❌ Erro ao verificar colunas:', error.message);
  }
  
  // 2. Verificar se existe uma coluna tipo_processo
  console.log('\n2️⃣ VERIFICANDO COLUNA tipo_processo:');
  console.log('-'.repeat(80));
  try {
    const tipoProcesso = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pacientes' 
      AND column_name = 'tipo_processo'
    `);
    
    if (tipoProcesso.rows.length === 0) {
      console.log('  ⚠️  Coluna tipo_processo NÃO EXISTE - será mapeada para contexto');
    } else {
      console.log('  ✅ Coluna tipo_processo existe');
    }
  } catch (error) {
    console.error('  ❌ Erro:', error.message);
  }
  
  // 3. Verificar dados de um paciente de exemplo
  console.log('\n3️⃣ VERIFICANDO DADOS DE UM PACIENTE COM RENACH:');
  console.log('-'.repeat(80));
  try {
    const paciente = await query(`
      SELECT 
        id, nome, cpf,
        nome_pai, nome_mae, categoria_cnh,
        numero_laudo_renach, numero_laudo,
        data_primeira_habilitacao, data_exame,
        contexto, numero_endereco,
        renach_data_upload
      FROM pacientes 
      WHERE renach_arquivo IS NOT NULL 
      ORDER BY renach_data_upload DESC 
      LIMIT 1
    `);
    
    if (paciente.rows.length === 0) {
      console.log('  ⚠️  Nenhum paciente com RENACH encontrado');
    } else {
      const p = paciente.rows[0];
      console.log(`  📋 Paciente: ${p.nome} (ID: ${p.id})`);
      console.log(`     CPF: ${p.cpf || 'N/A'}`);
      console.log(`     Nome do Pai: ${p.nome_pai || '❌ NULL'}`);
      console.log(`     Nome da Mãe: ${p.nome_mae || '❌ NULL'}`);
      console.log(`     Categoria CNH: ${p.categoria_cnh || '❌ NULL'}`);
      console.log(`     Número Laudo RENACH: ${p.numero_laudo_renach || '❌ NULL'}`);
      console.log(`     Número Laudo: ${p.numero_laudo || '❌ NULL'}`);
      console.log(`     Data Primeira Habilitação: ${p.data_primeira_habilitacao || '❌ NULL'}`);
      console.log(`     Data Exame: ${p.data_exame || '❌ NULL'}`);
      console.log(`     Contexto (tipo_processo): ${p.contexto || '❌ NULL'}`);
      console.log(`     Número Endereço: ${p.numero_endereco || '❌ NULL'}`);
      console.log(`     RENACH Upload: ${p.renach_data_upload || 'N/A'}`);
    }
  } catch (error) {
    console.error('  ❌ Erro ao verificar paciente:', error.message);
  }
  
  // 4. Verificar o código de mapeamento
  console.log('\n4️⃣ VERIFICANDO MAPEAMENTO DE CAMPOS NO CÓDIGO:');
  console.log('-'.repeat(80));
  const fieldMapping = {
    'numero_renach': 'numero_renach',
    'nome': 'nome',
    'data_nascimento': 'data_nascimento',
    'sexo': 'sexo',
    'categoria_cnh': 'categoria_cnh',
    'nome_pai': 'nome_pai',
    'nome_mae': 'nome_mae',
    'tipo_processo': 'contexto',
    'naturalidade': 'naturalidade',
    'nacionalidade': 'nacionalidade',
    'logradouro': 'logradouro',
    'numero_endereco': 'numero_endereco',
    'data_exame': 'data_exame',
    'data_primeira_habilitacao': 'data_primeira_habilitacao',
    'numero_laudo_renach': 'numero_laudo_renach',
    'numero_laudo': 'numero_laudo'
  };
  
  console.log('  Campos mapeados:');
  Object.entries(fieldMapping).forEach(([extracted, dbField]) => {
    console.log(`     ${extracted} → ${dbField}`);
  });
  
  // 5. Verificar se há problemas conhecidos
  console.log('\n5️⃣ DIAGNÓSTICO DE PROBLEMAS POTENCIAIS:');
  console.log('-'.repeat(80));
  
  const problemas = [];
  
  // Verificar se processResult.success pode estar false
  console.log('  🔍 Possíveis problemas:');
  console.log('     1. processResult.success pode ser false mesmo com dados extraídos');
  console.log('     2. extractedData pode estar vazio mesmo com processResult.success = true');
  console.log('     3. Campo tipo_processo não existe (mapeado para contexto)');
  console.log('     4. Validação pode estar rejeitando dados válidos');
  
  console.log('\n6️⃣ RECOMENDAÇÕES:');
  console.log('-'.repeat(80));
  console.log('  ✅ Verificar logs do backend durante upload do RENACH');
  console.log('  ✅ Confirmar que processResult.success = true');
  console.log('  ✅ Confirmar que extractedData contém os campos esperados');
  console.log('  ✅ Verificar se updateFields.length > 0 antes do UPDATE');
  console.log('  ✅ Verificar se a query UPDATE está sendo executada corretamente');
  
  process.exit(0);
}

analisar().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});

