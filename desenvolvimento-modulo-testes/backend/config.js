// config.js
// Template de Alta Performance para Validação Contextual de Formulários de Avaliação

module.exports = {
  // Configurações do Tesseract
  tesseract: {
    lang: 'por',
    configPath: './tessdata' // Garanta que esta pasta existe e contém o por.traineddata
  },

  // Regras de validação contextual.
  // A precisão do sistema depende diretamente da qualidade destas regras.
  // **Ajuste estas regras com base no texto exato dos seus formulários.**
  // Use ferramentas como regex101.com para testar suas Expressões Regulares.
  validationRules: [
    {
      key: 'nomeCompleto',
      label: 'Nome Completo',
      // Regex: Procura por "Nome:", "Nome Completo:", etc., com espaços e caixa alta/baixa flexíveis.
      regex: /Nome(?: Completo)?:?\s*(.+)/i,
      type: 'string',
      required: true
    },
    {
      key: 'dataAplicacao',
      label: 'Data de Aplicação',
      // Regex: Captura datas em vários formatos comuns (dd/mm/yyyy, d/m/yy, com espaços variáveis).
      regex: /Data de Aplicaç(?:ão|ao):?\s*(\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4})/i,
      type: 'date',
      required: true
    },
    {
      key: 'idade',
      label: 'Idade',
      // Regex: Procura "Idade:" e captura de 1 a 3 dígitos numéricos.
      regex: /Idade:?\s*(\d{1,3})/i,
      type: 'number',
      required: true
    },
    {
      key: 'escolaridade',
      label: 'Escolaridade',
      // Regex: Captura o texto após "Escolaridade:".
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
    // Regra CRÍTICA para o Palográfico: Extração dos 5 tempos.
    // Esta é a regra que você mais provavelmente precisará ajustar.
    // Exemplo: procura uma linha que contenha 5 grupos de números (de 2 a 4 dígitos cada).
    // É intencionalmente "solta" para encontrar os números mesmo que o rótulo falhe no OCR.
    // **Adapte esta regex para o padrão exato dos TEMPOS na sua imagem.**
    {
      key: 'temposPalografico',
      label: 'Tempos Palográfico (5 tempos)',
      // Regex mais flexível para capturar 5 números na faixa típica de tempos
      regex: /(?:\b\d{1,2}[º°o]?\s*|\b)(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\b/i,
      type: 'table_numbers',
      required: true
    }
  ],

  // Pontuação para o cálculo de precisão final.
  // Os pesos estão ajustados para priorizar a validação contextual.
  scoring: {
    baseWeightOCR: 0.3,
    agreementWeight: 0.2,
    validationWeight: 0.5, // 50% do score vem da validação bem-sucedida!
    requiredFieldBonus: 1.5
  }
};

