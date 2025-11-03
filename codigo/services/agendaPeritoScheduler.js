/**
 * Scheduler para automatizar consultas na Agenda do Perito
 * Executa consultas para terças e quartas configuradas
 */

const cron = require('node-cron');
const { query } = require('../config/database');
const AgendaPeritoService = require('./agendaPeritoService');

/**
 * Classe para gerenciar agendamento automático de consultas
 */
class AgendaPeritoScheduler {
  constructor() {
    this.tasks = new Map(); // Mapa de userId -> task
    this.isRunning = false;
  }

  /**
   * Inicia o scheduler para todos os usuários ativos
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler já está rodando');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Iniciando scheduler de Agenda do Perito...');

    // Agendar para rodar 1x por dia às 08:00
    // Verifica configurações e cria jobs para terças e quartas
    const task = cron.schedule('0 8 * * *', async () => {
      console.log('⏰ Executando scheduler diário de Agenda do Perito...');
      await this.processarUsuarios();
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });

    this.tasks.set('global', task);

    // Executar imediatamente na inicialização (opcional - descomente se necessário)
    // this.processarUsuarios().catch(err => {
    //   console.error('Erro ao processar usuários na inicialização:', err);
    // });

    console.log('✅ Scheduler iniciado (executa diariamente às 08:00)');
  }

  /**
   * Para o scheduler
   */
  stop() {
    this.tasks.forEach(task => task.stop());
    this.tasks.clear();
    this.isRunning = false;
    console.log('🛑 Scheduler parado');
  }

  /**
   * Processa todos os usuários com configuração ativa
   */
  async processarUsuarios() {
    try {
      // Buscar todos os usuários com configuração DETRAN ativa e sincronização automática
      const result = await query(
        `SELECT usuario_id, cpf, senha, dias_trabalho 
         FROM configuracoes_detran 
         WHERE ativo = true 
           AND sincronizacao_automatica = true`
      );

      console.log(`📋 Encontrados ${result.rows.length} usuário(s) para processar`);

      for (const config of result.rows) {
        try {
          await this.processarUsuario(config);
        } catch (error) {
          console.error(`❌ Erro ao processar usuário ${config.usuario_id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar usuários:', error);
    }
  }

  /**
   * Processa um usuário específico
   */
  async processarUsuario(config) {
    const usuarioId = config.usuario_id;
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
    const diasSemana = { 
      'domingo': 0, 
      'segunda': 1, 
      'terca': 2, 
      'quarta': 3, 
      'quinta': 4, 
      'sexta': 5, 
      'sabado': 6 
    };

    const diasFiltrados = diasTrabalho.filter(dia => ['terca', 'quarta'].includes(dia));

    if (diasFiltrados.length === 0) {
      console.log(`⏭️ Usuário ${usuarioId} não tem terças/quartas configuradas`);
      return;
    }

    // Calcular datas para as próximas 2 semanas (terças e quartas)
    const hoje = new Date();
    const datas = [];
    
    for (let i = 0; i < 14; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      const diaSemana = d.getDay();
      const diaNome = Object.keys(diasSemana).find(key => diasSemana[key] === diaSemana);
      
      if (diasFiltrados.includes(diaNome)) {
        datas.push(d.toISOString().split('T')[0]);
      }
    }

    if (datas.length === 0) {
      console.log(`⏭️ Nenhuma data válida encontrada para usuário ${usuarioId}`);
      return;
    }

    console.log(`📅 Processando ${datas.length} data(s) para usuário ${usuarioId}:`, datas);

    // Executar consultas
    let service = null;
    try {
      service = new AgendaPeritoService(config.cpf, config.senha, {
        headless: true,
        logger: console
      });

      await service.init();
      await service.loginIfNeeded();

      const resultados = [];
      for (const dataISO of datas) {
        try {
          const resultado = await service.consultarAgendaNaData(dataISO);
          resultados.push(resultado);
          
          // Aguardar entre consultas para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Erro ao consultar data ${dataISO} para usuário ${usuarioId}:`, error.message);
          resultados.push({
            ok: false,
            dataISO,
            error: error.message
          });
        }
      }

      await service.close();

      // Log de resultados
      const sucessos = resultados.filter(r => r.ok).length;
      console.log(`✅ Processamento concluído para usuário ${usuarioId}: ${sucessos}/${datas.length} sucesso(s)`);

      // Opcional: salvar resultados em tabela de histórico
      // await this.salvarResultados(usuarioId, resultados);

    } catch (error) {
      console.error(`❌ Erro ao processar usuário ${usuarioId}:`, error);
      if (service) {
        try {
          await service.close();
        } catch (e) {
          // Ignorar
        }
      }
    }
  }

  /**
   * Executa consulta imediata para um usuário específico e data
   */
  async executarConsultaManual(usuarioId, dataISO) {
    try {
      const configResult = await query(
        'SELECT cpf, senha FROM configuracoes_detran WHERE usuario_id = $1 AND ativo = true',
        [usuarioId]
      );

      if (configResult.rows.length === 0) {
        throw new Error('Configuração DETRAN não encontrada');
      }

      const config = configResult.rows[0];
      const service = new AgendaPeritoService(config.cpf, config.senha, {
        headless: true,
        logger: console
      });

      await service.init();
      await service.loginIfNeeded();
      
      const resultado = await service.consultarAgendaNaData(dataISO);
      
      await service.close();

      return resultado;
    } catch (error) {
      throw error;
    }
  }
}

// Singleton
let schedulerInstance = null;

function getScheduler() {
  if (!schedulerInstance) {
    schedulerInstance = new AgendaPeritoScheduler();
  }
  return schedulerInstance;
}

module.exports = {
  AgendaPeritoScheduler,
  getScheduler
};

