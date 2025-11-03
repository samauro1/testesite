/**
 * Cache simples de sessão para reuso de cookies do login DETRAN
 * Implementação em memória (pode ser migrado para Redis depois)
 */

// Cache em memória (Map)
const sessionCache = new Map();

/**
 * TTL padrão de sessão: 45 minutos (em segundos)
 */
const DEFAULT_TTL_SECONDS = 45 * 60;

/**
 * Limpa entradas expiradas do cache periodicamente
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of sessionCache.entries()) {
    if (entry.expiresAt < now) {
      sessionCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Limpar a cada 5 minutos

/**
 * Obtém cookies salvos se ainda válidos
 * 
 * @param {string} usuarioId - ID do usuário (chave do cache)
 * @returns {Promise<Array|null>} Array de cookies ou null se expirado/inexistente
 */
async function getCachedCookies(usuarioId) {
  const entry = sessionCache.get(`detran:${usuarioId}`);
  
  if (!entry) {
    return null;
  }
  
  // Verificar se expirou
  if (entry.expiresAt < Date.now()) {
    sessionCache.delete(`detran:${usuarioId}`);
    return null;
  }
  
  return entry.cookies;
}

/**
 * Salva cookies no cache com TTL
 * 
 * @param {string} usuarioId - ID do usuário
 * @param {Array} cookies - Array de cookies do Puppeteer
 * @param {number} ttlSeconds - TTL em segundos (padrão: 45 min)
 * @returns {Promise<void>}
 */
async function setCachedCookies(usuarioId, cookies, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const expiresAt = Date.now() + (ttlSeconds * 1000);
  
  sessionCache.set(`detran:${usuarioId}`, {
    cookies,
    expiresAt,
    createdAt: Date.now()
  });
}

/**
 * Remove cookies do cache (força novo login)
 * 
 * @param {string} usuarioId - ID do usuário
 * @returns {Promise<void>}
 */
async function clearCachedCookies(usuarioId) {
  sessionCache.delete(`detran:${usuarioId}`);
}

/**
 * Limpa todo o cache (útil para testes ou reset)
 * 
 * @returns {Promise<void>}
 */
async function clearAllCache() {
  sessionCache.clear();
}

/**
 * Obtém estatísticas do cache
 * 
 * @returns {Object} Estatísticas do cache
 */
function getCacheStats() {
  const now = Date.now();
  let active = 0;
  let expired = 0;
  
  for (const entry of sessionCache.values()) {
    if (entry.expiresAt < now) {
      expired++;
    } else {
      active++;
    }
  }
  
  return {
    total: sessionCache.size,
    active,
    expired,
    maxSize: 1000 // Limite teórico (ajustar se necessário)
  };
}

module.exports = {
  getCachedCookies,
  setCachedCookies,
  clearCachedCookies,
  clearAllCache,
  getCacheStats
};

