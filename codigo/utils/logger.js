/**
 * Sistema de logging configurável para o sistema
 * Níveis: error, warn, info, debug
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Nível padrão: INFO (mostra error, warn e info)
// Para ver todos os logs, usar DEBUG
// Para produção, usar WARN ou ERROR
let currentLogLevel = LOG_LEVELS.INFO;

// Definir nível via variável de ambiente ou função
function setLogLevel(level) {
  if (typeof level === 'string') {
    const upper = level.toUpperCase();
    if (LOG_LEVELS[upper] !== undefined) {
      currentLogLevel = LOG_LEVELS[upper];
    }
  } else if (typeof level === 'number' && level >= 0 && level <= 3) {
    currentLogLevel = level;
  }
}

// Verificar variável de ambiente na inicialização
if (process.env.LOG_LEVEL) {
  setLogLevel(process.env.LOG_LEVEL);
}

function log(level, ...args) {
  if (LOG_LEVELS[level] <= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    console.log(prefix, ...args);
  }
}

const logger = {
  error: (...args) => log('ERROR', ...args),
  warn: (...args) => log('WARN', ...args),
  info: (...args) => log('INFO', ...args),
  debug: (...args) => log('DEBUG', ...args),
  setLevel: setLogLevel,
  getLevel: () => {
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    return levelNames[currentLogLevel];
  }
};

module.exports = logger;

