/**
 * Script para estender as tabelas ROTAS-2 com TODAS as tabelas da documentação
 * Adiciona: Regiões, Estados e Contextos
 */

require('dotenv').config();
const { query } = require('../config/database');
const { criarFaixasPontos, inserirTabelaNormativa, inserirNormasRotas } = require('./populate-rotas2-tables');

// Dados das tabelas adicionais baseados na documentação fornecida
const TABELAS_ADICIONAIS = {
  // REGIÕES (5 tabelas)
  'Região Centro-Oeste': {
    criterio: 'Região',
    valorCriterio: 'Centro-Oeste',
    descricao: 'Normas para Região Centro-Oeste',
    dados: {
      '5': { c: 86, d: 60, a: 66, mga: 230 },
      '10': { c: 98, d: 72, a: 88, mga: 262 },
      '15': { c: 104, d: 77, a: 97, mga: 290 },
      '20': { c: 110, d: 81, a: 104, mga: 305 },
      '25': { c: 116, d: 86, a: 111, mga: 318 },
      '30': { c: 120, d: 88, a: 115, mga: 328 },
      '35': { c: 126, d: 91, a: 120, mga: 341 },
      '40': { c: 131, d: 94, a: 125, mga: 355 },
      '45': { c: 135, d: 97, a: 130, mga: 365 },
      '50': { c: 140, d: 100, a: 134, mga: 377 },
      '55': { c: 144, d: 103, a: 141, mga: 387 },
      '60': { c: 149, d: 105, a: 144, mga: 397 },
      '65': { c: 155, d: 108, a: 150, mga: 408 },
      '70': { c: 162, d: 111, a: 155, mga: 419 },
      '75': { c: 167, d: 115, a: 161, mga: 434 },
      '80': { c: 173, d: 118, a: 166, mga: 448 },
      '85': { c: 181, d: 123, a: 172, mga: 469 },
      '90': { c: 189, d: 130, a: 181, mga: 489 },
      '95': { c: 205, d: 141, a: 196, mga: 522 }
    }
  },
  'Região Nordeste': {
    criterio: 'Região',
    valorCriterio: 'Nordeste',
    descricao: 'Normas para Região Nordeste',
    dados: {
      '5': { c: 77, d: 52, a: 41, mga: 181 },
      '10': { c: 92, d: 64, a: 69, mga: 234 },
      '15': { c: 101, d: 71, a: 82, mga: 260 },
      '20': { c: 109, d: 76, a: 92, mga: 282 },
      '25': { c: 115, d: 80, a: 99, mga: 302 },
      '30': { c: 120, d: 85, a: 106, mga: 317 },
      '35': { c: 126, d: 90, a: 112, mga: 331 },
      '40': { c: 130, d: 94, a: 117, mga: 344 },
      '45': { c: 135, d: 97, a: 121, mga: 356 },
      '50': { c: 140, d: 101, a: 127, mga: 367 },
      '55': { c: 144, d: 104, a: 131, mga: 380 },
      '60': { c: 150, d: 108, a: 136, mga: 393 },
      '65': { c: 155, d: 112, a: 142, mga: 406 },
      '70': { c: 160, d: 116, a: 146, mga: 420 },
      '75': { c: 166, d: 120, a: 154, mga: 435 },
      '80': { c: 172, d: 125, a: 161, mga: 452 },
      '85': { c: 181, d: 132, a: 168, mga: 470 },
      '90': { c: 190, d: 142, a: 178, mga: 493 },
      '95': { c: 205, d: 163, a: 192, mga: 533 }
    }
  },
  'Região Norte': {
    criterio: 'Região',
    valorCriterio: 'Norte',
    descricao: 'Normas para Região Norte',
    dados: {
      '5': { c: 85, d: 56, a: 72, mga: 237 },
      '10': { c: 98, d: 70, a: 84, mga: 268 },
      '15': { c: 108, d: 76, a: 95, mga: 292 },
      '20': { c: 113, d: 80, a: 104, mga: 312 },
      '25': { c: 120, d: 82, a: 112, mga: 324 },
      '30': { c: 126, d: 87, a: 118, mga: 334 },
      '35': { c: 128, d: 92, a: 122, mga: 350 },
      '40': { c: 136, d: 95, a: 126, mga: 362 },
      '45': { c: 141, d: 98, a: 130, mga: 367 },
      '50': { c: 147, d: 100, a: 137, mga: 377 },
      '55': { c: 152, d: 102, a: 141, mga: 391 },
      '60': { c: 154, d: 106, a: 144, mga: 406 },
      '65': { c: 160, d: 108, a: 152, mga: 423 },
      '70': { c: 165, d: 111, a: 157, mga: 432 },
      '75': { c: 170, d: 116, a: 161, mga: 443 },
      '80': { c: 176, d: 120, a: 167, mga: 453 },
      '85': { c: 184, d: 126, a: 175, mga: 467 },
      '90': { c: 195, d: 132, a: 182, mga: 480 },
      '95': { c: 221, d: 144, a: 199, mga: 528 }
    }
  },
  'Região Sudeste': {
    criterio: 'Região',
    valorCriterio: 'Sudeste',
    descricao: 'Normas para Região Sudeste',
    dados: {
      '5': { c: 87, d: 54, a: 55, mga: 211 },
      '10': { c: 101, d: 68, a: 79, mga: 257 },
      '15': { c: 109, d: 75, a: 92, mga: 288 },
      '20': { c: 118, d: 80, a: 101, mga: 307 },
      '25': { c: 124, d: 84, a: 107, mga: 323 },
      '30': { c: 129, d: 89, a: 115, mga: 338 },
      '35': { c: 135, d: 93, a: 120, mga: 352 },
      '40': { c: 140, d: 96, a: 125, mga: 365 },
      '45': { c: 145, d: 100, a: 131, mga: 378 },
      '50': { c: 151, d: 103, a: 136, mga: 390 },
      '55': { c: 155, d: 106, a: 141, mga: 402 },
      '60': { c: 160, d: 109, a: 145, mga: 414 },
      '65': { c: 165, d: 113, a: 152, mga: 426 },
      '70': { c: 169, d: 117, a: 158, mga: 440 },
      '75': { c: 176, d: 121, a: 163, mga: 454 },
      '80': { c: 182, d: 126, a: 168, mga: 468 },
      '85': { c: 189, d: 132, a: 176, mga: 486 },
      '90': { c: 198, d: 141, a: 186, mga: 506 },
      '95': { c: 213, d: 157, a: 202, mga: 544 }
    }
  },
  'Região Sul': {
    criterio: 'Região',
    valorCriterio: 'Sul',
    descricao: 'Normas para Região Sul',
    dados: {
      '5': { c: 86, d: 54, a: 58, mga: 212 },
      '10': { c: 98, d: 66, a: 76, mga: 248 },
      '15': { c: 106, d: 72, a: 88, mga: 273 },
      '20': { c: 115, d: 77, a: 96, mga: 293 },
      '25': { c: 121, d: 80, a: 105, mga: 310 },
      '30': { c: 127, d: 84, a: 112, mga: 328 },
      '35': { c: 132, d: 88, a: 119, mga: 341 },
      '40': { c: 136, d: 92, a: 124, mga: 353 },
      '45': { c: 141, d: 95, a: 130, mga: 365 },
      '50': { c: 145, d: 98, a: 134, mga: 378 },
      '55': { c: 150, d: 100, a: 139, mga: 388 },
      '60': { c: 154, d: 103, a: 143, mga: 399 },
      '65': { c: 159, d: 106, a: 148, mga: 410 },
      '70': { c: 165, d: 110, a: 154, mga: 420 },
      '75': { c: 170, d: 115, a: 159, mga: 436 },
      '80': { c: 176, d: 119, a: 165, mga: 454 },
      '85': { c: 185, d: 125, a: 171, mga: 471 },
      '90': { c: 194, d: 132, a: 182, mga: 493 },
      '95': { c: 209, d: 148, a: 197, mga: 535 }
    }
  }
};

async function estenderTabelasRotas2() {
  console.log('🚀 Estendendo tabelas ROTAS-2 com tabelas adicionais...\n');
  
  try {
    let totalTabelas = 0;
    let totalNormas = 0;
    
    for (const [nomeTabela, config] of Object.entries(TABELAS_ADICIONAIS)) {
      console.log(`📊 Processando: ${nomeTabela}`);
      
      // Criar faixas de pontos
      const faixas = criarFaixasPontos(config.dados);
      
      // Inserir tabela normativa
      const tabelaId = await inserirTabelaNormativa(
        `ROTAS-2 - ${nomeTabela}`,
        config.criterio,
        config.valorCriterio,
        config.descricao
      );
      
      // Inserir normas
      const normasInseridas = await inserirNormasRotas(tabelaId, faixas);
      
      totalTabelas++;
      totalNormas += normasInseridas;
      console.log('');
    }
    
    console.log('✅ Extensão concluída!');
    console.log(`📈 Resumo:`);
    console.log(`   - Tabelas adicionadas: ${totalTabelas}`);
    console.log(`   - Normas inseridas: ${totalNormas}`);
    
  } catch (error) {
    console.error('❌ Erro durante extensão:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  estenderTabelasRotas2()
    .then(() => {
      console.log('\n✅ Script concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { estenderTabelasRotas2 };

