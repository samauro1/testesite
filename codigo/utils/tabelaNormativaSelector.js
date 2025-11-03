/**
 * Sistema Inteligente de Seleção de Tabelas Normativas
 * 
 * Regras de Prioridade:
 * 1. Contexto Trânsito/CNH (quando aplicável)
 * 2. São Paulo > Sudeste > Outras regiões
 * 3. Faixa etária específica > Geral
 * 4. Escolaridade específica > Geral
 */

const { query } = require('../config/database');

/**
 * Calcula idade a partir da data de nascimento
 */
function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;
  
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  
  return idade;
}

/**
 * Seleciona a melhor tabela normativa baseada nos critérios do paciente
 * 
 * @param {string} tipoTeste - Tipo do teste (mig, ac, rotas, etc.)
 * @param {object} paciente - Dados do paciente
 * @returns {object} { tabelaId, tabelaNome, sugestoes[] }
 */
async function selecionarTabelaNormativa(tipoTeste, paciente) {
  try {
    const idade = paciente.idade || calcularIdade(paciente.data_nascimento);
    const escolaridade = paciente.escolaridade;
    const contexto = paciente.contexto;
    const tipo_transito = paciente.tipo_transito;
    
    console.log('🔍 Selecionando tabela normativa:');
    console.log(`   Teste: ${tipoTeste}`);
    console.log(`   Idade: ${idade}`);
    console.log(`   Escolaridade: ${escolaridade}`);
    console.log(`   Contexto: ${contexto}`);
    console.log(`   Tipo Trânsito: ${tipo_transito}`);
    
    // Buscar todas as tabelas normativas ativas do tipo
    const todasTabelas = await query(`
      SELECT id, nome, tipo, versao, criterio, descricao
      FROM tabelas_normativas
      WHERE tipo = $1 AND ativa = true
      ORDER BY nome
    `, [tipoTeste]);
    
    if (todasTabelas.rows.length === 0) {
      return {
        tabelaId: null,
        tabelaNome: null,
        sugestoes: [],
        erro: 'Nenhuma tabela normativa encontrada'
      };
    }
    
    const tabelas = todasTabelas.rows;
    let pontuacao = tabelas.map(t => ({ ...t, score: 0, motivos: [] }));
    
    // === SISTEMA DE PONTUAÇÃO ===
    
    // 1. PRIORIDADE MÁXIMA: São Paulo (SP)
    pontuacao = pontuacao.map(t => {
      if (t.nome.includes('São Paulo')) {
        t.score += 1000;
        t.motivos.push('📍 São Paulo (prioridade regional)');
      }
      return t;
    });
    
    // 2. ALTA PRIORIDADE: Sudeste
    pontuacao = pontuacao.map(t => {
      if (t.nome.includes('Sudeste') && !t.nome.includes('São Paulo')) {
        t.score += 800;
        t.motivos.push('📍 Região Sudeste');
      }
      return t;
    });
    
    // 3. CONTEXTO TRÂNSITO (se aplicável) - ALTA PRIORIDADE
    if (contexto === 'Trânsito' && tipo_transito) {
      pontuacao = pontuacao.map(t => {
        // Verificar correspondência exata de tipo de trânsito
        let pontosTipo = 0;
        let motivoTipo = '';
        
        if (tipo_transito === '1ª Habilitação' || tipo_transito === 'Primeira Habilitação') {
          if (t.nome.includes('1ª Habilitação')) {
            pontosTipo = 900;
            motivoTipo = '🚗 1ª Habilitação CNH';
          }
        } else if (tipo_transito === 'Renovação' && t.nome.includes('Renovação')) {
          pontosTipo = 900;
          motivoTipo = '🔄 Renovação CNH';
        } else if (tipo_transito.includes('Mudança') && t.nome.includes('Mudança')) {
          pontosTipo = 900;
          motivoTipo = '🔄 Mudança de Categoria';
        } else if (tipo_transito.includes('Adição') && t.nome.includes('Mudança')) {
          pontosTipo = 900;
          motivoTipo = '🔄 Adição de Categoria';
        } else if (t.nome.includes('Motoristas Profissionais')) {
          pontosTipo = 850;
          motivoTipo = '🚛 Motoristas Profissionais';
        }
        
        if (pontosTipo > 0) {
          t.score += pontosTipo;
          t.motivos.push(motivoTipo);
        }
        
        return t;
      });
    }
    
    // 4. FAIXA ETÁRIA (se idade válida)
    if (idade !== null && idade >= 0) {
      pontuacao = pontuacao.map(t => {
        // Verificar se a tabela menciona faixa etária
        const match = t.nome.match(/(\d+)-(\d+)\s*anos/);
        if (match) {
          const min = parseInt(match[1]);
          const max = parseInt(match[2]);
          if (idade >= min && idade <= max) {
            t.score += 300;
            t.motivos.push(`👤 Faixa etária ${min}-${max} anos`);
          }
        }
        return t;
      });
    }
    
    // 5. ESCOLARIDADE
    if (escolaridade) {
      pontuacao = pontuacao.map(t => {
        if (escolaridade === 'E. Fundamental' && t.nome.includes('Fundamental')) {
          t.score += 200;
          t.motivos.push('📚 Ensino Fundamental');
        } else if (escolaridade === 'E. Médio' && t.nome.includes('Médio')) {
          t.score += 200;
          t.motivos.push('📚 Ensino Médio');
        } else if (escolaridade === 'E. Superior' && t.nome.includes('Superior')) {
          t.score += 200;
          t.motivos.push('📚 Ensino Superior');
        }
        return t;
      });
    }
    
    // 6. TABELA GERAL (fallback com pontuação baixa)
    pontuacao = pontuacao.map(t => {
      if (t.nome.includes('Geral') || t.nome.includes('População Brasileira')) {
        t.score += 100;
        t.motivos.push('🌐 Tabela geral (abrangente)');
      }
      return t;
    });
    
    // Ordenar por pontuação (maior para menor)
    pontuacao.sort((a, b) => b.score - a.score);
    
    // Tabela selecionada (maior pontuação)
    const tabelaSelecionada = pontuacao[0];
    
    // Top 5 sugestões
    const sugestoes = pontuacao.slice(0, 5).map(t => ({
      id: t.id,
      nome: t.nome,
      score: t.score,
      motivos: t.motivos
    }));
    
    console.log('✅ Tabela selecionada:', tabelaSelecionada.nome, '(Score:', tabelaSelecionada.score + ')');
    console.log('   Motivos:', tabelaSelecionada.motivos.join(', '));
    
    return {
      tabelaId: tabelaSelecionada.id,
      tabelaNome: tabelaSelecionada.nome,
      score: tabelaSelecionada.score,
      motivos: tabelaSelecionada.motivos,
      sugestoes: sugestoes,
      avisos: getAvisos(idade, escolaridade, contexto)
    };
    
  } catch (error) {
    console.error('❌ Erro ao selecionar tabela normativa:', error);
    return {
      tabelaId: null,
      tabelaNome: null,
      sugestoes: [],
      erro: error.message
    };
  }
}

/**
 * Gera avisos sobre incompatibilidades
 */
function getAvisos(idade, escolaridade, contexto) {
  const avisos = [];
  
  if (contexto === 'Trânsito' && idade !== null && idade < 18) {
    avisos.push({
      tipo: 'warning',
      mensagem: `⚠️ Idade ${idade} anos está abaixo da idade mínima para CNH (18 anos)`
    });
  }
  
  if (escolaridade === 'Não Escolarizado') {
    avisos.push({
      tipo: 'info',
      mensagem: 'ℹ️ Escolaridade "Não Escolarizado" não tem tabela específica. Usando tabela geral.'
    });
  }
  
  if (idade !== null && idade < 16) {
    avisos.push({
      tipo: 'warning',
      mensagem: `⚠️ Idade ${idade} anos está fora das faixas normativas padrão (16-92 anos)`
    });
  }
  
  return avisos;
}

module.exports = {
  selecionarTabelaNormativa,
  calcularIdade
};

