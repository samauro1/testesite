// Gabarito oficial do AC - Teste de Atenção Concentrada
// Baseado no crivo oficial fornecido
const AC_GABARITO = [
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true, ,
  false, false, true, false, false, true, false, false, true, false, false, true
];

// Total de círculos que devem ser marcados
const AC_GABARITO_TOTAL = 100;

// Verificação
console.log('Total de círculos:', AC_GABARITO.length);
console.log('Círculos para marcar:', AC_GABARITO.filter(x => x).length);
console.log('Posições marcadas:', AC_GABARITO.map((val, idx) => val ? idx : null).filter(x => x !== null));