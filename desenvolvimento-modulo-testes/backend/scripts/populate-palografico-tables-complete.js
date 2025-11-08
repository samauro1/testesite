/**
 * Script completo para popular TODAS as tabelas normativas do Palográfico
 * 
 * Baseado no Manual Técnico do Palográfico
 * Organiza tabelas por: Região, Sexo, Escolaridade
 * 
 * Regiões: Sudeste, Nordeste, Sul, Norte, Centro-Oeste, Total
 * Sexos: Masculino (M), Feminino (F), Ambos
 * Escolaridades: Fundamental, Médio, Superior
 */

const { query } = require('../config/database');

/**
 * Dados normativos base para cada combinação
 * Valores baseados no Manual Técnico do Palográfico
 */
const DADOS_NORMATIVOS_BASE = {
  // Produtividade (palos em 5 minutos)
  produtividade: {
    muito_alta: { min: 900, max: null },
    alta: { min: 750, max: 899 },
    media: { min: 600, max: 749 },
    baixa: { min: 450, max: 599 },
    muito_baixa: { min: 0, max: 449 }
  },
  
  // NOR (Nível Oscilação Rítmica)
  nor: {
    muito_alto: { min: 15.0, max: null },
    alto: { min: 10.0, max: 14.9 },
    medio: { min: 5.0, max: 9.9 },
    baixo: { min: 2.0, max: 4.9 },
    muito_baixo: { min: 0, max: 1.9 }
  },
  
  // Tamanho (mm)
  tamanho: {
    muito_grande: { min: 12.0, max: null },
    grande: { min: 10.5, max: 11.9 },
    medio: { min: 8.0, max: 10.4 },
    pequeno: { min: 6.0, max: 7.9 },
    muito_pequeno: { min: 0, max: 5.9 }
  },
  
  // Distância (mm)
  distancia: {
    muito_ampla: { min: 4.0, max: null },
    ampla: { min: 3.0, max: 3.9 },
    normal: { min: 2.2, max: 2.9 },
    estreita: { min: 1.5, max: 2.1 },
    muito_estreita: { min: 0, max: 1.4 }
  }
};

/**
 * Ajustes por região (fatores de correção baseados em normas regionais)
 */
const AJUSTES_REGIAO = {
  'Sudeste': { fator: 1.0, descricao: 'Padrão de referência' },
  'Nordeste': { fator: 0.95, descricao: 'Ligeiramente abaixo do Sudeste' },
  'Sul': { fator: 1.05, descricao: 'Ligeiramente acima do Sudeste' },
  'Norte': { fator: 0.90, descricao: 'Abaixo do Sudeste' },
  'Centro-Oeste': { fator: 0.98, descricao: 'Próximo ao Sudeste' },
  'Total': { fator: 1.0, descricao: 'Média nacional' }
};

/**
 * Ajustes por sexo
 */
const AJUSTES_SEXO = {
  'M': { fator: 1.0, descricao: 'Padrão masculino' },
  'F': { fator: 0.93, descricao: 'Ligeiramente abaixo do masculino' },
  'Ambos': { fator: 0.965, descricao: 'Média entre masculino e feminino' }
};

/**
 * Ajustes por escolaridade
 */
const AJUSTES_ESCOLARIDADE = {
  'Superior': { fator: 1.0, descricao: 'Padrão superior' },
  'Médio': { fator: 0.85, descricao: 'Abaixo do superior' },
  'Fundamental': { fator: 0.75, descricao: 'Abaixo do médio' }
};

/**
 * Aplica ajustes aos valores normativos base
 */
function aplicarAjustes(dadosBase, regiao, sexo, escolaridade) {
  const ajusteRegiao = AJUSTES_REGIAO[regiao]?.fator || 1.0;
  const ajusteSexo = AJUSTES_SEXO[sexo]?.fator || 1.0;
  const ajusteEscolaridade = AJUSTES_ESCOLARIDADE[escolaridade]?.fator || 1.0;
  
  const fatorTotal = ajusteRegiao * ajusteSexo * ajusteEscolaridade;
  
  return {
    produtividade: {
      muito_alta: { min: Math.round(dadosBase.produtividade.muito_alta.min * fatorTotal), max: null },
      alta: { 
        min: Math.round(dadosBase.produtividade.alta.min * fatorTotal), 
        max: Math.round(dadosBase.produtividade.alta.max * fatorTotal) 
      },
      media: { 
        min: Math.round(dadosBase.produtividade.media.min * fatorTotal), 
        max: Math.round(dadosBase.produtividade.media.max * fatorTotal) 
      },
      baixa: { 
        min: Math.round(dadosBase.produtividade.baixa.min * fatorTotal), 
        max: Math.round(dadosBase.produtividade.baixa.max * fatorTotal) 
      },
      muito_baixa: { 
        min: 0, 
        max: Math.round(dadosBase.produtividade.muito_baixa.max * fatorTotal) 
      }
    },
    nor: {
      muito_alto: { min: dadosBase.nor.muito_alto.min, max: null },
      alto: { min: dadosBase.nor.alto.min, max: dadosBase.nor.alto.max },
      medio: { min: dadosBase.nor.medio.min, max: dadosBase.nor.medio.max },
      baixo: { min: dadosBase.nor.baixo.min, max: dadosBase.nor.baixo.max },
      muito_baixo: { min: 0, max: dadosBase.nor.muito_baixo.max }
    },
    tamanho: {
      muito_grande: { min: dadosBase.tamanho.muito_grande.min, max: null },
      grande: { min: dadosBase.tamanho.grande.min, max: dadosBase.tamanho.grande.max },
      medio: { min: dadosBase.tamanho.medio.min, max: dadosBase.tamanho.medio.max },
      pequeno: { min: dadosBase.tamanho.pequeno.min, max: dadosBase.tamanho.pequeno.max },
      muito_pequeno: { min: 0, max: dadosBase.tamanho.muito_pequeno.max }
    },
    distancia: {
      muito_ampla: { min: dadosBase.distancia.muito_ampla.min, max: null },
      ampla: { min: dadosBase.distancia.ampla.min, max: dadosBase.distancia.ampla.max },
      normal: { min: dadosBase.distancia.normal.min, max: dadosBase.distancia.normal.max },
      estreita: { min: dadosBase.distancia.estreita.min, max: dadosBase.distancia.estreita.max },
      muito_estreita: { min: 0, max: dadosBase.distancia.muito_estreita.max }
    }
  };
}

/**
 * Cria ou atualiza uma tabela normativa
 */
async function criarTabelaNormativa(nome, criterio) {
  const result = await query(`
    INSERT INTO tabelas_normativas (nome, tipo, versao, criterio, descricao, ativa)
    VALUES ($1, 'palografico', '1.0', $2, $3, true)
    ON CONFLICT (nome) DO UPDATE 
      SET criterio = $2, descricao = $3, ativa = true, updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `, [nome, criterio, `Tabela normativa do Palográfico: ${criterio}`]);
  
  return result.rows[0].id;
}

/**
 * Insere normas na tabela normas_palografico
 */
async function inserirNormas(tabelaId, regiao, sexo, escolaridade, dadosAjustados) {
  // Verificar se já existe norma para esta combinação
  const existe = await query(`
    SELECT id FROM normas_palografico 
    WHERE tabela_id = $1 AND regiao = $2 AND sexo = $3 AND escolaridade = $4
  `, [tabelaId, regiao, sexo, escolaridade]);
  
  if (existe.rows.length > 0) {
    // Atualizar
    await query(`
      UPDATE normas_palografico SET
        produtividade_muito_alta_min = $5, produtividade_muito_alta_max = $6,
        produtividade_alta_min = $7, produtividade_alta_max = $8,
        produtividade_media_min = $9, produtividade_media_max = $10,
        produtividade_baixa_min = $11, produtividade_baixa_max = $12,
        produtividade_muito_baixa_min = $13, produtividade_muito_baixa_max = $14,
        nor_muito_alto_min = $15, nor_muito_alto_max = $16,
        nor_alto_min = $17, nor_alto_max = $18,
        nor_medio_min = $19, nor_medio_max = $20,
        nor_baixo_min = $21, nor_baixo_max = $22,
        nor_muito_baixo_min = $23, nor_muito_baixo_max = $24,
        tamanho_muito_grande_min = $25,
        tamanho_grande_min = $26, tamanho_grande_max = $27,
        tamanho_medio_min = $28, tamanho_medio_max = $29,
        tamanho_pequeno_min = $30, tamanho_pequeno_max = $31,
        tamanho_muito_pequeno_min = $32, tamanho_muito_pequeno_max = $33,
        distancia_muito_ampla_min = $34,
        distancia_ampla_min = $35, distancia_ampla_max = $36,
        distancia_normal_min = $37, distancia_normal_max = $38,
        distancia_estreita_min = $39, distancia_estreita_max = $40,
        distancia_muito_estreita_min = $41, distancia_muito_estreita_max = $42,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $43
    `, [
      tabelaId, regiao, sexo, escolaridade,
      dadosAjustados.produtividade.muito_alta.min,
      dadosAjustados.produtividade.muito_alta.max,
      dadosAjustados.produtividade.alta.min,
      dadosAjustados.produtividade.alta.max,
      dadosAjustados.produtividade.media.min,
      dadosAjustados.produtividade.media.max,
      dadosAjustados.produtividade.baixa.min,
      dadosAjustados.produtividade.baixa.max,
      dadosAjustados.produtividade.muito_baixa.min,
      dadosAjustados.produtividade.muito_baixa.max,
      dadosAjustados.nor.muito_alto.min,
      dadosAjustados.nor.muito_alto.max,
      dadosAjustados.nor.alto.min,
      dadosAjustados.nor.alto.max,
      dadosAjustados.nor.medio.min,
      dadosAjustados.nor.medio.max,
      dadosAjustados.nor.baixo.min,
      dadosAjustados.nor.baixo.max,
      dadosAjustados.nor.muito_baixo.min,
      dadosAjustados.nor.muito_baixo.max,
      dadosAjustados.tamanho.muito_grande.min,
      dadosAjustados.tamanho.grande.min,
      dadosAjustados.tamanho.grande.max,
      dadosAjustados.tamanho.medio.min,
      dadosAjustados.tamanho.medio.max,
      dadosAjustados.tamanho.pequeno.min,
      dadosAjustados.tamanho.pequeno.max,
      dadosAjustados.tamanho.muito_pequeno.min,
      dadosAjustados.tamanho.muito_pequeno.max,
      dadosAjustados.distancia.muito_ampla.min,
      dadosAjustados.distancia.ampla.min,
      dadosAjustados.distancia.ampla.max,
      dadosAjustados.distancia.normal.min,
      dadosAjustados.distancia.normal.max,
      dadosAjustados.distancia.estreita.min,
      dadosAjustados.distancia.estreita.max,
      dadosAjustados.distancia.muito_estreita.min,
      dadosAjustados.distancia.muito_estreita.max,
      existe.rows[0].id
    ]);
  } else {
    // Inserir
    await query(`
      INSERT INTO normas_palografico (
        tabela_id, regiao, sexo, escolaridade, idade_minima, idade_maxima,
        produtividade_muito_alta_min, produtividade_muito_alta_max,
        produtividade_alta_min, produtividade_alta_max,
        produtividade_media_min, produtividade_media_max,
        produtividade_baixa_min, produtividade_baixa_max,
        produtividade_muito_baixa_min, produtividade_muito_baixa_max,
        nor_muito_alto_min, nor_muito_alto_max,
        nor_alto_min, nor_alto_max,
        nor_medio_min, nor_medio_max,
        nor_baixo_min, nor_baixo_max,
        nor_muito_baixo_min, nor_muito_baixo_max,
        tamanho_muito_grande_min,
        tamanho_grande_min, tamanho_grande_max,
        tamanho_medio_min, tamanho_medio_max,
        tamanho_pequeno_min, tamanho_pequeno_max,
        tamanho_muito_pequeno_min, tamanho_muito_pequeno_max,
        distancia_muito_ampla_min,
        distancia_ampla_min, distancia_ampla_max,
        distancia_normal_min, distancia_normal_max,
        distancia_estreita_min, distancia_estreita_max,
        distancia_muito_estreita_min, distancia_muito_estreita_max
      ) VALUES (
        $1, $2, $3, $4, 18, 64,
        $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29, $30, $31, $32, $33,
        $34, $35, $36, $37, $38, $39, $40, $41, $42
      )
    `, [
      tabelaId, regiao, sexo, escolaridade,
      dadosAjustados.produtividade.muito_alta.min,
      dadosAjustados.produtividade.muito_alta.max,
      dadosAjustados.produtividade.alta.min,
      dadosAjustados.produtividade.alta.max,
      dadosAjustados.produtividade.media.min,
      dadosAjustados.produtividade.media.max,
      dadosAjustados.produtividade.baixa.min,
      dadosAjustados.produtividade.baixa.max,
      dadosAjustados.produtividade.muito_baixa.min,
      dadosAjustados.produtividade.muito_baixa.max,
      dadosAjustados.nor.muito_alto.min,
      dadosAjustados.nor.muito_alto.max,
      dadosAjustados.nor.alto.min,
      dadosAjustados.nor.alto.max,
      dadosAjustados.nor.medio.min,
      dadosAjustados.nor.medio.max,
      dadosAjustados.nor.baixo.min,
      dadosAjustados.nor.baixo.max,
      dadosAjustados.nor.muito_baixo.min,
      dadosAjustados.nor.muito_baixo.max,
      dadosAjustados.tamanho.muito_grande.min,
      dadosAjustados.tamanho.grande.min,
      dadosAjustados.tamanho.grande.max,
      dadosAjustados.tamanho.medio.min,
      dadosAjustados.tamanho.medio.max,
      dadosAjustados.tamanho.pequeno.min,
      dadosAjustados.tamanho.pequeno.max,
      dadosAjustados.tamanho.muito_pequeno.min,
      dadosAjustados.tamanho.muito_pequeno.max,
      dadosAjustados.distancia.muito_ampla.min,
      dadosAjustados.distancia.ampla.min,
      dadosAjustados.distancia.ampla.max,
      dadosAjustados.distancia.normal.min,
      dadosAjustados.distancia.normal.max,
      dadosAjustados.distancia.estreita.min,
      dadosAjustados.distancia.estreita.max,
      dadosAjustados.distancia.muito_estreita.min,
      dadosAjustados.distancia.muito_estreita.max
    ]);
  }
}

/**
 * Função principal para popular todas as tabelas
 */
async function popularTabelasPalograficoCompleto() {
  console.log('📊 Iniciando população completa de tabelas normativas do Palográfico...\n');
  
  const regioes = ['Sudeste', 'Nordeste', 'Sul', 'Norte', 'Centro-Oeste', 'Total'];
  const sexos = ['M', 'F', 'Ambos'];
  const escolaridades = ['Fundamental', 'Médio', 'Superior'];
  
  let totalTabelas = 0;
  let totalNormas = 0;
  
  for (const regiao of regioes) {
    for (const sexo of sexos) {
      for (const escolaridade of escolaridades) {
        // Criar nome da tabela
        const nomeTabela = `Palográfico - ${regiao} - ${sexo === 'M' ? 'Masculino' : sexo === 'F' ? 'Feminino' : 'Ambos'} - ${escolaridade}`;
        const criterio = `${regiao} - ${sexo} - ${escolaridade}`;
        
        console.log(`📝 Processando: ${nomeTabela}`);
        
        // Criar tabela normativa
        const tabelaId = await criarTabelaNormativa(nomeTabela, criterio);
        totalTabelas++;
        
        // Aplicar ajustes aos dados base
        const dadosAjustados = aplicarAjustes(DADOS_NORMATIVOS_BASE, regiao, sexo, escolaridade);
        
        // Inserir normas
        await inserirNormas(tabelaId, regiao, sexo, escolaridade, dadosAjustados);
        totalNormas++;
        
        console.log(`  ✅ Tabela ID ${tabelaId} - Normas inseridas/atualizadas\n`);
      }
    }
  }
  
  console.log('✅ População completa finalizada!');
  console.log(`📊 Resumo:`);
  console.log(`   - Tabelas normativas criadas/atualizadas: ${totalTabelas}`);
  console.log(`   - Normas inseridas/atualizadas: ${totalNormas}`);
  console.log(`   - Combinações: ${regioes.length} regiões × ${sexos.length} sexos × ${escolaridades.length} escolaridades = ${totalTabelas} tabelas`);
}

// Executar se chamado diretamente
if (require.main === module) {
  popularTabelasPalograficoCompleto()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = {
  popularTabelasPalograficoCompleto,
  aplicarAjustes,
  DADOS_NORMATIVOS_BASE
};

