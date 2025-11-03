const axios = require('axios');

async function testSystemStatus() {
  try {
    console.log('🔍 Testando status do sistema...');

    // 1. Testar backend
    console.log('\n📡 Testando backend (porta 3001)...');
    try {
      const backendResponse = await axios.get('http://localhost:3001/api/health');
      console.log('✅ Backend funcionando:', backendResponse.data);
    } catch (error) {
      console.log('❌ Backend não está respondendo:', error.message);
    }

    // 2. Testar frontend
    console.log('\n🌐 Testando frontend (porta 3000)...');
    try {
      const frontendResponse = await axios.get('http://localhost:3000');
      console.log('✅ Frontend funcionando (status:', frontendResponse.status + ')');
    } catch (error) {
      console.log('❌ Frontend não está respondendo:', error.message);
    }

    // 3. Testar login
    console.log('\n🔐 Testando login...');
    try {
      const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
        email: 'admin@teste.com',
        senha: '123456',
      });
      console.log('✅ Login funcionando, token obtido');
      
      const token = loginResponse.data.token;
      
      // 4. Testar listagem de pacientes
      console.log('\n👥 Testando listagem de pacientes...');
      try {
        const pacientesResponse = await axios.get('http://localhost:3001/api/pacientes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Listagem de pacientes funcionando,', pacientesResponse.data.pacientes.length, 'pacientes encontrados');
      } catch (error) {
        console.log('❌ Erro na listagem de pacientes:', error.response?.data || error.message);
      }
      
    } catch (error) {
      console.log('❌ Erro no login:', error.response?.data || error.message);
    }

    console.log('\n🎯 Status do sistema verificado!');
    console.log('\n📋 Instruções:');
    console.log('1. Backend: http://localhost:3001');
    console.log('2. Frontend: http://localhost:3000');
    console.log('3. Login: admin@teste.com / 123456');
    console.log('4. Se houver problemas de cache, limpe o navegador (Ctrl+Shift+R)');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testSystemStatus();

