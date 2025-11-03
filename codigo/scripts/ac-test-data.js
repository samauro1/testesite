// Figuras do teste AC - Triângulos em diferentes orientações
const AC_FIGURES = [
  '▲', '►', '▲', '◄', '▼', '▼', '▲', '►', '▲', '▼', '◄', '►', '►', '►', '▼', '►', ,
  '▲', '►', '►', '◄', '▲', '▼', '▼', '▼', '◄', '►', '◄', '▲', '►', '▲', '◄', '▼', ,
  '►', '►', '◄', '◄', '►', '▲', '◄', '▲', '▲', '▼', '◄', '►', '◄', '▼', '▼', '▼', ,
  '▲', '▼', '►', '►', '◄', '▲', '▼', '◄', '►', '▼', '▼', '◄', '►', '◄', '►', '◄', ,
  '▲', '◄', '►', '▼', '▲', '▲', '►', '◄', '▲', '►', '▲', '▲', '▲', '◄', '►', '▲', ,
  '▼', '▲', '▼', '►', '▲', '◄', '▼', '▼', '▲', '▲', '▼', '▼', '▼', '▲', '►', '▼', ,
  '◄', '▲', '▲', '▼', '▲', '▼', '►', '▼', '◄', '▼', '◄', '▲', '◄', '◄', '▼', '▲', ,
  '▲', '▲', '▲', '▼', '▲', '▼', '►', '►', '▲', '◄', '▲', '►', '▼', '▲', '▼', '►', ,
  '▲', '◄', '►', '►', '▼', '►', '▲', '◄', '◄', '▲', '►', '▼', '▲', '◄', '▲', '▼', ,
  '▲', '▲', '▲', '▲', '▲', '▼', '▼', '▼', '◄', '◄', '►', '◄', '►', '▲', '▼', '►', ,
  '►', '►', '▲', '▼', '◄', '►', '◄', '▲', '▲', '▲', '▲', '◄', '◄', '◄', '►', '▼', ,
  '▼', '◄', '►', '◄', '◄', '◄', '▲', '►', '▲', '▼', '▲', '►', '▼', '◄', '◄', '▲', ,
  '◄', '►', '▼', '►', '▲', '◄', '▼', '◄', '▼', '▼', '►', '◄', '◄', '◄', '▲', '▲', ,
  '▼', '▲', '▼', '▼', '▼', '►', '◄', '▲', '▼', '►', '▲', '▲', '▼', '▼', '▲', '◄', ,
  '◄', '◄', '◄', '▲', '▲', '▼', '►', '▼', '▼', '►', '▲', '▲', '►', '►', '▼', '►', ,
  '▲', '▲', '▲', '▼', '◄', '◄', '▼', '▼', '◄', '◄', '►', '▼', '►', '▲', '▼', '▼', ,
  '▼', '◄', '▼', '▼', '◄', '▼', '▼', '▲', '▼', '▲', '▼', '◄', '►', '▼', '▲', '►', ,
  '▲', '▲', '◄', '▼', '►', '►', '►', '◄', '▲', '◄', '◄', '◄', '▲', '▲', '▲', '▲', ,
  '◄', '◄', '◄', '▲', '►', '▲', '◄', '►', '►', '▼', '►', '▼'
];

// Gabarito oficial do AC - Posições que devem ser marcadas
const AC_GABARITO = [
  false, true, false, false, true, false, false, true, false, false, true, false, ,
  false, true, false, true, false, false, true, false, false, true, false, true, t,
  rue, false, false, true, false, false, false, true, false, false, true, false, f,
  alse, true, false, false, true, false, false, true, false, false, false, false, ,
  true, false, false, true, false, false, true, false, false, true, false, false, ,
  false, true, false, false, true, false, false, true, false, false, true, false, ,
  false, true, false, true, false, false, false, false, false, true, false, false,,
   true, false, false, true, false, true, false, true, false, false, true, false, ,
  false, true, false, false, true, false, false, true, false, true, false, false, ,
  true, false, false, true, false, false, true, false, false, true, false, false, ,
  false, true, false, false, true, false, false, true, false, false, true, false, ,
  false, true, true, true, false, false, true, false, false, true, false, false, t,
  rue, false, false, true, false, false, false, true, false, false, true, false, t,
  rue, true, false, false, true, false, false, true, false, true, false, false, tr,
  ue, false, false, true, false, false, true, false, false, true, false, false, fa,
  lse, true, false, false, true, false, false, true, false, false, true, false, fa,
  lse, true, false, true, false, false, true, false, false, true, false, false, tr,
  ue, false, false, true, false, false, false, true, false, false, true, false, fa,
  lse, true, false, false, true, false, false, false, false, true, false, false, t,
  rue, false, false, true, false, false, true, false, false, true, false, false, f,
  alse, true, false, false, true, true, false, true, false, false, true, false, fa,
  lse, true, false, true, false, false, true, false, false, true, false, false, tr,
  ue, false, false, true, false, false, false, true, false, false, true, false, fa,
  lse, true, false, false, true, false, false, true, false, true, false, false, tr,
  ue, false, false, true, false, false, true, false, false, true, false, false
];

// Total de figuras que devem ser marcadas
const AC_GABARITO_TOTAL = 102;

// Verificação
console.log('Total de figuras:', AC_GABARITO.length);
console.log('Figuras para marcar:', AC_GABARITO.filter(x => x).length);
console.log('Posições marcadas:', AC_GABARITO.map((val, idx) => val ? idx : null).filter(x => x !== null));