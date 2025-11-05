/**
 * Utilitário de Cálculos do Teste Palográfico
 * 
 * Implementa todas as fórmulas do Manual Técnico do Palográfico
 */

/**
 * Calcula Produtividade: total de palos em 5 minutos
 * @param {number[]} temposArray - Array com palos por minuto [min1, min2, min3, min4, min5]
 * @returns {number} Total de palos
 */
function calcularProdutividade(temposArray) {
  if (!Array.isArray(temposArray) || temposArray.length !== 5) {
    throw new Error('Requer array com 5 valores de tempos (um para cada minuto)');
  }
  
  // Validar que todos são números não negativos
  const valido = temposArray.every(val => typeof val === 'number' && val >= 0 && !isNaN(val));
  if (!valido) {
    throw new Error('Todos os valores devem ser números não negativos');
  }
  
  return temposArray.reduce((a, b) => a + b, 0);
}

/**
 * Calcula NOR (Nível Oscilação Rítmica)
 * Fórmula: (Soma das diferenças absolutas × 100) / Total de palos
 * @param {number[]} temposArray - Array com palos por minuto
 * @returns {number} NOR com uma casa decimal
 */
function calcularNOR(temposArray) {
  if (!Array.isArray(temposArray) || temposArray.length !== 5) {
    throw new Error('Requer array com 5 valores de tempos');
  }
  
  const diferencas = [];
  
  for (let i = 1; i < temposArray.length; i++) {
    diferencas.push(Math.abs(temposArray[i] - temposArray[i-1]));
  }
  
  const somaDiferencas = diferencas.reduce((a, b) => a + b, 0);
  const totalPalos = calcularProdutividade(temposArray);
  
  if (totalPalos === 0) {
    return 0;
  }
  
  const nor = (somaDiferencas * 100) / totalPalos;
  return Math.round(nor * 10) / 10; // Uma casa decimal
}

/**
 * Calcula Distância média entre palos (densidade)
 * @param {number} distanciaTotal - Distância total em mm
 * @param {number} totalPalos - Total de palos realizados
 * @returns {number} Distância média em mm (2 casas decimais)
 */
function calcularDistanciaMedia(distanciaTotal, totalPalos) {
  if (totalPalos === 0) {
    throw new Error('Total de palos não pode ser zero');
  }
  
  if (distanciaTotal < 0 || totalPalos < 0) {
    throw new Error('Distância total e total de palos devem ser não negativos');
  }
  
  const distanciaMedia = distanciaTotal / totalPalos;
  return parseFloat(distanciaMedia.toFixed(2));
}

/**
 * Calcula Tamanho médio dos palos
 * @param {number[]} palosMaiores - Array com tamanhos dos maiores palos (em mm)
 * @param {number[]} palosMenores - Array com tamanhos dos menores palos (em mm)
 * @returns {object} Objeto com médias { maiores, menores, media }
 */
function calcularTamanhoPalos(palosMaiores, palosMenores) {
  if (!Array.isArray(palosMaiores) || palosMaiores.length === 0) {
    throw new Error('Array de palos maiores é obrigatório');
  }
  
  if (!Array.isArray(palosMenores) || palosMenores.length === 0) {
    throw new Error('Array de palos menores é obrigatório');
  }
  
  const mediaGrandes = palosMaiores.reduce((a, b) => a + b, 0) / palosMaiores.length;
  const mediaMenores = palosMenores.reduce((a, b) => a + b, 0) / palosMenores.length;
  const mediaTotal = (mediaGrandes + mediaMenores) / 2;
  
  return {
    maiores: parseFloat(mediaGrandes.toFixed(1)),
    menores: parseFloat(mediaMenores.toFixed(1)),
    media: parseFloat(mediaTotal.toFixed(1)),
    maiorValor: Math.max(...palosMaiores),
    menorValor: Math.min(...palosMenores)
  };
}

/**
 * Calcula Impulsividade (diferença extrema de tamanho)
 * @param {number} paloMaiorTotal - Maior palo de todo o teste (em mm)
 * @param {number} paloMenorTotal - Menor palo de todo o teste (em mm)
 * @returns {number} Diferença em mm (1 casa decimal)
 */
function calcularImpulsividade(paloMaiorTotal, paloMenorTotal) {
  if (paloMaiorTotal < 0 || paloMenorTotal < 0) {
    throw new Error('Tamanhos dos palos devem ser não negativos');
  }
  
  const diferenca = paloMaiorTotal - paloMenorTotal;
  return parseFloat(diferenca.toFixed(1));
}

/**
 * Conta irregularidades de emotividade
 * @param {object} irregularidades - Objeto com flags de irregularidades
 * @returns {number} Contagem 0-8
 */
function calcularEmotividade(irregularidades) {
  if (!irregularidades || typeof irregularidades !== 'object') {
    return 0;
  }
  
  let contador = 0;
  const irregularidadesValidas = [
    'inclinacao',
    'pressao',
    'tamanho',
    'distancia_palos',
    'generalizadas',
    'distancia_linhas',
    'alinhamento',
    'ganhos'
  ];
  
  irregularidadesValidas.forEach(irr => {
    if (irregularidades[irr] === true) {
      contador++;
    }
  });
  
  return contador; // 0-8
}

/**
 * Classifica valor contra tabela normativa
 * @param {number} valor - Valor a classificar
 * @param {object} tabelas - Objeto com faixas de classificação
 * @returns {string} Classificação ('Muito Alta', 'Alta', 'Média', 'Baixa', 'Muito Baixa')
 */
function classificarPalografico(valor, tabelas) {
  if (!tabelas || typeof tabelas !== 'object') {
    return 'Indefinido';
  }
  
  // Produtividade
  if (tabelas.produtividade_muito_alta_min !== undefined) {
    if (valor >= tabelas.produtividade_muito_alta_min && valor <= (tabelas.produtividade_muito_alta_max || Infinity)) 
      return 'Muito Alta';
    if (valor >= tabelas.produtividade_alta_min && valor <= tabelas.produtividade_alta_max) 
      return 'Alta';
    if (valor >= tabelas.produtividade_media_min && valor <= tabelas.produtividade_media_max) 
      return 'Média';
    if (valor >= tabelas.produtividade_baixa_min && valor <= tabelas.produtividade_baixa_max) 
      return 'Baixa';
    if (valor >= tabelas.produtividade_muito_baixa_min && valor <= tabelas.produtividade_muito_baixa_max) 
      return 'Muito Baixa';
  }
  
  // NOR
  if (tabelas.nor_muito_alto_min !== undefined) {
    if (valor >= tabelas.nor_muito_alto_min && valor <= (tabelas.nor_muito_alto_max || Infinity)) 
      return 'Muito Alto';
    if (valor >= tabelas.nor_alto_min && valor <= tabelas.nor_alto_max) 
      return 'Alto';
    if (valor >= tabelas.nor_medio_min && valor <= tabelas.nor_medio_max) 
      return 'Médio';
    if (valor >= tabelas.nor_baixo_min && valor <= tabelas.nor_baixo_max) 
      return 'Baixo';
    if (valor >= tabelas.nor_muito_baixo_min && valor <= tabelas.nor_muito_baixo_max) 
      return 'Muito Baixo';
  }
  
  // Tamanho
  if (tabelas.tamanho_muito_grande_min !== undefined) {
    if (valor >= tabelas.tamanho_muito_grande_min) 
      return 'Muito Grande';
    if (valor >= tabelas.tamanho_grande_min && valor <= tabelas.tamanho_grande_max) 
      return 'Grande';
    if (valor >= tabelas.tamanho_medio_min && valor <= tabelas.tamanho_medio_max) 
      return 'Médio';
    if (valor >= tabelas.tamanho_pequeno_min && valor <= tabelas.tamanho_pequeno_max) 
      return 'Pequeno';
    if (valor >= tabelas.tamanho_muito_pequeno_min && valor <= tabelas.tamanho_muito_pequeno_max) 
      return 'Muito Pequeno';
  }
  
  // Distância
  if (tabelas.distancia_muito_ampla_min !== undefined) {
    if (valor >= tabelas.distancia_muito_ampla_min) 
      return 'Muito Ampla';
    if (valor >= tabelas.distancia_ampla_min && valor <= tabelas.distancia_ampla_max) 
      return 'Ampla';
    if (valor >= tabelas.distancia_normal_min && valor <= tabelas.distancia_normal_max) 
      return 'Normal';
    if (valor >= tabelas.distancia_estreita_min && valor <= tabelas.distancia_estreita_max) 
      return 'Estreita';
    if (valor >= tabelas.distancia_muito_estreita_min && valor <= tabelas.distancia_muito_estreita_max) 
      return 'Muito Estreita';
  }
  
  return 'Fora da faixa normativa';
}

/**
 * Gera interpretação combinada do Palográfico
 * @param {object} quantitativas - Dados quantitativos calculados
 * @param {object} qualitativas - Dados qualitativos observados
 * @param {string} contexto - Contexto de avaliação ('transito', 'rh', 'clinico')
 * @returns {object} Interpretação consolidada
 */
function gerarInterpretacaoPalografico(quantitativas, qualitativas = {}, contexto = 'transito') {
  const interpretacao = {
    produtividade: {
      valor: quantitativas.produtividade,
      classificacao: quantitativas.classificacao_produtividade || 'Não classificada',
      interpretacao: interpretarProdutividade(quantitativas.produtividade)
    },
    
    ritmo: {
      nor: quantitativas.nor,
      classificacao: quantitativas.classificacao_nor || 'Não classificada',
      interpretacao: interpretarRitmo(quantitativas.nor, quantitativas.produtividade)
    },
    
    tamanho: {
      valor: quantitativas.tamanho?.media || quantitativas.tamanho_medio,
      interpretacao: interpretarTamanho(quantitativas.tamanho?.media || quantitativas.tamanho_medio)
    },
    
    distancia: {
      valor: quantitativas.distancia_media,
      interpretacao: interpretarDistancia(quantitativas.distancia_media)
    },
    
    impulsividade: {
      valor: quantitativas.impulsividade,
      interpretacao: interpretarImpulsividade(quantitativas.impulsividade)
    },
    
    emotividade: {
      indice: quantitativas.emotividade || 0,
      interpretacao: interpretarEmotividade(quantitativas.emotividade || 0)
    },
    
    ambiente_grafico: determinarAmbienteGrafico(quantitativas, qualitativas),
    
    resumo_contextualizado: gerarResumoContexto(quantitativas, qualitativas, contexto)
  };
  
  return interpretacao;
}

function interpretarProdutividade(valor) {
  if (valor >= 900) return 'Rendimento muito superior, capacidade de produção excepcional. Indivíduo altamente produtivo.';
  if (valor >= 750) return 'Rendimento acima da média. Bom desempenho em atividades produtivas.';
  if (valor >= 600) return 'Rendimento dentro dos padrões médios esperados.';
  if (valor >= 450) return 'Rendimento abaixo da média. Menor capacidade de produção.';
  return 'Rendimento muito abaixo da média. Capacidade de produção deficiente.';
}

function interpretarRitmo(nor, produtividade) {
  if (produtividade > 750 && nor < 5) {
    return 'Bom equilíbrio rítmico. Possibilidade de acelerar rendimento sem perda de controle.';
  }
  if (produtividade > 750 && nor > 8 && nor < 10) {
    return 'Ligeiros sintomas de instabilidade. Rapidez com baixa qualidade de execução.';
  }
  if (nor > 15) {
    return 'Irregularidade clara nas tarefas. Falta de controle e instabilidade emocional significativa.';
  }
  if (nor < 2) {
    return 'Alta regularidade. Possível tendência à rigidez no comportamento.';
  }
  return 'Ritmo dentro dos padrões normais.';
}

function interpretarTamanho(valor) {
  if (!valor) return 'Tamanho não informado.';
  if (valor > 11.9) return 'Tamanho muito aumentado. Indica expansividade acentuada e possível exibicionismo.';
  if (valor >= 10.5) return 'Tamanho aumentado. Sugere segurança, generosidade e confiança em si.';
  if (valor >= 8 && valor <= 10.4) return 'Tamanho normal. Equilíbrio e ponderação nas atitudes.';
  if (valor >= 6 && valor < 8) return 'Tamanho pequeno. Revela introversão, concentração e minuciosidade.';
  return 'Tamanho muito pequeno. Indica inibição e sentimento de inadequação.';
}

function interpretarDistancia(valor) {
  if (!valor) return 'Distância não informada.';
  if (valor >= 4.0) return 'Distância muito ampla. Indica necessidade de espaço e distanciamento.';
  if (valor >= 3.0 && valor < 4.0) return 'Distância ampla. Sugere necessidade de espaço pessoal.';
  if (valor >= 2.2 && valor < 3.0) return 'Distância normal. Padrão de proximidade adequado.';
  if (valor >= 1.5 && valor < 2.2) return 'Distância estreita. Indica necessidade de proximidade.';
  return 'Distância muito estreita. Pode indicar dependência ou invasão de espaço.';
}

function interpretarImpulsividade(valor) {
  if (!valor) return 'Impulsividade não calculada.';
  if (valor > 6) return 'Alta impulsividade. Grande variação no tamanho dos traços indica instabilidade emocional.';
  if (valor > 3) return 'Impulsividade moderada. Alguma variação no controle motor.';
  return 'Impulsividade baixa. Bom controle motor e estabilidade.';
}

function interpretarEmotividade(indice) {
  if (indice >= 7) return 'Emotividade muito elevada. Muitas irregularidades indicam instabilidade emocional significativa.';
  if (indice >= 5) return 'Emotividade elevada. Presença de irregularidades que indicam desequilíbrio emocional.';
  if (indice >= 3) return 'Emotividade moderada. Algumas irregularidades presentes.';
  if (indice >= 1) return 'Emotividade leve. Poucas irregularidades.';
  return 'Emotividade controlada. Ausência de irregularidades significativas.';
}

function determinarAmbienteGrafico(quant, qual) {
  let indicadores_positivos = 0;
  let indicadores_negativos = 0;
  
  if (quant.nor && quant.nor < 10) indicadores_positivos++;
  else if (quant.nor) indicadores_negativos++;
  
  if (qual.organizacao === 'Ordenada') indicadores_positivos++;
  else if (qual.organizacao === 'Desorganizada') indicadores_negativos++;
  
  if (qual.ambiente_grafico === 'Positivo') indicadores_positivos++;
  else if (qual.ambiente_grafico === 'Negativo') indicadores_negativos++;
  
  return indicadores_positivos > indicadores_negativos ? 'Positivo' : 'Negativo';
}

function gerarResumoContexto(quant, qual, contexto) {
  const resumos = {
    transito: `No contexto de trânsito, o padrão de ${quant.produtividade > 750 ? 'alta produtividade' : 'produtividade reduzida'} com ${quant.nor && quant.nor < 10 ? 'ritmo estável' : 'ritmo instável'} sugere ${quant.produtividade > 750 && quant.nor && quant.nor < 10 ? 'aptidão adequada para condução' : 'necessidade de atenção e possível reavaliação'}.`,
    
    rh: `Para contexto ocupacional, os resultados indicam ${quant.produtividade > 750 ? 'capacidade produtiva elevada' : 'capacidade produtiva moderada'} com ${quant.nor && quant.nor < 10 ? 'estabilidade emocional adequada' : 'instabilidade que requer acompanhamento'}.`,
    
    clinico: `Clinicamente, a análise revela padrões de comportamento expressivo consistente com ${quant.emotividade && quant.emotividade > 5 ? 'instabilidade emocional' : 'equilíbrio emocional adequado'}.`
  };
  
  return resumos[contexto] || resumos.transito;
}

module.exports = {
  calcularProdutividade,
  calcularNOR,
  calcularDistanciaMedia,
  calcularTamanhoPalos,
  calcularImpulsividade,
  calcularEmotividade,
  classificarPalografico,
  gerarInterpretacaoPalografico
};

