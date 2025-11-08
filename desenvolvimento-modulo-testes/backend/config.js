/**
 * Configurações do OCR interno e regras de validação contextual.
 * Ajuste as expressões regulares conforme o layout da folha Palográfica.
 */
module.exports = {
  tesseract: {
    lang: 'por',
    configPath: './tessdata'
  },

  validationRules: [
    {
      key: 'nomeCompleto',
      label: 'Nome Completo',
      regex: /Nome(?: Completo)?:?\s*(.+)/i,
      type: 'string',
      required: true
    },
    {
      key: 'dataAplicacao',
      label: 'Data de Aplicação',
      regex: /Data de Aplicaç(?:ão|ao):?\s*(\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4})/i,
      type: 'date',
      required: true
    },
    {
      key: 'idade',
      label: 'Idade',
      regex: /Idade:?\s*(\d{1,3})/i,
      type: 'number',
      required: true
    },
    {
      key: 'escolaridade',
      label: 'Escolaridade',
      regex: /Escolaridade:?\s*(.+)/i,
      type: 'string',
      required: false
    },
    {
      key: 'localNascimento',
      label: 'Local de Nascimento',
      regex: /Local de Nascimento:?\s*([a-zA-Z\s,.-]+)/i,
      type: 'string',
      required: false
    },
    {
      key: 'temposPalografico',
      label: 'Tempos Palográfico (5 tempos)',
      regex: /\b(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\b/i,
      type: 'table_numbers',
      required: true
    }
  ],

  scoring: {
    baseWeightOCR: 0.3,
    agreementWeight: 0.2,
    validationWeight: 0.5,
    requiredFieldBonus: 1.5
  }
};

