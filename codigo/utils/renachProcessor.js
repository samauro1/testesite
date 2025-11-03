const RenachProcessorUniversal = require('./renachProcessorUniversal');

class RenachProcessor {
  constructor() {
    this.universalProcessor = new RenachProcessorUniversal();
  }

  /**
   * Processa um PDF RENACH e extrai informações
   * @param {string} base64Pdf - PDF em base64
   * @returns {Object} Dados extraídos
   */
  async processRenach(base64Pdf) {
    console.log('🔄 Usando processador universal RENACH...');
    return await this.universalProcessor.processRenach(base64Pdf);
  }
}

module.exports = RenachProcessor;