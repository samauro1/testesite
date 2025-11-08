/**
 * Wrapper legado para manter compatibilidade com módulos que ainda
 * importam `../utils/aiAnalyzer`. A lógica principal foi migrada para
 * `../image-analyzer`.
 */

const { analisarImagemTeste } = require('../image-analyzer');

module.exports = {
  analisarImagemTeste
};

