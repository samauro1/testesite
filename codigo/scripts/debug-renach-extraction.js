// Script para debugar a extração do RENACH
const RenachProcessor = require('../utils/renachProcessorUniversal');

// Simular o que acontece quando processResult é retornado
async function testar() {
  console.log('🧪 TESTE DE EXTRAÇÃO DO RENACH\n');
  
  // Simular diferentes cenários
  console.log('1️⃣ Testando cenário 1: success = true, data vazio\n');
  const cenario1 = {
    success: true,
    data: {}
  };
  
  console.log('processResult.success:', cenario1.success);
  console.log('processResult.data:', cenario1.data);
  console.log('Object.keys(processResult.data).length:', Object.keys(cenario1.data).length);
  console.log('Condição 1 (dados existem):', cenario1 && cenario1.data && Object.keys(cenario1.data).length > 0);
  console.log('Condição 2 (success):', cenario1.success);
  
  console.log('\n2️⃣ Testando cenário 2: success = false, data com conteúdo\n');
  const cenario2 = {
    success: false,
    data: {
      nome: 'TESTE',
      categoria_cnh: 'B'
    }
  };
  
  console.log('processResult.success:', cenario2.success);
  console.log('processResult.data:', cenario2.data);
  console.log('Object.keys(processResult.data).length:', Object.keys(cenario2.data).length);
  console.log('Condição 1 (dados existem):', cenario2 && cenario2.data && Object.keys(cenario2.data).length > 0);
  console.log('Condição 2 (success):', cenario2.success);
  
  console.log('\n3️⃣ Testando cenário 3: success = true, data com conteúdo\n');
  const cenario3 = {
    success: true,
    data: {
      nome: 'TESTE',
      categoria_cnh: 'B',
      nome_pai: 'PAI TESTE'
    }
  };
  
  console.log('processResult.success:', cenario3.success);
  console.log('processResult.data:', cenario3.data);
  console.log('Object.keys(processResult.data).length:', Object.keys(cenario3.data).length);
  console.log('Condição 1 (dados existem):', cenario3 && cenario3.data && Object.keys(cenario3.data).length > 0);
  console.log('Condição 2 (success):', cenario3.success);
  
  console.log('\n4️⃣ Testando lógica atual do código:\n');
  
  // Simular a lógica atual
  function testarLogica(processResult) {
    let extractedData = {};
    
    if (processResult && processResult.data && Object.keys(processResult.data).length > 0) {
      extractedData = processResult.data;
      console.log('  ✅ Usando Condição 1: dados existem');
      return extractedData;
    } else if (processResult.success) {
      extractedData = processResult.data || {};
      console.log('  ✅ Usando Condição 2: success = true');
      return extractedData;
    } else {
      console.log('  ❌ Nenhuma condição atendida');
      return extractedData;
    }
  }
  
  console.log('Cenário 1:', testarLogica(cenario1));
  console.log('Cenário 2:', testarLogica(cenario2));
  console.log('Cenário 3:', testarLogica(cenario3));
  
  console.log('\n5️⃣ Verificando retorno do processador:\n');
  console.log('O processador retorna:');
  console.log('  - Se sucesso: { success: true, data: {...} }');
  console.log('  - Se erro: { success: false, error: "...", data: {} }');
  console.log('\n⚠️ PROBLEMA POTENCIAL: Se houver erro, data = {} vazio!');
}

testar();

