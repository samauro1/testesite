const axios = require('axios');

async function seedMemoreOfficial() {
  try {
    console.log('🌱 Iniciando seed oficial das tabelas MEMORE...');
    
    // Fazer login primeiro
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@teste.com',
      senha: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso');
    
    // Executar seed
    const seedResponse = await axios.post(
      'http://localhost:3001/api/tabelas/memore/seed-official',
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Seed oficial MEMORE concluído!');
    console.log('📊 Tabelas criadas:', JSON.stringify(seedResponse.data, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no seed:', error.response?.data || error.message);
    process.exit(1);
  }
}

seedMemoreOfficial();

