const crypto = require('crypto');

/**
 * Gera identificador estável (external_uid) para um slot de agenda
 * Baseado em campos imutáveis que identificam unicamente a vaga
 * 
 * @param {Object} params
 * @param {string} params.unidade_code - Código da unidade/posto
 * @param {string} params.servico_code - Tipo de serviço
 * @param {string} params.data - Data no formato YYYY-MM-DD
 * @param {string} params.hora - Hora no formato HH:mm ou HH:mm:ss
 * @param {string|null} params.slotId - ID do slot se disponível (opcional)
 * @returns {string} Hash SHA1 hexadecimal (40 caracteres)
 */
function makeExternalUID({ unidade_code, servico_code, data, hora, slotId = null }) {
  // Normalizar hora para formato HH:mm:ss
  const horaNormalizada = hora.includes(':') 
    ? hora.split(':').slice(0, 3).join(':').padEnd(8, ':00')
    : '00:00:00';
  
  // Construir string estável
  const raw = [
    unidade_code || 'DEFAULT',
    servico_code || 'PERITO',
    data,
    horaNormalizada,
    slotId || ''
  ].join('|');
  
  return crypto.createHash('sha1').update(raw).digest('hex');
}

/**
 * Gera hash do conteúdo normalizado de um payload
 * Ordena propriedades e remove espaços variáveis para garantir estabilidade
 * 
 * @param {Object} payloadObj - Objeto a ser hasheado
 * @returns {string} Hash SHA1 hexadecimal (40 caracteres)
 */
function hashPayload(payloadObj) {
  // Normalizar: ordenar chaves e remover valores undefined/null
  const normalized = {};
  Object.keys(payloadObj)
    .sort()
    .forEach(key => {
      const value = payloadObj[key];
      if (value !== undefined && value !== null) {
        // Remover espaços em branco extras de strings
        normalized[key] = typeof value === 'string' 
          ? value.trim().replace(/\s+/g, ' ') 
          : value;
      }
    });
  
  const stable = JSON.stringify(normalized);
  return crypto.createHash('sha1').update(stable).digest('hex');
}

/**
 * Normaliza payload de um slot extraído do scraping
 * Padroniza formatos e remove campos variáveis
 * 
 * @param {Object} rawSlot - Slot bruto extraído do scraping
 * @returns {Object} Payload normalizado
 */
function normalizeSlotPayload(rawSlot) {
  // Normalizar hora para HH:mm:ss
  let hora = rawSlot.time || rawSlot.hora || rawSlot.horario || '';
  if (hora && typeof hora === 'string') {
    hora = hora.trim();
    // Adicionar segundos se não tiver
    if (hora.match(/^\d{2}:\d{2}$/)) {
      hora = hora + ':00';
    }
    // Garantir formato correto
    if (!hora.match(/^\d{2}:\d{2}:\d{2}$/)) {
      hora = '00:00:00';
    }
  } else {
    hora = '00:00:00';
  }
  
  return {
    slotId: rawSlot.id || rawSlot.slotId || rawSlot.slot_id || null,
    hora,
    label: rawSlot.label || rawSlot.nome || null,
    status: rawSlot.status || (rawSlot.available === false ? 'booked' : 'available'),
    disponivel: rawSlot.available !== false,
    // Manter dados brutos para debug
    raw: {
      ...rawSlot,
      normalized_at: new Date().toISOString()
    }
  };
}

module.exports = {
  makeExternalUID,
  hashPayload,
  normalizeSlotPayload
};

