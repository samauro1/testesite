/**
 * Tipos de erros específicos do DETRAN para mapeamento de status HTTP
 */

class DetranError extends Error {
  constructor(message, tipo, statusCode = 500) {
    super(message);
    this.name = 'DetranError';
    this.tipo = tipo;
    this.statusCode = statusCode;
  }
}

/**
 * Erro de autenticação (credenciais inválidas)
 */
class DetranAuthError extends DetranError {
  constructor(message = 'Credenciais inválidas') {
    super(message, 'auth', 401);
    this.name = 'DetranAuthError';
  }
}

/**
 * Erro de CAPTCHA detectado
 */
class DetranCaptchaError extends DetranError {
  constructor(message = 'CAPTCHA detectado no login do DETRAN. É necessária intervenção manual.') {
    super(message, 'captcha', 409);
    this.name = 'DetranCaptchaError';
  }
}

/**
 * Erro de seletores (estrutura da página mudou)
 */
class DetranSelectorError extends DetranError {
  constructor(message = 'Estrutura da página do DETRAN mudou. Seletores não encontrados.') {
    super(message, 'selectors', 422);
    this.name = 'DetranSelectorError';
  }
}

/**
 * Erro de timeout
 */
class DetranTimeoutError extends DetranError {
  constructor(message = 'Timeout ao aguardar resposta do DETRAN') {
    super(message, 'timeout', 504);
    this.name = 'DetranTimeoutError';
  }
}

/**
 * Erro de rede/indisponibilidade
 */
class DetranNetworkError extends DetranError {
  constructor(message = 'Erro de rede ou serviço DETRAN indisponível') {
    super(message, 'network', 503);
    this.name = 'DetranNetworkError';
  }
}

/**
 * Mapeia erro genérico para tipo específico
 */
function mapErrorToType(error) {
  const msg = error.message?.toLowerCase() || '';
  
  if (msg.includes('captcha') || msg.includes('recaptcha')) {
    return new DetranCaptchaError(error.message);
  }
  
  if (msg.includes('credencial') || msg.includes('senha inválida') || msg.includes('usuário inválido')) {
    return new DetranAuthError(error.message);
  }
  
  if (msg.includes('timeout') || msg.includes('time')) {
    return new DetranTimeoutError(error.message);
  }
  
  if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('eaddrinfo')) {
    return new DetranNetworkError(error.message);
  }
  
  if (msg.includes('seletor') || msg.includes('não foi possível encontrar') || msg.includes('estrutura')) {
    return new DetranSelectorError(error.message);
  }
  
  // Erro genérico
  return error;
}

module.exports = {
  DetranError,
  DetranAuthError,
  DetranCaptchaError,
  DetranSelectorError,
  DetranTimeoutError,
  DetranNetworkError,
  mapErrorToType
};

