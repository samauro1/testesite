const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Gerar relatório geral
router.post('/generate', async (req, res) => {
  try {
    const { tipo_relatorio, data_inicio, data_fim, paciente_id, teste_tipo } = req.body;
    const usuario_id = req.user.id;

    let relatorio = {};

    switch (tipo_relatorio) {
      case 'geral':
        relatorio = await gerarRelatorioGeral(data_inicio, data_fim);
        break;
      case 'paciente':
        relatorio = await gerarRelatorioPaciente(paciente_id);
        break;
      case 'teste':
        relatorio = await gerarRelatorioTeste(teste_tipo, data_inicio, data_fim);
        break;
      case 'estoque':
        relatorio = await gerarRelatorioEstoque();
        break;
      default:
        return res.status(400).json({
          error: 'Tipo de relatório não suportado'
        });
    }

    // Salvar relatório no banco
    const result = await query(`
      INSERT INTO relatorios (usuario_id, tipo_relatorio, dados_relatorio, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING id, created_at
    `, [usuario_id, tipo_relatorio, JSON.stringify(relatorio)]);

    res.json({
      message: 'Relatório gerado com sucesso',
      relatorio_id: result.rows[0].id,
      relatorio,
      gerado_em: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Buscar relatório por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT r.id, r.tipo_relatorio, r.dados_relatorio, r.created_at,
             u.nome as usuario_nome
      FROM relatorios r
      JOIN usuarios u ON r.usuario_id = u.id
      WHERE r.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Relatório não encontrado'
      });
    }

    const relatorio = result.rows[0];
    relatorio.dados_relatorio = JSON.parse(relatorio.dados_relatorio);

    res.json({
      relatorio
    });
  } catch (error) {
    console.error('Erro ao buscar relatório:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Listar relatórios
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, tipo_relatorio } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    if (tipo_relatorio) {
      whereClause = 'WHERE r.tipo_relatorio = $1';
      queryParams.push(tipo_relatorio);
    }

    const countQuery = `
      SELECT COUNT(*) 
      FROM relatorios r
      JOIN usuarios u ON r.usuario_id = u.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT r.id, r.tipo_relatorio, r.created_at,
             u.nome as usuario_nome
      FROM relatorios r
      JOIN usuarios u ON r.usuario_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC 
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const dataResult = await query(dataQuery, [...queryParams, limit, offset]);

    res.json({
      relatorios: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar relatórios:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Funções auxiliares para gerar relatórios
async function gerarRelatorioGeral(dataInicio, dataFim) {
  const whereClause = dataInicio && dataFim 
    ? 'WHERE a.data_aplicacao BETWEEN $1 AND $2'
    : '';

  const params = dataInicio && dataFim ? [dataInicio, dataFim] : [];

  // Estatísticas gerais
  const statsResult = await query(`
    SELECT 
      COUNT(DISTINCT a.id) as total_avaliacoes,
      COUNT(DISTINCT a.paciente_id) as total_pacientes,
      COUNT(DISTINCT a.usuario_id) as total_avaliadores
    FROM avaliacoes a
    ${whereClause}
  `, params);

  // Avaliações por tipo de habilitação
  const habilitacaoResult = await query(`
    SELECT tipo_habilitacao, COUNT(*) as quantidade
    FROM avaliacoes a
    ${whereClause}
    GROUP BY tipo_habilitacao
    ORDER BY quantidade DESC
  `, params);

  // Avaliações por aplicação
  const aplicacaoResult = await query(`
    SELECT aplicacao, COUNT(*) as quantidade
    FROM avaliacoes a
    ${whereClause}
    GROUP BY aplicacao
    ORDER BY quantidade DESC
  `, params);

  // Avaliações por mês
  const mensalResult = await query(`
    SELECT 
      DATE_TRUNC('month', a.data_aplicacao) as mes,
      COUNT(*) as quantidade
    FROM avaliacoes a
    ${whereClause}
    GROUP BY DATE_TRUNC('month', a.data_aplicacao)
    ORDER BY mes DESC
    LIMIT 12
  `, params);

  return {
    periodo: {
      inicio: dataInicio,
      fim: dataFim
    },
    estatisticas: statsResult.rows[0],
    por_habilitacao: habilitacaoResult.rows,
    por_aplicacao: aplicacaoResult.rows,
    por_mes: mensalResult.rows
  };
}

async function gerarRelatorioPaciente(pacienteId) {
  // Dados do paciente
  const pacienteResult = await query(`
    SELECT p.nome, p.cpf, p.idade, p.escolaridade, p.created_at
    FROM pacientes p
    WHERE p.id = $1
  `, [pacienteId]);

  if (pacienteResult.rows.length === 0) {
    throw new Error('Paciente não encontrado');
  }

  // Avaliações do paciente
  const avaliacoesResult = await query(`
    SELECT a.id, a.numero_laudo, a.data_aplicacao, a.aplicacao, 
           a.tipo_habilitacao, a.observacoes, a.created_at,
           u.nome as avaliador_nome
    FROM avaliacoes a
    JOIN usuarios u ON a.usuario_id = u.id
    WHERE a.paciente_id = $1
    ORDER BY a.data_aplicacao DESC
  `, [pacienteId]);

  // Resultados dos testes
  const resultadosResult = await query(`
    SELECT 
      'AC' as teste_tipo, ac.acertos, ac.erros, ac.omissoes, ac.pb, ac.percentil, ac.classificacao
    FROM resultados_ac ac
    JOIN avaliacoes a ON ac.avaliacao_id = a.id
    WHERE a.paciente_id = $1
    
    UNION ALL
    
    SELECT 
      'BETA-III' as teste_tipo, beta.acertos, beta.erros, beta.omissao as omissoes, 
      beta.resultado_final as pb, beta.percentil, beta.classificacao
    FROM resultados_beta_iii beta
    JOIN avaliacoes a ON beta.avaliacao_id = a.id
    WHERE a.paciente_id = $1
    
    UNION ALL
    
    SELECT 
      'BPA-2' as teste_tipo, bpa.acertos, bpa.erros, bpa.omissoes, bpa.pontos as pb, bpa.percentil, bpa.classificacao
    FROM resultados_bpa2 bpa
    JOIN avaliacoes a ON bpa.avaliacao_id = a.id
    WHERE a.paciente_id = $1
    
    ORDER BY teste_tipo
  `, [pacienteId]);

  return {
    paciente: pacienteResult.rows[0],
    avaliacoes: avaliacoesResult.rows,
    resultados: resultadosResult.rows
  };
}

async function gerarRelatorioTeste(testeTipo, dataInicio, dataFim) {
  const whereClause = dataInicio && dataFim 
    ? 'AND a.data_aplicacao BETWEEN $2 AND $3'
    : '';

  const params = dataInicio && dataFim ? [testeTipo, dataInicio, dataFim] : [testeTipo];

  let queryTeste = '';
  
  switch (testeTipo) {
    case 'ac':
      queryTeste = `
        SELECT 
          a.numero_laudo, a.data_aplicacao, p.nome as paciente_nome,
          ac.acertos, ac.erros, ac.omissoes, ac.pb, ac.percentil, ac.classificacao
        FROM resultados_ac ac
        JOIN avaliacoes a ON ac.avaliacao_id = a.id
        JOIN pacientes p ON a.paciente_id = p.id
        WHERE 1=1 ${whereClause}
        ORDER BY a.data_aplicacao DESC
      `;
      break;
    case 'beta-iii':
      queryTeste = `
        SELECT 
          a.numero_laudo, a.data_aplicacao, p.nome as paciente_nome,
          beta.acertos, beta.erros, beta.omissao as omissoes, 
          beta.resultado_final as pb, beta.percentil, beta.classificacao
        FROM resultados_beta_iii beta
        JOIN avaliacoes a ON beta.avaliacao_id = a.id
        JOIN pacientes p ON a.paciente_id = p.id
        WHERE 1=1 ${whereClause}
        ORDER BY a.data_aplicacao DESC
      `;
      break;
    default:
      throw new Error('Tipo de teste não suportado');
  }

  const resultadosResult = await query(queryTeste, params);

  // Estatísticas do teste
  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_aplicacoes,
      AVG(CASE WHEN ${testeTipo === 'ac' ? 'ac.pb' : 'beta.resultado_final'} IS NOT NULL 
               THEN ${testeTipo === 'ac' ? 'ac.pb' : 'beta.resultado_final'} END) as media_resultado,
      MIN(CASE WHEN ${testeTipo === 'ac' ? 'ac.pb' : 'beta.resultado_final'} IS NOT NULL 
               THEN ${testeTipo === 'ac' ? 'ac.pb' : 'beta.resultado_final'} END) as menor_resultado,
      MAX(CASE WHEN ${testeTipo === 'ac' ? 'ac.pb' : 'beta.resultado_final'} IS NOT NULL 
               THEN ${testeTipo === 'ac' ? 'ac.pb' : 'beta.resultado_final'} END) as maior_resultado
    FROM ${testeTipo === 'ac' ? 'resultados_ac ac' : 'resultados_beta_iii beta'}
    JOIN avaliacoes a ON ${testeTipo === 'ac' ? 'ac.avaliacao_id' : 'beta.avaliacao_id'} = a.id
    WHERE 1=1 ${whereClause}
  `, params);

  return {
    teste_tipo: testeTipo,
    periodo: {
      inicio: dataInicio,
      fim: dataFim
    },
    estatisticas: statsResult.rows[0],
    resultados: resultadosResult.rows
  };
}

async function gerarRelatorioEstoque() {
  // Estoque atual
  const estoqueResult = await query(`
    SELECT nome_teste, quantidade_atual, quantidade_minima,
           CASE WHEN quantidade_atual <= quantidade_minima THEN 'Baixo' 
                WHEN quantidade_atual <= quantidade_minima * 1.5 THEN 'Atenção'
                ELSE 'Normal' END as status
    FROM testes_estoque 
    WHERE ativo = true
    ORDER BY nome_teste
  `);

  // Movimentações recentes
  const movimentacoesResult = await query(`
    SELECT 
      t.nome_teste, m.tipo_movimentacao, m.quantidade, m.observacoes, m.created_at,
      u.nome as usuario_nome
    FROM movimentacoes_estoque m
    JOIN testes_estoque t ON m.teste_id = t.id
    JOIN usuarios u ON m.usuario_id = u.id
    ORDER BY m.created_at DESC
    LIMIT 50
  `);

  // Estatísticas
  const statsResult = await query(`
    SELECT 
      COUNT(*) as total_itens,
      SUM(quantidade_atual) as total_estoque,
      COUNT(CASE WHEN quantidade_atual <= quantidade_minima THEN 1 END) as itens_estoque_baixo
    FROM testes_estoque 
    WHERE ativo = true
  `);

  return {
    estoque_atual: estoqueResult.rows,
    movimentacoes_recentes: movimentacoesResult.rows,
    estatisticas: statsResult.rows[0]
  };
}

module.exports = router;
