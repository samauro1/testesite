/**
 * Servidor Express Isolado para Desenvolvimento do Módulo de Testes
 * 
 * Porta: 3002 (para não conflitar com o sistema principal na porta 3001)
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentar limite para imagens base64
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static('public'));

// Rota para favicon (evitar 404)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Rotas
app.get('/', (req, res) => {
  res.json({
    message: 'Módulo de Testes - Ambiente de Desenvolvimento Isolado',
    version: '1.0.0',
    status: 'development',
    port: PORT
  });
});

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas de testes
const testesRoutes = require('./routes/testes');
app.use('/api/testes', testesRoutes);

// Rotas específicas de cada teste
const acRoutes = require('./routes/ac');
app.use('/api/ac', acRoutes);

const betaIIIRoutes = require('./routes/beta-iii');
app.use('/api/beta-iii', betaIIIRoutes);

// Rotas BPA-2
try {
  console.log('📥 Tentando carregar rotas de BPA-2...');
  const bpa2Routes = require('./routes/bpa2');
  console.log('✅ Módulo bpa2.js carregado com sucesso');
  app.use('/api/bpa2', bpa2Routes);
  console.log('✅ Rotas de BPA-2 registradas em /api/bpa2');
  console.log('   Endpoints disponíveis:');
  console.log('   - GET  /api/bpa2');
  console.log('   - GET  /api/bpa2/tabelas');
  console.log('   - POST /api/bpa2/calcular');
} catch (error) {
  console.error('❌ ERRO ao carregar rotas de BPA-2:', error);
  console.error('❌ Stack:', error.stack);
  console.error('⚠️  Servidor continuará sem as rotas de BPA-2');
}

// Rotas de Atenção (Rotas A, D, C)
try {
  console.log('📥 Tentando carregar rotas de Rotas...');
  const rotasRoutes = require('./routes/rotas');
  console.log('✅ Módulo rotas.js carregado com sucesso');
  app.use('/api/rotas', rotasRoutes);
  console.log('✅ Rotas de Rotas de Atenção registradas em /api/rotas');
  console.log('   Endpoints disponíveis:');
  console.log('   - GET  /api/rotas');
  console.log('   - GET  /api/rotas/tabelas');
  console.log('   - POST /api/rotas/calcular');
} catch (error) {
  console.error('❌ ERRO ao carregar rotas de Rotas:', error);
  console.error('❌ Stack:', error.stack);
  // Não interromper o servidor, mas avisar claramente
  console.error('⚠️  Servidor continuará sem as rotas de Rotas');
}

const memoreRoutes = require('./routes/memore');
app.use('/api/memore', memoreRoutes);

const migRoutes = require('./routes/mig');
app.use('/api/mig', migRoutes);

const mvtRoutes = require('./routes/mvt');
app.use('/api/mvt', mvtRoutes);

const r1Routes = require('./routes/r1');
app.use('/api/r1', r1Routes);

const palograficoRoutes = require('./routes/palografico');
app.use('/api/palografico', palograficoRoutes);

// Rotas de Atenção (expansão do AC)
const atencaoRoutes = require('./routes/atencao');
app.use('/api/atencao', atencaoRoutes);

// Rotas de Memória
const memoriaRoutes = require('./routes/memoria');
app.use('/api/memoria', memoriaRoutes);

// Rotas de Laudos
const laudosRoutes = require('./routes/laudos');
app.use('/api/laudos', laudosRoutes);

// Rotas de Análise de Imagem
const imagemRoutes = require('./routes/imagem');
app.use('/api/imagem', imagemRoutes);

// Rotas administrativas
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de desenvolvimento do módulo de testes rodando na porta ${PORT}`);
  console.log(`📍 Ambiente: DESENVOLVIMENTO ISOLADO`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
});

