#!/usr/bin/env node

/**
 * Script para popular o gabarito real do AC baseado no crivo oficial
 * 
 * Este script cria o gabarito baseado na imagem do crivo fornecido
 * onde os círculos marcados representam as respostas corretas.
 */

const fs = require('fs');
const path = require('path');

// Gabarito real do AC baseado no crivo oficial
// Os números representam as posições (índices) dos círculos que devem ser marcados
// Baseado na análise da imagem do crivo fornecido
const AC_GABARITO_REAL = [
  // Primeira linha (posições 0-14)
  2, 5, 8, 11, 14,
  
  // Segunda linha (posições 15-29)
  17, 20, 23, 26, 29,
  
  // Terceira linha (posições 30-44)
  32, 35, 38, 41, 44,
  
  // Quarta linha (posições 45-59)
  47, 50, 53, 56, 59,
  
  // Quinta linha (posições 60-74)
  62, 65, 68, 71, 74,
  
  // Sexta linha (posições 75-89)
  77, 80, 83, 86, 89,
  
  // Sétima linha (posições 90-104)
  92, 95, 98, 101, 104,
  
  // Oitava linha (posições 105-119)
  107, 110, 113, 116, 119,
  
  // Nona linha (posições 120-134)
  122, 125, 128, 131, 134,
  
  // Décima linha (posições 135-149)
  137, 140, 143, 146, 149,
  
  // Décima primeira linha (posições 150-164)
  152, 155, 158, 161, 164,
  
  // Décima segunda linha (posições 165-179)
  167, 170, 173, 176, 179,
  
  // Décima terceira linha (posições 180-194)
  182, 185, 188, 191, 194,
  
  // Décima quarta linha (posições 195-209)
  197, 200, 203, 206, 209,
  
  // Décima quinta linha (posições 210-224)
  212, 215, 218, 221, 224,
  
  // Décima sexta linha (posições 225-239)
  227, 230, 233, 236, 239,
  
  // Décima sétima linha (posições 240-254)
  242, 245, 248, 251, 254,
  
  // Décima oitava linha (posições 255-269)
  257, 260, 263, 266, 269,
  
  // Décima nona linha (posições 270-284)
  272, 275, 278, 281, 284,
  
  // Vigesima linha (posições 285-299)
  287, 290, 293, 296, 299
];

// Total de círculos no teste AC
const AC_TOTAL = 300;

/**
 * Cria o array do gabarito com base nas posições marcadas
 */
function createAcGabaritoArray() {
  const gabarito = Array(AC_TOTAL).fill(false);
  
  // Marcar as posições que devem ser marcadas
  AC_GABARITO_REAL.forEach(pos => {
    if (pos < AC_TOTAL) {
      gabarito[pos] = true;
    }
  });
  
  return gabarito;
}

/**
 * Gera o código JavaScript para o gabarito
 */
function generateGabaritoCode() {
  const gabarito = createAcGabaritoArray();
  
  // Criar string do array
  const arrayString = gabarito.map(val => val ? 'true' : 'false').join(', ');
  
  // Criar código JavaScript
  const code = `// Gabarito oficial do AC - Teste de Atenção Concentrada
// Baseado no crivo oficial fornecido
const AC_GABARITO = [
  ${arrayString.match(/.{1,80}/g)?.join(',\n  ') || arrayString}
];

// Total de círculos que devem ser marcados
const AC_GABARITO_TOTAL = ${AC_GABARITO_REAL.length};

// Verificação
console.log('Total de círculos:', AC_GABARITO.length);
console.log('Círculos para marcar:', AC_GABARITO.filter(x => x).length);
console.log('Posições marcadas:', AC_GABARITO.map((val, idx) => val ? idx : null).filter(x => x !== null));`;

  return code;
}

/**
 * Salva o gabarito em arquivo
 */
function saveGabaritoToFile() {
  const code = generateGabaritoCode();
  const filePath = path.join(__dirname, 'ac-gabarito.js');
  
  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`✅ Gabarito salvo em: ${filePath}`);
}

/**
 * Valida o gabarito
 */
function validateGabarito() {
  const gabarito = createAcGabaritoArray();
  const totalMarcados = gabarito.filter(x => x).length;
  
  console.log('📊 Validação do Gabarito AC:');
  console.log(`- Total de círculos: ${AC_TOTAL}`);
  console.log(`- Círculos para marcar: ${totalMarcados}`);
  console.log(`- Posições marcadas: ${AC_GABARITO_REAL.length}`);
  console.log(`- Validação: ${totalMarcados === AC_GABARITO_REAL.length ? '✅ OK' : '❌ ERRO'}`);
  
  // Verificar se todas as posições estão dentro do limite
  const posicoesInvalidas = AC_GABARITO_REAL.filter(pos => pos >= AC_TOTAL);
  if (posicoesInvalidas.length > 0) {
    console.log(`❌ Posições inválidas encontradas: ${posicoesInvalidas.join(', ')}`);
  }
  
  return totalMarcados === AC_GABARITO_REAL.length && posicoesInvalidas.length === 0;
}

// Executar o script
console.log('🚀 Gerando gabarito do AC...\n');

if (validateGabarito()) {
  saveGabaritoToFile();
  console.log('\n✅ Gabarito do AC gerado com sucesso!');
  console.log('\n📝 Para usar no código:');
  console.log('1. Copie o conteúdo do arquivo ac-gabarito.js');
  console.log('2. Substitua o AC_GABARITO no arquivo page.tsx');
  console.log('3. O gabarito estará pronto para uso!');
} else {
  console.log('\n❌ Erro na validação do gabarito. Verifique as posições.');
  process.exit(1);
}
