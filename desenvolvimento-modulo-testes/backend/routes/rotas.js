/**
 * Rotas para Teste Rotas de Atenção (A, D, C)
 */

const express = require('express');
const { query } = require('../config/database');
const { calcularRotas } = require('../utils/calculadoras');
const router = express.Router();

// Rota de teste para verificar se o módulo está carregado
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Rotas de Atenção (A, D, C) - API funcionando',
    endpoints: {
      'GET /api/rotas/tabelas': 'Lista tabelas normativas disponíveis',
      'POST /api/rotas/calcular': 'Calcula resultado das rotas'
    }
  });
});

/**
 * GET /api/rotas/tabelas
 * Lista tabelas normativas disponíveis para Rotas
 */
router.get('/tabelas', async (req, res) => {
  try {
    console.log('📥 GET /api/rotas/tabelas - Requisição recebida');
    console.log('   Timestamp:', new Date().toISOString());
    
    // Testar conexão primeiro
    try {
      const testQuery = await query('SELECT NOW() as time, current_database() as db');
      console.log(`✅ Conexão OK - Banco: ${testQuery.rows[0].db}`);
    } catch (dbError) {
      console.error('❌ Erro de conexão com banco:', dbError.message);
      console.error('❌ Código:', dbError.code);
      return res.status(500).json({
        success: false,
        error: 'Erro de conexão com banco de dados',
        message: dbError.message,
        code: dbError.code,
        details: 'Verifique se o banco de dados está configurado e rodando'
      });
    }
    
    // Buscar tabelas normativas
    let tabelas;
    try {
      console.log('🔍 Executando query para buscar tabelas normativas...');
      tabelas = await query(`
        SELECT id, nome, tipo, versao, criterio, descricao
        FROM tabelas_normativas 
        WHERE tipo = 'rotas' AND ativa = true
        ORDER BY nome
      `);
      console.log(`✅ Query executada com sucesso. Encontradas ${tabelas.rows.length} tabela(s) para Rotas`);
      
      if (tabelas.rows.length > 0) {
        tabelas.rows.forEach((t, i) => {
          console.log(`   ${i + 1}. ID: ${t.id}, Nome: ${t.nome}`);
        });
      }
    } catch (queryError) {
      console.error('❌ Erro na query de tabelas normativas:');
      console.error('   Mensagem:', queryError.message);
      console.error('   Código:', queryError.code);
      
      // Se a tabela não existir, retornar lista vazia ao invés de erro
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
      throw queryError; // Re-lançar se for outro erro
    }

    // Retornar resultado
    const response = {
      success: true,
      data: {
        tabelas: tabelas.rows,
        total: tabelas.rows.length
      }
    };
    
    console.log('✅ Resposta enviada com sucesso');
    res.json(response);
  } catch (error) {
    console.error('❌ ERRO GERAL ao listar tabelas de Rotas:');
    console.error('   Mensagem:', error.message);
    console.error('   Código:', error.code);
    console.error('   Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar tabelas normativas',
      message: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        code: error.code
      } : undefined
    });
  }
});

/**
 * POST /api/rotas/calcular
 */
router.post('/calcular', async (req, res) => {
  try {
    console.log('📥 POST /api/rotas/calcular - Body recebido:', JSON.stringify(req.body, null, 2));
    
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
      acertos_rota_a,
      erros_rota_a,
      omissoes_rota_a,
      acertos_rota_d,
      erros_rota_d,
      omissoes_rota_d,
      acertos_rota_c,
      erros_rota_c,
      omissoes_rota_c,
      tabela_id
    } = req.body;

    // Validar que pelo menos algum dado foi enviado
    if (
      (acertos_rota_a === undefined && erros_rota_a === undefined && omissoes_rota_a === undefined) &&
      (acertos_rota_d === undefined && erros_rota_d === undefined && omissoes_rota_d === undefined) &&
      (acertos_rota_c === undefined && erros_rota_c === undefined && omissoes_rota_c === undefined)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos: é necessário informar pelo menos os dados de uma rota (A, D ou C)'
      });
    }

    // Se não foi informada tabela_id, tentar buscar uma tabela padrão
    let tabelaIdFinal = tabela_id;
    
    if (!tabelaIdFinal) {
      try {
        const tabelaPadrao = await query(`
          SELECT id FROM tabelas_normativas 
          WHERE tipo = 'rotas' AND ativa = true 
          ORDER BY id ASC 
          LIMIT 1
        `);
        
        if (tabelaPadrao.rows.length > 0) {
          tabelaIdFinal = tabelaPadrao.rows[0].id;
          console.log('✅ Usando tabela padrão para Rotas:', tabelaIdFinal, '- Nome:', tabelaPadrao.rows[0].nome);
        } else {
          // Tentar buscar qualquer tabela de rotas (mesmo inativa) para debug
          const qualquerTabela = await query(`
            SELECT id, nome, ativa FROM tabelas_normativas 
            WHERE tipo = 'rotas' 
            ORDER BY id ASC 
            LIMIT 1
          `);
          
          if (qualquerTabela.rows.length > 0) {
            console.log('⚠️ Tabela encontrada mas inativa, ativando automaticamente:', qualquerTabela.rows[0].id);
            await query(`UPDATE tabelas_normativas SET ativa = true WHERE id = $1`, [qualquerTabela.rows[0].id]);
            tabelaIdFinal = qualquerTabela.rows[0].id;
          } else {
            // Se não há tabelas, retornar resultado sem classificação
            console.log('⚠️ Nenhuma tabela normativa encontrada para Rotas. Calculando sem percentil/classificação.');
            
            // Calcular apenas os PBs sem tabela normativa
            const resultados = {};
            const tiposRota = [
              { tipo: 'A', prefixo: 'rota_a' },
              { tipo: 'D', prefixo: 'rota_d' },
              { tipo: 'C', prefixo: 'rota_c' }
            ];

            for (const rota of tiposRota) {
              const acertos = req.body[`acertos_${rota.prefixo}`] || 0;
              const erros = req.body[`erros_${rota.prefixo}`] || 0;
              const omissoes = req.body[`omissoes_${rota.prefixo}`] || 0;
              const pb = acertos - erros - omissoes;

              resultados[rota.tipo.toLowerCase()] = {
                acertos,
                erros,
                omissoes,
                pb,
                percentil: null,
                classificacao: 'Tabela normativa não disponível'
              };
            }

            // Nota: O teste Rotas de Atenção não possui MGA

            return res.json({
              success: true,
              data: resultados,
              aviso: 'Nenhuma tabela normativa encontrada. Resultados calculados sem percentil/classificação. Popule as tabelas normativas para obter classificação completa.'
            });
          }
        }
      } catch (dbError) {
        console.error('Erro ao buscar tabela padrão:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao buscar tabela normativa padrão'
        });
      }
    }

    // Calcular (com ou sem tabela - a função calcularRotas aceita null)
    if (tabelaIdFinal) {
      console.log('📊 Calculando Rotas com tabela ID:', tabelaIdFinal);
    } else {
      console.log('⚠️ Calculando Rotas sem tabela normativa (apenas PBs)');
    }
    
    const resultado = await calcularRotas(tabelaIdFinal, {
      acertos_rota_a: acertos_rota_a || 0,
      erros_rota_a: erros_rota_a || 0,
      omissoes_rota_a: omissoes_rota_a || 0,
      acertos_rota_d: acertos_rota_d || 0,
      erros_rota_d: erros_rota_d || 0,
      omissoes_rota_d: omissoes_rota_d || 0,
      acertos_rota_c: acertos_rota_c || 0,
      erros_rota_c: erros_rota_c || 0,
      omissoes_rota_c: omissoes_rota_c || 0
    });

    console.log('✅ Resultado calculado:', JSON.stringify(resultado, null, 2));

    // Se não havia tabela, adicionar aviso
    const response = {
      success: true,
      data: resultado
    };
    
    if (!tabelaIdFinal) {
      response.aviso = 'Nenhuma tabela normativa encontrada. Resultados calculados sem percentil/classificação. Popule as tabelas normativas para obter classificação completa.';
    }

    res.json(response);
  } catch (error) {
    console.error('Erro ao calcular Rotas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;

