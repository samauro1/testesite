/**
 * Serviço de Processamento de Imagem para Teste AC
 * 
 * Este serviço implementa a correção automatizada do teste AC a partir de fotos.
 * 
 * Funcionalidades:
 * - Detecção de símbolos no grid
 * - Detecção de círculos do crivo
 * - Detecção de marcas do examinando
 * - Detecção de círculos de cancelamento
 * - Comparação e contagem (acertos, erros, omissões)
 * 
 * TODO: Implementar usando OpenCV ou biblioteca similar
 */

/**
 * Processa imagem do teste preenchido
 * @param {Buffer|string} imagemTeste - Imagem do teste preenchido (base64 ou buffer)
 * @param {Buffer|string} imagemCrivo - Imagem do crivo (base64 ou buffer, opcional)
 * @returns {Object} { acertos, erros, omissoes, detalhes }
 */
async function processarImagemAC(imagemTeste, imagemCrivo = null) {
  // TODO: Implementar processamento de imagem
  // 
  // Passos:
  // 1. Pré-processamento:
  //    - Correção de perspectiva
  //    - Ajuste de brilho/contraste
  //    - Binarização
  //
  // 2. Detecção de elementos:
  //    - Símbolos (triângulos/setas) e suas orientações
  //    - Círculos do crivo (posições corretas)
  //    - Marcas do examinando (linhas verticais/inclinadas)
  //    - Círculos de cancelamento (ao redor de marcas)
  //
  // 3. Análise:
  //    - Mapear posições de cada elemento
  //    - Comparar posições de marcas com círculos do crivo
  //    - Identificar acertos, erros, omissões
  //
  // 4. Retornar resultados

  throw new Error('Processamento de imagem ainda não implementado');
}

/**
 * Detecta símbolos no grid
 * @param {Image} imagem - Imagem processada
 * @returns {Array} [{ x, y, orientacao }, ...]
 */
function detectarSimbolos(imagem) {
  // TODO: Implementar detecção de símbolos
  // Usar OpenCV ou similar para detectar triângulos/setas
  // Classificar orientação (▲, ▼, ◀, ▶)
  return [];
}

/**
 * Detecta círculos do crivo
 * @param {Image} imagem - Imagem do crivo
 * @returns {Array} [{ x, y, raio }, ...]
 */
function detectarCirculosCrivo(imagem) {
  // TODO: Implementar detecção de círculos
  // Usar HoughCircles do OpenCV
  return [];
}

/**
 * Detecta marcas do examinando
 * @param {Image} imagem - Imagem do teste preenchido
 * @returns {Array} [{ x, y, tipo }, ...]
 */
function detectarMarcas(imagem) {
  // TODO: Implementar detecção de linhas
  // Usar HoughLines do OpenCV
  // Filtrar por cor (azul) ou contraste
  return [];
}

/**
 * Detecta círculos de cancelamento
 * @param {Image} imagem - Imagem do teste preenchido
 * @returns {Array} [{ x, y, raio, marca_vinculada }, ...]
 */
function detectarCirculosCancelamento(imagem) {
  // TODO: Implementar detecção de círculos menores
  // Verificar se há marca dentro do círculo
  return [];
}

/**
 * Compara posições e calcula acertos, erros, omissões
 * @param {Array} simbolos - Posições dos símbolos
 * @param {Array} crivoCirculos - Círculos do crivo
 * @param {Array} marcas - Marcas do examinando
 * @param {Array} cancelamentos - Círculos de cancelamento
 * @returns {Object} { acertos, erros, omissoes }
 */
function compararPosicoes(simbolos, crivoCirculos, marcas, cancelamentos) {
  let acertos = 0;
  let erros = 0;
  let omissoes = 0;

  // Encontrar última marca
  const ultimaMarca = marcas.length > 0 ? marcas[marcas.length - 1] : null;

  // Para cada símbolo
  for (const simbolo of simbolos) {
    const temCrivo = crivoCirculos.some(c => 
      Math.abs(c.x - simbolo.x) < 5 && Math.abs(c.y - simbolo.y) < 5
    );
    const temMarca = marcas.some(m => 
      Math.abs(m.x - simbolo.x) < 5 && Math.abs(m.y - simbolo.y) < 5
    );
    const temCancelamento = cancelamentos.some(c => 
      Math.abs(c.x - simbolo.x) < 10 && Math.abs(c.y - simbolo.y) < 10
    );

    // Acerto: marca presente + crivo presente + sem cancelamento
    if (temMarca && temCrivo && !temCancelamento) {
      acertos++;
    }
    // Erro: marca presente + sem crivo + sem cancelamento
    else if (temMarca && !temCrivo && !temCancelamento) {
      erros++;
    }
    // Omissão: crivo presente + sem marca (apenas até última marca)
    else if (temCrivo && !temMarca && ultimaMarca && 
             (simbolo.y <= ultimaMarca.y || simbolo.x <= ultimaMarca.x)) {
      omissoes++;
    }
  }

  return { acertos, erros, omissoes };
}

module.exports = {
  processarImagemAC,
  detectarSimbolos,
  detectarCirculosCrivo,
  detectarMarcas,
  detectarCirculosCancelamento,
  compararPosicoes
};

