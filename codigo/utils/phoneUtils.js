/**
 * Utilitário para processamento de telefones brasileiros
 * Formato Anatel/E.164: +55 (XX) 9XXXX-XXXX (celular) ou +55 (XX) XXXX-XXXX (fixo)
 * Armazena sem máscara no BD, formata no frontend
 */

/**
 * Detecta se um número é celular ou fixo
 * @param {string} numero - Número sem máscara (apenas dígitos)
 * @returns {boolean} - true se for celular (9 dígitos após DDD), false se for fixo
 */
function isCelular(numero) {
  if (!numero) return false;
  
  const numeros = numero.replace(/\D/g, '');
  if (numeros.length < 8) return false;
  
  // Remove código do país (55) se presente
  let numeroLimpo = numeros;
  if (numeros.startsWith('55') && numeros.length > 11) {
    numeroLimpo = numeros.substring(2);
  }
  
  // Números brasileiros:
  // Fixo: 10 dígitos (DDD 2 + número 8)
  // Celular: 11 dígitos (DDD 2 + número 9, onde o 9º dígito começa com 6, 7, 8 ou 9)
  
  if (numeroLimpo.length === 11) {
    // Tem 11 dígitos - verificar se o 3º dígito (primeiro do número) é 6, 7, 8 ou 9
    const primeiroDigitoNumero = numeroLimpo[2]; // Após o DDD (2 dígitos)
    return ['6', '7', '8', '9'].includes(primeiroDigitoNumero);
  } else if (numeroLimpo.length === 10) {
    // Tem 10 dígitos - é fixo
    return false;
  } else if (numeroLimpo.length === 9) {
    // 9 dígitos sem DDD - verificar primeiro dígito
    const primeiroDigito = numeroLimpo[0];
    return ['6', '7', '8', '9'].includes(primeiroDigito);
  } else if (numeroLimpo.length === 8) {
    // 8 dígitos sem DDD - é fixo
    return false;
  }
  
  return false;
}

/**
 * Normaliza número de telefone removendo formatação
 * @param {string} telefone - Telefone com ou sem formatação
 * @returns {string} - Número apenas com dígitos (sem máscara)
 */
function normalizarTelefone(telefone) {
  if (!telefone) return null;
  
  // Remove todos os caracteres não numéricos
  return telefone.replace(/\D/g, '');
}

/**
 * Formata número de telefone brasileiro para exibição
 * @param {string} numero - Número sem máscara
 * @param {boolean} incluirDDD - Se deve incluir DDD na formatação
 * @returns {string} - Telefone formatado: (XX) 9XXXX-XXXX ou (XX) XXXX-XXXX
 */
function formatarTelefone(numero, incluirDDD = true) {
  if (!numero) return '';
  
  const numeros = normalizarTelefone(numero);
  if (!numeros || numeros.length < 8) return numero;
  
  // Remove código do país se presente
  let numeroFormatado = numeros;
  if (numeros.startsWith('55') && numeros.length > 11) {
    numeroFormatado = numeros.substring(2);
  }
  
  // Se tem DDD (10 ou 11 dígitos)
  if (numeroFormatado.length >= 10) {
    const ddd = numeroFormatado.substring(0, 2);
    const numeroSemDDD = numeroFormatado.substring(2);
    
    if (numeroSemDDD.length === 9) {
      // Celular: (XX) 9XXXX-XXXX
      if (incluirDDD) {
        return `(${ddd}) ${numeroSemDDD.substring(0, 5)}-${numeroSemDDD.substring(5)}`;
      } else {
        return `${numeroSemDDD.substring(0, 5)}-${numeroSemDDD.substring(5)}`;
      }
    } else if (numeroSemDDD.length === 8) {
      // Fixo: (XX) XXXX-XXXX
      if (incluirDDD) {
        return `(${ddd}) ${numeroSemDDD.substring(0, 4)}-${numeroSemDDD.substring(4)}`;
      } else {
        return `${numeroSemDDD.substring(0, 4)}-${numeroSemDDD.substring(4)}`;
      }
    }
  }
  
  // Se não tem DDD (8 ou 9 dígitos)
  if (numeroFormatado.length === 9) {
    // Celular: 9XXXX-XXXX
    return `${numeroFormatado.substring(0, 5)}-${numeroFormatado.substring(5)}`;
  } else if (numeroFormatado.length === 8) {
    // Fixo: XXXX-XXXX
    return `${numeroFormatado.substring(0, 4)}-${numeroFormatado.substring(4)}`;
  }
  
  return numero; // Retorna original se não conseguir formatar
}

/**
 * Processa telefones de vários formatos e separa fixo/celular
 * Aceita: "1126140032", "11975457665", "1126140032 / 11975457665", ["1126140032","11975457665"]
 * @param {string|Array} telefones - Telefone(s) em qualquer formato
 * @param {string} dddPadrao - DDD padrão se não houver (ex: "11")
 * @returns {Object} - { telefone_fixo: string|null, telefone_celular: string|null }
 */
function processarTelefones(telefones, dddPadrao = '11') {
  let telefoneFixo = null;
  let telefoneCelular = null;
  
  if (!telefones) {
    return { telefone_fixo: null, telefone_celular: null };
  }
  
  // Se for array ou string JSON, converter
  let listaTelefones = [];
  if (Array.isArray(telefones)) {
    listaTelefones = telefones;
  } else if (typeof telefones === 'string') {
    // Verificar se é uma string JSON (começa com [ ou {)
    if (telefones.trim().startsWith('[') || telefones.trim().startsWith('{')) {
      try {
        // Tenta fazer parse de JSON
        const parsed = JSON.parse(telefones);
        if (Array.isArray(parsed)) {
          listaTelefones = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Se for objeto, tentar extrair arrays
          Object.values(parsed).forEach(val => {
            if (Array.isArray(val)) {
              listaTelefones.push(...val);
            }
          });
        } else {
          listaTelefones = [telefones];
        }
      } catch {
        // Se falhar o parse, tratar como string normal
        listaTelefones = [telefones];
      }
    } else {
      // Se não for JSON, tratar como string
      // Remove formatação e separa por / ou espaço
      if (telefones.includes('/')) {
        listaTelefones = telefones.split('/').map(t => t.trim());
      } else if (telefones.includes(' ') && telefones.length > 12) {
        listaTelefones = telefones.split(/\s+/).filter(t => t.trim());
      } else {
        listaTelefones = [telefones];
      }
    }
  } else {
    listaTelefones = [telefones];
  }
  
  // Processar cada telefone
  for (let tel of listaTelefones) {
    if (!tel || tel.trim() === '') continue;
    
    // Normalizar (remover máscara)
    const numeroLimpo = normalizarTelefone(tel);
    if (!numeroLimpo || numeroLimpo.length < 8) continue;
    
    let numeroCompleto = numeroLimpo;
    
    // Se não tem DDD (8 ou 9 dígitos), adiciona DDD padrão
    if (numeroLimpo.length === 8 || numeroLimpo.length === 9) {
      numeroCompleto = dddPadrao + numeroLimpo;
    }
    
    // Remove código do país se presente
    if (numeroCompleto.startsWith('55') && numeroCompleto.length > 11) {
      numeroCompleto = numeroCompleto.substring(2);
    }
    
    // Verifica se é celular ou fixo
    if (isCelular(numeroCompleto)) {
      if (!telefoneCelular) {
        telefoneCelular = numeroCompleto; // Salva sem máscara no BD
      }
    } else {
      if (!telefoneFixo) {
        telefoneFixo = numeroCompleto; // Salva sem máscara no BD
      }
    }
  }
  
  return {
    telefone_fixo: telefoneFixo,
    telefone_celular: telefoneCelular
  };
}

/**
 * Converte telefones processados para formato de exibição no frontend
 * @param {string|null} telefoneFixo - Telefone fixo sem máscara
 * @param {string|null} telefoneCelular - Telefone celular sem máscara
 * @returns {Object} - { telefone_fixo_formatado: string, telefone_celular_formatado: string }
 */
function formatarTelefonesParaFrontend(telefoneFixo, telefoneCelular) {
  return {
    telefone_fixo_formatado: telefoneFixo ? formatarTelefone(telefoneFixo) : null,
    telefone_celular_formatado: telefoneCelular ? formatarTelefone(telefoneCelular) : null
  };
}

/**
 * Gera link WhatsApp para celular
 * @param {string} telefoneCelular - Telefone celular sem máscara
 * @returns {string} - Link WhatsApp
 */
function gerarLinkWhatsApp(telefoneCelular) {
  if (!telefoneCelular) return null;
  
  const numero = normalizarTelefone(telefoneCelular);
  
  // Remove código do país se presente e adiciona 55
  let numeroWhatsApp = numero;
  if (!numero.startsWith('55')) {
    numeroWhatsApp = '55' + numero;
  }
  
  return `https://wa.me/${numeroWhatsApp}`;
}

/**
 * Gera link para chamada telefônica
 * @param {string} telefone - Telefone sem máscara
 * @returns {string} - Link tel:
 */
function gerarLinkTelefone(telefone) {
  if (!telefone) return null;
  
  const numero = normalizarTelefone(telefone);
  
  // Remove código do país se presente
  let numeroChamada = numero;
  if (numero.startsWith('55') && numero.length > 11) {
    numeroChamada = numero.substring(2);
  }
  
  return `tel:${numeroChamada}`;
}

module.exports = {
  isCelular,
  normalizarTelefone,
  formatarTelefone,
  processarTelefones,
  formatarTelefonesParaFrontend,
  gerarLinkWhatsApp,
  gerarLinkTelefone
};

