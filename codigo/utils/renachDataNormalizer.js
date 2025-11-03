/**
 * Utilitários para normalização e sanitização de dados extraídos do RENACH
 */

// Evitar salvar sentinelas como "NÃO ENCONTRADO"
function normalizeString(val) {
  if (val == null) return undefined;
  const s = String(val).trim();
  if (!s || /^n[ãa]o\s+encontrado/i.test(s) || s === 'null' || s === 'undefined') return undefined;
  return s;
}

// Datas do Brasil "dd/mm/aaaa" -> "aaaa-mm-dd"
function parseBrazilianDate(val) {
  if (!val) return undefined;
  const str = String(val).trim();
  // Padrões: dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd (já ISO)
  const m = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const iso = `${yyyy}-${mm}-${dd}`;
    // Validação simples
    const d = new Date(iso + 'T00:00:00Z');
    if (!Number.isNaN(d.getTime())) {
      return iso;
    }
  }
  // Tentar formato ISO já existente
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    const iso = `${yyyy}-${mm}-${dd}`;
    const d = new Date(iso + 'T00:00:00Z');
    if (!Number.isNaN(d.getTime())) {
      return iso;
    }
  }
  return undefined;
}

// Categoria CNH: extrair e validar
// Possíveis categorias: A, B, C, D, E (simples) ou AB, AC, BC, etc. (combinadas), ACC (Autorização para Ciclomotor).
// Muitos RENACHs trazem múltiplas ou a atual na linha "Categoria".
function normalizeCategoriaCNH(raw) {
  const s = normalizeString(raw);
  if (!s) return undefined;

  // Procura padrões comuns: "Categoria: B", "Categoria atual: AB", "Categoria: ACC"
  const catLabel = s.match(/categoria[^:]*:\s*([A-Z,\/\s]+)\b/i);
  let found = catLabel ? catLabel[1] : s;

  // Limpa separadores e preserva categorias combinadas como "AB", "AC", etc.
  found = found.toUpperCase().trim();
  
  // Verificar se é categoria combinada válida (AB, AC, BC, ABC, etc.)
  const categoriaCombinada = found.match(/^([A-E]{2,5})$/);
  if (categoriaCombinada) {
    // Validar que não tem letras repetidas e está em ordem alfabética
    const cat = categoriaCombinada[1];
    const catOrdenada = cat.split('').sort().join('');
    if (cat === catOrdenada && cat.length <= 5) {
      return cat;
    }
  }
  
  // Limpa separadores e pega tokens individuais
  const tokens = found
    .replace(/[^\w\/\s,]/g, ' ')
    .split(/[,\s\/]+/)
    .filter(Boolean);

  // Validar categorias simples e combinadas
  const valid = new Set(['A', 'B', 'C', 'D', 'E', 'ACC']);
  const validCombinadas = tokens.filter(t => /^[A-E]{2,5}$/.test(t) && t.split('').sort().join('') === t);
  const onlyValid = tokens.filter(t => valid.has(t) || validCombinadas.includes(t));

  if (onlyValid.length === 0) return undefined;

  // Priorizar categorias combinadas sobre simples
  if (validCombinadas.length > 0) {
    // Se houver múltiplas combinações, pegar a primeira (mais completa)
    return validCombinadas.sort((a, b) => b.length - a.length)[0];
  }

  // Heurística: priorizar B se existir; senão pegue a primeira
  if (onlyValid.includes('B')) return 'B';
  return onlyValid[0];
}

// Limpeza dos dados extraídos (antes do mapeamento)
function sanitizeExtractedData(raw = {}) {
  const cleaned = {};

  cleaned.nome_pai = normalizeString(raw.nome_pai);
  cleaned.nome_mae = normalizeString(raw.nome_mae);
  cleaned.categoria_cnh = normalizeCategoriaCNH(raw.categoria_cnh || raw.categoria || raw.categoriaCNH);

  // tipo_processo -> contexto
  let contexto = normalizeString(raw.tipo_processo || raw.contexto);
  // Normalização de contexto (opcional): "renovacao" -> "Renovação"
  if (contexto) {
    const c = contexto.toLowerCase();
    if (c.includes('renov')) contexto = 'Renovação';
    else if (c.includes('primeira')) contexto = 'Primeira Habilitação';
    else if (c.includes('mudan') || c.includes('adicao') || c.includes('adição')) contexto = 'Adição/Mudança de Categoria';
    // manter valor original se não casar
  }

  cleaned.contexto = contexto;

  cleaned.data_primeira_habilitacao = parseBrazilianDate(raw.data_primeira_habilitacao || raw.primeira_habilitacao);
  cleaned.data_exame = parseBrazilianDate(raw.data_exame || raw.data_do_exame);

  cleaned.numero_laudo_renach = normalizeString(raw.numero_laudo_renach || raw.numero_laudo || raw.renach || raw.numeroRenach);
  cleaned.numero_laudo = normalizeString(raw.numero_laudo || raw.laudo);
  cleaned.numero_endereco = normalizeString(raw.numero_endereco || raw.numero);

  // Foto é opcional e não deve bloquear os demais campos
  cleaned.renach_foto = raw.foto || raw.renach_foto || undefined;

  // Outros campos importantes
  cleaned.nome = normalizeString(raw.nome);
  cleaned.cpf = normalizeString(raw.cpf);
  cleaned.numero_renach = normalizeString(raw.numero_renach);
  cleaned.sexo = normalizeString(raw.sexo);
  cleaned.nacionalidade = normalizeString(raw.nacionalidade);
  cleaned.logradouro = normalizeString(raw.logradouro);
  cleaned.complemento = normalizeString(raw.complemento);
  cleaned.bairro = normalizeString(raw.bairro);
  cleaned.cep = normalizeString(raw.cep);
  cleaned.codigo_municipio = normalizeString(raw.codigo_municipio);
  cleaned.municipio = normalizeString(raw.municipio);
  cleaned.rg = normalizeString(raw.rg);
  cleaned.orgao_expedidor_rg = normalizeString(raw.orgao_expedidor_rg);
  cleaned.uf_rg = normalizeString(raw.uf_rg || 'SP'); // Default SP se não encontrado
  
  // Resultado do exame: normalizar preservando "Inapto Temporário"
  if (raw.resultado_exame) {
    let resultado = String(raw.resultado_exame).trim();
    // Normalizar variações de "Inapto Temporário"
    if (/inapto\s+tempor[áa]rio/i.test(resultado)) {
      resultado = 'Inapto Temporário';
    }
    // Normalizar outros resultados
    else if (/apto/i.test(resultado) && !/inapto/i.test(resultado)) {
      resultado = 'Apto';
    }
    else if (/inapto/i.test(resultado) && !/tempor/i.test(resultado)) {
      resultado = 'Inapto';
    }
    cleaned.resultado_exame = normalizeString(resultado);
  }
  cleaned.data_nascimento = parseBrazilianDate(raw.data_nascimento || raw.data_de_nascimento);

  // Atividade remunerada: converter "SIM"/"NÃO" para boolean
  if (raw.atividade_remunerada) {
    const atividade = String(raw.atividade_remunerada).trim().toUpperCase();
    cleaned.atividade_remunerada = atividade === 'SIM' || atividade === 'TRUE' || atividade === '1';
  }

  // Remover undefined para facilitar o builder do UPDATE
  Object.keys(cleaned).forEach(k => cleaned[k] === undefined && delete cleaned[k]);

  return cleaned;
}

// Política de atualização: quando atualizar um campo?
// Só atualizar se o valor novo for não vazio e diferente do atual.
// Evitar sobreescrever com valores piores/menores (ex.: manter "B" ao invés de "ACC" se a heurística não tiver certeza).
// Datas só atualizar se válidas.
function shouldUpdateValue(current, next) {
  if (next == null || next === undefined) return false;
  if (current == null || current === undefined) return true;
  const cur = String(current).trim();
  const nxt = String(next).trim();
  if (!nxt) return false;
  if (!cur) return true;
  return cur !== nxt;
}

module.exports = {
  normalizeString,
  parseBrazilianDate,
  normalizeCategoriaCNH,
  sanitizeExtractedData,
  shouldUpdateValue
};

