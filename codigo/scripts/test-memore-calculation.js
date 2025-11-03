const axios = require('axios');

async function testMemoreCalculation() {
  try {
    console.log('🧪 Testando cálculo do MEMORE...');
    
    // Fazer login
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@teste.com',
      senha: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado');
    
    // Teste 1: Resultado médio (EB = 12)
    console.log('\n📊 Teste 1: VP=18, VN=6, FN=6, FP=6 → EB esperado = 12');
    const test1 = await axios.post(
      'http://localhost:3001/api/tabelas/memore/calculate',
      {
        vp: 18,
        vn: 6,
        fn: 6,
        fp: 6,
        tabela_id: 120 // Tabela Geral
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    console.log('Resultado:', test1.data.resultado);
    
    // Teste 2: Resultado superior (EB = 20)
    console.log('\n📊 Teste 2: VP=20, VN=10, FN=5, FP=5 → EB esperado = 20');
    const test2 = await axios.post(
      'http://localhost:3001/api/tabelas/memore/calculate',
      {
        vp: 20,
        vn: 10,
        fn: 5,
        fp: 5,
        tabela_id: 120 // Tabela Geral
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    console.log('Resultado:', test2.data.resultado);
    
    // Teste 3: Resultado inferior (EB = 0)
    console.log('\n📊 Teste 3: VP=12, VN=0, FN=6, FP=6 → EB esperado = 0');
    const test3 = await axios.post(
      'http://localhost:3001/api/tabelas/memore/calculate',
      {
        vp: 12,
        vn: 0,
        fn: 6,
        fp: 6,
        tabela_id: 120 // Tabela Geral
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    console.log('Resultado:', test3.data.resultado);
    
    // Teste 4: Com tabela de trânsito
    console.log('\n📊 Teste 4: Tabela Trânsito - VP=20, VN=8, FN=4, FP=4 → EB esperado = 20');
    const test4 = await axios.post(
      'http://localhost:3001/api/tabelas/memore/calculate',
      {
        vp: 20,
        vn: 8,
        fn: 4,
        fp: 4,
        tabela_id: 116 // Tabela Trânsito
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    console.log('Resultado:', test4.data.resultado);
    
    console.log('\n✅ Todos os testes concluídos!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    process.exit(1);
  }
}

testMemoreCalculation();

