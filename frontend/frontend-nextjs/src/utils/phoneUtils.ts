// Utilitários para processamento de números telefônicos

export interface ProcessedPhone {
  fixed?: string;
  mobile?: string;
  original: string;
}

/**
 * Processa uma string de telefone que pode conter múltiplos números separados por "/"
 * Exemplo: "2478-5827 / (11) 98386-3866" -> { fixed: "24785827", mobile: "11983863866" }
 */
export function parsePhoneNumbers(phoneString: string): ProcessedPhone {
  if (!phoneString || phoneString.trim() === '') {
    return { original: phoneString };
  }

  // Dividir por "/" para separar os números
  const parts = phoneString.split('/').map(part => part.trim());
  
  const result: ProcessedPhone = {
    original: phoneString
  };

  for (const part of parts) {
    if (!part) continue;

    // Remover todos os caracteres não numéricos para análise
    const cleanNumber = part.replace(/\D/g, '');
    
    if (cleanNumber.length === 0) continue;

    // Identificar se é celular (11 dígitos) ou fixo (8-10 dígitos)
    if (cleanNumber.length === 11 && cleanNumber.startsWith('11')) {
      // Celular: 11XXXXXXXXX
      result.mobile = cleanNumber;
    } else if (cleanNumber.length >= 8 && cleanNumber.length <= 10) {
      // Telefone fixo: 8-10 dígitos
      result.fixed = cleanNumber;
    } else if (cleanNumber.length === 11 && !cleanNumber.startsWith('11')) {
      // Celular com DDD diferente de 11
      result.mobile = cleanNumber;
    } else if (cleanNumber.length === 10) {
      // Telefone fixo com DDD
      result.fixed = cleanNumber;
    }
  }

  return result;
}

/**
 * Aplica máscara para telefone fixo
 * Exemplo: "24785827" -> "2478-5827"
 */
export function maskFixedPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  
  const clean = phone.replace(/\D/g, '');
  
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  } else if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  
  return clean;
}

/**
 * Aplica máscara para celular
 * Exemplo: "11983863866" -> "(11) 98386-3866"
 */
export function maskMobilePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  
  const clean = phone.replace(/\D/g, '');
  
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  
  return clean;
}


/**
 * Combina números telefônicos para armazenamento
 * Exemplo: { fixed: "24785827", mobile: "11983863866" } -> "24785827/11983863866"
 */
export function combinePhoneNumbers(processed: ProcessedPhone): string {
  const parts: string[] = [];
  
  if (processed.fixed) {
    parts.push(processed.fixed);
  }
  
  if (processed.mobile) {
    parts.push(processed.mobile);
  }
  
  return parts.join('/');
}

/**
 * Gera link do WhatsApp para celular
 */
export function generateWhatsAppLink(phone: string): string {
  if (!phone) return '';
  
  const clean = phone.replace(/\D/g, '');
  
  if (clean.length === 11) {
    return `https://wa.me/55${clean}`;
  } else if (clean.length === 10) {
    return `https://wa.me/5511${clean}`;
  }
  
  return '';
}

/**
 * Valida se um número de telefone é válido
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  
  const clean = phone.replace(/\D/g, '');
  
  // Telefone fixo: 8-10 dígitos
  if (clean.length >= 8 && clean.length <= 10) {
    return true;
  }
  
  // Celular: 11 dígitos
  if (clean.length === 11) {
    return true;
  }
  
  return false;
}

/**
 * Detecta o tipo de telefone (fixo ou celular)
 */
export function getPhoneType(phone: string): 'fixed' | 'mobile' | 'unknown' {
  if (!phone) return 'unknown';
  
  const clean = phone.replace(/\D/g, '');
  
  if (clean.length === 11) {
    return 'mobile';
  } else if (clean.length >= 8 && clean.length <= 10) {
    return 'fixed';
  }
  
  return 'unknown';
}

/**
 * Remove todos os caracteres não numéricos do telefone
 * Exemplo: "(11) 98386-3866" -> "11983863866"
 */
export function cleanPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '');
}

/**
 * Aplica máscara para telefone baseado no tipo detectado
 * Exemplo: "11983863866" -> "(11) 98386-3866"
 */
export function applyPhoneMask(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  
  const clean = cleanPhone(phone);
  
  if (clean.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    // Telefone fixo com DDD: (XX) XXXX-XXXX
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  } else if (clean.length === 8) {
    // Telefone fixo sem DDD: XXXX-XXXX
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  
  return clean;
}

/**
 * Formata telefone para exibição com suporte a múltiplos números
 * Exemplo: "24785827/11983863866" -> "2478-5827 / (11) 98386-3866"
 */
export function formatPhoneDisplay(phone: string | ProcessedPhone): string {
  if (!phone) return '';
  
  // Se é um objeto ProcessedPhone, formata usando as funções existentes
  if (typeof phone === 'object' && 'fixed' in phone && 'mobile' in phone) {
    const parts: string[] = [];
    
    if (phone.fixed) {
      parts.push(maskFixedPhone(phone.fixed));
    }
    
    if (phone.mobile) {
      parts.push(maskMobilePhone(phone.mobile));
    }
    
    return parts.join(' / ');
  }
  
  // Se é string e contém "/", processa como múltiplos números
  if (typeof phone === 'string' && phone.includes('/')) {
    const processed = parsePhoneNumbers(phone);
    return formatPhoneDisplay(processed);
  }
  
  // Aplica máscara baseada no tamanho
  const clean = cleanPhone(phone as string);
  
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  } else if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  
  return clean;
}