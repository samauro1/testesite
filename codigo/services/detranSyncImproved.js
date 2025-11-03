const { query, getClient } = require('../config/database');
const DetranScraper = require('./detranScraper');
const { makeExternalUID, hashPayload, normalizeSlotPayload } = require('../utils/detranUID');
const { getCachedCookies, setCachedCookies, clearCachedCookies } = require('../utils/detranSessionCache');

// Retry simples (substitui p-retry se não disponível)
let pRetry;
try {
  pRetry = require('p-retry');
} catch (e) {
  // Implementação simples de retry
  pRetry = async (fn, options = {}) => {
    const { retries = 3, minTimeout = 1000, maxTimeout = 8000, factor = 2, onFailedAttempt } = options;
    let lastError;
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (onFailedAttempt) {
          onFailedAttempt({ attemptNumber: attempt, retriesLeft: retries - attempt + 1, error });
        }
        if (attempt <= retries) {
          const timeout = Math.min(minTimeout * Math.pow(factor, attempt - 1), maxTimeout);
          const jitter = timeout * 0.1 * Math.random(); // 10% de jitter
          await new Promise(resolve => setTimeout(resolve, timeout + jitter));
        }
      }
    }
    throw lastError;
  };
}

/**
 * Serviço de sincronização melhorada da agenda DETRAN
 * Implementa:
 * - Sincronização incremental
 * - Deduplicação robusta
 * - Cache de sessão
 * - Retry automático
 * - Observabilidade
 */
class DetranSyncImproved {
  constructor(usuarioId) {
    this.usuarioId = usuarioId;
  }

  /**
   * Executa sincronização de uma janela de datas
   * 
   * @param {Object} options
   * @param {string} options.windowStart - Data inicial (YYYY-MM-DD)
   * @param {string} options.windowEnd - Data final (YYYY-MM-DD)
   * @param {Array<string>} options.diasTrabalho - Dias da semana a sincronizar
   * @param {string} options.cpf - CPF do perito
   * @param {string} options.senha - Senha do perito
   * @returns {Promise<Object>} Resultado da sincronização
   */
  async runWindowSync({ windowStart, windowEnd, diasTrabalho, cpf, senha }) {
    // Iniciar run de sincronização
    const runId = await this.startRun({ windowStart, windowEnd });
    let scraper = null;

    try {
      // Tentar adquirir lock para evitar execuções concorrentes
      const lockAcquired = await this.acquireLock();
      if (!lockAcquired) {
        throw new Error('Outro sync está rodando para este usuário. Abortado.');
      }

      // Calcular datas válidas dentro da janela
      const datas = this.calculateDatesInWindow(windowStart, windowEnd, diasTrabalho);
      
      if (datas.length === 0) {
        await this.finishRun(client, runId, 'success', { inserted: 0, updated: 0, removed: 0, skipped: 0 }, null);
        return { success: true, message: 'Nenhuma data válida na janela', totals: { inserted: 0, updated: 0, removed: 0 } };
      }

      console.log(`📅 Sincronizando ${datas.length} data(s) na janela ${windowStart} a ${windowEnd}`);

      // Obter ou criar sessão (com cache)
      let session = await getCachedCookies(this.usuarioId);
      let needsLogin = !session;

      // Inicializar scraper
      scraper = new DetranScraper(cpf, senha);
      
      if (needsLogin) {
        console.log('🔐 Fazendo login (sessão não encontrada no cache)...');
        await scraper.init();
        await scraper.login();
        // Salvar cookies no cache
        const cookies = await scraper.page.cookies();
        await setCachedCookies(this.usuarioId, cookies, 45 * 60); // 45 min
        session = cookies;
      } else {
        console.log('✅ Reutilizando sessão do cache');
        await scraper.init();
        await scraper.page.setCookie(...session);
        // Verificar se sessão ainda válida navegando para uma página
        try {
          await scraper.page.goto(scraper.baseUrl, { waitUntil: 'networkidle2', timeout: 10000 });
          // Se redirecionou para login, fazer novo login
          if (scraper.page.url().includes('login') || scraper.page.url().includes('Login')) {
            console.log('⚠️ Sessão expirada, fazendo novo login...');
            await scraper.login();
            const cookies = await scraper.page.cookies();
            await setCachedCookies(this.usuarioId, cookies, 45 * 60);
            session = cookies;
          }
        } catch (e) {
          console.log('⚠️ Erro ao verificar sessão, fazendo novo login...');
          await scraper.login();
          const cookies = await scraper.page.cookies();
          await setCachedCookies(this.usuarioId, cookies, 45 * 60);
          session = cookies;
        }
      }

      let totals = { inserted: 0, updated: 0, removed: 0, skipped: 0 };

      // Processar cada data
      for (let i = 0; i < datas.length; i++) {
        const dataStr = datas[i];
        const dataFormatada = this.formatDataBR(dataStr); // DD/MM/YYYY para o scraper

        try {
          // Retry com backoff exponencial
          const slots = await pRetry(
            async () => {
              console.log(`\n📅 Processando ${dataFormatada} (${i + 1}/${datas.length})...`);
              const agendamentos = await scraper.buscarAgendamentos(dataFormatada);
              
              // Converter agendamentos para formato de slots
              return agendamentos.map(ag => ({
                time: ag.hora,
                nome: ag.nome,
                cpf: ag.cpf,
                telefone: ag.telefone,
                email: ag.email,
                tipo_processo: ag.tipo_processo,
                categoria_cnh: ag.categoria_cnh,
                available: true // Assumindo que se apareceu na lista está disponível
              }));
            },
            {
              retries: 3,
              minTimeout: 1000,
              maxTimeout: 8000,
              factor: 2,
              onFailedAttempt: error => {
                console.log(`⚠️ Tentativa ${error.attemptNumber} falhou, tentando novamente...`);
              }
            }
          );

          // Normalizar slots e gerar UIDs
          const normalizedSlots = slots.map(slot => {
            const payload = normalizeSlotPayload(slot);
            const external_uid = makeExternalUID({
              unidade_code: 'DEFAULT',
              servico_code: 'PERITO',
              data: dataStr, // YYYY-MM-DD
              hora: payload.hora,
              slotId: slot.cpf // Usar CPF como identificador único do slot
            });

            return {
              source: 'DETRAN',
              unidade_code: 'DEFAULT',
              servico_code: 'PERITO',
              data: dataStr,
              hora: payload.hora,
              status: payload.status,
              external_uid,
              payload: {
                ...payload,
                nome: slot.nome,
                cpf: slot.cpf,
                telefone: slot.telefone,
                email: slot.email,
                tipo_processo: slot.tipo_processo,
                categoria_cnh: slot.categoria_cnh
              },
              content_hash: hashPayload(payload)
            };
          });

          // Upsert e diff para esta data
          const result = await this.upsertAndDiffDay(normalizedSlots, dataStr);
          totals.inserted += result.inserted;
          totals.updated += result.updated;
          totals.removed += result.removed;

          // Voltar para página de pesquisa (exceto última data)
          if (i < datas.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await scraper.voltar();
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          console.error(`❌ Erro ao processar data ${dataFormatada}:`, error.message);
          totals.skipped++;
          // Tentar voltar mesmo em caso de erro
          if (i < datas.length - 1) {
            try {
              await scraper.voltar();
            } catch (e) {
              console.error('⚠️ Erro ao voltar após erro:', e.message);
            }
          }
        }
      }

      await this.finishRun(runId, 'success', totals, null);
      await this.releaseLock();
      
      if (scraper) {
        await scraper.close();
      }

      return {
        success: true,
        message: `Sincronização concluída: ${totals.inserted} inseridos, ${totals.updated} atualizados, ${totals.removed} removidos`,
        totals
      };

    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      await this.finishRun(runId, 'failed', null, String(error.stack || error));
      await this.releaseLock();
      
      if (scraper) {
        try {
          await scraper.close();
        } catch (e) {
          console.error('⚠️ Erro ao fechar scraper:', e);
        }
      }

      // Limpar cache se erro de autenticação
      if (error.message.includes('login') || error.message.includes('autenticação')) {
        await clearCachedCookies(this.usuarioId);
      }

      throw error;
    } finally {
      // Nada a fazer - query usa pool automático
    }
  }

  /**
   * Inicia registro de run
   */
  async startRun({ windowStart, windowEnd }) {
    const result = await query(
      `INSERT INTO agenda_sync_runs (source, usuario_id, window_start, window_end, status)
       VALUES ('DETRAN', $1, $2, $3, 'running')
       RETURNING id`,
      [this.usuarioId, windowStart, windowEnd]
    );
    return result.rows[0].id;
  }

  /**
   * Finaliza registro de run
   */
  async finishRun(runId, status, totals, error) {
    await query(
      `UPDATE agenda_sync_runs
       SET status = $2, totals = $3, error = $4, error_details = $5, finished_at = NOW()
       WHERE id = $1`,
      [
        runId,
        status,
        totals ? JSON.stringify(totals) : null,
        error,
        error ? JSON.stringify({ message: error.substring(0, 500), timestamp: new Date().toISOString() }) : null
      ]
    );
  }

  /**
   * Tenta adquirir lock (advisory lock do PostgreSQL)
   */
  async acquireLock() {
    try {
      // Lock específico por usuário
      const lockKey = 873251 + this.usuarioId; // Número arbitrário + usuario_id
      const result = await query('SELECT pg_try_advisory_lock($1)', [lockKey]);
      return result.rows[0].pg_try_advisory_lock;
    } catch (e) {
      // Se não suportar advisory lock, retorna true (não bloqueia)
      console.warn('⚠️ Advisory lock não disponível, continuando sem lock');
      return true;
    }
  }

  /**
   * Libera lock
   */
  async releaseLock() {
    try {
      const lockKey = 873251 + this.usuarioId;
      await query('SELECT pg_advisory_unlock($1)', [lockKey]);
    } catch (e) {
      // Ignorar erro se não suportar
    }
  }

  /**
   * Calcula datas válidas na janela baseadas em dias de trabalho
   */
  calculateDatesInWindow(windowStart, windowEnd, diasTrabalho) {
    const datas = [];
    const diasSemana = {
      'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3,
      'quinta': 4, 'sexta': 5, 'sabado': 6
    };

    const start = new Date(windowStart);
    const end = new Date(windowEnd);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const diaSemana = d.getDay();
      const diaNome = Object.keys(diasSemana).find(key => diasSemana[key] === diaSemana);
      
      if (diasTrabalho.includes(diaNome)) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        datas.push(`${yyyy}-${mm}-${dd}`);
      }
    }

    return datas;
  }

  /**
   * Formata data de YYYY-MM-DD para DD/MM/YYYY
   */
  formatDataBR(dataISO) {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  /**
   * Upsert e diff para um dia específico (transação)
   */
  async upsertAndDiffDay(rows, dataStr) {
    if (!rows || rows.length === 0) {
      // Se não há slots coletados, marcar todos os existentes como removidos
      const removed = await query(
        `UPDATE agenda_slots
         SET status = 'removed',
             is_current = FALSE,
             last_seen_at = NOW()
         WHERE source = 'DETRAN'
           AND usuario_id = $1
           AND data = $2::date
           AND is_current = TRUE
           AND status != 'removed'`,
        [this.usuarioId, dataStr]
      );
      return { inserted: 0, updated: 0, removed: removed.rowCount || 0 };
    }

    const unidade = rows[0].unidade_code;
    const servico = rows[0].servico_code;
    const client = await getClient();

    try {
      await client.query('BEGIN');
      
      // Preparar JSON para upsert
      const rowsJson = JSON.stringify(rows);

      // Criar tabela temporária
      await client.query(`
        CREATE TEMP TABLE tmp_slots (
          source TEXT,
          unidade_code TEXT,
          servico_code TEXT,
          data DATE,
          hora TIME,
          status TEXT,
          external_uid TEXT,
          payload JSONB,
          content_hash TEXT,
          usuario_id INTEGER
        ) ON COMMIT DROP
      `);

      // Popular tabela temporária
      await client.query(`
        INSERT INTO tmp_slots (source, unidade_code, servico_code, data, hora, status, external_uid, payload, content_hash, usuario_id)
        SELECT
          t.source::TEXT,
          t.unidade_code::TEXT,
          t.servico_code::TEXT,
          t.data::DATE,
          t.hora::TIME,
          t.status::TEXT,
          t.external_uid::TEXT,
          t.payload::JSONB,
          t.content_hash::TEXT,
          $2::INTEGER
        FROM jsonb_to_recordset($1::jsonb) AS t(
          source TEXT,
          unidade_code TEXT,
          servico_code TEXT,
          data TEXT,
          hora TEXT,
          status TEXT,
          external_uid TEXT,
          payload JSONB,
          content_hash TEXT
        )
      `, [rowsJson, this.usuarioId]);

      // Upsert na tabela principal
      const upsertResult = await client.query(`
        WITH ins_upd AS (
          INSERT INTO agenda_slots (
            source, unidade_code, servico_code, data, hora, status, is_current,
            external_uid, payload, content_hash, last_seen_at, usuario_id
          )
          SELECT
            source, unidade_code, servico_code, data, hora, status, TRUE,
            external_uid, payload, content_hash, NOW(), usuario_id
          FROM tmp_slots
          ON CONFLICT (source, external_uid)
          DO UPDATE SET
            status = EXCLUDED.status,
            is_current = TRUE,
            payload = EXCLUDED.payload,
            content_hash = EXCLUDED.content_hash,
            last_seen_at = NOW()
          RETURNING (xmax = 0) AS inserted
        )
        SELECT
          (SELECT COUNT(*) FROM ins_upd WHERE inserted) AS inserted,
          (SELECT COUNT(*) FROM ins_upd WHERE NOT inserted) AS updated
      `);

      const inserted = parseInt(upsertResult.rows[0]?.inserted || 0);
      const updated = parseInt(upsertResult.rows[0]?.updated || 0);

      // Marcar como removidos os que não apareceram
      const removedResult = await client.query(`
        UPDATE agenda_slots s
        SET status = 'removed',
            is_current = FALSE,
            last_seen_at = NOW()
        WHERE s.source = 'DETRAN'
          AND s.usuario_id = $1
          AND s.unidade_code = $2
          AND s.servico_code = $3
          AND s.data = (SELECT DISTINCT data FROM tmp_slots)
          AND s.is_current = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM tmp_slots t WHERE t.external_uid = s.external_uid
          )
        RETURNING 1
      `, [this.usuarioId, unidade, servico]);

      const removed = removedResult.rowCount || 0;

      await client.query('COMMIT');
      client.release();

      return { inserted, updated, removed };

    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      throw error;
    }
  }
}

module.exports = DetranSyncImproved;

