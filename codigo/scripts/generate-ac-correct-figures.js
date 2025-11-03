// Script para gerar figuras corretas do teste AC
// Baseado na descrição detalhada das imagens

console.log('🎯 Gerando figuras corretas do teste AC...\n');

// Tipos de figuras identificadas:
// 1. ► (zeta preta, ponta direita) - DEVE SER MARCADA
// 2. ◁ (zeta contorneada branca, ponta esquerda) - DEVE SER MARCADA  
// 3. ▽ (zeta contorneada com ponto, ponta baixo) - DEVE SER MARCADA
// 4. ▼ (zeta preta, ponta baixo) - NÃO deve ser marcada
// 5. ▲ (zeta preta, ponta cima) - NÃO deve ser marcada
// 6. ◄ (zeta preta, ponta esquerda) - NÃO deve ser marcada
// 7. ▷ (zeta contorneada branca, ponta direita) - NÃO deve ser marcada
// 8. △ (zeta contorneada branca, ponta cima) - NÃO deve ser marcada

// Array com todos os tipos de figuras possíveis
const ALL_FIGURE_TYPES = [
  '►', '◁', '▽', // Figuras que DEVEM ser marcadas
  '▼', '▲', '◄', '▷', '△' // Figuras que NÃO devem ser marcadas
];

// Gerar array de 300 figuras com distribuição realística
const generateFigures = () => {
  const figures = [];
  const total = 300;
  
  // Aproximadamente 30% devem ser figuras que devem ser marcadas
  const targetCount = Math.floor(total * 0.3); // ~90 figuras
  const otherCount = total - targetCount; // ~210 figuras
  
  // Figuras que devem ser marcadas
  for (let i = 0; i < targetCount; i++) {
    const randomTarget = Math.floor(Math.random() * 3);
    figures.push(['►', '◁', '▽'][randomTarget]);
  }
  
  // Outras figuras
  for (let i = 0; i < otherCount; i++) {
    const randomOther = Math.floor(Math.random() * 5);
    figures.push(['▼', '▲', '◄', '▷', '△'][randomOther]);
  }
  
  // Embaralhar o array
  for (let i = figures.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [figures[i], figures[j]] = [figures[j], figures[i]];
  }
  
  return figures;
};

// Gerar as figuras
const AC_FIGURES = generateFigures();

// Verificar quantas figuras de cada tipo temos
const countFigures = (figures) => {
  const counts = {};
  figures.forEach(fig => {
    counts[fig] = (counts[fig] || 0) + 1;
  });
  return counts;
};

const counts = countFigures(AC_FIGURES);

console.log('📊 Distribuição das figuras:');
console.log('✅ Figuras que DEVEM ser marcadas:');
console.log(`   ► (preta direita): ${counts['►'] || 0}`);
console.log(`   ◁ (contorneada esquerda): ${counts['◁'] || 0}`);
console.log(`   ▽ (contorneada com ponto baixo): ${counts['▽'] || 0}`);
console.log('❌ Figuras que NÃO devem ser marcadas:');
console.log(`   ▼ (preta baixo): ${counts['▼'] || 0}`);
console.log(`   ▲ (preta cima): ${counts['▲'] || 0}`);
console.log(`   ◄ (preta esquerda): ${counts['◄'] || 0}`);
console.log(`   ▷ (contorneada direita): ${counts['▷'] || 0}`);
console.log(`   △ (contorneada cima): ${counts['△'] || 0}`);

const totalTarget = (counts['►'] || 0) + (counts['◁'] || 0) + (counts['▽'] || 0);
console.log(`\n🎯 Total de figuras que devem ser marcadas: ${totalTarget}`);

// Gerar array JavaScript
console.log('\n📝 Array JavaScript para copiar:');
console.log('const AC_FIGURES = [');
for (let i = 0; i < AC_FIGURES.length; i += 15) {
  const row = AC_FIGURES.slice(i, i + 15);
  console.log(`  '${row.join("', '")}',`);
}
console.log('];');

// Gerar gabarito
const TARGET_FIGURES = ['►', '◁', '▽'];
const AC_GABARITO = AC_FIGURES.map(figure => TARGET_FIGURES.includes(figure));

console.log('\n📝 Gabarito JavaScript para copiar:');
console.log('const AC_GABARITO = [');
for (let i = 0; i < AC_GABARITO.length; i += 15) {
  const row = AC_GABARITO.slice(i, i + 15);
  console.log(`  ${row.join(', ')},`);
}
console.log('];');

console.log('\n✅ Figuras geradas com sucesso!');
console.log(`📊 Total de figuras: ${AC_FIGURES.length}`);
console.log(`🎯 Total de acertos possíveis: ${AC_GABARITO.filter(x => x).length}`);
