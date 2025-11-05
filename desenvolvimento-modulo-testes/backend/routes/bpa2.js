/**
 * Rotas para Teste BPA-2 - Atenção (Alternada, Concentrada, Dividida)
 * Conforme manual: AA (Atenção Alternada), AC (Atenção Concentrada), AD (Atenção Dividida)
 */

const express = require('express');
const { query } = require('../config/database');
const { calcularBPA2 } = require('../utils/calculadoras');
const router = express.Router();

// Rota de teste para verificar se o módulo está carregado
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'BPA-2 - Bateria de Provas de Atenção - API funcionando',
    endpoints: {
      'GET /api/bpa2/tabelas': 'Lista tabelas normativas disponíveis',
      'POST /api/bpa2/calcular': 'Calcula resultado do BPA-2'
    }
  });
});

/**
 * GET /api/bpa2/tabelas
 * Lista tabelas normativas disponíveis para BPA-2
 */
router.get('/tabelas', async (req, res) => {
  try {
    console.log('📥 GET /api/bpa2/tabelas - Requisição recebida');
    
    // Testar conexão primeiro
    try {
      const testQuery = await query('SELECT NOW() as time, current_database() as db');
      console.log(`✅ Conexão OK - Banco: ${testQuery.rows[0].db}`);
    } catch (dbError) {
      console.error('❌ Erro de conexão com banco:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Erro de conexão com banco de dados',
        message: dbError.message
      });
    }
    
    // Buscar tabelas normativas
    let tabelas;
    try {
      tabelas = await query(`
        SELECT id, nome, tipo, versao, criterio, descricao
        FROM tabelas_normativas 
        WHERE tipo = 'bpa2' AND ativa = true
        ORDER BY nome
      `);
      console.log(`✅ Query executada. Encontradas ${tabelas.rows.length} tabela(s) para BPA-2`);
    } catch (queryError) {
      console.error('❌ Erro na query de tabelas normativas:', queryError.message);
      
      // Se a tabela não existir, retornar lista vazia
      if (queryError.message.includes('does not exist') || 
          queryError.message.includes('não existe') ||
          queryError.code === '42P01') {
        console.log('⚠️ Tabela tabelas_normativas não existe ainda. Retornando lista vazia.');
        return res.json({
          success: true,
          data: {
            tabelas: [],
            total: 0,
            aviso: 'Tabela normativa não existe. Execute o script de população de tabelas primeiro.'
          }
        });
      }
      throw queryError;
    }

    // Retornar resultado
    res.json({
      success: true,
      data: {
        tabelas: tabelas.rows,
        total: tabelas.rows.length
      }
    });
  } catch (error) {
    console.error('❌ ERRO GERAL ao listar tabelas de BPA-2:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar tabelas normativas',
      message: error.message
    });
  }
});

/**
 * POST /api/bpa2/calcular
 */
router.post('/calcular', async (req, res) => {
  try {
    console.log('📥 POST /api/bpa2/calcular - Body recebido:', JSON.stringify(req.body, null, 2));
    
    // Verificar conexão com banco primeiro
    try {
      await query('SELECT 1');
    } catch (dbError) {
      console.error('❌ Erro de conexão com banco:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Erro de conexão com banco de dados',
        message: dbError.message
      });
    }
    
    const {
      // Aceitar tanto a nomenclatura antiga quanto a nova para compatibilidade
      acertos_sustentada,
      erros_sustentada,
      omissoes_sustentada,
      acertos_concentrada,
      erros_concentrada,
      omissoes_concentrada,
      acertos_alternada,
      erros_alternada,
      omissoes_alternada,
      acertos_dividida,
      erros_dividida,
      omissoes_dividida,
      tabela_id,
      criterio,  // Novo: critério (idade, escolaridade, região) para buscar tabelas coerentes
      idade,     // Idade específica (ex: "6 anos", "15-17 anos")
      escolaridade  // Escolaridade específica (ex: "Ensino Fundamental")
    } = req.body;

    // Buscar tabelas normativas baseadas no critério ou tabela_id selecionada
    let tabelasIds = {
      alternada: null,
      concentrada: null,
      dividida: null,
      geral: null
    };

    if (tabela_id) {
      // Se foi informada uma tabela_id, buscar o critério dela e encontrar as outras 3 tabelas
      try {
        const tabelaInfo = await query(`
          SELECT criterio, nome FROM tabelas_normativas 
          WHERE id = $1 AND tipo = 'bpa2' AND ativa = true
        `, [tabela_id]);
        
        if (tabelaInfo.rows.length > 0) {
          const criterioTabela = tabelaInfo.rows[0].criterio;
          const nomeTabela = tabelaInfo.rows[0].nome;
          
          console.log(`📋 Tabela selecionada: ${nomeTabela} (critério: ${criterioTabela || 'geral'})`);
          
          // Identificar qual tipo de atenção é esta tabela pelo nome
          let tipoAtencaoTabela = null;
          if (nomeTabela.includes('AA') || nomeTabela.includes('Alternada')) {
            tipoAtencaoTabela = 'Alternada';
          } else if (nomeTabela.includes('AC') || nomeTabela.includes('Concentrada')) {
            tipoAtencaoTabela = 'Concentrada';
          } else if (nomeTabela.includes('AD') || nomeTabela.includes('Dividida')) {
            tipoAtencaoTabela = 'Dividida';
          } else if (nomeTabela.includes('Geral') || nomeTabela.includes('Atenção')) {
            tipoAtencaoTabela = 'Geral';
          }
          
          // Buscar todas as 4 tabelas do mesmo critério
          const criterioFinal = criterio || criterioTabela;
          
          if (criterioFinal) {
            const todasTabelas = await query(`
              SELECT id, nome, criterio 
              FROM tabelas_normativas 
              WHERE tipo = 'bpa2' AND ativa = true 
                AND criterio = $1
              ORDER BY nome
            `, [criterioFinal]);
            
            // Mapear tabelas por tipo de atenção
            todasTabelas.rows.forEach(t => {
              const nome = t.nome.toLowerCase();
              if (nome.includes('alternada') || nome.includes(' - aa')) {
                tabelasIds.alternada = t.id;
              } else if (nome.includes('concentrada') || nome.includes(' - ac')) {
                tabelasIds.concentrada = t.id;
              } else if (nome.includes('dividida') || nome.includes(' - ad')) {
                tabelasIds.dividida = t.id;
              } else if (nome.includes('geral') || (nome.includes('atenção') && !nome.includes('alternada') && !nome.includes('concentrada') && !nome.includes('dividida'))) {
                tabelasIds.geral = t.id;
              }
            });
            
            console.log('📊 Tabelas encontradas pelo critério:', {
              criterio: criterioFinal,
              alternada: tabelasIds.alternada,
              concentrada: tabelasIds.concentrada,
              dividida: tabelasIds.dividida,
              geral: tabelasIds.geral
            });
          } else {
            // Se não tem critério, usar apenas a tabela selecionada (modo compatibilidade)
            console.log('⚠️ Tabela sem critério definido. Usando apenas tabela selecionada.');
            if (tipoAtencaoTabela === 'Alternada') tabelasIds.alternada = tabela_id;
            else if (tipoAtencaoTabela === 'Concentrada') tabelasIds.concentrada = tabela_id;
            else if (tipoAtencaoTabela === 'Dividida') tabelasIds.dividida = tabela_id;
            else if (tipoAtencaoTabela === 'Geral') tabelasIds.geral = tabela_id;
          }
        }
      } catch (dbError) {
        console.error('Erro ao buscar tabelas por critério:', dbError);
      }
    } else if (criterio) {
      // Se foi informado apenas o critério, buscar todas as 4 tabelas
      try {
        const todasTabelas = await query(`
          SELECT id, nome, criterio 
          FROM tabelas_normativas 
          WHERE tipo = 'bpa2' AND ativa = true 
            AND criterio = $1
          ORDER BY nome
        `, [criterio]);
        
        todasTabelas.rows.forEach(t => {
          const nome = t.nome.toLowerCase();
          if (nome.includes('alternada') || nome.includes(' - aa')) {
            tabelasIds.alternada = t.id;
          } else if (nome.includes('concentrada') || nome.includes(' - ac')) {
            tabelasIds.concentrada = t.id;
          } else if (nome.includes('dividida') || nome.includes(' - ad')) {
            tabelasIds.dividida = t.id;
          } else if (nome.includes('geral') || (nome.includes('atenção') && !nome.includes('alternada') && !nome.includes('concentrada') && !nome.includes('dividida'))) {
            tabelasIds.geral = t.id;
          }
        });
      } catch (dbError) {
        console.error('Erro ao buscar tabelas por critério:', dbError);
      }
    }

    // Se não encontrou nenhuma tabela, tentar buscar uma padrão
    if (!tabelasIds.alternada && !tabelasIds.concentrada && !tabelasIds.dividida && !tabelasIds.geral) {
      try {
        const tabelaPadrao = await query(`
          SELECT id FROM tabelas_normativas 
          WHERE tipo = 'bpa2' AND ativa = true 
          ORDER BY id ASC 
          LIMIT 1
        `);
        
        if (tabelaPadrao.rows.length > 0) {
          console.log('⚠️ Usando tabela padrão (pode não ter todas as modalidades)');
          // Não usar tabela padrão única - melhor calcular sem tabela
        }
      } catch (dbError) {
        console.error('Erro ao buscar tabela padrão:', dbError);
      }
    }

    console.log('📊 Calculando BPA-2 com tabelas:', JSON.stringify(tabelasIds, null, 2));
    console.log('📊 Dados recebidos:', { idade, escolaridade, valor_criterio: idade || escolaridade || null });
    
    try {
      const resultado = await calcularBPA2(tabelasIds, {
      // Aceitar nomenclatura antiga (sustentada) e nova (concentrada)
      acertos_sustentada: acertos_sustentada || 0,
      erros_sustentada: erros_sustentada || 0,
      omissoes_sustentada: omissoes_sustentada || 0,
      acertos_concentrada: acertos_concentrada || acertos_sustentada || 0,
      erros_concentrada: erros_concentrada || erros_sustentada || 0,
      omissoes_concentrada: omissoes_concentrada || omissoes_sustentada || 0,
      acertos_alternada: acertos_alternada || 0,
      erros_alternada: erros_alternada || 0,
      omissoes_alternada: omissoes_alternada || 0,
      acertos_dividida: acertos_dividida || 0,
      erros_dividida: erros_dividida || 0,
      omissoes_dividida: omissoes_dividida || 0,
      // Critérios para busca de normas
      idade: idade || null,
      escolaridade: escolaridade || null,
      valor_criterio: idade || escolaridade || null
      });

      console.log('✅ Resultado calculado:', JSON.stringify(resultado, null, 2));

      // Preparar resposta
      const response = {
        success: true,
        data: resultado
      };
      
      if (!tabelaIdFinal) {
        response.aviso = 'Nenhuma tabela normativa encontrada. Resultados calculados sem percentil/classificação. Popule as tabelas normativas para obter classificação completa.';
      }

      res.json(response);
    } catch (calcError) {
      console.error('❌ Erro ao calcular BPA-2:', calcError);
      console.error('Stack trace:', calcError.stack);
      throw calcError; // Re-throw para ser capturado pelo catch externo
    }
  } catch (error) {
    console.error('❌ Erro geral ao calcular BPA-2:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

