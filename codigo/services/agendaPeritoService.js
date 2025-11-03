/**
 * Serviço para consultar/registrar na Agenda do Perito no e-CNH SP
 * Acessa "Consultar agenda do Perito" → "Acesso à Agenda Diária do Perito"
 * e preenche datas no formato específico: "terça 04/11/2025" e "04/11/2025 ag"
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { formatarDataExibicao, formatarDataReferencia } = require('../utils/dateFormatting');
const { captureArtifactsOnError } = require('../utils/detranArtifacts');
const { DetranSelectorError, DetranCaptchaError, DetranAuthError } = require('../utils/detranErrorTypes');

const BASE_URL = 'https://www.e-cnhsp.sp.gov.br/';

/**
 * Helper para delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Serviço de automação para consultar Agenda do Perito
 */
class AgendaPeritoService {
  constructor(cpf, senha, options = {}) {
    this.cpf = cpf;
    this.senha = senha;
    this.baseUrl = BASE_URL;
    this.browser = null;
    this.page = null;
    this.userDataDir = options.userDataDir || path.resolve('.playwright/state');
    this.headless = options.headless !== false; // Default headless
    this.logger = options.logger || console;
  }

  /**
   * Inicializa o navegador
   */
  async init() {
    try {
      this.logger.log('🚀 Inicializando navegador para Agenda do Perito...');
      
      // Criar diretório de estado se não existir
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true });
      }

      const launchOptions = {
        headless: this.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ],
        userDataDir: this.userDataDir,
        timeout: 60000
      };

      this.browser = await puppeteer.launch(launchOptions);
      this.page = await this.browser.newPage();
      
      await this.page.setViewport({ width: 1366, height: 768 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      this.logger.log('✅ Navegador inicializado');
    } catch (error) {
      this.logger.error('❌ Erro ao inicializar navegador:', error);
      throw new Error(`Falha ao inicializar navegador: ${error.message}`);
    }
  }

  /**
   * Faz login se necessário
   */
  async loginIfNeeded() {
    try {
      this.logger.log('🔐 Verificando autenticação...');
      await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await delay(3000);

      // Verificar se já está logado
      const isLoggedIn = await this.verificarSeLogado();
      if (isLoggedIn) {
        this.logger.log('✅ Já está autenticado');
        return;
      }

      // Tentar acessar "Consultar agenda do Perito"
      this.logger.log('🔍 Procurando link "Consultar agenda do Perito"...');
      const consultarLink = await this.encontrarLink('Consultar agenda do Perito');
      
      if (consultarLink) {
        await consultarLink.click();
        await delay(2000);
      }

      // Tentar acessar "Acesso à Agenda Diária do Perito"
      this.logger.log('🔍 Procurando link "Acesso à Agenda Diária do Perito"...');
      const agendaDiariaLink = await this.encontrarLink('Acesso à Agenda Diária do Perito');
      
      if (agendaDiariaLink) {
        await agendaDiariaLink.click();
        await delay(2000);
      }

      // Verificar se pede login (Acesso Restrito)
      const precisaLogin = await this.verificarNecessitaLogin();
      
      if (!precisaLogin) {
        this.logger.log('✅ Sessão possivelmente já autenticada');
        return;
      }

      // Fazer login
      this.logger.log('🔐 Fazendo login...');
      
      if (!this.cpf || !this.senha) {
        throw new Error('Credenciais ausentes: defina CPF e senha.');
      }

      // Preencher CPF e Senha
      await this.preencherCPF(this.cpf);
      await delay(1000);
      await this.preencherSenha(this.senha);
      await delay(1000);

      // Clicar em "Acessar"
      await this.clicarBotaoAcessar();
      await delay(3000);

      // Verificar CAPTCHA
      const temCaptcha = await this.verificarCaptcha();
      if (temCaptcha) {
        const screenshotPath = path.join(this.userDataDir, `captcha_${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        throw new DetranCaptchaError('CAPTCHA detectado — intervenção manual necessária.');
      }

      // Verificar se login foi bem-sucedido
      const loggedIn = await this.verificarSeLogado();
      if (!loggedIn) {
        await delay(2000);
        const aindaNaoLogado = !(await this.verificarSeLogado());
        if (aindaNaoLogado) {
          await captureArtifactsOnError(this.page, 'login-agenda-perito-failed');
          throw new DetranAuthError('Não foi possível confirmar login. Verifique credenciais.');
        }
      }

      this.logger.log('✅ Login realizado com sucesso');
    } catch (error) {
      this.logger.error('❌ Erro ao fazer login:', error);
      if (error.tipo) {
        throw error;
      }
      throw new DetranAuthError(`Erro ao fazer login: ${error.message}`);
    }
  }

  /**
   * Consulta agenda para uma data específica
   * @param {Date|string} alvoDate - Data para consultar (Date ou string ISO)
   * @returns {Promise<Object>} Resultado da consulta
   */
  async consultarAgendaNaData(alvoDate) {
    try {
      const data = typeof alvoDate === 'string' ? new Date(alvoDate) : alvoDate;
      const dataExibicao = formatarDataExibicao(data);     // ex.: "terça 04/11/2025"
      const dataReferencia = formatarDataReferencia(data); // ex.: "04/11/2025 ag"

      this.logger.log(`📅 Consultando agenda para: ${dataExibicao}`);

      // Garantir que estamos na página de Agenda Diária
      await this.navegarParaAgendaDiaria();

      // Preencher campo de data de exibição
      this.logger.log(`✍️ Preenchendo "Data Exibição": ${dataExibicao}`);
      await this.preencherCampoDataExibicao(dataExibicao);

      // Preencher campo de data de referência
      this.logger.log(`✍️ Preenchendo "Data Referência": ${dataReferencia}`);
      await this.preencherCampoDataReferencia(dataReferencia);

      await delay(1000);

      // Submeter/consultar
      this.logger.log('🔘 Clicando em "Consultar"...');
      await this.clicarBotaoConsultar();
      
      await delay(3000);
      try {
        await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 });
      } catch (e) {
        // Pode ser SPA, não há navegação tradicional
      }

      // Screenshot para auditoria
      const dataFormatada = formatarDataExibicao(data).replace(/\s+/g, '_').replace(/\//g, '-');
      const screenshotPath = path.join(this.userDataDir, `agenda_${dataFormatada}_${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });

      // Verificar se há resultado (tabela ou mensagem)
      const temResultado = await this.verificarTemResultado();

      this.logger.log(`✅ Consulta realizada. Resultado: ${temResultado ? 'Encontrado' : 'Não encontrado'}`);

      return {
        ok: temResultado,
        dataExibicao,
        dataReferencia,
        screenshot: screenshotPath,
        dataISO: data.toISOString().split('T')[0]
      };
    } catch (error) {
      this.logger.error(`❌ Erro ao consultar agenda para ${alvoDate}:`, error);
      throw error;
    }
  }

  /**
   * Navega para a página de Agenda Diária do Perito
   */
  async navegarParaAgendaDiaria() {
    try {
      // Verificar se já estamos na página correta
      const urlAtual = this.page.url();
      if (urlAtual.includes('Agenda') || urlAtual.includes('agenda') || urlAtual.includes('Perito')) {
        this.logger.log('✅ Já estamos na página de Agenda do Perito');
        return;
      }

      // Procurar link "Acesso à Agenda Diária do Perito"
      const link = await this.encontrarLink('Acesso à Agenda Diária do Perito');
      if (link) {
        await link.click();
        await delay(2000);
        this.logger.log('✅ Navegou para Agenda Diária do Perito');
      } else {
        // Tentar navegar diretamente (pode variar)
        this.logger.log('⚠️ Link não encontrado, tentando navegação direta...');
        await this.page.goto(`${this.baseUrl}AgendaDiariaPerito`, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        });
        await delay(2000);
      }
    } catch (error) {
      this.logger.error('❌ Erro ao navegar para Agenda Diária:', error);
      throw new DetranSelectorError(`Erro ao navegar para página: ${error.message}`);
    }
  }

  /**
   * Preenche campo de data de exibição
   */
  async preencherCampoDataExibicao(dataExibicao) {
    const selectors = [
      'input[name="dataExibicao"]',
      'input[id="dataExibicao"]',
      'input[placeholder*="data" i]',
      'input[type="text"]:first-of-type'
    ];

    for (const selector of selectors) {
      try {
        const input = await this.page.$(selector);
        if (input) {
          await input.click({ clickCount: 3 });
          await input.type(dataExibicao, { delay: 100 });
          this.logger.log(`✅ Campo "Data Exibição" preenchido com: ${dataExibicao}`);
          return;
        }
      } catch (e) {
        continue;
      }
    }

    throw new DetranSelectorError('Não foi possível encontrar o campo "Data Exibição"');
  }

  /**
   * Preenche campo de data de referência
   */
  async preencherCampoDataReferencia(dataReferencia) {
    const selectors = [
      'input[name="dataReferencia"]',
      'input[id="dataReferencia"]',
      'input[name*="referencia" i]',
      'input[type="text"]:nth-of-type(2)'
    ];

    for (const selector of selectors) {
      try {
        const input = await this.page.$(selector);
        if (input) {
          await input.click({ clickCount: 3 });
          await input.type(dataReferencia, { delay: 100 });
          this.logger.log(`✅ Campo "Data Referência" preenchido com: ${dataReferencia}`);
          return;
        }
      } catch (e) {
        continue;
      }
    }

    throw new DetranSelectorError('Não foi possível encontrar o campo "Data Referência"');
  }

  /**
   * Clica no botão Consultar
   */
  async clicarBotaoConsultar() {
    const button = await this.page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
      return buttons.find(btn => {
        const text = (btn.textContent || btn.value || '').toUpperCase();
        return text.includes('CONSULTAR') || text.includes('PESQUISAR');
      });
    });

    if (button && button.asElement()) {
      await button.asElement().click();
    } else {
      // Fallback: pressionar Enter
      await this.page.keyboard.press('Enter');
    }
  }

  /**
   * Verifica se há resultado na página
   */
  async verificarTemResultado() {
    try {
      const temResultado = await this.page.evaluate(() => {
        const temTabela = !!document.querySelector('table, .table');
        const temResultado = !!document.querySelector('.resultado, #agenda, [class*="resultado"]');
        const temDados = document.body.innerText.includes('Hora') || document.body.innerText.includes('CPF');
        return temTabela || temResultado || temDados;
      });
      return temResultado;
    } catch (e) {
      return false;
    }
  }

  /**
   * Verifica se está logado
   */
  async verificarSeLogado() {
    try {
      const url = this.page.url().toLowerCase();
      if (url.includes('login') || url.includes('entrar') || url.includes('auth')) {
        return false;
      }

      const temLogout = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        return links.some(el => {
          const text = (el.textContent || '').toLowerCase();
          return text.includes('sair') || text.includes('logout');
        });
      });

      return temLogout;
    } catch (e) {
      return false;
    }
  }

  /**
   * Verifica se precisa fazer login
   */
  async verificarNecessitaLogin() {
    try {
      const precisa = await this.page.evaluate(() => {
        const texto = document.body.innerText.toUpperCase();
        return texto.includes('ACESSO RESTRITO') || 
               texto.includes('LOGIN') ||
               !!document.querySelector('input[type="password"]');
      });
      return precisa;
    } catch (e) {
      return false;
    }
  }

  /**
   * Encontra link por texto
   */
  async encontrarLink(texto) {
    const link = await this.page.evaluateHandle((txt) => {
      const links = Array.from(document.querySelectorAll('a, button'));
      return links.find(link => {
        const text = (link.textContent || link.innerText || '').toUpperCase();
        return text.includes(txt.toUpperCase());
      });
    }, texto);

    return link && link.asElement() ? link.asElement() : null;
  }

  /**
   * Preenche CPF
   */
  async preencherCPF(cpf) {
    const selectors = [
      'input[name*="cpf" i]',
      'input[id*="cpf" i]',
      'input[type="text"]'
    ];

    for (const selector of selectors) {
      try {
        const input = await this.page.$(selector);
        if (input) {
          await input.click({ clickCount: 3 });
          await input.type(cpf, { delay: 100 });
          return;
        }
      } catch (e) {
        continue;
      }
    }

    throw new DetranSelectorError('Campo CPF não encontrado');
  }

  /**
   * Preenche senha
   */
  async preencherSenha(senha) {
    const input = await this.page.$('input[type="password"]');
    if (!input) {
      throw new DetranSelectorError('Campo senha não encontrado');
    }
    await input.click({ clickCount: 3 });
    await input.type(senha, { delay: 100 });
  }

  /**
   * Clica no botão Acessar
   */
  async clicarBotaoAcessar() {
    const button = await this.page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      return buttons.find(btn => {
        const text = (btn.textContent || btn.value || '').toUpperCase();
        return text.includes('ACESSAR') || text.includes('ENTRAR');
      });
    });

    if (button && button.asElement()) {
      await button.asElement().click();
    } else {
      await this.page.keyboard.press('Enter');
    }
  }

  /**
   * Verifica se há CAPTCHA
   */
  async verificarCaptcha() {
    try {
      const temCaptcha = await this.page.evaluate(() => {
        return !!document.querySelector('iframe[src*="recaptcha"], .g-recaptcha, [id*="recaptcha"]');
      });
      return temCaptcha;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fecha o navegador
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('🔒 Navegador fechado');
    }
  }
}

module.exports = AgendaPeritoService;

