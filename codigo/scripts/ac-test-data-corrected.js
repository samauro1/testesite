// Figuras do teste AC - Triângulos em diferentes orientações
const AC_FIGURES = [
  '▲', '►', '▲', '◄', '▼', '▼', '▲', '►', '▲', '▼', '◄', '►', '►', '►', '▼',
  '►', '▲', '►', '►', '◄', '▲', '▼', '▼', '▼', '◄', '►', '◄', '▲', '►', '▲',
  '◄', '▼', '►', '►', '◄', '◄', '►', '▲', '◄', '▲', '▲', '▼', '◄', '►', '◄',
  '▼', '▼', '▼', '▲', '▼', '►', '►', '◄', '▲', '▼', '◄', '►', '▼', '▼', '◄',
  '►', '◄', '►', '◄', '▲', '◄', '►', '▼', '▲', '▲', '►', '◄', '▲', '►', '▲',
  '▲', '▲', '◄', '►', '▲', '▼', '▲', '▼', '►', '▲', '◄', '▼', '▼', '▲', '▲',
  '▼', '▼', '▼', '▲', '►', '▼', '◄', '▲', '▲', '▼', '▲', '▼', '►', '▼', '◄',
  '▼', '◄', '▲', '◄', '◄', '▼', '▲', '▲', '▲', '▲', '▼', '▲', '▼', '►', '►',
  '▲', '◄', '▲', '►', '▼', '▲', '▼', '►', '▲', '◄', '►', '►', '▼', '►', '▲',
  '◄', '◄', '▲', '►', '▼', '▲', '◄', '▲', '▼', '▲', '▲', '▲', '▲', '▲', '▼',
  '▼', '▼', '◄', '◄', '►', '◄', '►', '▲', '▼', '►', '►', '►', '▲', '▼', '◄',
  '►', '◄', '▲', '▲', '▲', '▲', '◄', '◄', '◄', '►', '▼', '▼', '◄', '►', '◄',
  '◄', '◄', '◄', '▲', '►', '▲', '▼', '▲', '►', '▼', '◄', '◄', '▲', '◄', '►',
  '▼', '►', '▲', '◄', '▼', '◄', '▼', '▼', '►', '◄', '◄', '◄', '▲', '▲', '▼',
  '▲', '▼', '▼', '▼', '▼', '►', '◄', '▲', '▼', '►', '▲', '▲', '▼', '▼', '▲',
  '◄', '◄', '◄', '◄', '▲', '▲', '▼', '►', '▼', '▼', '►', '▲', '▲', '►', '►',
  '▼', '►', '▲', '▲', '▲', '▼', '◄', '◄', '▼', '▼', '◄', '◄', '►', '▼', '►',
  '▲', '▼', '▼', '▼', '◄', '▼', '▼', '▼', '◄', '▼', '▼', '▲', '▼', '▲', '▼',
  '◄', '►', '▼', '▲', '►', '▲', '▲', '◄', '▼', '►', '►', '►', '◄', '▲', '◄',
  '◄', '◄', '▲', '▲', '▲', '▲', '◄', '◄', '◄', '▲', '►', '▲', '◄', '►', '►'
];

// Gabarito oficial do AC - Posições que devem ser marcadas
const AC_GABARITO = [
  false, true, false, false, true, false, false, true, false, false, true, false, false, true, false,
  true, false, false, true, false, false, true, false, false, true, false, true, false, true, false,
  false, true, false, false, true, false, false, false, true, false, false, true, false, false, true,
  false, true, false, false, true, false, false, true, false, false, false, false, true, false, false,
  true, false, false, true, false, false, true, false, false, true, false, false, true, false, false,
  true, false, false, true, false, false, true, false, false, true, false, false, true, false, false,
  true, false, true, false, false, false, false, false, true, false, false, true, false, false, true,
  false, false, true, false, true, false, true, false, false, true, false, false, true, false, true,
  false, true, false, false, true, false, false, true, false, true, false, false, true, false, false,
  true, false, false, true, false, false, true, false, false, true, false, false, true, false, false,
  true, false, false, true, false, false, true, false, false, true, false, false, true, false, false,
  true, true, true, false, false, true, false, false, true, false, false, true, false, false, true,
  false, false, true, false, false, false, true, false, false, true, false, false, true, false, false,
  true, true, false, false, true, false, false, true, false, true, false, false, true, false, false,
  true, false, false, true, false, false, true, false, false, true, false, false, true, false, false,
  true, false, false, true, false, false, true, false, false, true, false, false, true, false, false,
  true, false, true, false, false, true, false, false, true, false, false, true, false, false, true,
  false, false, true, false, false, false, true, false, false, true, false, false, true, false, false,
  true, false, false, true, false, false, true, false, false, true, false, false, true, false, false,
  true, false, false, true, true, false, true, false, false, true, false, false, true, false, false
];

// Total de figuras que devem ser marcadas
const AC_GABARITO_TOTAL = 102;
