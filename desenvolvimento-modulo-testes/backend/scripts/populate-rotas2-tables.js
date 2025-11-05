/**
 * Script para Popular Tabelas Normativas da Bateria ROTAS-2
 * 
 * Este script popula todas as tabelas normativas da ROTAS-2 no banco de dados,
 * incluindo tabelas por faixa etária, escolaridade, região, estado e contexto.
 */

const { query } = require('../config/database');

// Estrutura das tabelas fornecidas
const TABELAS_ROTAS2 = {
  // Tabela 1: Geral
  'Geral': {
    criterio: 'Geral',
    descricao: 'Tabela geral para a população brasileira (N=22.333)',
    dados: {
      '5': { c: 85, d: 54, a: 54, mga: 208 },
      '10': { c: 99, d: 67, a: 77, mga: 252 },
      '15': { c: 107, d: 74, a: 90, mga: 281 },
      '20': { c: 115, d: 79, a: 99, mga: 302 },
      '25': { c: 121, d: 83, a: 106, mga: 318 },
      '30': { c: 127, d: 88, a: 113, mga: 333 },
      '35': { c: 132, d: 92, a: 119, mga: 346 },
      '40': { c: 136, d: 95, a: 123, mga: 359 },
      '45': { c: 143, d: 98, a: 129, mga: 372 },
      '50': { c: 147, d: 102, a: 134, mga: 384 },
      '55': { c: 152, d: 104, a: 139, mga: 396 },
      '60': { c: 157, d: 108, a: 144, mga: 407 },
      '65': { c: 162, d: 112, a: 149, mga: 419 },
      '70': { c: 167, d: 116, a: 155, mga: 433 },
      '75': { c: 173, d: 120, a: 161, mga: 448 },
      '80': { c: 179, d: 124, a: 167, mga: 462 },
      '85': { c: 186, d: 130, a: 175, mga: 480 },
      '90': { c: 196, d: 139, a: 184, mga: 502 },
      '95': { c: 211, d: 156, a: 200, mga: 540 }
    }
  },
  // Tabela 2: Faixa Etária 16-23
  'Faixa Etária 16-23': {
    criterio: 'Idade',
    valorCriterio: '16-23',
    descricao: 'Normas para faixa etária de 16 a 23 anos',
    dados: {
      '5': { c: 93, d: 70, a: 87, mga: 268 },
      '10': { c: 103, d: 78, a: 101, mga: 304 },
      '15': { c: 112, d: 84, a: 110, mga: 321 },
      '20': { c: 118, d: 89, a: 119, mga: 338 },
      '25': { c: 124, d: 94, a: 123, mga: 351 },
      '30': { c: 129, d: 98, a: 129, mga: 366 },
      '35': { c: 136, d: 101, a: 135, mga: 380 },
      '40': { c: 141, d: 104, a: 140, mga: 391 },
      '45': { c: 145, d: 107, a: 144, mga: 403 },
      '50': { c: 151, d: 110, a: 149, mga: 415 },
      '55': { c: 156, d: 113, a: 154, mga: 424 },
      '60': { c: 160, d: 116, a: 158, mga: 437 },
      '65': { c: 166, d: 120, a: 162, mga: 449 },
      '70': { c: 170, d: 123, a: 167, mga: 460 },
      '75': { c: 176, d: 128, a: 173, mga: 473 },
      '80': { c: 182, d: 132, a: 179, mga: 487 },
      '85': { c: 189, d: 139, a: 185, mga: 502 },
      '90': { c: 198, d: 149, a: 195, mga: 525 },
      '95': { c: 211, d: 166, a: 210, mga: 557 }
    }
  },
  // Tabela 3: Faixa Etária 24-31
  'Faixa Etária 24-31': {
    criterio: 'Idade',
    valorCriterio: '24-31',
    descricao: 'Normas para faixa etária de 24 a 31 anos',
    dados: {
      '5': { c: 104, d: 75, a: 79, mga: 253 },
      '10': { c: 104, d: 75, a: 96, mga: 288 },
      '15': { c: 113, d: 81, a: 104, mga: 308 },
      '20': { c: 120, d: 85, a: 112, mga: 327 },
      '25': { c: 127, d: 89, a: 119, mga: 343 },
      '30': { c: 131, d: 93, a: 124, mga: 356 },
      '35': { c: 136, d: 97, a: 129, mga: 369 },
      '40': { c: 142, d: 100, a: 133, mga: 382 },
      '45': { c: 147, d: 103, a: 138, mga: 393 },
      '50': { c: 152, d: 105, a: 142, mga: 403 },
      '55': { c: 156, d: 109, a: 146, mga: 414 },
      '60': { c: 161, d: 112, a: 152, mga: 426 },
      '65': { c: 166, d: 116, a: 158, mga: 438 },
      '70': { c: 171, d: 119, a: 163, mga: 451 },
      '75': { c: 177, d: 123, a: 168, mga: 463 },
      '80': { c: 184, d: 128, a: 173, mga: 476 },
      '85': { c: 190, d: 134, a: 180, mga: 492 },
      '90': { c: 199, d: 142, a: 189, mga: 513 },
      '95': { c: 215, d: 157, a: 204, mga: 550 }
    }
  },
  // Tabela 4: Faixa Etária 32-39
  'Faixa Etária 32-39': {
    criterio: 'Idade',
    valorCriterio: '32-39',
    descricao: 'Normas para faixa etária de 32 a 39 anos',
    dados: {
      '5': { c: 94, d: 62, a: 70, mga: 243 },
      '10': { c: 105, d: 72, a: 89, mga: 278 },
      '15': { c: 115, d: 77, a: 99, mga: 301 },
      '20': { c: 121, d: 81, a: 106, mga: 318 },
      '25': { c: 128, d: 86, a: 112, mga: 334 },
      '30': { c: 133, d: 90, a: 119, mga: 349 },
      '35': { c: 138, d: 93, a: 123, mga: 359 },
      '40': { c: 143, d: 96, a: 128, mga: 370 },
      '45': { c: 148, d: 99, a: 132, mga: 381 },
      '50': { c: 152, d: 102, a: 138, mga: 392 },
      '55': { c: 157, d: 104, a: 142, mga: 403 },
      '60': { c: 161, d: 108, a: 146, mga: 412 },
      '65': { c: 166, d: 111, a: 152, mga: 424 },
      '70': { c: 170, d: 115, a: 157, mga: 437 },
      '75': { c: 176, d: 119, a: 162, mga: 450 },
      '80': { c: 182, d: 124, a: 167, mga: 465 },
      '85': { c: 191, d: 130, a: 174, mga: 483 },
      '90': { c: 200, d: 137, a: 184, mga: 504 },
      '95': { c: 216, d: 156, a: 200, mga: 544 }
    }
  },
  // Tabela 5: Faixa Etária 40-47
  'Faixa Etária 40-47': {
    criterio: 'Idade',
    valorCriterio: '40-47',
    descricao: 'Normas para faixa etária de 40 a 47 anos',
    dados: {
      '5': { c: 89, d: 58, a: 61, mga: 219 },
      '10': { c: 101, d: 68, a: 79, mga: 256 },
      '15': { c: 110, d: 74, a: 89, mga: 283 },
      '20': { c: 118, d: 77, a: 97, mga: 301 },
      '25': { c: 124, d: 81, a: 104, mga: 315 },
      '30': { c: 128, d: 85, a: 109, mga: 327 },
      '35': { c: 134, d: 88, a: 115, mga: 340 },
      '40': { c: 138, d: 92, a: 119, mga: 351 },
      '45': { c: 144, d: 95, a: 123, mga: 361 },
      '50': { c: 148, d: 98, a: 128, mga: 372 },
      '55': { c: 152, d: 101, a: 132, mga: 383 },
      '60': { c: 157, d: 104, a: 137, mga: 395 },
      '65': { c: 161, d: 107, a: 142, mga: 405 },
      '70': { c: 167, d: 111, a: 145, mga: 418 },
      '75': { c: 172, d: 115, a: 152, mga: 432 },
      '80': { c: 178, d: 120, a: 159, mga: 446 },
      '85': { c: 184, d: 126, a: 166, mga: 462 },
      '90': { c: 194, d: 135, a: 175, mga: 486 },
      '95': { c: 210, d: 150, a: 190, mga: 525 }
    }
  },
  // Tabela 6: Faixa Etária 48-55
  'Faixa Etária 48-55': {
    criterio: 'Idade',
    valorCriterio: '48-55',
    descricao: 'Normas para faixa etária de 48 a 55 anos',
    dados: {
      '5': { c: 86, d: 50, a: 43, mga: 194 },
      '10': { c: 96, d: 60, a: 63, mga: 225 },
      '15': { c: 103, d: 67, a: 76, mga: 251 },
      '20': { c: 110, d: 72, a: 84, mga: 267 },
      '25': { c: 116, d: 75, a: 90, mga: 284 },
      '30': { c: 121, d: 78, a: 96, mga: 299 },
      '35': { c: 126, d: 81, a: 102, mga: 310 },
      '40': { c: 131, d: 84, a: 107, mga: 322 },
      '45': { c: 136, d: 88, a: 112, mga: 335 },
      '50': { c: 140, d: 91, a: 118, mga: 345 },
      '55': { c: 144, d: 94, a: 120, mga: 354 },
      '60': { c: 151, d: 98, a: 126, mga: 365 },
      '65': { c: 155, d: 101, a: 130, mga: 378 },
      '70': { c: 160, d: 104, a: 135, mga: 390 },
      '75': { c: 167, d: 108, a: 140, mga: 403 },
      '80': { c: 173, d: 113, a: 144, mga: 417 },
      '85': { c: 181, d: 117, a: 152, mga: 438 },
      '90': { c: 191, d: 126, a: 165, mga: 466 },
      '95': { c: 206, d: 137, a: 178, mga: 501 }
    }
  },
  // Tabela 7: Faixa Etária 56-63
  'Faixa Etária 56-63': {
    criterio: 'Idade',
    valorCriterio: '56-63',
    descricao: 'Normas para faixa etária de 56 a 63 anos',
    dados: {
      '5': { c: 74, d: 35, a: 29, mga: 161 },
      '10': { c: 90, d: 48, a: 50, mga: 198 },
      '15': { c: 100, d: 57, a: 64, mga: 229 },
      '20': { c: 108, d: 64, a: 73, mga: 250 },
      '25': { c: 115, d: 69, a: 81, mga: 268 },
      '30': { c: 120, d: 73, a: 88, mga: 285 },
      '35': { c: 124, d: 77, a: 95, mga: 297 },
      '40': { c: 129, d: 80, a: 100, mga: 310 },
      '45': { c: 134, d: 84, a: 104, mga: 322 },
      '50': { c: 138, d: 88, a: 110, mga: 335 },
      '55': { c: 143, d: 92, a: 114, mga: 345 },
      '60': { c: 148, d: 95, a: 120, mga: 355 },
      '65': { c: 152, d: 98, a: 124, mga: 366 },
      '70': { c: 158, d: 102, a: 128, mga: 380 },
      '75': { c: 163, d: 105, a: 134, mga: 393 },
      '80': { c: 170, d: 111, a: 140, mga: 408 },
      '85': { c: 178, d: 118, a: 146, mga: 424 },
      '90': { c: 185, d: 126, a: 156, mga: 447 },
      '95': { c: 198, d: 140, a: 168, mga: 483 }
    }
  },
  // Tabela 8: Faixa Etária 64-71
  'Faixa Etária 64-71': {
    criterio: 'Idade',
    valorCriterio: '64-71',
    descricao: 'Normas para faixa etária de 64 a 71 anos',
    dados: {
      '5': { c: 58, d: 0, a: 14, mga: 127 },
      '10': { c: 74, d: 24, a: 29, mga: 160 },
      '15': { c: 84, d: 39, a: 44, mga: 185 },
      '20': { c: 92, d: 47, a: 53, mga: 206 },
      '25': { c: 98, d: 54, a: 60, mga: 221 },
      '30': { c: 103, d: 61, a: 66, mga: 233 },
      '35': { c: 107, d: 66, a: 71, mga: 248 },
      '40': { c: 113, d: 72, a: 76, mga: 260 },
      '45': { c: 118, d: 77, a: 82, mga: 271 },
      '50': { c: 123, d: 80, a: 86, mga: 284 },
      '55': { c: 128, d: 84, a: 91, mga: 296 },
      '60': { c: 131, d: 90, a: 97, mga: 309 },
      '65': { c: 137, d: 95, a: 102, mga: 322 },
      '70': { c: 142, d: 98, a: 107, mga: 331 },
      '75': { c: 148, d: 104, a: 115, mga: 347 },
      '80': { c: 156, d: 112, a: 120, mga: 369 },
      '85': { c: 165, d: 119, a: 127, mga: 386 },
      '90': { c: 174, d: 128, a: 135, mga: 410 },
      '95': { c: 185, d: 140, a: 155, mga: 444 }
    }
  },
  // Tabela 9: Faixa Etária 72-92
  'Faixa Etária 72-92': {
    criterio: 'Idade',
    valorCriterio: '72-92',
    descricao: 'Normas para faixa etária de 72 a 92 anos',
    dados: {
      '5': { c: 16, d: 0, a: -6, mga: 39 },
      '10': { c: 32, d: 7, a: 6, mga: 73 },
      '15': { c: 39, d: 17, a: 19, mga: 94 },
      '20': { c: 49, d: 23, a: 24, mga: 112 },
      '25': { c: 58, d: 31, a: 32, mga: 127 },
      '30': { c: 62, d: 35, a: 37, mga: 148 },
      '35': { c: 69, d: 42, a: 42, mga: 156 },
      '40': { c: 76, d: 47, a: 47, mga: 173 },
      '45': { c: 83, d: 55, a: 53, mga: 188 },
      '50': { c: 89, d: 60, a: 59, mga: 203 },
      '55': { c: 93, d: 64, a: 62, mga: 220 },
      '60': { c: 98, d: 69, a: 68, mga: 231 },
      '65': { c: 104, d: 75, a: 74, mga: 244 },
      '70': { c: 112, d: 78, a: 80, mga: 256 },
      '75': { c: 121, d: 85, a: 85, mga: 272 },
      '80': { c: 128, d: 92, a: 94, mga: 291 },
      '85': { c: 143, d: 102, a: 102, mga: 315 },
      '90': { c: 155, d: 106, a: 110, mga: 347 },
      '95': { c: 168, d: 120, a: 123, mga: 384 }
    }
  },
  // Tabela 10: Ensino Fundamental
  'Ensino Fundamental': {
    criterio: 'Escolaridade',
    valorCriterio: 'Fundamental',
    descricao: 'Normas para nível de escolaridade Ensino Fundamental',
    dados: {
      '5': { c: 62, d: 34, a: 26, mga: 141 },
      '10': { c: 82, d: 49, a: 49, mga: 186 },
      '15': { c: 91, d: 59, a: 63, mga: 216 },
      '20': { c: 98, d: 65, a: 73, mga: 241 },
      '25': { c: 104, d: 71, a: 82, mga: 260 },
      '30': { c: 110, d: 76, a: 89, mga: 276 },
      '35': { c: 116, d: 79, a: 96, mga: 291 },
      '40': { c: 120, d: 82, a: 102, mga: 306 },
      '45': { c: 126, d: 87, a: 107, mga: 319 },
      '50': { c: 130, d: 90, a: 114, mga: 332 },
      '55': { c: 136, d: 94, a: 120, mga: 345 },
      '60': { c: 141, d: 98, a: 124, mga: 358 },
      '65': { c: 146, d: 102, a: 130, mga: 372 },
      '70': { c: 151, d: 106, a: 135, mga: 386 },
      '75': { c: 156, d: 110, a: 142, mga: 402 },
      '80': { c: 162, d: 116, a: 148, mga: 419 },
      '85': { c: 169, d: 122, a: 157, mga: 438 },
      '90': { c: 180, d: 131, a: 167, mga: 460 },
      '95': { c: 192, d: 145, a: 183, mga: 498 }
    }
  },
  // Tabela 11: Ensino Médio
  'Ensino Médio': {
    criterio: 'Escolaridade',
    valorCriterio: 'Médio',
    descricao: 'Normas para nível de escolaridade Ensino Médio',
    dados: {
      '5': { c: 90, d: 61, a: 64, mga: 231 },
      '10': { c: 101, d: 72, a: 85, mga: 270 },
      '15': { c: 109, d: 77, a: 96, mga: 298 },
      '20': { c: 117, d: 82, a: 104, mga: 314 },
      '25': { c: 123, d: 86, a: 111, mga: 328 },
      '30': { c: 128, d: 91, a: 118, mga: 343 },
      '35': { c: 133, d: 94, a: 122, mga: 355 },
      '40': { c: 138, d: 98, a: 127, mga: 367 },
      '45': { c: 144, d: 101, a: 132, mga: 380 },
      '50': { c: 148, d: 103, a: 137, mga: 391 },
      '55': { c: 153, d: 106, a: 142, mga: 402 },
      '60': { c: 158, d: 110, a: 146, mga: 413 },
      '65': { c: 163, d: 113, a: 152, mga: 425 },
      '70': { c: 168, d: 117, a: 158, mga: 438 },
      '75': { c: 174, d: 121, a: 163, mga: 453 },
      '80': { c: 180, d: 127, a: 168, mga: 467 },
      '85': { c: 186, d: 133, a: 176, mga: 484 },
      '90': { c: 196, d: 142, a: 186, mga: 505 },
      '95': { c: 209, d: 160, a: 201, mga: 544 }
    }
  },
  // Tabela 12: Ensino Superior
  'Ensino Superior': {
    criterio: 'Escolaridade',
    valorCriterio: 'Superior',
    descricao: 'Normas para nível de escolaridade Ensino Superior',
    dados: {
      '5': { c: 96, d: 62, a: 71, mga: 245 },
      '10': { c: 110, d: 72, a: 89, mga: 284 },
      '15': { c: 119, d: 78, a: 102, mga: 309 },
      '20': { c: 126, d: 82, a: 110, mga: 328 },
      '25': { c: 132, d: 87, a: 117, mga: 344 },
      '30': { c: 136, d: 91, a: 121, mga: 356 },
      '35': { c: 142, d: 95, a: 127, mga: 369 },
      '40': { c: 147, d: 98, a: 132, mga: 380 },
      '45': { c: 152, d: 101, a: 137, mga: 391 },
      '50': { c: 156, d: 104, a: 141, mga: 404 },
      '55': { c: 161, d: 107, a: 145, mga: 414 },
      '60': { c: 166, d: 110, a: 152, mga: 425 },
      '65': { c: 170, d: 113, a: 157, mga: 438 },
      '70': { c: 176, d: 117, a: 161, mga: 450 },
      '75': { c: 182, d: 120, a: 166, mga: 463 },
      '80': { c: 188, d: 126, a: 173, mga: 478 },
      '85': { c: 194, d: 131, a: 180, mga: 493 },
      '90': { c: 205, d: 140, a: 190, mga: 516 },
      '95': { c: 221, d: 154, a: 204, mga: 554 }
    }
  }
  // Nota: Adicionarei mais tabelas conforme necessário (Regiões, Estados, Contextos)
};

// Função para determinar classificação baseada no percentil
function getClassificacao(percentil) {
  if (percentil >= 95) return 'Superior';
  if (percentil >= 85) return 'Superior';
  if (percentil >= 75) return 'Médio Superior';
  if (percentil >= 65) return 'Médio Superior';
  if (percentil >= 55) return 'Médio';
  if (percentil >= 45) return 'Médio';
  if (percentil >= 35) return 'Médio';
  if (percentil >= 25) return 'Médio Inferior';
  if (percentil >= 20) return 'Médio Inferior';
  if (percentil >= 15) return 'Inferior';
  if (percentil >= 10) return 'Inferior';
  if (percentil >= 5) return 'Inferior';
  return 'Inferior';
}

// Função para criar faixas de pontos a partir dos dados de percentil
// Cada valor de percentil representa o PONTO MÍNIMO para alcançar aquele percentil
// A faixa vai do valor atual até (próximo valor - 1)
function criarFaixasPontos(dados) {
  const percentis = Object.keys(dados).map(p => parseInt(p)).sort((a, b) => a - b);
  const faixas = {};
  
  // Para cada tipo (C, D, A, MGA)
  ['c', 'd', 'a', 'mga'].forEach(tipo => {
    faixas[tipo] = [];
    
    for (let i = 0; i < percentis.length; i++) {
      const percentil = percentis[i];
      const pontosMin = dados[percentil.toString()][tipo];
      
      // Determinar pontos_max: vai até o próximo percentil - 1, ou 9999 se for o último
      let pontosMax;
      if (i < percentis.length - 1) {
        const proximoPercentil = percentis[i + 1];
        const proximoValor = dados[proximoPercentil.toString()][tipo];
        pontosMax = proximoValor - 1;
      } else {
        // Último percentil: vai até um valor muito alto
        pontosMax = 9999;
      }
      
      // Garantir que pontosMin não seja maior que pontosMax
      if (pontosMin > pontosMax) {
        pontosMax = pontosMin;
      }
      
      faixas[tipo].push({
        percentil,
        pontosMin,
        pontosMax,
        classificacao: getClassificacao(percentil)
      });
    }
  });
  
  return faixas;
}

// Função para inserir tabela normativa
async function inserirTabelaNormativa(nome, criterio, valorCriterio, descricao) {
  try {
    // Verificar se já existe
    const existente = await query(`
      SELECT id FROM tabelas_normativas 
      WHERE tipo = 'rotas' AND nome = $1 AND criterio = $2
    `, [nome, criterio || '']);
    
    if (existente.rows.length > 0) {
      console.log(`⚠️  Tabela "${nome}" já existe (ID: ${existente.rows[0].id})`);
      return existente.rows[0].id;
    }
    
    const result = await query(`
      INSERT INTO tabelas_normativas (nome, tipo, versao, criterio, descricao, ativa)
      VALUES ($1, 'rotas', '2.0', $2, $3, true)
      RETURNING id
    `, [nome, criterio || null, descricao || null]);
    
    console.log(`✅ Tabela "${nome}" criada (ID: ${result.rows[0].id})`);
    return result.rows[0].id;
  } catch (error) {
    console.error(`❌ Erro ao criar tabela "${nome}":`, error.message);
    throw error;
  }
}

// Função para inserir normas de rotas
async function inserirNormasRotas(tabelaId, faixas) {
  try {
    // Limpar normas existentes
    await query('DELETE FROM normas_rotas WHERE tabela_id = $1', [tabelaId]);
    
    let totalInserido = 0;
    
    // Inserir para cada tipo de rota
    for (const [tipo, normas] of Object.entries(faixas)) {
      const rotaTipo = tipo.toUpperCase(); // C, D, A ou MGA
      
      for (const norma of normas) {
        await query(`
          INSERT INTO normas_rotas (tabela_id, rota_tipo, pontos_min, pontos_max, percentil, classificacao)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          tabelaId,
          rotaTipo,
          norma.pontosMin,
          norma.pontosMax,
          norma.percentil,
          norma.classificacao
        ]);
        totalInserido++;
      }
    }
    
    console.log(`  ✅ ${totalInserido} normas inseridas para tabela ID ${tabelaId}`);
    return totalInserido;
  } catch (error) {
    console.error(`❌ Erro ao inserir normas:`, error.message);
    throw error;
  }
}

// Função principal
async function popularTabelasRotas2() {
  console.log('🚀 Iniciando popularização das tabelas ROTAS-2...\n');
  
  try {
    let totalTabelas = 0;
    let totalNormas = 0;
    
    for (const [nomeTabela, config] of Object.entries(TABELAS_ROTAS2)) {
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
    
    console.log('✅ Popularização concluída!');
    console.log(`📈 Resumo:`);
    console.log(`   - Tabelas criadas: ${totalTabelas}`);
    console.log(`   - Normas inseridas: ${totalNormas}`);
    
  } catch (error) {
    console.error('❌ Erro durante popularização:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  popularTabelasRotas2()
    .then(() => {
      console.log('\n✅ Script concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { 
  popularTabelasRotas2,
  criarFaixasPontos,
  inserirTabelaNormativa,
  inserirNormasRotas
};

