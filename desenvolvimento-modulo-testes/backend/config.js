// config.js
// Template de Alta Performance para Validação Contextual de Formulários de Avaliação

const removerAcentos = (valor) =>
  valor
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

module.exports = {
  tesseract: {
    lang: 'por',
    configPath: './tessdata'
  },

  validationRules: {
    identificador: {
      required: true,
      pattern: /\b(?:ident(?:ificacao|ificação|\.?)|id\b|paciente|prontuario|registro)\s*[:\-]?\s*([a-z0-9\-\/\.]{3,})/i,
      post: (valor) => removerAcentos(valor).toUpperCase()
    },
    nomeCompleto: {
      required: true,
      pattern: /\b(?:nome(?: completo)?|paciente)\s*[:\-]?\s*([a-z\s]{3,})/i,
      post: (valor) =>
        removerAcentos(valor)
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .replace(/\b\w/g, (letra) => letra.toUpperCase())
    },
    dataAplicacao: {
      required: true,
      pattern: /\bdata(?:\s+de)?\s+aplic[aç][aã]o\s*[:\-]?\s*(\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4})/i,
      post: (valor) => valor.replace(/\s*\/\s*/g, '/')
    },
    idade: {
      required: false,
      pattern: /\bidade\s*[:\-]?\s*(\d{1,3})\b/i,
      post: (valor) => {
        const numero = parseInt(valor, 10);
        return Number.isNaN(numero) ? null : numero;
      }
    },
    escolaridade: {
      required: false,
      pattern:
        /\bescolaridade\s*[:\-]?\s*(fundamental|medio|médio|superior|pos|p[oó]s|tecnico|t[eé]cnico|graduacao|graduação)\b/i,
      post: (valor) => removerAcentos(valor).toLowerCase()
    },
    localNascimento: {
      required: false,
      pattern: /\b(?:naturalidade|local\s+de\s+nascimento|nasc\.)\s*[:\-]?\s*([a-z\s\-]{3,})/i,
      post: (valor) =>
        removerAcentos(valor)
          .replace(/\s+/g, ' ')
          .replace(/\b\w/g, (letra) => letra.toUpperCase())
    },
    temposPalografico: {
      required: true,
      pattern: /\b(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})\b/,
      post: (valores) => valores
    }
  },

  scoring: {
    baseWeightOCR: 0.3,
    agreementWeight: 0.2,
    validationWeight: 0.5,
    requiredFieldBonus: 1.5
  }
};

