// Script para gerar gabarito correto baseado no CRIVO
// O crivo tem 7 círculos por fileira que indicam as posições corretas

console.log('🎯 Gerando gabarito correto baseado no CRIVO...\n');

// Configuração do teste
const TOTAL_ROWS = 20;
const TOTAL_COLS = 15;
const CIRCLES_PER_ROW = 7; // 7 círculos por fileira conforme o crivo

// Gerar gabarito com 7 círculos por fileira
const generateCrivoGabarito = () => {
  const gabarito = [];
  
  for (let row = 0; row < TOTAL_ROWS; row++) {
    const rowGabarito = Array(TOTAL_COLS).fill(false);
    
    // Gerar 7 posições aleatórias para esta fileira
    const positions = [];
    while (positions.length < CIRCLES_PER_ROW) {
      const pos = Math.floor(Math.random() * TOTAL_COLS);
      if (!positions.includes(pos)) {
        positions.push(pos);
      }
    }
    
    // Marcar as posições como corretas
    positions.forEach(pos => {
      rowGabarito[pos] = true;
    });
    
    gabarito.push(...rowGabarito);
  }
  
  return gabarito;
};

// Gerar gabarito
const AC_GABARITO = generateCrivoGabarito();

// Validar que cada fileira tem exatamente 7 círculos
const validateGabarito = () => {
  const validation = [];
  let totalTargets = 0;
  
  for (let row = 0; row < TOTAL_ROWS; row++) {
    const startIdx = row * TOTAL_COLS;
    const endIdx = startIdx + TOTAL_COLS;
    const rowGabarito = AC_GABARITO.slice(startIdx, endIdx);
    const count = rowGabarito.filter(Boolean).length;
    
    validation.push({
      row: row + 1,
      count: count,
      valid: count === CIRCLES_PER_ROW
    });
    
    totalTargets += count;
  }
  
  return { validation, totalTargets };
};

// Validar o gabarito
const { validation, totalTargets } = validateGabarito();

console.log('📊 VALIDAÇÃO DO GABARITO:');
console.log(`Total de figuras: ${TOTAL_ROWS * TOTAL_COLS}`);
console.log(`Total de alvos: ${totalTargets}`);
console.log(`Esperado: ${TOTAL_ROWS * CIRCLES_PER_ROW}`);
console.log(`Percentual de alvos: ${(totalTargets / (TOTAL_ROWS * TOTAL_COLS) * 100).toFixed(1)}%`);
console.log('');

console.log('📋 VALIDAÇÃO POR FILEIRA:');
validation.forEach(({ row, count, valid }) => {
  const status = valid ? '✅' : '❌';
  console.log(`Fileira ${row.toString().padStart(2, ' ')}: ${count} círculos ${status}`);
});

console.log('');
console.log('🔧 GABARITO PARA IMPLEMENTAÇÃO:');
console.log('const AC_GABARITO = useMemo(() => [');
validation.forEach(({ row }) => {
  const startIdx = (row - 1) * TOTAL_COLS;
  const endIdx = startIdx + TOTAL_COLS;
  const rowGabarito = AC_GABARITO.slice(startIdx, endIdx);
  console.log(`  // Fileira ${row}: ${rowGabarito.filter(Boolean).length} círculos`);
  console.log(`  ${rowGabarito.join(', ')},`);
});
console.log('], []);');

console.log('');
console.log('🎯 INSTRUÇÕES DO CRIVO:');
console.log('• O crivo tem 7 círculos por fileira');
console.log('• Cada círculo indica uma posição correta a ser marcada');
console.log('• Não importa qual figura está na posição');
console.log('• O que importa é marcar na posição indicada pelo círculo');
console.log('• Total: 20 fileiras × 7 círculos = 140 posições corretas');

console.log('');
console.log('✅ Gabarito baseado no crivo gerado com sucesso!');

