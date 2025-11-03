// Configurações de performance do sistema

export const PERFORMANCE_CONFIG = {
  // Cache settings
  CACHE: {
    DEFAULT_STALE_TIME: 10 * 60 * 1000, // 10 minutos
    DEFAULT_GC_TIME: 15 * 60 * 1000, // 15 minutos
    DASHBOARD_STALE_TIME: 5 * 60 * 1000, // 5 minutos para dashboard
    STATIC_STALE_TIME: 30 * 60 * 1000, // 30 minutos para dados estáticos
  },
  
  // Request settings
  REQUESTS: {
    TIMEOUT: 10000, // 10 segundos
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000, // 1 segundo
  },
  
  // UI settings
  UI: {
    DEBOUNCE_DELAY: 300, // 300ms para debounce
    LOADING_MIN_TIME: 500, // Mínimo 500ms para mostrar loading
    ANIMATION_DURATION: 200, // 200ms para animações
  },
  
  // Bundle optimization
  BUNDLE: {
    CHUNK_SIZE_LIMIT: 250000, // 250KB por chunk
    VENDOR_CHUNK_SIZE: 100000, // 100KB para vendors
  }
};

// Função para debounce
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Função para throttle
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};
