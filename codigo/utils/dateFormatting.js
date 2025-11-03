/**
 * Utilitários para formatação de datas no formato requerido pelo e-CNH SP
 */

const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * Formata um número para 2 dígitos com zero à esquerda
 */
function pad2(n) {
  return n.toString().padStart(2, '0');
}

/**
 * Formata data para exibição: "terça 04/11/2025"
 * @param {Date|string} date - Data (Date object ou string ISO)
 * @returns {string} Data formatada: "diaSemana DD/MM/YYYY"
 */
function formatarDataExibicao(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diaSemana = dias[d.getDay()];
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${diaSemana} ${dd}/${mm}/${yyyy}`;
}

/**
 * Formata data para referência: "04/11/2025"
 * @param {Date|string} date - Data (Date object ou string ISO)
 * @returns {string} Data formatada: "DD/MM/YYYY"
 */
function formatarDDMMYYYY(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Formata data para referência sem barras: "04112025"
 * @param {Date|string} date - Data (Date object ou string ISO)
 * @returns {string} Data formatada: "DDMMYYYY"
 */
function formatarDDMMYYYY_semBarras(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

/**
 * Formata data de referência com sufixo: "04/11/2025 ag"
 * @param {Date|string} date - Data (Date object ou string ISO)
 * @param {string} sufixo - Sufixo a adicionar (padrão: " ag")
 * @returns {string} Data formatada: "DD/MM/YYYY ag"
 */
function formatarDataReferencia(date, sufixo = ' ag') {
  return formatarDDMMYYYY(date) + sufixo;
}

/**
 * Converte string de data BR para Date object
 * @param {string} dataBR - Data no formato "DD/MM/YYYY"
 * @returns {Date} Objeto Date
 */
function parseDataBR(dataBR) {
  const [dia, mes, ano] = dataBR.split('/');
  return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato BR (DD/MM/YYYY)
 * @param {string} dataISO - Data no formato "YYYY-MM-DD"
 * @returns {string} Data no formato "DD/MM/YYYY"
 */
function isoParaBR(dataISO) {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Converte data BR (DD/MM/YYYY) para formato ISO (YYYY-MM-DD)
 * @param {string} dataBR - Data no formato "DD/MM/YYYY"
 * @returns {string} Data no formato "YYYY-MM-DD"
 */
function brParaISO(dataBR) {
  const [dia, mes, ano] = dataBR.split('/');
  return `${ano}-${mes}-${dia}`;
}

module.exports = {
  formatarDataExibicao,
  formatarDDMMYYYY,
  formatarDDMMYYYY_semBarras,
  formatarDataReferencia,
  parseDataBR,
  isoParaBR,
  brParaISO,
  dias
};

