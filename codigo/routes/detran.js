const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const DetranScraper = require('../services/detranScraper');
const { processarTelefones } = require('../utils/phoneUtils');
const { mapErrorToType } = require('../utils/detranErrorTypes');

/**
 * Verificar e criar tabela se não existir
 */
async function verificarTabelaDetran() {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'configuracoes_detran'
      )
    `);
    
    if (!result.rows[0].exists) {
      console.log('📋 Criando tabela configuracoes_detran...');
      await query(`
        CREATE TABLE IF NOT EXISTS configuracoes_detran (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          cpf VARCHAR(14) NOT NULL,
          senha TEXT NOT NULL,
          dias_trabalho TEXT NOT NULL,
          sincronizacao_automatica BOOLEAN DEFAULT false,
          ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
          ativo BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(usuario_id)
        )
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_configuracoes_detran_usuario 
        ON configuracoes_detran(usuario_id)
      `);
      console.log('✅ Tabela configuracoes_detran criada com sucesso');
    }
  } catch (error) {
    console.error('⚠️ Erro ao verificar/criar tabela configuracoes_detran:', error.message);
    // Não lançar erro para não bloquear a aplicação
  }
}

// Verificar tabela na inicialização
verificarTabelaDetran().catch(err => {
  console.error('Erro ao verificar tabela DETRAN:', err);
});

/**
 * GET /api/detran/configuracao
 * Obter configuração DETRAN do usuário
 */
router.get('/configuracao', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, cpf, dias_trabalho, sincronizacao_automatica, ultima_sincronizacao, ativo FROM configuracoes_detran WHERE usuario_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    const config = result.rows[0];
    // Parse dias_trabalho JSON se necessário
    if (typeof config.dias_trabalho === 'string') {
      try {
        config.dias_trabalho = JSON.parse(config.dias_trabalho || '[]');
      } catch (e) {
        console.warn('⚠️ Erro ao fazer parse de dias_trabalho:', e);
        config.dias_trabalho = [];
      }
    } else if (!config.dias_trabalho) {
      config.dias_trabalho = [];
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('❌ Erro ao buscar configuração DETRAN:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Erro ao buscar configuração DETRAN',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/detran/configuracao
 * Salvar/atualizar configuração DETRAN
 */
router.put('/configuracao', authenticateToken, async (req, res) => {
  try {
    const { cpf, senha, dias_trabalho, sincronizacao_automatica, ativo } = req.body;

    console.log('📥 Recebendo requisição de atualização DETRAN:', {
      cpf: cpf ? `${cpf.substring(0, 3)}***` : 'undefined',
      senha: senha ? '***' : 'undefined',
      dias_trabalho,
      sincronizacao_automatica,
      ativo,
      usuario_id: req.user.id
    });

    // Validar campos obrigatórios
    if (!cpf || !cpf.trim()) {
      return res.status(400).json({
        error: 'CPF é obrigatório'
      });
    }

    if (!senha || !senha.trim()) {
      return res.status(400).json({
        error: 'Senha é obrigatória'
      });
    }

    if (!dias_trabalho || !Array.isArray(dias_trabalho) || dias_trabalho.length === 0) {
      return res.status(400).json({
        error: 'Selecione pelo menos um dia de trabalho'
      });
    }

    // Limpar CPF (remover caracteres especiais)
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    // Verificar se já existe configuração
    const existing = await query(
      'SELECT id FROM configuracoes_detran WHERE usuario_id = $1',
      [req.user.id]
    );

    let result;
    if (existing.rows.length === 0) {
      // Criar nova configuração
      console.log('📝 Criando nova configuração DETRAN');
      result = await query(
        `INSERT INTO configuracoes_detran 
         (usuario_id, cpf, senha, dias_trabalho, sincronizacao_automatica, ativo)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, cpf, dias_trabalho, sincronizacao_automatica, ultima_sincronizacao, ativo`,
        [req.user.id, cpfLimpo, senha.trim(), JSON.stringify(dias_trabalho), sincronizacao_automatica || false, ativo !== false]
      );
      console.log('✅ Configuração DETRAN criada com sucesso');
    } else {
      // Atualizar configuração existente
      console.log('📝 Atualizando configuração DETRAN existente');
      result = await query(
        `UPDATE configuracoes_detran 
         SET cpf = $1, senha = $2, dias_trabalho = $3, 
             sincronizacao_automatica = $4, ativo = $5, updated_at = CURRENT_TIMESTAMP
         WHERE usuario_id = $6
         RETURNING id, cpf, dias_trabalho, sincronizacao_automatica, ultima_sincronizacao, ativo`,
        [cpfLimpo, senha.trim(), JSON.stringify(dias_trabalho), sincronizacao_automatica || false, ativo !== false, req.user.id]
      );
      console.log('✅ Configuração DETRAN atualizada com sucesso');
    }

    const config = result.rows[0];
    // Parse dias_trabalho JSON se necessário
    if (typeof config.dias_trabalho === 'string') {
      try {
        config.dias_trabalho = JSON.parse(config.dias_trabalho || '[]');
      } catch (e) {
        console.warn('⚠️ Erro ao fazer parse de dias_trabalho:', e);
        config.dias_trabalho = [];
      }
    } else if (!config.dias_trabalho) {
      config.dias_trabalho = [];
    }

    console.log('✅ Configuração DETRAN salva:', {
      id: config.id,
      cpf: `${config.cpf.substring(0, 3)}***`,
      dias_trabalho: config.dias_trabalho,
      ativo: config.ativo
    });

    res.json({
      success: true,
      data: config,
      message: 'Configuração DETRAN salva com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao salvar configuração DETRAN:', error);
    console.error('Stack:', error.stack);
    console.error('Body recebido:', {
      cpf: req.body.cpf ? `${req.body.cpf.substring(0, 3)}***` : 'undefined',
      senha: req.body.senha ? '***' : 'undefined',
      dias_trabalho: req.body.dias_trabalho
    });
    res.status(500).json({
      error: 'Erro ao salvar configuração DETRAN',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/detran/sincronizar
 * Sincronizar agendamentos do DETRAN
 * 
 * Query params ou body:
 * - useImproved: boolean - Se true, usa o sistema melhorado com slots e deduplicação
 */
router.post('/sincronizar', authenticateToken, async (req, res) => {
  // Se useImproved=true, usar sistema melhorado
  if (req.query.useImproved === 'true' || req.body.useImproved === true) {
    return await sincronizarImproved(req, res);
  }
  
  // Sistema original melhorado (usado por padrão agora)
  return await sincronizarOriginalMelhorada(req, res);
});

/**
 * Sincronização melhorada com slots, deduplicação e cache de sessão
 */
async function sincronizarImproved(req, res) {
  try {
    console.log('🔄 Iniciando sincronização DETRAN melhorada para usuário:', req.user.id);
    
    // Buscar configuração
    const configResult = await query(
      'SELECT cpf, senha, dias_trabalho FROM configuracoes_detran WHERE usuario_id = $1 AND ativo = true',
      [req.user.id]
    );

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Configuração DETRAN não encontrada ou inativa'
      });
    }

    const config = configResult.rows[0];
    let diasTrabalho;
    if (typeof config.dias_trabalho === 'string') {
      try {
        diasTrabalho = JSON.parse(config.dias_trabalho || '[]');
      } catch (e) {
        diasTrabalho = [];
      }
    } else {
      diasTrabalho = config.dias_trabalho || [];
    }

    if (diasTrabalho.length === 0) {
      return res.status(400).json({
        error: 'Nenhum dia de trabalho configurado'
      });
    }

    // Calcular janela de datas
    const hoje = new Date();
    const windowStart = req.body.windowStart || hoje.toISOString().split('T')[0];
    const windowEnd = req.body.windowEnd || (() => {
      const endDate = new Date(hoje);
      endDate.setDate(hoje.getDate() + 14); // Próximas 2 semanas
      return endDate.toISOString().split('T')[0];
    })();

    // Usar sistema melhorado
    const DetranSyncImproved = require('../services/detranSyncImproved');
    const sync = new DetranSyncImproved(req.user.id);
    
    const result = await sync.runWindowSync({
      windowStart,
      windowEnd,
      diasTrabalho,
      cpf: config.cpf,
      senha: config.senha
    });

    // Atualizar última sincronização
    await query(
      'UPDATE configuracoes_detran SET ultima_sincronizacao = CURRENT_TIMESTAMP WHERE usuario_id = $1',
      [req.user.id]
    );

    // Criar agendamentos na tabela principal a partir dos slots
    await criarAgendamentosDeSlots(req.user.id, windowStart, windowEnd);

    res.json({
      success: true,
      message: result.message,
      data: {
        totals: result.totals,
        window: { start: windowStart, end: windowEnd }
      }
    });

  } catch (error) {
    console.error('❌ Erro na sincronização melhorada:', error);
    res.status(500).json({
      error: 'Erro ao sincronizar agendamentos do DETRAN',
      detalhes: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
}

/**
 * Criar agendamentos na tabela principal a partir dos slots sincronizados
 */
async function criarAgendamentosDeSlots(usuarioId, windowStart, windowEnd) {
  // Buscar slots disponíveis que ainda não foram convertidos em agendamentos
  const slots = await query(
    `SELECT s.*
     FROM agenda_slots s
     WHERE s.usuario_id = $1
       AND s.data BETWEEN $2::date AND $3::date
       AND s.is_current = TRUE
       AND s.status = 'available'
       AND s.agendamento_id IS NULL
     ORDER BY s.data, s.hora`,
    [usuarioId, windowStart, windowEnd]
  );

  let criados = 0;
  for (const slot of slots.rows) {
    try {
      const payload = slot.payload || {};
      
      // Verificar se já existe agendamento similar
      const existing = await query(
        `SELECT id FROM agendamentos 
         WHERE cpf = $1 
           AND data_agendamento::date = $2 
           AND EXTRACT(HOUR FROM data_agendamento) = EXTRACT(HOUR FROM $3::time)
           AND EXTRACT(MINUTE FROM data_agendamento) = EXTRACT(MINUTE FROM $3::time)
           AND usuario_id = $4`,
        [payload.cpf || '', slot.data, slot.hora, usuarioId]
      );

      if (existing.rows.length > 0) {
        // Atualizar slot com agendamento_id
        await query(
          'UPDATE agenda_slots SET agendamento_id = $1 WHERE id = $2',
          [existing.rows[0].id, slot.id]
        );
        continue;
      }

      // Processar telefone
      const telefonesProcessados = processarTelefones(payload.telefone || '');

      // Criar agendamento
      const dataAgendamento = `${slot.data} ${slot.hora}`;
      const insertResult = await query(
        `INSERT INTO agendamentos 
         (usuario_id, nome, cpf, telefone_fixo, telefone_celular, email, 
          data_agendamento, contexto, tipo_transito, categoria_cnh, observacoes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          usuarioId,
          payload.nome || 'Nome não informado',
          payload.cpf || null,
          telefonesProcessados.telefone_fixo,
          telefonesProcessados.telefone_celular,
          payload.email || null,
          dataAgendamento,
          'Trânsito',
          payload.tipo_processo || null,
          payload.categoria_cnh || null,
          `Importado automaticamente do DETRAN em ${new Date().toLocaleString('pt-BR')}`
        ]
      );

      // Vincular slot ao agendamento
      await query(
        'UPDATE agenda_slots SET agendamento_id = $1 WHERE id = $2',
        [insertResult.rows[0].id, slot.id]
      );

      criados++;
    } catch (error) {
      console.error(`❌ Erro ao criar agendamento do slot ${slot.id}:`, error.message);
    }
  }

  console.log(`✅ ${criados} agendamento(s) criado(s) a partir de slots`);
}

/**
 * FUNÇÕES AUXILIARES - Validações e Utilitários
 */

/**
 * Validar CPF - verificar se tem 11 dígitos
 */
function validarCPF(cpf) {
  if (!cpf) return false;
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo.length === 11 && /^\d+$/.test(cpfLimpo);
}

/**
 * Validar hora no formato HH:MM
 */
function validarHora(hora) {
  if (!hora) return false;
  const match = hora.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const h = parseInt(match[1]);
  const m = parseInt(match[2]);
  return h >= 0 && h < 24 && m >= 0 && m < 60;
}

/**
 * Validar data no formato DD/MM/YYYY
 */
function validarData(data) {
  if (!data) return false;
  const match = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const [, dia, mes, ano] = match.map(Number);
  return dia > 0 && dia <= 31 && mes > 0 && mes <= 12 && ano >= 2020;
}

/**
 * Sanitizar e processar telefone com melhor tratamento (V2)
 */
function processarTelefonesV2(telefone) {
  const resultado = {
    telefone_fixo: null,
    telefone_celular: null
  };

  if (!telefone || typeof telefone !== 'string') {
    return resultado;
  }

  // Limpar caracteres especiais
  const telefonesLimpo = telefone.replace(/\D/g, '');
  
  // Se vazio após limpeza
  if (!telefonesLimpo) {
    return resultado;
  }

  // Dividir por espaço, vírgula ou ponto-e-vírgula se houver múltiplos
  const telefones = telefone
    .split(/[,;]/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  for (const tel of telefones) {
    const digitos = tel.replace(/\D/g, '');
    
    // Celular: 11 dígitos (começa com 9 no São Paulo - 3º dígito após DDD)
    if (digitos.length === 11 && digitos[2] === '9') {
      if (!resultado.telefone_celular) {
        resultado.telefone_celular = digitos;
      }
    }
    // Fixo: 10 dígitos
    else if (digitos.length === 10) {
      if (!resultado.telefone_fixo) {
        resultado.telefone_fixo = digitos;
      }
    }
    // Se tiver 11 dígitos mas não for celular, pode ser fixo antigo
    else if (digitos.length === 11 && digitos[2] !== '9') {
      if (!resultado.telefone_fixo) {
        resultado.telefone_fixo = digitos;
      }
    }
    // Se tiver 8 ou 9 dígitos, adicionar DDD padrão (11)
    else if (digitos.length === 8 || digitos.length === 9) {
      const numeroComDDD = '11' + digitos;
      if (digitos.length === 9 && digitos[0] === '9') {
        if (!resultado.telefone_celular) {
          resultado.telefone_celular = numeroComDDD;
        }
      } else {
        if (!resultado.telefone_fixo) {
          resultado.telefone_fixo = numeroComDDD;
        }
      }
    }
  }

  return resultado;
}

/**
 * Validar agendamento antes de inserir
 */
function validarAgendamento(agendamento, data) {
  const erros = [];

  if (!agendamento.nome || agendamento.nome.trim().length === 0) {
    erros.push('Nome vazio');
  }

  if (!validarCPF(agendamento.cpf)) {
    erros.push(`CPF inválido: ${agendamento.cpf}`);
  }

  if (!validarHora(agendamento.hora)) {
    erros.push(`Hora inválida: ${agendamento.hora}`);
  }

  if (!validarData(data)) {
    erros.push(`Data inválida: ${data}`);
  }

  return {
    valido: erros.length === 0,
    erros
  };
}

/**
 * Retry com backoff exponencial
 */
async function retryComBackoff(fn, maxTentativas = 3, backoffMs = 1000) {
  let ultimoErro;
  
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      console.log(`   Tentativa ${tentativa}/${maxTentativas}...`);
      return await fn();
    } catch (erro) {
      ultimoErro = erro;
      console.log(`   ❌ Tentativa ${tentativa} falhou: ${erro.message}`);
      
      if (tentativa < maxTentativas) {
        const espera = backoffMs * Math.pow(2, tentativa - 1);
        console.log(`   ⏳ Aguardando ${espera}ms antes de retry...`);
        await new Promise(resolve => setTimeout(resolve, espera));
      }
    }
  }
  
  throw new Error(`Falha após ${maxTentativas} tentativas: ${ultimoErro.message}`);
}

/**
 * Sincronização original MELHORADA com validações
 */
async function sincronizarOriginalMelhorada(req, res) {
  let scraper = null;
  const stats = {
    datasProcessadas: 0,
    agendamentosExtraidos: 0,
    agendamentosValidados: 0,
    agendamentosInseridos: 0,
    agendamentosDuplicados: 0,
    agendamentosInvalidos: 0,
    erros: []
  };

  try {
    console.log('\n🔄 === INICIANDO SINCRONIZAÇÃO DETRAN (MELHORADA) ===');
    console.log('📅 Usuário:', req.user.id);
    console.log('⏰ Timestamp:', new Date().toLocaleString('pt-BR'));
    
    // ====== ETAPA 1: BUSCAR CONFIGURAÇÃO ======
    console.log('\n📋 === BUSCANDO CONFIGURAÇÃO ===');
    const configResult = await query(
      'SELECT cpf, senha, dias_trabalho FROM configuracoes_detran WHERE usuario_id = $1 AND ativo = true',
      [req.user.id]
    );

    if (configResult.rows.length === 0) {
      console.warn('⚠️ Configuração DETRAN não encontrada ou inativa');
      return res.status(400).json({
        error: 'Configuração DETRAN não encontrada ou inativa',
        stats
      });
    }

    const config = configResult.rows[0];
    console.log('✅ Configuração encontrada');
    console.log(`   CPF: ${config.cpf.substring(0, 3)}***`);
    
    let diasTrabalho;
    try {
      diasTrabalho = typeof config.dias_trabalho === 'string'
        ? JSON.parse(config.dias_trabalho || '[]')
        : config.dias_trabalho || [];
    } catch (e) {
      console.warn('⚠️ Erro ao fazer parse dias_trabalho:', e.message);
      diasTrabalho = [];
    }

    if (diasTrabalho.length === 0) {
      console.warn('⚠️ Nenhum dia de trabalho configurado');
      return res.status(400).json({
        error: 'Nenhum dia de trabalho configurado',
        stats
      });
    }

    console.log(`✅ Dias de trabalho: ${diasTrabalho.length} configurados`);

    // ====== ETAPA 2: CALCULAR DATAS ======
    console.log('\n📅 === CALCULANDO DATAS ===');
    const proximasDatas = calcularProximasDatas(
      diasTrabalho,
      req.body.datas_especificas || []
    );

    if (proximasDatas.length === 0) {
      console.warn('⚠️ Nenhuma data válida encontrada');
      return res.status(400).json({
        error: 'Nenhuma data válida encontrada',
        stats
      });
    }

    console.log(`✅ Datas a processar: ${proximasDatas.length}`);
    proximasDatas.forEach((data, idx) => {
      console.log(`   [${idx + 1}] ${data}`);
    });

    // ====== ETAPA 3: INICIALIZAR SCRAPER ======
    console.log('\n🚀 === INICIALIZANDO SCRAPER ===');
    try {
      scraper = new DetranScraper(config.cpf, config.senha);
      await scraper.init();
      console.log('✅ Scraper inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar scraper:', error.message);
      throw new Error(`Erro ao inicializar navegador: ${error.message}`);
    }

    // ====== ETAPA 4: FAZER LOGIN ======
    console.log('\n🔐 === FAZENDO LOGIN ===');
    try {
      await retryComBackoff(async () => {
        await scraper.login();
      }, 2, 2000);
      console.log('✅ Login realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao fazer login:', error.message);
      const mappedError = mapErrorToType(error);
      throw mappedError;
    }

    // ====== ETAPA 5: NAVEGAR PARA AGENDA ======
    console.log('\n🗺️ === NAVEGANDO PARA AGENDA ===');
    try {
      // O método login() já navega para agenda, mas podemos melhorar
      // Verificando se já estamos na agenda após login
      const urlAtual = scraper.page.url();
      if (!urlAtual.includes('agenda') && !urlAtual.includes('perito')) {
        // Se não estiver, tentar navegar
        if (scraper.acessarAgendaPorMenu && typeof scraper.acessarAgendaPorMenu === 'function') {
          const menuFuncionou = await scraper.acessarAgendaPorMenu();
          if (menuFuncionou) {
            console.log('✅ Navegação por menu concluída');
          } else {
            const urlFuncionou = await scraper.acessarAgendaPorURL();
            if (urlFuncionou) {
              console.log('✅ Navegação por URL concluída');
            }
          }
        }
      }
      console.log('✅ Navegação concluída');
    } catch (error) {
      console.error('❌ Erro ao navegar para agenda:', error.message);
      // Não falhar aqui, pode estar na página correta
    }

    // ====== ETAPA 6: PROCESSAR DATAS ======
    console.log('\n📊 === PROCESSANDO AGENDAMENTOS ===');
    
    for (let i = 0; i < proximasDatas.length; i++) {
      const data = proximasDatas[i];
      console.log(`\n${'-'.repeat(70)}`);
      console.log(`📅 DATA [${i + 1}/${proximasDatas.length}]: ${data}`);
      console.log('-'.repeat(70));

      try {
        // Buscar agendamentos com retry
        console.log('   🔍 Buscando agendamentos...');
        let agendamentos;
        
        try {
          agendamentos = await retryComBackoff(async () => {
            return await scraper.buscarAgendamentos(data);
          }, 2, 2000);
        } catch (error) {
          console.error(`   ❌ Falha ao buscar agendamentos: ${error.message}`);
          stats.erros.push({
            data,
            erro: `Falha ao buscar agendamentos: ${error.message}`
          });
          
          // Tentar voltar para próxima data
          if (i < proximasDatas.length - 1) {
            try {
              await scraper.voltar();
            } catch (e) {
              console.log(`   ⚠️ Erro ao voltar: ${e.message}`);
            }
          }
          
          continue;
        }

        console.log(`   ✅ ${agendamentos.length} agendamento(s) extraído(s)`);
        stats.agendamentosExtraidos += agendamentos.length;

        // Processar cada agendamento
        for (const agendamento of agendamentos) {
          try {
            // VALIDAÇÃO 1: Validar campos
            const validacao = validarAgendamento(agendamento, data);
            
            if (!validacao.valido) {
              console.log(`   ⚠️ Agendamento inválido: ${agendamento.nome || 'Sem nome'}`);
              console.log(`      Motivos: ${validacao.erros.join(', ')}`);
              stats.agendamentosInvalidos++;
              continue;
            }

            stats.agendamentosValidados++;

            // VALIDAÇÃO 2: Verificar duplicação
            const dataHora = agendamento.hora.split(':');
            const horaFormatada = `${dataHora[0]}:${dataHora[1]}:00`;
            const dataFormatada = converterDataBRparaISO(data);

            const existing = await query(
              `SELECT id FROM agendamentos 
               WHERE cpf = $1 AND data_agendamento::date = $2 
               AND EXTRACT(HOUR FROM data_agendamento) = $3 
               AND EXTRACT(MINUTE FROM data_agendamento) = $4
               AND usuario_id = $5`,
              [
                agendamento.cpf,
                dataFormatada,
                parseInt(dataHora[0]),
                parseInt(dataHora[1]),
                req.user.id
              ]
            );

            if (existing.rows.length > 0) {
              console.log(`   ⏭️ Duplicado: ${agendamento.nome} - ${data} ${agendamento.hora}`);
              stats.agendamentosDuplicados++;
              continue;
            }

            // PROCESSAMENTO: Telefones com nova função
            const telefonesProcessados = processarTelefonesV2(agendamento.telefone);

            // INSERÇÃO: Criar agendamento
            const dataAgendamento = `${dataFormatada} ${horaFormatada}`;
            const insertResult = await query(
              `INSERT INTO agendamentos 
               (usuario_id, nome, cpf, telefone_fixo, telefone_celular, email, 
                data_agendamento, contexto, tipo_transito, categoria_cnh, observacoes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               RETURNING id, nome, cpf, data_agendamento`,
              [
                req.user.id,
                agendamento.nome,
                agendamento.cpf,
                telefonesProcessados.telefone_fixo,
                telefonesProcessados.telefone_celular,
                agendamento.email || null,
                dataAgendamento,
                'Trânsito',
                agendamento.tipo_processo || null,
                agendamento.categoria_cnh || null,
                `Importado do DETRAN em ${new Date().toLocaleString('pt-BR')}`
              ]
            );

            console.log(`   ✅ Inserido: ${agendamento.nome} - ${data} ${agendamento.hora}`);
            stats.agendamentosInseridos++;

          } catch (error) {
            console.error(`   ❌ Erro ao processar agendamento: ${error.message}`);
            stats.erros.push({
              agendamento: agendamento.nome || 'desconhecido',
              erro: error.message
            });
          }
        }

        stats.datasProcessadas++;

        // Voltar para próxima data
        if (i < proximasDatas.length - 1) {
          console.log(`   ⏳ Preparando para próxima data...`);
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          try {
            await scraper.voltar();
            console.log(`   ✅ Voltou para página de pesquisa`);
            await new Promise(resolve => setTimeout(resolve, 1500));
          } catch (error) {
            console.error(`   ❌ Erro ao voltar: ${error.message}`);
            stats.erros.push({
              data,
              erro: `Erro ao voltar: ${error.message}`
            });
          }
        }

      } catch (error) {
        console.error(`❌ Erro ao processar data ${data}: ${error.message}`);
        stats.erros.push({
          data,
          erro: error.message
        });
        if (i < proximasDatas.length - 1) {
          try {
            await scraper.voltar();
          } catch (e) {
            console.log(`⚠️ Erro ao voltar após erro: ${e.message}`);
          }
        }
      }
    }

    // ====== ETAPA 7: FINALIZAR ======
    console.log(`\n${'-'.repeat(70)}`);
    console.log('📊 === RESUMO FINAL ===');
    console.log(`   Datas processadas: ${stats.datasProcessadas}/${proximasDatas.length}`);
    console.log(`   Agendamentos extraídos: ${stats.agendamentosExtraidos}`);
    console.log(`   Agendamentos validados: ${stats.agendamentosValidados}`);
    console.log(`   Agendamentos inseridos: ${stats.agendamentosInseridos}`);
    console.log(`   Agendamentos duplicados: ${stats.agendamentosDuplicados}`);
    console.log(`   Agendamentos inválidos: ${stats.agendamentosInvalidos}`);
    console.log(`   Erros: ${stats.erros.length}`);

    // Atualizar última sincronização
    await query(
      'UPDATE configuracoes_detran SET ultima_sincronizacao = CURRENT_TIMESTAMP WHERE usuario_id = $1',
      [req.user.id]
    );

    // Tentar sair
    try {
      await scraper.sair();
      console.log('✅ Sair executado');
    } catch (e) {
      console.log(`⚠️ Erro ao clicar em "Sair": ${e.message}`);
    }

    await scraper.close();
    console.log('✅ Scraper fechado com sucesso');
    console.log('\n✅ === SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO ===\n');

    return res.json({
      success: true,
      message: `Sincronização concluída: ${stats.agendamentosInseridos} agendamento(s) importado(s)`,
      data: {
        stats,
        erros: stats.erros.length > 0 ? stats.erros : undefined
      }
    });

  } catch (error) {
    console.error('\n❌ === ERRO NA SINCRONIZAÇÃO ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    // Fechar scraper
    if (scraper) {
      try {
        console.log('🔒 Fechando scraper após erro...');
        await scraper.close();
      } catch (e) {
        console.error(`⚠️ Erro ao fechar scraper: ${e.message}`);
      }
    }

    const mappedError = mapErrorToType(error);
    const statusCode = mappedError.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: mappedError.message || 'Erro ao sincronizar',
      tipo: mappedError.tipo || 'generic',
      stats,
      detalhes: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
}

/**
 * Sincronização original (compatibilidade)
 */
async function sincronizarOriginal(req, res) {
  let scraper = null;
  try {
    console.log('🔄 Iniciando sincronização DETRAN (original) para usuário:', req.user.id);
    
    // Buscar configuração do usuário
    console.log('📋 Buscando configuração DETRAN...');
    const configResult = await query(
      'SELECT cpf, senha, dias_trabalho FROM configuracoes_detran WHERE usuario_id = $1 AND ativo = true',
      [req.user.id]
    );

    if (configResult.rows.length === 0) {
      console.warn('⚠️ Configuração DETRAN não encontrada para usuário:', req.user.id);
      return res.status(400).json({
        error: 'Configuração DETRAN não encontrada ou inativa'
      });
    }

    const config = configResult.rows[0];
    console.log('✅ Configuração encontrada:', {
      cpf: config.cpf ? `${config.cpf.substring(0, 3)}***` : 'undefined',
      senha: config.senha ? '***' : 'undefined'
    });
    
    let diasTrabalho;
    if (typeof config.dias_trabalho === 'string') {
      try {
        diasTrabalho = JSON.parse(config.dias_trabalho || '[]');
      } catch (e) {
        console.warn('⚠️ Erro ao fazer parse de dias_trabalho:', e);
        diasTrabalho = [];
      }
    } else {
      diasTrabalho = config.dias_trabalho || [];
    }

    if (diasTrabalho.length === 0) {
      console.warn('⚠️ Nenhum dia de trabalho configurado');
      return res.status(400).json({
        error: 'Nenhum dia de trabalho configurado'
      });
    }

    // Calcular próximas datas baseadas nos dias de trabalho
    const proximasDatas = calcularProximasDatas(diasTrabalho, req.body.datas_especificas || []);
    
    if (proximasDatas.length === 0) {
      console.warn('⚠️ Nenhuma data válida encontrada');
      return res.status(400).json({
        error: 'Nenhuma data válida encontrada'
      });
    }

    console.log(`📅 Sincronizando ${proximasDatas.length} data(s):`, proximasDatas);

    // Inicializar scraper
    console.log('🚀 Inicializando scraper DETRAN...');
    try {
      scraper = new DetranScraper(config.cpf, config.senha);
      await scraper.init();
      console.log('✅ Scraper inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar scraper:', error);
      throw new Error(`Erro ao inicializar navegador: ${error.message}`);
    }

    // Fazer login
    console.log('🔐 Fazendo login no DETRAN...');
    try {
      await scraper.login();
      console.log('✅ Login realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao fazer login:', error);
      // Mapear erro para tipo específico
      const mappedError = mapErrorToType(error);
      throw mappedError;
    }

    const agendamentosEncontrados = [];
    const erros = [];

    // Processar cada data
    // IMPORTANTE: Para cada data, fazemos:
    // 1. Consultar agendamentos para a data
    // 2. Processar os resultados
    // 3. Voltar para página de pesquisa (exceto na última)
    // 4. Consultar próxima data
    for (let i = 0; i < proximasDatas.length; i++) {
      const data = proximasDatas[i];
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📅 PROCESSANDO DATA ${i + 1}/${proximasDatas.length}: ${data}`);
        console.log(`${'='.repeat(60)}\n`);
        
        // 1. Consultar agendamentos para esta data
        const agendamentos = await scraper.buscarAgendamentos(data);
        
        // Processar cada agendamento encontrado
        for (const agendamento of agendamentos) {
          try {
            // Verificar se já existe agendamento com mesmo CPF e data/hora
            const dataHora = agendamento.hora.split(':');
            const horaFormatada = `${dataHora[0]}:${dataHora[1]}:00`;
            const dataFormatada = converterDataBRparaISO(data);

            const existing = await query(
              `SELECT id FROM agendamentos 
               WHERE cpf = $1 AND data_agendamento::date = $2 
               AND EXTRACT(HOUR FROM data_agendamento) = $3 
               AND EXTRACT(MINUTE FROM data_agendamento) = $4
               AND usuario_id = $5`,
              [
                agendamento.cpf,
                dataFormatada,
                parseInt(dataHora[0]),
                parseInt(dataHora[1]),
                req.user.id
              ]
            );

            if (existing.rows.length > 0) {
              console.log(`⏭️ Agendamento já existe: ${agendamento.nome} - ${data} ${agendamento.hora}`);
              continue;
            }

            // Processar telefone
            const telefonesProcessados = processarTelefones(agendamento.telefone);

            // Criar agendamento
            const dataAgendamento = `${dataFormatada} ${horaFormatada}`;
            const insertResult = await query(
              `INSERT INTO agendamentos 
               (usuario_id, nome, cpf, telefone_fixo, telefone_celular, email, 
                data_agendamento, contexto, tipo_transito, categoria_cnh, observacoes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               RETURNING id, nome, cpf, data_agendamento`,
              [
                req.user.id,
                agendamento.nome,
                agendamento.cpf,
                telefonesProcessados.telefone_fixo,
                telefonesProcessados.telefone_celular,
                agendamento.email || null,
                dataAgendamento,
                'Trânsito',
                agendamento.tipo_processo || null,
                agendamento.categoria_cnh || null,
                `Importado automaticamente do DETRAN em ${new Date().toLocaleString('pt-BR')}`
              ]
            );

            agendamentosEncontrados.push({
              id: insertResult.rows[0].id,
              nome: agendamento.nome,
              cpf: agendamento.cpf,
              data: data,
              hora: agendamento.hora
            });

            console.log(`✅ Agendamento criado: ${agendamento.nome} - ${data} ${agendamento.hora}`);
          } catch (error) {
            console.error(`❌ Erro ao processar agendamento ${agendamento.nome}:`, error.message);
            erros.push({
              agendamento: agendamento.nome,
              erro: error.message
            });
          }
        }

        // 2. Voltar para página de pesquisa ANTES de consultar próxima data
        // (exceto na última iteração, onde não há próxima data)
        if (i < proximasDatas.length - 1) {
          console.log(`\n⏸️ Aguardando 2 segundos antes de voltar para página de pesquisa...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log(`\n🔄 Preparando para consultar próxima data (${proximasDatas[i + 1]})...`);
          await scraper.voltar();
          
          // Aguardar um pouco após voltar antes de processar próxima data
          console.log(`⏸️ Aguardando 2 segundos antes de processar próxima data...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log(`\n✅ Última data processada, não é necessário voltar.`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar data ${data}:`, error.message);
        erros.push({
          data,
          erro: error.message
        });
        
        // Tentar voltar mesmo em caso de erro (exceto na última iteração)
        if (i < proximasDatas.length - 1) {
          try {
            await scraper.voltar();
          } catch (voltarError) {
            console.error('⚠️ Erro ao voltar após erro:', voltarError.message);
          }
        }
      }
    }

    // Atualizar última sincronização
    await query(
      'UPDATE configuracoes_detran SET ultima_sincronizacao = CURRENT_TIMESTAMP WHERE usuario_id = $1',
      [req.user.id]
    );

    // Clicar em "Sair" antes de fechar o navegador
    try {
      await scraper.sair();
    } catch (e) {
      console.log('⚠️ Erro ao clicar em "Sair" (não crítico):', e.message);
    }

    await scraper.close();

    res.json({
      success: true,
      message: `Sincronização concluída: ${agendamentosEncontrados.length} agendamento(s) importado(s)`,
      data: {
        importados: agendamentosEncontrados.length,
        agendamentos: agendamentosEncontrados,
        erros: erros.length > 0 ? erros : undefined
      }
    });
  } catch (error) {
    console.error('❌ Erro na sincronização DETRAN:', error);
    console.error('Stack trace:', error.stack);
    
    // Garantir que o scraper seja fechado mesmo em caso de erro
    if (scraper) {
      try {
        console.log('🔒 Fechando scraper após erro...');
        await scraper.close();
        console.log('✅ Scraper fechado');
      } catch (e) {
        console.error('⚠️ Erro ao fechar scraper:', e);
      }
    }

    // Mapear erro para tipo específico e retornar status HTTP apropriado
    const mappedError = mapErrorToType(error);
    const statusCode = mappedError.statusCode || 500;
    const errorResponse = {
      success: false,
      error: mappedError.message || 'Erro ao sincronizar agendamentos do DETRAN',
      tipo: mappedError.tipo || 'generic',
      detalhes: process.env.NODE_ENV === 'development' ? {
        message: mappedError.message,
        stack: mappedError.stack,
        tipo: mappedError.constructor.name
      } : undefined
    };

    console.error(`📤 Enviando resposta de erro (${statusCode}):`, errorResponse);
    res.status(statusCode).json(errorResponse);
  }
}

/**
 * Calcular próximas datas baseadas nos dias de trabalho
 */
function calcularProximasDatas(diasTrabalho, datasEspecificas = []) {
  const diasSemana = {
    'domingo': 0,
    'segunda': 1,
    'terca': 2,
    'quarta': 3,
    'quinta': 4,
    'sexta': 5,
    'sabado': 6
  };

  const datas = [];

  // Se foram fornecidas datas específicas, usar elas
  if (datasEspecificas.length > 0) {
    return datasEspecificas.map(d => formatarDataBR(d));
  }

  // Caso contrário, calcular próximas datas baseadas nos dias de trabalho
  const hoje = new Date();
  const proximasDatas = [];

  for (let i = 0; i < 14; i++) { // Próximas 2 semanas
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    
    const diaSemana = data.getDay();
    const diaNome = Object.keys(diasSemana).find(key => diasSemana[key] === diaSemana);
    
    if (diasTrabalho.includes(diaNome)) {
      proximasDatas.push(formatarDataBR(data));
    }
  }

  return proximasDatas;
}

/**
 * Formatar data para DD/MM/YYYY
 */
function formatarDataBR(data) {
  if (typeof data === 'string') {
    // Se já está no formato correto, retornar
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      return data;
    }
    // Tentar converter de ISO
    data = new Date(data);
  }
  
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Converter data BR para ISO
 */
function converterDataBRparaISO(dataBR) {
  const [dia, mes, ano] = dataBR.split('/');
  return `${ano}-${mes}-${dia}`;
}

/**
 * POST /api/detran/agenda-perito/consultar
 * Consultar agenda do perito para uma data específica
 * Body: { date: "2025-11-04" } (opcional, usa data atual se não fornecido)
 */
router.post('/agenda-perito/consultar', authenticateToken, async (req, res) => {
  let service = null;
  try {
    const { date } = req.body;
    
    // Buscar configuração DETRAN do usuário
    const configResult = await query(
      'SELECT cpf, senha FROM configuracoes_detran WHERE usuario_id = $1 AND ativo = true',
      [req.user.id]
    );

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Configuração DETRAN não encontrada ou inativa'
      });
    }

    const config = configResult.rows[0];
    const alvoDate = date ? new Date(date + 'T12:00:00') : new Date();

    // Inicializar serviço
    const AgendaPeritoService = require('../services/agendaPeritoService');
    service = new AgendaPeritoService(config.cpf, config.senha, {
      headless: true,
      logger: console
    });

    await service.init();
    await service.loginIfNeeded();
    
    const result = await service.consultarAgendaNaData(alvoDate);
    
    await service.close();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Erro ao consultar agenda do perito:', error);
    
    if (service) {
      try {
        await service.close();
      } catch (e) {
        // Ignorar erro ao fechar
      }
    }

    res.status(500).json({
      error: 'Erro ao consultar agenda do perito',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/detran/agenda-perito/agendar
 * Agenda consultas para terças e quartas futuras (até 30 dias)
 */
router.post('/agenda-perito/agendar', authenticateToken, async (req, res) => {
  try {
    // Buscar configuração DETRAN do usuário
    const configResult = await query(
      'SELECT cpf, senha, dias_trabalho FROM configuracoes_detran WHERE usuario_id = $1 AND ativo = true',
      [req.user.id]
    );

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Configuração DETRAN não encontrada ou inativa'
      });
    }

    const config = configResult.rows[0];
    let diasTrabalho;
    if (typeof config.dias_trabalho === 'string') {
      try {
        diasTrabalho = JSON.parse(config.dias_trabalho || '[]');
      } catch (e) {
        diasTrabalho = [];
      }
    } else {
      diasTrabalho = config.dias_trabalho || [];
    }

    // Filtrar apenas terças e quartas
    const diasSemana = { 'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6 };
    const diasFiltrados = diasTrabalho.filter(dia => ['terca', 'quarta'].includes(dia));

    if (diasFiltrados.length === 0) {
      return res.status(400).json({
        error: 'Configuração não inclui terças ou quartas'
      });
    }

    // Calcular datas para os próximos 30 dias
    const hoje = new Date();
    const datas = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      const diaSemana = d.getDay();
      const diaNome = Object.keys(diasSemana).find(key => diasSemana[key] === diaSemana);
      
      if (diasFiltrados.includes(diaNome)) {
        datas.push(d.toISOString().split('T')[0]);
      }
    }

    // Armazenar agendamentos programados (opcional: criar tabela para isso)
    // Por enquanto, apenas retorna as datas
    res.json({
      success: true,
      message: `${datas.length} data(s) programada(s) para consulta`,
      data: {
        datas,
        total: datas.length
      }
    });
  } catch (error) {
    console.error('❌ Erro ao agendar consultas:', error);
    res.status(500).json({
      error: 'Erro ao agendar consultas',
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/detran/agendamentos
 * Consultar agendamentos importados do DETRAN por data
 * Compatível com o guia de integração do módulo Agenda DETRAN V2
 */
router.get('/agendamentos', authenticateToken, async (req, res) => {
  try {
    const { data_inicio, data_fim, limit = 100, offset = 0 } = req.query;
    
    let whereClause = 'WHERE a.usuario_id = $1';
    let queryParams = [req.user.id];
    let paramCounter = queryParams.length;

    // Filtro por data de agendamento
    if (data_inicio) {
      paramCounter++;
      queryParams.push(data_inicio);
      whereClause += ` AND a.data_agendamento::date >= $${paramCounter}::date`;
    }

    if (data_fim) {
      paramCounter++;
      queryParams.push(data_fim);
      whereClause += ` AND a.data_agendamento::date <= $${paramCounter}::date`;
    }

    // Query para total
    const countQuery = `
      SELECT COUNT(*) 
      FROM agendamentos a 
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Query para dados com paginação
    paramCounter++;
    queryParams.push(parseInt(limit));
    paramCounter++;
    queryParams.push(parseInt(offset));

    const dataQuery = `
      SELECT 
        a.id,
        a.data_agendamento,
        EXTRACT(HOUR FROM a.data_agendamento)::INTEGER || ':' || LPAD(EXTRACT(MINUTE FROM a.data_agendamento)::INTEGER::TEXT, 2, '0') as hora,
        a.nome as paciente_nome,
        a.cpf as paciente_cpf,
        COALESCE(a.telefone_fixo || CASE WHEN a.telefone_celular IS NOT NULL THEN ' / ' || a.telefone_celular ELSE '' END, a.telefone) as paciente_telefone,
        a.email as paciente_email,
        a.tipo_transito as tipo_processo,
        a.categoria_cnh as categoria,
        NULL as status_exame_medico,
        NULL as status_exame_psicologico,
        'DETRAN' as origem,
        a.observacoes
      FROM agendamentos a 
      ${whereClause}
      ORDER BY a.data_agendamento ASC
      LIMIT $${paramCounter - 1} OFFSET $${paramCounter}
    `;

    const dataResult = await query(dataQuery, queryParams);

    // Formatar dados no formato esperado pelo guia
    const agendamentos = dataResult.rows.map(row => ({
      id: row.id,
      data_agendamento: row.data_agendamento ? row.data_agendamento.toISOString().split('T')[0] : null,
      hora: row.hora,
      tipo_processo: row.tipo_processo,
      categoria: row.categoria,
      status_exame_medico: row.status_exame_medico,
      status_exame_psicologico: row.status_exame_psicologico,
      origem: row.origem,
      observacoes: row.observacoes,
      paciente_nome: row.paciente_nome,
      paciente_cpf: row.paciente_cpf,
      paciente_telefone: row.paciente_telefone,
      paciente_email: row.paciente_email
    }));

    res.json({
      sucesso: true,
      total,
      agendamentos
    });
  } catch (error) {
    console.error('❌ Erro ao buscar agendamentos DETRAN:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao buscar agendamentos'
    });
  }
});

module.exports = router;

