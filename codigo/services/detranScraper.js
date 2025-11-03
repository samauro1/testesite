const puppeteer = require('puppeteer');
const { captureArtifactsOnError } = require('../utils/detranArtifacts');
const { DetranSelectorError, DetranCaptchaError, DetranAuthError, DetranTimeoutError } = require('../utils/detranErrorTypes');
const { formatarDDMMYYYY, formatarDDMMYYYY_semBarras } = require('../utils/dateFormatting');

/**
 * Helper para aguardar um tempo (substitui waitForTimeout que foi removido)
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Procurar primeiro seletor válido entre candidatos (fallback)
 */
async function pickSelector(page, candidates, options = { timeout: 4000 }) {
  for (const selector of candidates) {
    try {
      await page.waitForSelector(selector, { timeout: 2000, visible: true });
      const element = await page.$(selector);
      if (element) {
        const isVisible = await page.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        }, element);
        if (isVisible) {
          console.log(`✅ Seletor encontrado: ${selector}`);
          return element;
        }
      }
    } catch (e) {
      // Tentar próximo seletor
      continue;
    }
  }
  return null;
}

/**
 * Detectar se há iframe com formulário de login
 */
async function getFrameWithLogin(page) {
  const frames = page.frames();
  for (const frame of frames) {
    try {
      const hasInput = await frame.$('input[type="password"], input[name*="senha"], input[id*="senha"]');
      if (hasInput) {
        console.log('📄 Login está em iframe, usando frame:', frame.url() || frame.name());
        return frame;
      }
    } catch (e) {
      // Frame pode não estar carregado, continuar
    }
  }
  return null;
}

/**
 * Detectar CAPTCHA na página
 */
async function detectCaptcha(pageOrFrame) {
  const suspects = [
    'iframe[src*="recaptcha"]',
    'iframe[src*="captcha"]',
    '.g-recaptcha',
    'div[id*="recaptcha"]',
    'div[class*="recaptcha"]'
  ];
  
  for (const selector of suspects) {
    try {
      const element = await pageOrFrame.$(selector);
      if (element) {
        const isVisible = await pageOrFrame.evaluate(el => {
          return el.offsetParent !== null && window.getComputedStyle(el).display !== 'none';
        }, element);
        if (isVisible) {
          console.log(`⚠️ CAPTCHA detectado: ${selector}`);
          return true;
        }
      }
    } catch (e) {
      // Continuar verificando
    }
  }
  
  // Verificar também por texto
  try {
    const bodyText = await pageOrFrame.evaluate(() => document.body.innerText.toLowerCase());
    if (bodyText.includes('não sou um robô') || 
        bodyText.includes('not a robot') || 
        bodyText.includes('verificação de segurança')) {
      console.log('⚠️ CAPTCHA detectado por texto');
      return true;
    }
  } catch (e) {
    // Ignorar
  }
  
  return false;
}

/**
 * Aceitar cookies se presente
 */
async function acceptCookiesIfPresent(page) {
  try {
    const buttons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      return allButtons.filter(btn => {
        const text = (btn.textContent || btn.innerText || '').toUpperCase();
        const id = (btn.id || '').toUpperCase();
        const className = (btn.className || '').toUpperCase();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toUpperCase();
        return text.includes('ACEITAR') || 
               text.includes('CONCORDO') || 
               text.includes('OK') ||
               id.includes('ACCEPT') ||
               className.includes('ACCEPT') ||
               id === 'ONETRUST-ACCEPT-BTN-HANDLER' ||
               ariaLabel.includes('ACEITAR');
      }).map(btn => ({
        element: btn,
        selector: btn.id ? `#${btn.id}` : btn.className ? `.${btn.className.split(' ')[0]}` : null
      }));
    });
    
    for (const btnInfo of buttons) {
      try {
        if (btnInfo.selector) {
          const button = await page.$(btnInfo.selector);
          if (button) {
            await button.click({ timeout: 2000 });
            console.log('✅ Cookies aceitos');
            await delay(1000);
            return true;
          }
        } else {
          // Tentar clicar diretamente via evaluate
          await page.evaluate(el => el.click(), btnInfo.element);
          console.log('✅ Cookies aceitos (via evaluate)');
          await delay(1000);
          return true;
        }
      } catch (e) {
        // Tentar próximo
      }
    }
  } catch (e) {
    // Ignorar erros
  }
  return false;
}

/**
 * Verificar se login foi bem-sucedido
 */
async function isLoggedIn(page) {
  // Verificar URL (não deve conter 'login', 'entrar', 'auth')
  const url = page.url().toLowerCase();
  if (!url.includes('login') && !url.includes('entrar') && !url.includes('auth')) {
    return true;
  }
  
  // Verificar se há elementos de área logada (botões/links de "Sair")
  try {
    const hasLogout = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      return links.some(el => {
        const text = (el.textContent || el.innerText || '').toLowerCase();
        const href = (el.href || '').toLowerCase();
        const onclick = (el.getAttribute('onclick') || '').toLowerCase();
        return text.includes('sair') || 
               text.includes('logout') ||
               href.includes('logout') ||
               onclick.includes('logout');
      });
    });
    
    if (hasLogout) {
      return true;
    }
  } catch (e) {
    // Ignorar erro
  }
  
  return false;
}

/**
 * Extrair mensagem de erro do formulário
 */
async function extractLoginErrorMessage(pageOrFrame) {
  const errorSelectors = [
    '.error',
    '.alert-danger',
    '.msg-erro',
    '[role="alert"]',
    '.invalid-feedback',
    'div[class*="error"]'
  ];
  
  for (const selector of errorSelectors) {
    try {
      const element = await pageOrFrame.$(selector);
      if (element) {
        const text = await pageOrFrame.evaluate(el => el.textContent?.trim(), element);
        if (text && text.length > 0 && text.length < 200) {
          return text;
        }
      }
    } catch (e) {
      // Continuar
    }
  }
  
  return null;
}

/**
 * Serviço para fazer scraping dos agendamentos do DETRAN SP
 * Site: https://www.e-cnhsp.sp.gov.br/
 */
class DetranScraper {
  constructor(cpf, senha) {
    this.cpf = cpf;
    this.senha = senha;
    this.baseUrl = 'https://www.e-cnhsp.sp.gov.br/gefor/index.jsp';
    this.browser = null;
    this.page = null;
    // V3: Detecção dinâmica de menu contextual
    this.menuContextoDetectado = false;
    this.menuLinksAgenda = [];
  }

  /**
   * Inicializa o navegador
   */
  async init() {
    try {
      console.log('🚀 Inicializando navegador...');
      
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ],
        timeout: 60000 // 60 segundos para inicializar
      };

      // Em Windows, pode ser necessário configurar executablePath
      // Se o Chrome não for encontrado automaticamente
      if (process.platform === 'win32') {
        // Tentar usar o Chrome instalado no sistema se disponível
        const possiblePaths = [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        ];
        
        // Não definir executablePath por padrão - deixar Puppeteer encontrar automaticamente
        // Se houver problemas, descomente e ajuste:
        // const fs = require('fs');
        // for (const path of possiblePaths) {
        //   if (fs.existsSync(path)) {
        //     launchOptions.executablePath = path;
        //     break;
        //   }
        // }
      }

      this.browser = await puppeteer.launch(launchOptions);
      this.page = await this.browser.newPage();
      
      // Configurar timeouts maiores
      this.page.setDefaultNavigationTimeout(120000); // 2 minutos
      this.page.setDefaultTimeout(60000); // 1 minuto
      
      // Configurar viewport e user agent
      await this.page.setViewport({ width: 1920, height: 1080 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Listeners para erros
      this.page.on('error', err => console.error('❌ Erro da página:', err));
      this.browser.on('disconnected', () => console.log('⚠️ Browser desconectado'));
      
      console.log('✅ Navegador inicializado com timeouts aumentados');
    } catch (error) {
      console.error('❌ Erro ao inicializar navegador:', error);
      console.error('Detalhes:', {
        message: error.message,
        stack: error.stack
      });
      throw new Error(`Falha ao inicializar navegador: ${error.message}. Certifique-se de que o Puppeteer está instalado corretamente e que há espaço em disco suficiente.`);
    }
  }

  /**
   * V3: Fecha modal "Importante" se aparecer (não falha se não existir)
   */
  async fecharModalImportante() {
    try {
      console.log('\n🔍 Verificando se há modal "Importante" para fechar...');
      
      const frames = this.page.frames();
      
      // Procurar em todos os frames
      for (const frame of frames) {
        try {
          const modalInfo = await frame.evaluate(() => {
            // Estratégia 1: Procurar por modal visível com título "Importante"
            const modals = Array.from(document.querySelectorAll('div[class*="modal"], div[class*="dialog"], div[class*="popup"], div[id*="modal"], div[id*="dialog"]'));
            
            for (const modal of modals) {
              // Verificar se está visível
              const style = window.getComputedStyle(modal);
              if (style.display === 'none' || style.visibility === 'hidden') continue;
              
              const text = (modal.textContent || modal.innerText || '').toUpperCase();
              
              // Verificar se é o modal "Importante" (vários indicadores)
              const isModalImportante = text.includes('IMPORTANTE') || 
                                       text.includes('ATENÇÃO SRS. MÉDICOS') ||
                                       text.includes('ATENÇÃO SRS. MÉDICO') ||
                                       (text.includes('JAVA') && text.includes('DOWNLOAD'));
              
              if (isModalImportante) {
                // Procurar botão "Fechar" dentro do modal
                const buttons = Array.from(modal.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
                const fecharButton = buttons.find(btn => {
                  const btnText = (btn.textContent || btn.innerText || btn.value || '').toUpperCase().trim();
                  const btnStyle = window.getComputedStyle(btn);
                  return (btnText === 'FECHAR' || btnText.includes('FECHAR') || btnText === 'CLOSE' || btnText === '×' || btnText === 'X') &&
                         btnStyle.display !== 'none' && btnStyle.visibility !== 'hidden';
                });
                
                if (fecharButton) {
                  return {
                    element: fecharButton,
                    found: true
                  };
                }
              }
            }
            
            // Estratégia 2: Procurar diretamente pelo botão "Fechar" próximo a "Importante"
            const allButtons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
            for (const btn of allButtons) {
              const btnText = (btn.textContent || btn.innerText || btn.value || '').toUpperCase().trim();
              const btnStyle = window.getComputedStyle(btn);
              
              if ((btnText === 'FECHAR' || btnText.includes('FECHAR')) && 
                  btnStyle.display !== 'none' && btnStyle.visibility !== 'hidden') {
                // Verificar contexto (pais até 5 níveis)
                let parent = btn.parentElement;
                let nivel = 0;
                while (parent && nivel < 5) {
                  const parentText = (parent.textContent || parent.innerText || '').toUpperCase();
                  if (parentText.includes('IMPORTANTE') || parentText.includes('ATENÇÃO SRS. MÉDICOS')) {
                    return {
                      element: btn,
                      found: true
                    };
                  }
                  parent = parent.parentElement;
                  nivel++;
                }
              }
            }
            
            return { found: false };
          });
          
          if (modalInfo && modalInfo.found) {
            console.log('✅ Modal "Importante" encontrado, clicando em "Fechar"...');
            
            // Clicar no botão
            await frame.evaluate((btn) => {
              btn.click();
            }, modalInfo.element);
            
            await delay(1000);
            console.log('✅ Modal "Importante" fechado com sucesso');
            
            // Verificar se ainda está visível (pode ter checkbox "não exibir novamente")
            const aindaVisivel = await frame.evaluate(() => {
              const text = document.body.innerText.toUpperCase();
              return text.includes('IMPORTANTE') && text.includes('ATENÇÃO SRS. MÉDICOS');
            });
            
            if (!aindaVisivel) {
              return true;
            }
          }
        } catch (e) {
          // Frame pode não estar acessível, continuar
          continue;
        }
      }
      
      // Verificar também na página principal
      const modalInfo = await this.page.evaluate(() => {
        // Estratégia 1: Procurar modal visível
        const modals = Array.from(document.querySelectorAll('div[class*="modal"], div[class*="dialog"], div[class*="popup"], div[id*="modal"], div[id*="dialog"]'));
        
        for (const modal of modals) {
          const style = window.getComputedStyle(modal);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          
          const text = (modal.textContent || modal.innerText || '').toUpperCase();
          
          const isModalImportante = text.includes('IMPORTANTE') || 
                                   text.includes('ATENÇÃO SRS. MÉDICOS') ||
                                   text.includes('ATENÇÃO SRS. MÉDICO') ||
                                   (text.includes('JAVA') && text.includes('DOWNLOAD'));
          
          if (isModalImportante) {
            const buttons = Array.from(modal.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
            const fecharButton = buttons.find(btn => {
              const btnText = (btn.textContent || btn.innerText || btn.value || '').toUpperCase().trim();
              const btnStyle = window.getComputedStyle(btn);
              
              return (btnText === 'FECHAR' || btnText.includes('FECHAR') || btnText === 'CLOSE') &&
                     btnStyle.display !== 'none' && btnStyle.visibility !== 'hidden';
            });
            
            if (fecharButton) {
              return {
                element: fecharButton,
                found: true
              };
            }
          }
        }
        
        // Estratégia 2: Procurar botão "Fechar" visível próximo a "Importante"
        const allButtons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
        for (const btn of allButtons) {
          const btnText = (btn.textContent || btn.innerText || btn.value || '').toUpperCase().trim();
          const btnStyle = window.getComputedStyle(btn);
          
          if ((btnText === 'FECHAR' || btnText.includes('FECHAR')) && 
              btnStyle.display !== 'none' && btnStyle.visibility !== 'hidden') {
            let parent = btn.parentElement;
            let nivel = 0;
            while (parent && nivel < 5) {
              const parentText = (parent.textContent || parent.innerText || '').toUpperCase();
              if (parentText.includes('IMPORTANTE') || parentText.includes('ATENÇÃO SRS. MÉDICOS')) {
                return {
                  element: btn,
                  found: true
                };
              }
              parent = parent.parentElement;
              nivel++;
            }
          }
        }
        
        return { found: false };
      });
      
      if (modalInfo && modalInfo.found) {
        console.log('✅ Modal "Importante" encontrado na página principal, clicando em "Fechar"...');
        await this.page.evaluate((btn) => {
          btn.click();
        }, modalInfo.element);
        await delay(1000);
        console.log('✅ Modal "Importante" fechado com sucesso');
        return true;
      }
      
      console.log('ℹ️ Modal "Importante" não encontrado (isso é OK)');
      return false;
      
    } catch (error) {
      console.log(`⚠️ Erro ao tentar fechar modal (não crítico): ${error.message}`);
      return false; // NUNCA falha, apenas retorna false
    }
  }

  /**
   * NOVO FLUXO: Clicar em "Consulta Agenda do Perito" ANTES do login
   * Isso leva à página de login da agenda
   */
  async clicarConsultaAgendaPerito() {
    try {
      console.log('\n🔍 === PROCURANDO "CONSULTA AGENDA DO PERITO" ===');
      
      await delay(2000); // Aguardar página estabilizar após fechar modal
      
      // Procurar link/botão "Consulta Agenda do Perito" em todos os frames
      const frames = this.page.frames();
      let encontrado = false;
      
      for (const frame of frames) {
        try {
          const linkAgenda = await frame.evaluateHandle(() => {
            // Procurar todos os links e botões
            const allLinks = Array.from(document.querySelectorAll('a, button, [onclick], [href]'));
            
            for (const link of allLinks) {
              const text = (link.textContent || link.innerText || '').toUpperCase();
              const href = (link.href || link.getAttribute('href') || '').toUpperCase();
              const onclick = (link.getAttribute('onclick') || '').toUpperCase();
              
              // Procurar por "consulta agenda do perito" ou variações
              const matchAgenda = text.includes('CONSULTA AGENDA DO PERITO') ||
                                text.includes('CONSULTA AGENDA PERITO') ||
                                text.includes('AGENDA DO PERITO') ||
                                (text.includes('CONSULTA') && text.includes('AGENDA') && text.includes('PERITO')) ||
                                href.includes('AGENDA') && href.includes('PERITO') ||
                                onclick.includes('AGENDA') && onclick.includes('PERITO');
              
              const visivel = link.offsetParent !== null && 
                            window.getComputedStyle(link).display !== 'none' &&
                            window.getComputedStyle(link).visibility !== 'hidden';
              
              if (matchAgenda && visivel) {
                return link;
              }
            }
            return null;
          });
          
          if (linkAgenda && linkAgenda.asElement()) {
            const textoLink = await frame.evaluate(el => el.textContent || el.innerText || '', linkAgenda.asElement());
            console.log(`✅ Link encontrado no frame "${frame.name() || 'unnamed'}": "${textoLink.substring(0, 50)}"`);
            console.log('🔘 Clicando em "Consulta Agenda do Perito"...');
            
            await linkAgenda.asElement().click();
            await delay(3000); // Aguardar navegação
            encontrado = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Se não encontrou em frames, procurar na página principal
      if (!encontrado) {
        const linkAgenda = await this.page.evaluateHandle(() => {
          const allLinks = Array.from(document.querySelectorAll('a, button, [onclick]'));
          for (const link of allLinks) {
            const text = (link.textContent || link.innerText || '').toUpperCase();
            const href = (link.href || link.getAttribute('href') || '').toUpperCase();
            const matchAgenda = text.includes('CONSULTA AGENDA DO PERITO') ||
                              text.includes('CONSULTA AGENDA PERITO') ||
                              (text.includes('CONSULTA') && text.includes('AGENDA') && text.includes('PERITO'));
            
            const visivel = link.offsetParent !== null;
            if (matchAgenda && visivel) {
              return link;
            }
          }
          return null;
        });
        
        if (linkAgenda && linkAgenda.asElement()) {
          const textoLink = await this.page.evaluate(el => el.textContent || el.innerText || '', linkAgenda.asElement());
          console.log(`✅ Link encontrado na página principal: "${textoLink.substring(0, 50)}"`);
          console.log('🔘 Clicando em "Consulta Agenda do Perito"...');
          await linkAgenda.asElement().click();
          await delay(3000);
          encontrado = true;
        }
      }
      
      if (!encontrado) {
        console.log('⚠️ Link "Consulta Agenda do Perito" não encontrado, tentando continuar mesmo assim...');
      }
      
      return encontrado;
    } catch (error) {
      console.log(`⚠️ Erro ao clicar em "Consulta Agenda do Perito": ${error.message}`);
      return false;
    }
  }

  /**
   * V3: Detecta menu contextual SEM falhar se não existir
   * Retorna informações do menu ou array vazio se não encontrar
   */
  async detectarMenuContexto() {
    try {
      console.log('\n🔍 === DETECTANDO MENU CONTEXTUAL ===');
      
      await delay(2000); // Aguardar página estabilizar após login
      
      const frames = this.page.frames();
      console.log(`📋 Total de frames: ${frames.length}`);
      
      for (const frame of frames) {
        try {
          const menuInfo = await frame.evaluate(() => {
            // Procurar todos os links e botões
            const allLinks = Array.from(document.querySelectorAll('a, button, [onclick]'));
            const linksAgenda = [];
            
            for (const link of allLinks) {
              const text = (link.textContent || link.innerText || '').toUpperCase();
              const href = (link.href || link.getAttribute('href') || '').toUpperCase();
              const onclick = (link.getAttribute('onclick') || '').toUpperCase();
              
              // EXCLUIR links com certificado digital
              const temCertificado = text.includes('CERTIFICADO') || 
                                   text.includes('DIGITAL') ||
                                   href.includes('CERTIFICADO') ||
                                   href.includes('DIGITAL') ||
                                   onclick.includes('CERTIFICADO') ||
                                   onclick.includes('DIGITAL');
              
              // Buscar links relacionados a agenda/perito
              const palavrasChave = [
                'AGENDA',
                'PERITO',
                'IMPRIMIR AGENDA',
                'AGENDA DIÁRIA',
                'AGENDA DIARIA',
                'CONSULTAR AGENDA'
              ];
              
              const matchAgenda = palavrasChave.some(palavra => 
                text.includes(palavra) || href.includes(palavra) || onclick.includes(palavra)
              );
              
              if (matchAgenda && !temCertificado) {
                linksAgenda.push({
                  element: link,
                  texto: text.substring(0, 100),
                  href: href.substring(0, 200),
                  onclick: onclick.substring(0, 200)
                });
              }
            }
            
            return linksAgenda.length > 0 ? linksAgenda : null;
          });
          
          if (menuInfo && menuInfo.length > 0) {
            this.menuContextoDetectado = true;
            this.menuLinksAgenda = menuInfo;
            console.log(`✅ Menu detectado no frame "${frame.name() || 'unnamed'}":`);
            console.log(`📋 ${menuInfo.length} link(s) de agenda encontrado(s):`);
            menuInfo.forEach((link, idx) => {
              console.log(`   [${idx + 1}] "${link.texto.substring(0, 50)}"`);
            });
            
            // Screenshot após detectar menu
            await this._takeScreenshotAndHtml('02-menu-agenda');
            
            return true;
          }
        } catch (e) {
          // Frame pode não estar acessível, continuar
          continue;
        }
      }
      
      // Se não encontrou em frames, procurar na página principal
      const menuInfo = await this.page.evaluate(() => {
        const allLinks = Array.from(document.querySelectorAll('a, button, [onclick]'));
        const linksAgenda = [];
        
        for (const link of allLinks) {
          const text = (link.textContent || link.innerText || '').toUpperCase();
          const href = (link.href || link.getAttribute('href') || '').toUpperCase();
          const onclick = (link.getAttribute('onclick') || '').toUpperCase();
          
          const temCertificado = text.includes('CERTIFICADO') || 
                               text.includes('DIGITAL') ||
                               href.includes('CERTIFICADO') ||
                               href.includes('DIGITAL');
          
          const matchAgenda = (text.includes('AGENDA') && text.includes('PERITO')) ||
                            text.includes('IMPRIMIR AGENDA') ||
                            text.includes('AGENDA DIÁRIA') ||
                            (href.includes('AGENDA') && href.includes('PERITO'));
          
          if (matchAgenda && !temCertificado) {
            linksAgenda.push({
              element: link,
              texto: text.substring(0, 100),
              href: href.substring(0, 200),
              onclick: onclick.substring(0, 200)
            });
          }
        }
        
        return linksAgenda.length > 0 ? linksAgenda : null;
      });
      
      if (menuInfo && menuInfo.length > 0) {
        this.menuContextoDetectado = true;
        this.menuLinksAgenda = menuInfo;
        console.log(`✅ Menu detectado na página principal:`);
        console.log(`📋 ${menuInfo.length} link(s) encontrado(s)`);
        await this._takeScreenshotAndHtml('02-menu-agenda');
        return true;
      }
      
      console.log('⚠️ Menu contextual não encontrado (isso é OK, usaremos URLs diretas)');
      this.menuContextoDetectado = false;
      this.menuLinksAgenda = [];
      return false;
      
    } catch (error) {
      console.log(`⚠️ Erro ao detectar menu (não crítico): ${error.message}`);
      this.menuContextoDetectado = false;
      this.menuLinksAgenda = [];
      return false; // NUNCA falha, apenas retorna false
    }
  }

  /**
   * V3: Acessa agenda usando menu contextual (se disponível)
   */
  async acessarAgendaPorMenu() {
    if (!this.menuContextoDetectado || this.menuLinksAgenda.length === 0) {
      console.log('⚠️ Menu não disponível para uso');
      return false;
    }
    
    try {
      console.log('\n🗺️ === NAVEGANDO POR MENU CONTEXTUAL ===');
      console.log(`📌 Tentando usar menu contextual (${this.menuLinksAgenda.length} link(s) disponível(is))...`);
      
      const frames = this.page.frames();
      
      // Tentar cada link do menu
      for (const linkInfo of this.menuLinksAgenda) {
        try {
          console.log(`📍 Tentando link: "${linkInfo.texto.substring(0, 50)}"`);
          
          // Procurar o elemento em todos os frames
          for (const frame of frames) {
            try {
              const elemento = await frame.evaluateHandle((texto, href) => {
                const allElements = Array.from(document.querySelectorAll('a, button, [onclick]'));
                return allElements.find(el => {
                  const elText = (el.textContent || el.innerText || '').toUpperCase();
                  const elHref = (el.href || el.getAttribute('href') || '').toUpperCase();
                  return (elText.includes(texto.substring(0, 30)) || elHref.includes(href.substring(0, 50)));
                });
              }, linkInfo.texto, linkInfo.href);
              
              if (elemento && elemento.asElement()) {
                console.log(`✅ Link encontrado no frame "${frame.name() || 'unnamed'}"`);
                
                // Verificar se tem onclick
                const temOnclick = await frame.evaluate(el => {
                  return !!el.getAttribute('onclick');
                }, elemento);
                
                if (temOnclick && linkInfo.onclick) {
                  // Executar onclick
                  console.log('🔘 Executando onclick do link...');
                  await frame.evaluate((onclick) => {
                    eval(onclick);
                  }, linkInfo.onclick);
                } else if (linkInfo.href && !linkInfo.href.includes('JAVASCRIPT')) {
                  // Navegar para URL
                  console.log(`🔗 Navegando para: ${linkInfo.href.substring(0, 100)}`);
                  await this.page.goto(linkInfo.href, {
                    waitUntil: 'networkidle2',
                    timeout: 60000
                  }).catch(() => console.log('⏰ Timeout tolerado'));
                } else {
                  // Clicar no elemento
                  await elemento.asElement().click();
                }
                
                await delay(4000);
                
                // Verificar se navegou para página de agenda
                const temFormulario = await frame.evaluate(() => {
                  return !!document.querySelector('input[name*="data"], input[placeholder*="data" i], select[name*="agendamento"]');
                });
                
                if (temFormulario) {
                  console.log('✅ Navegou para página de agenda usando menu!');
                  await this._takeScreenshotAndHtml('03-menu-sucesso');
                  return true;
                }
              }
            } catch (e) {
              continue;
            }
          }
        } catch (e) {
          console.log(`⚠️ Erro ao usar link do menu: ${e.message}`);
          continue;
        }
      }
      
      console.log('⚠️ Menu detectado mas não funcionou, usando fallback...');
      return false;
      
    } catch (error) {
      console.log(`⚠️ Erro ao acessar por menu: ${error.message}`);
      return false; // Não falha, apenas retorna false
    }
  }

  /**
   * V3: Acessa agenda usando URLs diretas (fallback)
   */
  async acessarAgendaPorURL() {
    try {
      console.log('\n🗺️ === NAVEGANDO POR URL DIRETA (FALLBACK) ===');
      
      // URLs corretas para agenda de perito (4 variações)
      const urlsAgendaPerito = [
        'https://www.e-cnhsp.sp.gov.br/gefor/GFR/utilitarios/imprimirAgendaDiaria.do',
        'https://www.e-cnhsp.sp.gov.br/gefor/GFR/pericia/listarAgenda.do',
        'https://www.e-cnhsp.sp.gov.br/gefor/GFR/pericia/consultarAgendamento.do',
        'https://www.e-cnhsp.sp.gov.br/gefor/GFR/pericia/consultarAgenda.do'
      ];
      
      for (let i = 0; i < urlsAgendaPerito.length; i++) {
        try {
          console.log(`📍 Tentando URL ${i + 1}/${urlsAgendaPerito.length}: ${urlsAgendaPerito[i]}`);
          
          await Promise.race([
            this.page.goto(urlsAgendaPerito[i], {
              waitUntil: 'networkidle2',
              timeout: 60000
            }),
            delay(60000)
          ]).catch(err => {
            console.log(`⚠️ Navegação com timeout tolerado: ${err.message}`);
          });
          
          await delay(5000);
          
          // Verificar se carregou formulário em algum frame
          const frames = this.page.frames();
          let temFormulario = false;
          
          for (const frame of frames) {
            try {
              const hasForm = await frame.evaluate(() => {
                return !!document.querySelector('input[name*="data"], input[placeholder*="data" i], select[name*="agendamento"], form');
              });
              
              if (hasForm) {
                temFormulario = true;
                console.log(`✅ Formulário encontrado no frame: ${frame.name() || 'unnamed'}`);
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          // Verificar também na página principal
          if (!temFormulario) {
            temFormulario = await this.page.evaluate(() => {
              return !!document.querySelector('input[name*="data"], input[placeholder*="data" i], select[name*="agendamento"]');
            });
          }
          
          if (temFormulario) {
            console.log(`✅ URL ${i + 1} funcionou! Formulário de agenda encontrado.`);
            await this._takeScreenshotAndHtml('03-url-direta-sucesso');
            return true;
          } else {
            console.log(`⚠️ URL ${i + 1} não tem formulário, tentando próxima...`);
          }
        } catch (e) {
          console.log(`⚠️ Erro na URL ${i + 1}: ${e.message}`);
          continue;
        }
      }
      
      console.log('⚠️ Nenhuma URL direta funcionou');
      return false;
      
    } catch (error) {
      console.log(`⚠️ Erro ao acessar por URL: ${error.message}`);
      return false;
    }
  }

  /**
   * Helper para encontrar um frame que contenha um seletor específico
   */
  async _findFrameWithSelector(page, selector, timeout = 5000) {
    let frameFound = null;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const element = await frame.$(selector);
          if (element) {
            const isVisible = await frame.evaluate(el => {
              if (!el) return false;
              const style = window.getComputedStyle(el);
              return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
            }, element);
            if (isVisible) {
              console.log(`🔍 Seletor "${selector}" encontrado no frame: ${frame.url() || frame.name() || 'unnamed'}`);
              return frame;
            }
          }
        } catch (e) {
          // Ignore errors for frames that might not be ready or accessible
        }
      }
      await delay(500);
    }
    return null;
  }

  /**
   * Helper para encontrar um elemento visível de forma robusta
   */
  async _findVisibleElement(pageOrFrame, selector, timeout = 5000) {
    try {
      // Puppeteer não suporta :contains() nativamente, então precisamos adaptar
      if (selector.includes(':contains(')) {
        // Extrair texto a buscar
        const match = selector.match(/:contains\("([^"]+)"\)/);
        if (match) {
          const textToFind = match[1];
          const baseSelector = selector.replace(/:contains\([^)]+\)/, '');
          
          // Buscar todos os elementos do tipo baseSelector e filtrar por texto
          const elements = await pageOrFrame.$$(baseSelector);
          for (const el of elements) {
            const text = await pageOrFrame.evaluate(e => e.textContent || e.innerText || e.value || '', el);
            if (text && text.toUpperCase().includes(textToFind.toUpperCase())) {
              const isVisible = await pageOrFrame.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
              }, el);
              if (isVisible) {
                return el;
              }
            }
          }
          return null;
        }
      }
      
      const element = await pageOrFrame.waitForSelector(selector, { visible: true, timeout });
      return element;
    } catch (error) {
      console.warn(`⚠️ Elemento não encontrado com seletor ${selector} após ${timeout}ms.`);
      return null;
    }
  }

  /**
   * Helper para capturar screenshot e HTML para debug
   */
  async _takeScreenshotAndHtml(namePrefix) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${namePrefix}-${timestamp}`;
      const artifactsPath = path.join(__dirname, '..', 'artifacts');
      
      // Criar diretório se não existir
      try {
        await fs.mkdir(artifactsPath, { recursive: true });
      } catch (e) {
        // Diretório já existe
      }
      
      const pngPath = path.join(artifactsPath, `${filename}.png`);
      const htmlPath = path.join(artifactsPath, `${filename}.html`);

      try {
        await this.page.screenshot({ path: pngPath, fullPage: true });
        console.log(`📸 Screenshot salvo: ${pngPath}`);
      } catch (err) {
        console.error(`❌ Erro ao salvar screenshot: ${err.message}`);
      }

      try {
        const htmlContent = await this.page.content();
        await fs.writeFile(htmlPath, htmlContent);
        console.log(`📄 HTML salvo: ${htmlPath}`);
      } catch (err) {
        console.error(`❌ Erro ao salvar HTML: ${err.message}`);
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao capturar screenshot/HTML: ${error.message}`);
    }
  }

  /**
   * Fazer login no site do DETRAN
   * Fluxo: Página inicial → CPF → Continuar → CPF + Senha → Acessar → Consultar Agenda do Perito
   */
  async login() {
    try {
      console.log('🔐 === NOVO FLUXO DE LOGIN ===');
      console.log('🔐 Acessando página inicial do DETRAN...');
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Aguardar página carregar
      await delay(3000);
      
      // Aceitar cookies se presente
      await acceptCookiesIfPresent(this.page);
      await delay(1000);
      
      // NOVO: Fechar modal de informações (tempo de entrega, etc.)
      await this.fecharModalImportante();
      
      // NOVO: PASSO 1 - Clicar em "Consulta Agenda do Perito" (NÃO preencher CPF aqui)
      console.log('\n📋 PASSO 1: Clicando em "Consulta Agenda do Perito"...');
      const clicouAgenda = await this.clicarConsultaAgendaPerito();
      
      if (!clicouAgenda) {
        console.log('⚠️ Não foi possível clicar em "Consulta Agenda do Perito", tentando login direto...');
      } else {
        await delay(2000);
      }
      
      console.log('📍 Etapa 1: Procurando campo de CPF na página inicial...');
      
      // ETAPA 1: Encontrar e preencher CPF na página inicial (dentro da caixa "Credenciados")
      let cpfInput = null;
      
      // Aguardar página carregar completamente (pode ter JavaScript dinâmico)
      await delay(3000);
      
      // Verificar se há frameset na página inicial
      const hasFramesetInicial = await this.page.evaluate(() => {
        return document.querySelector('frameset') !== null;
      });
      
      if (hasFramesetInicial) {
        console.log('📄 Frameset detectado na página inicial, aguardando frames...');
        await delay(3000);
        // Procurar frame com conteúdo
        const frames = this.page.frames();
        for (const frame of frames) {
          if (frame !== this.page.mainFrame()) {
            const inputs = await frame.$$('input').catch(() => []);
            if (inputs.length > 0) {
              console.log(`✅ Frame com inputs encontrado: ${frame.name()} (${inputs.length} inputs)`);
              // Usar este frame para buscar CPF
              const cpfFrame = await frame.evaluateHandle(() => {
                // Procurar input próximo a texto "CPF" ou "Credenciados"
                const allElements = Array.from(document.querySelectorAll('*'));
                const cpfTextElement = allElements.find(el => {
                  const text = (el.textContent || '').toUpperCase();
                  return text.includes('DIGITE SEU CPF') || 
                         text.includes('CPF PARA ACESSAR') ||
                         text.includes('CREDENCIADOS');
                });
                
                if (cpfTextElement) {
                  let current = cpfTextElement;
                  for (let i = 0; i < 10; i++) {
                    const input = current.querySelector ? current.querySelector('input[type="text"], input:not([type])') : null;
                    if (input) return input;
                    const nextInput = current.nextElementSibling?.querySelector?.('input[type="text"], input:not([type])');
                    if (nextInput) return nextInput;
                    current = current.parentElement;
                    if (!current) break;
                  }
                }
                
                const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
                return inputs.length > 0 ? inputs[0] : null;
              });
              
              if (cpfFrame && cpfFrame.asElement()) {
                cpfInput = cpfFrame.asElement();
                console.log('✅ Campo de CPF encontrado no frame');
                break;
              }
            }
          }
        }
      }
      
      // ETAPA 1: Encontrar e preencher CPF na página inicial (dentro da caixa "Credenciados")
      // cpfInput já pode ter sido encontrado no frame acima
      if (!cpfInput) {
        // Aguardar mais um pouco para conteúdo carregar dinamicamente
        await delay(2000);
        
        // Estratégia simples: procurar qualquer input de texto visível
        const inputsVisiveis = await this.page.$$eval('input[type="text"], input:not([type])', inputs => {
          return inputs.filter(input => {
            const style = window.getComputedStyle(input);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   input.offsetParent !== null;
          }).slice(0, 5); // Pegar os primeiros 5 inputs visíveis
        }).catch(() => []);
        
        if (inputsVisiveis && inputsVisiveis.length > 0) {
          console.log(`✅ Encontrados ${inputsVisiveis.length} input(s) visível(is) na página`);
          // Usar o primeiro input visível como CPF
          const firstInput = await this.page.$('input[type="text"], input:not([type])');
          if (firstInput) {
            cpfInput = firstInput;
            console.log('✅ Campo de CPF encontrado (primeiro input visível)');
          }
        }
      }
      
      if (!cpfInput) {
        // Procurar campo de CPF na página inicial com estratégias mais complexas
        // Pode estar próximo ao texto "Digite seu CPF para acessar sua conta:" ou "CPF:"
        try {
          // Estratégia 1: Procurar por label/texto próximo que contenha "CPF"
          cpfInput = await this.page.evaluateHandle(() => {
          // Procurar elemento que contenha o texto sobre CPF
          const allElements = Array.from(document.querySelectorAll('*'));
          const cpfTextElement = allElements.find(el => {
            const text = (el.textContent || '').toUpperCase();
            return text.includes('DIGITE SEU CPF') || 
                   text.includes('CPF PARA ACESSAR') ||
                   (el.tagName === 'LABEL' && text.includes('CPF'));
          });
          
          if (cpfTextElement) {
            // Procurar input próximo
            let current = cpfTextElement;
            for (let i = 0; i < 10; i++) {
              // Procurar input no mesmo container
              const input = current.querySelector ? current.querySelector('input[type="text"], input:not([type])') : null;
              if (input) return input;
              
              // Procurar input próximo (irmão)
              const nextInput = current.nextElementSibling?.querySelector?.('input[type="text"], input:not([type])');
              if (nextInput) return nextInput;
              
              // Subir na hierarquia
              current = current.parentElement;
              if (!current) break;
            }
          }
          
          // Estratégia 2: Procurar input dentro de elementos que contenham "Credenciados"
          const credenciadosElements = Array.from(document.querySelectorAll('*')).filter(el => {
            const text = (el.textContent || '').toUpperCase();
            return text.includes('CREDENCIADOS') || text.includes('CREDENCIADO');
          });
          
          for (const el of credenciadosElements) {
            const input = el.querySelector ? el.querySelector('input[type="text"], input:not([type])') : null;
            if (input) return input;
          }
          
          // Estratégia 3: Procurar qualquer input de texto na página (último recurso)
          const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
          if (inputs.length > 0) {
            return inputs[0];
          }
          
          return null;
        });
        
        if (cpfInput && cpfInput.asElement()) {
          cpfInput = cpfInput.asElement();
          console.log('✅ Campo de CPF encontrado na página inicial');
        } else {
          // Tentar seletores específicos
          const selectors = [
            'input[name*="cpf" i]',
            'input[id*="cpf" i]',
            'input[placeholder*="cpf" i]',
            'label:contains("CPF") + input, label:contains("CPF") ~ input',
            'input[type="text"]'
          ];
          
          for (const selector of selectors) {
            try {
              cpfInput = await this.page.$(selector);
              if (cpfInput) {
                console.log(`✅ Campo de CPF encontrado com seletor: ${selector}`);
                break;
              }
            } catch (e) {
              // Seletor pode não ser válido, continuar
            }
          }
        }
      } catch (e) {
        console.log('⚠️ Erro ao procurar CPF:', e.message);
      }
      } // Fecha o if (!cpfInput) da linha 394

      if (!cpfInput) {
        await captureArtifactsOnError(this.page, 'login-cpf-inicial-not-found');
        throw new DetranSelectorError('Não foi possível encontrar o campo de CPF na página inicial.');
      }

      // Preencher CPF e pressionar Enter (ou clicar em "Continuar")
      console.log('✍️ Preenchendo CPF...');
      await cpfInput.click({ clickCount: 3 });
      await cpfInput.type(this.cpf, { delay: 100 });
      console.log('✅ CPF preenchido');
      
      await delay(1000);
      
      // Pressionar Enter OU clicar no botão "Continuar"
      console.log('🔘 Pressionando Enter ou clicando em "Continuar"...');
      try {
        // Tentar encontrar botão "Continuar"
        const continuarButton = await this.page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'));
          return buttons.find(btn => {
            const text = (btn.textContent || btn.value || btn.innerText || '').toUpperCase();
            return text.includes('CONTINUAR') || text.includes('PRÓXIMO') || text.includes('AVANÇAR');
          });
        });
        
        if (continuarButton && continuarButton.asElement()) {
          await continuarButton.asElement().click();
          console.log('✅ Clicado em "Continuar"');
        } else {
          // Fallback: pressionar Enter
          await cpfInput.press('Enter');
          console.log('✅ Pressionado Enter');
        }
      } catch (e) {
        // Se falhar, tentar Enter direto
        await cpfInput.press('Enter');
        console.log('✅ Pressionado Enter (fallback)');
      }
      
      // Aguardar navegação ou carregamento da próxima página
      console.log('⏳ Aguardando próxima etapa (CPF + Senha)...');
      await delay(3000);
      
      try {
        await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        // Pode ser SPA, não há navegação tradicional
      }
      
      // Verificar se agora há frameset (pode aparecer após clicar em Continuar)
      let targetPage = this.page;
      const hasFrameset = await this.page.evaluate(() => {
        return document.querySelector('frameset') !== null;
      });
      
      if (hasFrameset) {
        console.log('📄 Frameset detectado após Continuar, aguardando frames...');
        await delay(3000);
        
        const bodyFrame = this.page.frames().find(frame => 
          frame.name() === 'body' || 
          frame.url().includes('login.do') ||
          frame.url().includes('SGU')
        );
        
        if (bodyFrame) {
          const frameInputs = await bodyFrame.$$('input');
          if (frameInputs.length > 0) {
            targetPage = bodyFrame;
            console.log(`✅ Usando frame "body" (${frameInputs.length} inputs encontrados)`);
            await delay(2000);
          }
        }
      }
      
      console.log('📍 Etapa 2: Procurando campos de CPF e Senha para login...');
      
      // Verificar o conteúdo da página/frame para debug
      const pageContent = await targetPage.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          inputs: Array.from(document.querySelectorAll('input')).map(input => ({
            type: input.type,
            name: input.name,
            id: input.id,
            placeholder: input.placeholder,
            className: input.className
          })),
          forms: Array.from(document.querySelectorAll('form')).map(form => ({
            action: form.action,
            method: form.method,
            inputs: Array.from(form.querySelectorAll('input')).length
          })),
          hasLoginButton: Array.from(document.querySelectorAll('button, input[type="submit"]')).some(btn => 
            (btn.textContent || btn.value || '').toUpperCase().includes('ENTRAR') ||
            (btn.textContent || btn.value || '').toUpperCase().includes('LOGIN') ||
            (btn.textContent || btn.value || '').toUpperCase().includes('ACESSAR')
          ),
          bodyTextSnippet: document.body.innerText.substring(0, 200)
        };
      });
      
      console.log('📄 Informações da página:', JSON.stringify(pageContent, null, 2));
      
      // Verificar CAPTCHA ANTES de tentar preencher
      if (await detectCaptcha(targetPage)) {
        await captureArtifactsOnError(this.page, 'login-captcha-detected');
        throw new DetranCaptchaError('CAPTCHA detectado no login do DETRAN. É necessária intervenção manual.');
      }
      
      // Se não encontrou inputs, aguardar mais um pouco (pode estar carregando dinamicamente)
      if (pageContent.inputs.length === 0) {
        console.log('⚠️ Nenhum input encontrado, aguardando mais 5 segundos...');
        await delay(5000);
        
        // Verificar novamente
        const inputsAfterWait = await targetPage.$$('input');
        console.log(`📋 Após aguardar, encontrados ${inputsAfterWait.length} input(s)`);
      }

      // Preencher CPF - tentar múltiplas estratégias no targetPage (pode ser iframe)
      console.log('✍️ Procurando campo de CPF na etapa 2...');
      
      let cpfInputEtapa2 = null;
      let found = false;
      
      // Estratégia 1: Procurar por label "CPF:" e encontrar o input associado
      try {
        const cpfByLabel = await targetPage.evaluateHandle(() => {
          // Procurar label que contém "CPF"
          const labels = Array.from(document.querySelectorAll('label'));
          const cpfLabel = labels.find(label => 
            label.textContent && label.textContent.toUpperCase().includes('CPF')
          );
          
          if (cpfLabel) {
            // Tentar encontrar input associado via "for" ou proximidade
            const labelFor = cpfLabel.getAttribute('for');
            if (labelFor) {
              const input = document.getElementById(labelFor);
              if (input) return input;
            }
            
            // Procurar input próximo ao label (próximo elemento irmão ou dentro do mesmo container)
            let nextElement = cpfLabel.nextElementSibling;
            while (nextElement) {
              if (nextElement.tagName === 'INPUT') {
                return nextElement;
              }
              const inputInside = nextElement.querySelector('input');
              if (inputInside) return inputInside;
              nextElement = nextElement.nextElementSibling;
            }
            
            // Procurar no container pai
            const parent = cpfLabel.parentElement;
            if (parent) {
              const inputInParent = parent.querySelector('input');
              if (inputInParent) return inputInParent;
            }
          }
          
          return null;
        });
        
        if (cpfByLabel && cpfByLabel.asElement()) {
          cpfInputEtapa2 = cpfByLabel.asElement();
          console.log('✅ Campo CPF encontrado por label "CPF:"');
          found = true;
        }
      } catch (e) {
        console.log('⚠️ Campo CPF não encontrado por label, tentando outras estratégias...');
      }
      
      // Estratégia 2: Procurar por nome/id específico usando pickSelector (fallback)
      if (!found) {
        try {
          const cpfSelectors = [
            'input[name*="cpf" i]',
            'input[id*="cpf" i]',
            'input[placeholder*="cpf" i]',
            'input[type="text"]'
          ];
          cpfInputEtapa2 = await pickSelector(targetPage, cpfSelectors);
          if (cpfInputEtapa2) {
            console.log('✅ Campo CPF encontrado por nome/id/placeholder');
            found = true;
          }
        } catch (e) {
          console.log('⚠️ Campo CPF não encontrado por nome/id, tentando outras estratégias...');
        }
      }
      
      // Estratégia 3: Procurar qualquer input de texto (primeiro campo de texto)
      if (!found && !cpfInputEtapa2) {
        try {
          const inputs = await targetPage.$$('input[type="text"], input:not([type])');
          if (inputs.length > 0) {
            cpfInputEtapa2 = inputs[0];
            console.log(`✅ Encontrado ${inputs.length} input(s) de texto, usando o primeiro como CPF`);
            found = true;
          }
        } catch (e) {
          console.log('⚠️ Nenhum input de texto encontrado');
        }
      }
      
      // Estratégia 4: Procurar dentro de formulários
      if (!found && !cpfInputEtapa2) {
        try {
          const formInputs = await targetPage.evaluate(() => {
            const forms = Array.from(document.querySelectorAll('form'));
            for (const form of forms) {
              const inputs = Array.from(form.querySelectorAll('input[type="text"], input:not([type])'));
              if (inputs.length > 0) {
                return inputs.map(input => ({
                  name: input.name,
                  id: input.id
                }));
              }
            }
            return [];
          });
          
          if (formInputs.length > 0) {
            console.log(`📋 Encontrados ${formInputs.length} inputs em formulários`);
            const firstInputSelector = formInputs[0].id ? `#${formInputs[0].id}` : 
                                       formInputs[0].name ? `input[name="${formInputs[0].name}"]` : 'input[type="text"]';
            cpfInputEtapa2 = await targetPage.$(firstInputSelector);
            if (cpfInputEtapa2) {
              console.log('✅ Campo encontrado dentro de formulário');
              found = true;
            }
          }
        } catch (e) {
          console.log('⚠️ Erro ao procurar em formulários:', e.message);
        }
      }

      if (!found || !cpfInputEtapa2) {
        // Capturar artefatos antes de lançar erro
        await captureArtifactsOnError(this.page, 'login-cpf-not-found');
        throw new DetranSelectorError('Não foi possível encontrar o campo de CPF na página. A estrutura da página pode ter mudado.');
      }

      // NOVO FLUXO: Verificar se CPF e senha já estão preenchidos
      const cpfValue = await cpfInputEtapa2.evaluate(el => el.value);
      const precisaPreencher = !cpfValue || cpfValue.trim() === '';
      
      if (precisaPreencher) {
        console.log('✍️ CPF vazio, preenchendo...');
        await cpfInputEtapa2.click({ clickCount: 3 });
        await cpfInputEtapa2.type(this.cpf, { delay: 100 });
        console.log('✅ CPF preenchido:', this.cpf.substring(0, 3) + '***');
      } else {
        console.log('✅ CPF já está preenchido:', cpfValue.substring(0, 3) + '***');
      }
      
      // Preencher senha apenas se CPF foi preenchido (se já estava preenchido, senha provavelmente também está)
      if (!precisaPreencher) {
        console.log('ℹ️ CPF já preenchido, verificando se senha também está...');
      }

      // Preencher senha
      console.log('✍️ Procurando campo de senha...');
      let senhaInput = null;
      let senhaFound = false;
      
      // Estratégia 1: Procurar por label "Senha:" e encontrar o input associado
      try {
        const senhaByLabel = await targetPage.evaluateHandle(() => {
          // Procurar label que contém "Senha"
          const labels = Array.from(document.querySelectorAll('label'));
          const senhaLabel = labels.find(label => 
            label.textContent && label.textContent.toUpperCase().includes('SENHA')
          );
          
          if (senhaLabel) {
            // Tentar encontrar input associado via "for"
            const labelFor = senhaLabel.getAttribute('for');
            if (labelFor) {
              const input = document.getElementById(labelFor);
              if (input) return input;
            }
            
            // Procurar input próximo ao label
            let nextElement = senhaLabel.nextElementSibling;
            while (nextElement) {
              if (nextElement.tagName === 'INPUT') {
                return nextElement;
              }
              const inputInside = nextElement.querySelector('input');
              if (inputInside) return inputInside;
              nextElement = nextElement.nextElementSibling;
            }
            
            // Procurar no container pai
            const parent = senhaLabel.parentElement;
            if (parent) {
              const inputsInParent = parent.querySelectorAll('input');
              // Pegar o segundo input se houver mais de um (primeiro é CPF)
              if (inputsInParent.length > 1) {
                return inputsInParent[1];
              } else if (inputsInParent.length === 1) {
                return inputsInParent[0];
              }
            }
          }
          
          return null;
        });
        
        if (senhaByLabel && senhaByLabel.asElement()) {
          senhaInput = senhaByLabel.asElement();
          console.log('✅ Campo de senha encontrado por label "Senha:"');
          senhaFound = true;
        }
      } catch (e) {
        console.log('⚠️ Campo de senha não encontrado por label, tentando outras estratégias...');
      }
      
      // Estratégia 2: Procurar por type="password" usando pickSelector
      if (!senhaFound) {
        const senhaSelectors = [
          'input[type="password"]',
          'input[name*="senha" i]',
          'input[id*="senha" i]',
          'input[placeholder*="senha" i]'
        ];
        senhaInput = await pickSelector(targetPage, senhaSelectors);
        if (senhaInput) {
          console.log('✅ Campo de senha encontrado por nome/id/type/placeholder');
          senhaFound = true;
        }
      }
      
      // Estratégia 3: Procurar segundo input de texto (após CPF)
      if (!senhaFound && !senhaInput) {
        const passwordInputs = await targetPage.$$('input[type="password"]');
        if (passwordInputs.length > 0) {
          senhaInput = passwordInputs[0];
          console.log(`✅ Campo de senha encontrado (${passwordInputs.length} encontrado(s))`);
          senhaFound = true;
        } else {
          // Tentar encontrar segundo input de texto (pode ser senha sem type="password")
          const textInputs = await targetPage.$$('input[type="text"], input:not([type])');
          if (textInputs.length > 1) {
            senhaInput = textInputs[1];
            console.log('✅ Usando segundo input de texto como senha');
            senhaFound = true;
          }
        }
      }

      if (!senhaFound || !senhaInput) {
        // Capturar artefatos antes de lançar erro
        await captureArtifactsOnError(this.page, 'login-senha-not-found');
        throw new DetranSelectorError('Não foi possível encontrar o campo de senha na página. A estrutura da página pode ter mudado.');
      }

      // Verificar se senha já está preenchida
      const senhaValue = await senhaInput.evaluate(el => el.value);
      if (!senhaValue || senhaValue.trim() === '') {
        await senhaInput.click({ clickCount: 3 });
        await senhaInput.type(this.senha, { delay: 100 });
        console.log('✅ Senha preenchida');
      } else {
        console.log('✅ Senha já está preenchida, pulando...');
      }

      // Clicar em "Acessar" ou botão de login
      await this.clicarBotaoAcessar(targetPage);
      
      // Verificar mensagens de erro
      const errorMsg = await extractLoginErrorMessage(targetPage);
      if (errorMsg) {
        await captureArtifactsOnError(this.page, 'login-auth-error');
        throw new DetranAuthError(`Falha de autenticação: ${errorMsg}`);
      }
      
      // Verificar se login foi bem-sucedido
      const loggedIn = await isLoggedIn(this.page);
      if (!loggedIn) {
        // Verificar novamente após mais um delay (pode ser SPA)
        await delay(2000);
        const stillLoggedOut = !(await isLoggedIn(this.page));
        if (stillLoggedOut) {
          await captureArtifactsOnError(this.page, 'login-failed');
          throw new DetranAuthError('Não foi possível confirmar login. Verifique credenciais ou se a estrutura da página mudou.');
        }
      }
      
      // Screenshot e HTML após login bem-sucedido
      await this._takeScreenshotAndHtml('01-apos-login');

      // Fechar modal "Importante" se aparecer
      await this.fecharModalImportante();

      // NOVO FLUXO: Após login, já estamos na página de agenda (não precisa navegar mais)
      console.log('\n✅ Login concluído, verificando se estamos na página de agenda...');
      const urlAposLogin = this.page.url();
      console.log(`📍 URL após login: ${urlAposLogin}`);
      
      // Se já estamos na agenda, tudo certo
      if (urlAposLogin.includes('agenda') || urlAposLogin.includes('perito') || urlAposLogin.includes('consultar')) {
        console.log('✅ Já estamos na página de agenda/pesquisa');
        return true;
      }
      
      console.log('⚠️ URL não indica estar na agenda, mas continuando (pode estar em página intermediária)...');
      return true;
    } catch (error) {
      console.error('❌ Erro ao fazer login:', error.message);
      
      // Se já é um erro tipado, relançar
      if (error.tipo) {
        throw error;
      }
      
      // Capturar artefatos e mapear erro genérico
      await captureArtifactsOnError(this.page, 'login-generic-error');
      
      // Se timeout, mapear para DetranTimeoutError
      if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        throw new DetranTimeoutError(`Timeout ao fazer login no DETRAN: ${error.message}`);
      }
      
      // Erro genérico de seletores
      throw new DetranSelectorError(`Erro ao fazer login no DETRAN: ${error.message}`);
    }
  }

  /**
   * Faz login na tela "Acesso Restrito" após clicar em "Consultar Agenda do Perito"
   * Esta é uma segunda etapa de login que aparece especificamente para acessar a agenda
   */
  async fazerLoginAcessoRestrito() {
    try {
      console.log('🔐 Fazendo login na tela "Acesso Restrito"...');
      
      // Verificar se há frameset
      let targetPage = this.page;
      const hasFrameset = await this.page.evaluate(() => {
        return document.querySelector('frameset') !== null;
      });

      if (hasFrameset) {
        await delay(2000);
        const frames = this.page.frames();
        for (const frame of frames) {
          if (frame !== this.page.mainFrame()) {
            try {
              const frameInputs = await frame.$$('input').catch(() => []);
              if (frameInputs.length > 0) {
                targetPage = frame;
                console.log(`✅ Usando frame "${frame.name() || 'body'}" para login`);
                break;
              }
            } catch (e) {
              // Continuar
            }
          }
        }
      }

      await delay(1000);

      // Verificar e preencher CPF (pode já estar preenchido pelo navegador)
      console.log('✍️ Verificando campo CPF na tela de Acesso Restrito...');
      const cpfInput = await targetPage.$('input[name="codigo"], input#cpf, input[id*="cpf" i]');
      if (cpfInput) {
        const cpfValue = await cpfInput.evaluate(el => el.value);
        if (!cpfValue || cpfValue.trim() === '') {
          console.log('✍️ CPF não encontrado, preenchendo...');
          await cpfInput.click({ clickCount: 3 });
          await cpfInput.type(this.cpf, { delay: 100 });
          console.log('✅ CPF preenchido');
        } else {
          console.log(`✅ CPF já está preenchido (valor: ${cpfValue.substring(0, 3)}***)`);
        }
      } else {
        console.log('⚠️ Campo CPF não encontrado');
      }

      // Verificar e preencher Senha (pode já estar preenchido pelo navegador)
      console.log('✍️ Verificando campo Senha na tela de Acesso Restrito...');
      const senhaInput = await targetPage.$('input[type="password"], input[name="senha"], input#senha');
      if (senhaInput) {
        const senhaValue = await senhaInput.evaluate(el => el.value);
        if (!senhaValue || senhaValue.trim() === '') {
          console.log('✍️ Senha não encontrada, preenchendo...');
          await senhaInput.click({ clickCount: 3 });
          await senhaInput.type(this.senha, { delay: 100 });
          console.log('✅ Senha preenchida');
        } else {
          console.log('✅ Senha já está preenchida (senhas salvas do navegador)');
        }
      } else {
        console.log('⚠️ Campo Senha não encontrado');
      }

      await delay(1000);

      // Clicar em "Acessar"
      await this.clicarBotaoAcessar(targetPage);
      
      await delay(5000); // Aguardar mais tempo após clicar em "Acessar"
      
      // Verificar se navegou para a página correta do formulário
      const urlAposAcessar = this.page.url();
      console.log(`📍 URL após clicar em "Acessar": ${urlAposAcessar}`);
      
      // Verificar se temos o formulário de pesquisa
      await delay(3000);
      const temFormulario = await this.page.evaluate(() => {
        const texto = document.body.innerText.toUpperCase();
        const temDataInput = !!document.querySelector('input[name*="data"], input[id*="data"], input[placeholder*="data" i]');
        const temSelect = !!document.querySelector('select');
        const temAgendaText = texto.includes('AGENDA') && (texto.includes('PERITO') || texto.includes('PSICÓLOGO') || texto.includes('IMPRIMIR'));
        return temDataInput || (temSelect && temAgendaText) || texto.includes('IMPRIMIR AGENDA DIÁRIA DO PSICÓLOGO');
      });
      
      if (temFormulario) {
        console.log('✅ Formulário de pesquisa da agenda detectado após login');
      } else {
        console.log('⚠️ Formulário de pesquisa não encontrado imediatamente. Verificando frames...');
        
        // Verificar frames
        const frames = this.page.frames();
        for (const frame of frames) {
          try {
            const temForm = await frame.evaluate(() => {
              return !!document.querySelector('input[name*="data"], select[name*="agendamento"]');
            });
            if (temForm) {
              console.log(`✅ Formulário encontrado no frame "${frame.name() || 'unnamed'}"`);
              break;
            }
          } catch (e) {
            // Continuar
          }
        }
      }
      
      console.log('✅ Login na tela "Acesso Restrito" concluído');
    } catch (error) {
      console.error('❌ Erro ao fazer login na tela Acesso Restrito:', error.message);
      throw error;
    }
  }

  /**
   * Clica no botão "Acessar" (helper reutilizável)
   */
  async clicarBotaoAcessar(targetPage = this.page) {
      console.log('🔘 Procurando botão "Acessar"...');
      // Priorizar especificamente "Acessar" conforme vídeo
      const acessarButton = await targetPage.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
        
        // PRIORIDADE 1: Procurar especificamente por "Acessar"
        const botaoAcessar = buttons.find(btn => {
          const text = (btn.textContent || btn.value || btn.innerText || '').toUpperCase().trim();
          return text === 'ACESSAR' || text.includes('ACESSAR');
        });
        
        if (botaoAcessar) return botaoAcessar;
        
        // PRIORIDADE 2: Outras opções
        return buttons.find(btn => {
          const text = (btn.textContent || btn.value || btn.innerText || '').toUpperCase();
          return text.includes('ENTRAR') ||
                 text.includes('LOGIN') ||
                 text.includes('ENVIAR') ||
                 btn.type === 'submit';
        });
      });
      
      if (acessarButton && acessarButton.asElement()) {
        console.log('✅ Botão de acesso encontrado, clicando...');
        try {
          const page = this.page; // Capturar referência para usar no Promise
          // Tentar aguardar navegação enquanto clica
          await Promise.race([
            (async () => {
              await acessarButton.asElement().click();
              try {
                await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
              } catch (navError) {
                // Navegação pode não acontecer, isso é ok (SPA)
              }
            })(),
            delay(8000) // Timeout de segurança
          ]);
        } catch (e) {
          console.log('⚠️ Erro ao clicar no botão, tentando Enter...', e.message);
          // Fallback: pressionar Enter (usar this.page.keyboard pois targetPage pode ser frame)
          try {
            await this.page.keyboard.press('Enter');
          } catch (kbError) {
            console.log('⚠️ Erro ao pressionar Enter:', kbError.message);
          }
          await delay(3000);
        }
      } else {
        // Último recurso: pressionar Enter (usar this.page.keyboard pois targetPage pode ser frame)
        console.log('⚠️ Botão não encontrado, tentando pressionar Enter...');
        try {
          await this.page.keyboard.press('Enter');
        } catch (kbError) {
          console.log('⚠️ Erro ao pressionar Enter:', kbError.message);
        }
        await delay(3000);
    }
  }

  /**
   * Buscar agendamentos para uma data específica
   * @param {string} dataReferencia - Data no formato DD/MM/YYYY (ex: 04/11/2025)
   * IMPORTANTE: Esta função assume que já estamos na página de pesquisa de agendamentos.
   * Após buscar, você deve chamar voltar() antes de buscar a próxima data.
   */
  async buscarAgendamentos(dataReferencia) {
    // Fechar modal "Importante" se aparecer (pode aparecer aleatoriamente)
    await this.fecharModalImportante();
    try {
      console.log(`📅 ===== BUSCANDO AGENDAMENTOS PARA ${formatarDDMMYYYY(dataReferencia)} =====`);
      await this._takeScreenshotAndHtml(`pre-search-${formatarDDMMYYYY_semBarras(dataReferencia)}`);

      // --- Verificar se estamos na página "Imprimir Agenda Diária do Psicólogo" ---
      console.log('🔍 Verificando se estamos na página "Imprimir Agenda Diária do Psicólogo"...');
      const pageTitle = await this.page.title();
      const pageText = await this.page.evaluate(() => document.body.innerText.toUpperCase());
      
      if (pageTitle.includes('Imprimir Agenda') || pageText.includes('IMPRIMIR AGENDA DIÁRIA DO PSICÓLOGO')) {
        console.log('✅ Estamos na página correta: "Imprimir Agenda Diária do Psicólogo"');
      } else {
        console.log(`⚠️ Título da página: "${pageTitle}"`);
        console.log('⚠️ Continuando mesmo assim...');
      }

      // --- Encontrar o frame da agenda ---
      console.log('🔍 Procurando o frame que contém o formulário de pesquisa da agenda...');
      
      // Primeiro, aguardar que a página de agenda carregue completamente
      await delay(5000);
      
      // SOLUÇÃO MELHORADA V4: Listar todos os frames e inspecionar com mais detalhes
      const frames = this.page.frames();
      console.log(`📋 Total de frames encontrados: ${frames.length}`);
      
      // Log detalhado de todos os frames para debug
      for (let i = 0; i < frames.length; i++) {
        try {
          const frameInfo = await frames[i].evaluate(() => {
            return {
              title: document.title,
              url: window.location.href,
              hasInputs: document.querySelectorAll('input, select').length,
              hasForms: document.querySelectorAll('form').length,
              hasTable: !!document.querySelector('table'),
              bodyText: document.body.innerText.substring(0, 200)
            };
          }).catch(() => ({}));
          
          const frameName = frames[i].name() || 'unnamed';
          const frameUrl = frames[i].url();
          console.log(`  Frame ${i}: name="${frameName}"`);
          console.log(`    URL: ${frameUrl.substring(0, 100)}`);
          console.log(`    Elementos: ${frameInfo.hasInputs || 0} inputs/selects, ${frameInfo.hasForms || 0} forms, table=${frameInfo.hasTable || false}`);
        } catch (e) {
          console.log(`  Frame ${i}: erro ao obter info`);
        }
      }
      
      // Procurar por diferentes seletores que indicam a página de agenda
      let agendaFrame = await this._findFrameWithSelector(this.page, 'input[name="dataReferencia"]', 10000) ||
                       await this._findFrameWithSelector(this.page, 'input[name*="data"]', 10000) ||
                       await this._findFrameWithSelector(this.page, 'select[name*="agendamento"]', 10000) ||
                       await this._findFrameWithSelector(this.page, 'input[placeholder*="data"]', 10000);
      
      if (!agendaFrame) {
        // Se não encontrar o frame específico, tentar usar o frame "body"
        const bodyFrame = frames.find(frame => frame.name() === 'body');
        
        if (bodyFrame) {
          console.log('⚠️ Frame específico não encontrado, tentando usar frame "body"...');
          
          // Verificar se o frame body tem elementos de formulário de agenda
          const hasAgendaElements = await bodyFrame.evaluate(() => {
            const inputs = document.querySelectorAll('input[type="text"]');
            const selects = document.querySelectorAll('select');
            const hasDataInput = Array.from(inputs).some(input => 
              input.name.toLowerCase().includes('data') || 
              input.id.toLowerCase().includes('data') ||
              (input.placeholder && input.placeholder.toLowerCase().includes('data'))
            );
            const hasSelect = selects.length > 0;
            console.log(`Frame body: ${inputs.length} inputs, ${selects.length} selects, hasDataInput=${hasDataInput}, hasSelect=${hasSelect}`);
            return hasDataInput || hasSelect;
          }).catch(() => false);
          
          if (hasAgendaElements) {
            console.log('✅ Frame "body" contém elementos de agenda, usando-o...');
            agendaFrame = bodyFrame;
          } else {
            console.log('⚠️ Frame body não tem elementos de agenda');
            // Tentar QUALQUER frame que tenha inputs
            for (const frame of frames) {
              if (frame === this.page.mainFrame()) continue;
              try {
                const hasInputs = await frame.$$('input, select').then(elements => elements.length > 0).catch(() => false);
                if (hasInputs) {
                  console.log(`✅ Usando frame com inputs: ${frame.name() || 'unnamed'}`);
                  agendaFrame = frame;
                  break;
                }
              } catch (e) {
                // Continuar
              }
            }
            if (!agendaFrame) {
              throw new DetranSelectorError('Frame com formulário de pesquisa de agenda não encontrado.');
            }
          }
        } else {
          throw new DetranSelectorError('Nenhum frame adequado encontrado para pesquisa de agenda.');
        }
      }
      
      const targetFrame = agendaFrame;
      
      // --- V4: LISTAR ELEMENTOS DO FORMULÁRIO ANTES DE PREENCHER (DEBUG MELHORADO) ---
      console.log('\n📋 === LISTANDO ELEMENTOS DO FORMULÁRIO (V4) ===');
      const elementosForm = await targetFrame.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, select')).map((inp, idx) => ({
          idx,
          type: inp.type || (inp.tagName === 'SELECT' ? 'select' : 'text'),
          name: inp.name || '',
          id: inp.id || '',
          placeholder: inp.placeholder || '',
          value: inp.value || '',
          className: inp.className || '',
          visivel: inp.offsetParent !== null
        }));
        
        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map((btn, idx) => ({
          idx,
          texto: (btn.textContent || btn.innerText || btn.value || '').trim(),
          type: btn.type || 'button',
          name: btn.name || '',
          visivel: btn.offsetParent !== null
        }));
        
        return { inputs, buttons };
      });
      
      console.log('   📝 Inputs/Selects encontrados:');
      elementosForm.inputs.filter(i => i.visivel && i.type !== 'hidden').forEach(inp => {
        console.log(`     [${inp.idx}] ${inp.type} - name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}"`);
      });
      
      console.log('   🔘 Botões encontrados:');
      elementosForm.buttons.filter(b => b.visivel).forEach(btn => {
        console.log(`     [${btn.idx}] "${btn.texto}" (type="${btn.type}")`);
      });

      // --- Preencher "Data Referência" ---
      console.log('\n✍️ Preenchendo campo "Data Referência"...');
      
      // Estratégias para encontrar o campo "Data Referência"
      let dataReferenciaInput = null;
      
      // Estratégia 1: Por name específico
      dataReferenciaInput = await this._findVisibleElement(targetFrame, 'input[name="dataReferencia"]', 2000);
      if (dataReferenciaInput) {
        console.log('✅ Campo encontrado por input[name="dataReferencia"]');
      }
      
      // Estratégia 2: Por name contendo "data"
      if (!dataReferenciaInput) {
        dataReferenciaInput = await this._findVisibleElement(targetFrame, 'input[name*="data"]', 2000);
        if (dataReferenciaInput) {
          console.log('✅ Campo encontrado por input[name*="data"]');
        }
      }
      
      // Estratégia 3: Por name contendo "dt"
      if (!dataReferenciaInput) {
        dataReferenciaInput = await this._findVisibleElement(targetFrame, 'input[name*="dt"]', 2000);
        if (dataReferenciaInput) {
          console.log('✅ Campo encontrado por input[name*="dt"]');
        }
      }
      
      // Estratégia 4: Por placeholder contendo "data"
      if (!dataReferenciaInput) {
        dataReferenciaInput = await this._findVisibleElement(targetFrame, 'input[placeholder*="data" i]', 2000);
        if (dataReferenciaInput) {
          console.log('✅ Campo encontrado por input[placeholder*="data"]');
        }
      }
      
      // Estratégia 5: Por type="date"
      if (!dataReferenciaInput) {
        dataReferenciaInput = await this._findVisibleElement(targetFrame, 'input[type="date"]', 2000);
        if (dataReferenciaInput) {
          console.log('✅ Campo encontrado por input[type="date"]');
        }
      }
      
      // Estratégia 6: Por label "Data Referência"
      if (!dataReferenciaInput) {
        try {
          const inputFromLabel = await targetFrame.evaluateHandle(() => {
            const labels = Array.from(document.querySelectorAll('label'));
            const dataLabel = labels.find(label => 
              label.textContent.toLowerCase().includes('data') && 
              label.textContent.toLowerCase().includes('referência')
            );
            if (dataLabel && dataLabel.getAttribute('for')) {
              return document.getElementById(dataLabel.getAttribute('for'));
            }
            return null;
          });
          if (inputFromLabel && inputFromLabel.asElement()) {
            dataReferenciaInput = inputFromLabel.asElement();
            console.log('✅ Campo encontrado por label');
          }
        } catch (e) {
          console.warn('⚠️ Erro ao buscar por label:', e.message);
        }
      }
      
      // Estratégia 7: Primeiro input de texto visível (fallback)
      if (!dataReferenciaInput) {
        console.log('⚠️ Campo "Data Referência" não encontrado pelos seletores específicos, tentando primeiro input visível...');
        const allInputs = await targetFrame.$$('input[type="text"]');
        for (const input of allInputs) {
          const isVisible = await targetFrame.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
          }, input);
          if (isVisible) {
            dataReferenciaInput = input;
            console.log('✅ Usando primeiro input de texto visível como "Data Referência".');
            break;
          }
        }
      }
      
      if (!dataReferenciaInput) {
        // Salvar HTML para debug
        const fs = require('fs');
        const html = await targetFrame.content();
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const debugFile = `codigo/artifacts/debug-formulario-agenda-${timestamp}.html`;
        fs.writeFileSync(debugFile, html);
        console.log(`❌ HTML salvo em: ${debugFile}`);
        
        await this._takeScreenshotAndHtml(`formulario-nao-encontrado`);
        return []; // Retornar array vazio em vez de lançar erro
      }
      
      // NOVO FLUXO: Preencher data no formato 04112025 (sem barras) + TAB + aguardar 1s + clicar em "Selecione" + selecionar 04/11/2025
      await dataReferenciaInput.click({ clickCount: 3 }); // Selecionar todo o texto
      await dataReferenciaInput.press('Backspace'); // Limpar
      await delay(500);
      
      const dataSemBarras = formatarDDMMYYYY_semBarras(dataReferencia); // "04112025"
      console.log(`✍️ Preenchendo data no formato sem barras: ${dataSemBarras}`);
      
      await dataReferenciaInput.type(dataSemBarras, { delay: 100 });
      console.log('⌨️ Pressionando TAB...');
      await dataReferenciaInput.press('Tab');
      console.log('⏳ Aguardando 1 segundo...');
      await delay(1000);

      // --- Selecionar "Data de Agendamento" no dropdown ---
      // FLUXO CORRETO conforme descrito pelo usuário:
      // 1. Tab e aguardar 2 segundos (já feito acima)
      // 2. Encontrar o dropdown "Data de Agendamento" (não o de "Unidade de Trânsito")
      // 3. Clicar no dropdown na área "Selecione" para abrir o menu
      // 4. Aguardar opções carregarem
      // 5. Procurar e clicar na data "04/11/2025" (com barras)
      console.log('✍️ Selecionando "Data de Agendamento" no dropdown...');
      
      // Encontrar todos os selects e identificar qual é o "Data de Agendamento" (não "Unidade de Trânsito")
      const allSelects = await targetFrame.$$('select');
      console.log(`📋 Total de selects encontrados: ${allSelects.length}`);
      
      let dataAgendamentoSelect = null;
      
      // Procurar o select que NÃO é "Unidade de Trânsito" e que está relacionado a "Data de Agendamento"
      for (const select of allSelects) {
        try {
          const selectInfo = await targetFrame.evaluate((sel) => {
            const labelText = (sel.previousElementSibling?.textContent || sel.parentElement?.textContent || '').toUpperCase();
            const name = (sel.name || '').toUpperCase();
            const id = (sel.id || '').toUpperCase();
            const firstOption = sel.options[0]?.text?.toUpperCase() || '';
            
            // Verificar se é "Unidade de Trânsito" (não queremos esse)
            const isUnidade = labelText.includes('UNIDADE') || name.includes('UNIDADE') || id.includes('UNIDADE');
            
            // Verificar se é "Data de Agendamento"
            const isDataAgendamento = labelText.includes('DATA DE AGENDAMENTO') || 
                                     labelText.includes('DATA DE AGEND') ||
                                     name.includes('AGENDAMENTO') || 
                                     id.includes('AGENDAMENTO');
            
            return {
              isUnidade,
              isDataAgendamento,
              labelText: labelText.substring(0, 50),
              name,
              id,
              firstOption: firstOption.substring(0, 30)
            };
          }, select);
          
          // Se não é "Unidade de Trânsito" e é "Data de Agendamento" OU se temos 2 selects e este não é unidade
          if (!selectInfo.isUnidade && (selectInfo.isDataAgendamento || (allSelects.length >= 2))) {
            dataAgendamentoSelect = select;
            console.log(`✅ Select "Data de Agendamento" identificado (label: "${selectInfo.labelText}")`);
            break;
          }
        } catch (e) {
          console.log(`⚠️ Erro ao verificar select:`, e.message);
        }
      }
      
      // Se não encontrou, usar o segundo select (assumindo que o primeiro é "Unidade de Trânsito")
      if (!dataAgendamentoSelect && allSelects.length >= 2) {
        dataAgendamentoSelect = allSelects[1];
        console.log('⚠️ Usando segundo select como "Data de Agendamento" (assumindo primeiro é Unidade)');
      }
      
      // Se ainda não encontrou, usar o primeiro select disponível
      if (!dataAgendamentoSelect && allSelects.length > 0) {
        dataAgendamentoSelect = allSelects[0];
        console.log('⚠️ Usando primeiro select disponível como fallback');
      }
      
      if (!dataAgendamentoSelect) {
        throw new DetranSelectorError('Dropdown "Data de Agendamento" não encontrado no frame da agenda.');
      }
      
      const dataParaSelecionar = formatarDDMMYYYY(dataReferencia); // "04/11/2025"
      console.log(`🔍 Procurando data "${dataParaSelecionar}" no dropdown...`);
      
      // FLUXO: Clicar no select na área "Selecione" para abrir o menu dropdown
      console.log('🖱️ Clicando no dropdown "Data de Agendamento" na área "Selecione" para abrir o menu...');
      
      // Garantir que o select está visível e focado
      await targetFrame.evaluate((sel) => {
        sel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        sel.focus();
      }, dataAgendamentoSelect);
      await delay(300);
      
      // Clicar no select para abrir o dropdown (na área "Selecione")
      await dataAgendamentoSelect.click({ delay: 100 });
      await delay(800); // Aguardar menu abrir
      
      // Aguardar opções carregarem (pode demorar um pouco)
      console.log('⏳ Aguardando opções do dropdown carregarem após clicar em "Selecione"...');
      await delay(1500);
      
      // Verificar quantas opções temos
      const optionsInfo = await targetFrame.evaluate((sel) => {
        const options = Array.from(sel.options || []);
        return {
          total: options.length,
          texts: options.map(o => o.text.trim()),
          values: options.map(o => o.value)
        };
      }, dataAgendamentoSelect);
      
      console.log(`📋 Opções disponíveis no dropdown: ${optionsInfo.total}`);
      if (optionsInfo.texts.length > 0) {
        console.log(`📋 Primeiras 5 opções: ${optionsInfo.texts.slice(0, 5).join(', ')}`);
      }
      
      // Procurar a opção que contenha a data "04/11/2025"
      const optionIndex = await targetFrame.evaluate((sel, dataParaSelecionar) => {
        const options = Array.from(sel.options);
        
        // Procurar opção exata
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          const optText = opt.text.trim();
          
          // Buscar exata ou que contenha a data
          if (optText === dataParaSelecionar || 
              opt.value === dataParaSelecionar ||
              optText.includes(dataParaSelecionar)) {
            return i;
          }
        }
        
        // Se não encontrou exata, procurar por parte da data (DD/MM/YYYY)
        const [dia, mes, ano] = dataParaSelecionar.split('/');
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          const optText = opt.text.trim();
          if (optText.includes(`${dia}/${mes}/${ano}`) ||
              opt.value.includes(`${dia}/${mes}/${ano}`)) {
            return i;
          }
        }
        
        return -1;
      }, dataAgendamentoSelect, dataParaSelecionar);
      
      if (optionIndex >= 0) {
        // Selecionar a opção pelo índice - FLUXO: Clicar na data para selecionar
        console.log(`✅ Data "${dataParaSelecionar}" encontrada na posição ${optionIndex}, clicando na data...`);
        
        // Estratégia: Clicar diretamente na opção do dropdown (se o menu ainda estiver aberto)
        // Ou selecionar pelo índice e disparar eventos
        try {
          // Tentar clicar diretamente na opção se o dropdown ainda estiver aberto
          const optionElement = await targetFrame.evaluateHandle((sel, index) => {
            // Tentar encontrar a opção no DOM (pode estar em um elemento de menu)
            const option = sel.options[index];
            if (option) {
              // Procurar elemento visual da opção no DOM
              const optionText = option.text.trim();
              // Se o select usa um menu customizado, pode precisar clicar em um elemento filho
              return option;
            }
            return null;
          }, dataAgendamentoSelect, optionIndex);
          
          // Selecionar pelo índice e disparar eventos
          await targetFrame.evaluate((sel, index) => {
            sel.selectedIndex = index;
            sel.value = sel.options[index].value;
            
            // Disparar eventos necessários
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            sel.dispatchEvent(new Event('input', { bubbles: true }));
            sel.dispatchEvent(new Event('blur', { bubbles: true }));
            
            // Focus e blur para garantir
            sel.focus();
            sel.blur();
          }, dataAgendamentoSelect, optionIndex);
          
          await delay(500);
          
          // Verificar se foi selecionado
          const selectedText = await targetFrame.evaluate((sel) => {
            return sel.options[sel.selectedIndex]?.text?.trim() || '';
          }, dataAgendamentoSelect);
          
          console.log(`✅ Data clicada/selecionada no dropdown: "${selectedText}"`);
        } catch (e) {
          console.log(`⚠️ Erro ao clicar/selecionar data: ${e.message}`);
          // Tentar método alternativo
          await targetFrame.evaluate((sel, index) => {
            sel.selectedIndex = index;
            sel.value = sel.options[index].value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }, dataAgendamentoSelect, optionIndex);
        }
      } else {
        console.log(`⚠️ Data "${dataParaSelecionar}" não encontrada nas opções.`);
        console.log(`📋 Opções disponíveis: ${optionsInfo.texts.slice(0, 10).join(', ')}`);
        
        // Tentar selecionar a primeira opção válida (não "- SELECIONE -")
        const primeiraOpcaoIndex = await targetFrame.evaluate((sel) => {
          const options = Array.from(sel.options);
          for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            if (opt.value && 
                opt.text.trim() !== '- SELECIONE -' && 
                opt.text.trim() !== 'SELECIONE' &&
                opt.text.trim() !== '' &&
                !opt.text.trim().toUpperCase().includes('SELECIONE')) {
              return i;
            }
          }
          return -1;
        }, dataAgendamentoSelect);
        
        if (primeiraOpcaoIndex >= 0) {
          await targetFrame.evaluate((sel, index) => {
            sel.selectedIndex = index;
            sel.value = sel.options[index].value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }, dataAgendamentoSelect, primeiraOpcaoIndex);
          
          const primeiraOpcao = await targetFrame.evaluate((sel) => {
            return sel.options[sel.selectedIndex]?.text?.trim() || '';
          }, dataAgendamentoSelect);
          
          console.log(`⚠️ Selecionada primeira opção disponível: "${primeiraOpcao}"`);
        } else {
          console.log('⚠️ Não foi possível selecionar nenhuma opção válida no dropdown');
        }
      }
      
      await delay(1000);

      // --- V4: Clicar em "PESQUISAR" com múltiplas estratégias melhoradas ---
      console.log('\n🔍 === PROCURANDO BOTÃO "PESQUISAR" (V4) ===');
      
      // V4: Estratégias múltiplas em ordem de prioridade
      let searchButton = null;
      const textosPesquisar = ['pesquisar', 'buscar', 'consultar', 'ok', 'search', 'go', 'enviar'];
      
      // Estratégia 1: Buscar por texto exato "pesquisar" (prioridade máxima)
      console.log('   Tentando estratégia 1: texto exato "pesquisar"...');
      searchButton = await targetFrame.evaluateHandle((textos) => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="image"], a[role="button"]'));
        return buttons.find(btn => {
          const text = (btn.textContent || btn.innerText || btn.value || '').toLowerCase().trim();
          const visivel = btn.offsetParent !== null && 
                         window.getComputedStyle(btn).display !== 'none' &&
                         window.getComputedStyle(btn).visibility !== 'hidden';
          return visivel && text === 'pesquisar';
        });
      }, textosPesquisar);
      
      // Estratégia 2: Buscar por texto que contenha "pesquisar"
      if (!searchButton || !searchButton.asElement()) {
        console.log('   Tentando estratégia 2: texto contendo "pesquisar"...');
        searchButton = await targetFrame.evaluateHandle((textos) => {
          const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="image"]'));
          return buttons.find(btn => {
            const text = (btn.textContent || btn.innerText || btn.value || '').toLowerCase().trim();
            const visivel = btn.offsetParent !== null;
            return visivel && textos.some(t => text.includes(t));
          });
        }, textosPesquisar);
      }
      
      // Estratégia 3: Usar seletores CSS específicos
      if (!searchButton || !searchButton.asElement()) {
        console.log('   Tentando estratégia 3: seletores CSS...');
        searchButton = await this._findVisibleElement(targetFrame, 'button:contains("PESQUISAR")', 3000) ||
                      await this._findVisibleElement(targetFrame, 'input[type="submit"][value*="PESQUISAR" i]', 3000) ||
                      await this._findVisibleElement(targetFrame, 'input[type="button"][value*="PESQUISAR" i]', 3000) ||
                      await this._findVisibleElement(targetFrame, 'button[type="submit"]', 3000);
      }
      
      // Estratégia 4: Primeiro botão submit visível (fallback)
      if (!searchButton || !searchButton.asElement()) {
        console.log('   Tentando estratégia 4: primeiro botão submit visível...');
        searchButton = await targetFrame.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'));
          return buttons.find(btn => {
            const visivel = btn.offsetParent !== null;
            return visivel;
          });
        });
      }
      
      if (!searchButton || !searchButton.asElement()) {
        // V4: Log detalhado antes de lançar erro
        const botoesDisponiveis = await targetFrame.evaluate(() => {
          return Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(btn => ({
            texto: (btn.textContent || btn.innerText || btn.value || '').trim(),
            type: btn.type,
            visivel: btn.offsetParent !== null
          }));
        });
        console.log('   ❌ Botões disponíveis na página:');
        botoesDisponiveis.forEach((btn, idx) => {
          console.log(`      [${idx}] "${btn.texto}" (type="${btn.type}", visivel=${btn.visivel})`);
        });
        
        await this._takeScreenshotAndHtml('botao-pesquisar-nao-encontrado');
        throw new DetranSelectorError('Botão "PESQUISAR" não encontrado após tentar todas as estratégias.');
      }
      
      const textoBotao = await targetFrame.evaluate(el => el.textContent || el.innerText || el.value || '', searchButton.asElement());
      console.log(`   ✅ Botão encontrado: "${textoBotao}"`);
      console.log('🔘 Clicando botão "Pesquisar"...');
      
      // Se for um elemento do evaluateHandle, converter para elemento clicável
      const elementToClick = searchButton.asElement ? searchButton.asElement() : searchButton;
      
      if (!elementToClick) {
        throw new DetranSelectorError('Botão "PESQUISAR" encontrado mas não é clicável.');
      }
      
      // Clicar e aguardar resultados
      await Promise.all([
        elementToClick.click(),
        targetFrame.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => console.log('⚠️ Navegação não detectada após PESQUISAR, pode ser AJAX.')),
        targetFrame.waitForSelector('table', { visible: true, timeout: 15000 }).catch(() => console.log('⚠️ Tabela de resultados não visível após PESQUISAR.'))
      ]);
      
      console.log('✅ Botão "PESQUISAR" clicado.');
      await delay(3000);
      
      // Fechar modal "Importante" se aparecer após pesquisar (pode aparecer aleatoriamente)
      await this.fecharModalImportante();
      
      await this._takeScreenshotAndHtml(`after-search-${formatarDDMMYYYY_semBarras(dataReferencia)}`);

      // --- Extrair dados da tabela ---
      // Fechar modal "Importante" novamente antes de extrair (pode aparecer aleatoriamente)
      await this.fecharModalImportante();
      
      // Aguardar tabela aparecer
      console.log('🔍 Procurando tabela de resultados...');
      
      // Verificar se há frameset na página de resultados
      let targetPageForResults = targetFrame;
      const hasFramesetResults = await this.page.evaluate(() => {
        return document.querySelector('frameset') !== null;
      });
      
      if (hasFramesetResults) {
        console.log('📄 Frameset detectado nos resultados, procurando frame...');
        await delay(2000);
        const frames = this.page.frames();
        const bodyFrame = frames.find(frame => 
          frame.name() === 'body' || 
          frame.url().includes('Agenda') ||
          frame.url().includes('agenda')
        );
        if (bodyFrame) {
          targetPageForResults = bodyFrame;
          console.log('✅ Usando frame "body" para resultados');
        }
      }
      
      // Fechar modal "Importante" após aguardar frames carregarem (pode aparecer aleatoriamente)
      await this.fecharModalImportante();
      
      try {
        await targetPageForResults.waitForSelector('table tbody tr, .table tbody tr, tbody tr', { timeout: 15000 });
        console.log('✅ Tabela encontrada');
      } catch (error) {
        console.log('⚠️ Tabela não encontrada imediatamente, aguardando mais...');
        await delay(3000);
        
        // Tentar novamente
        const tableExists = await targetPageForResults.$('table, .table');
        if (!tableExists) {
          console.log('⚠️ Tabela ainda não encontrada, tentando buscar resultados de outra forma...');
        }
      }

      // Primeiro, extrair a data dos resultados (está no cabeçalho da seção RESULTADO)
      const dataResultado = await targetPageForResults.evaluate(() => {
        // Procurar texto que contenha "DATA:" seguido de uma data
        const allText = document.body.innerText;
        const dataMatch = allText.match(/DATA:\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (dataMatch) {
          return dataMatch[1];
        }
        return null;
      });
      
      const dataFinal = dataResultado || formatarDDMMYYYY(dataReferencia);
      console.log(`📅 Data extraída dos resultados: ${dataFinal}`);
      
      // V4: Extrair dados da tabela com técnica melhorada
      console.log('\n📊 === EXTRAINDO DADOS DA TABELA (V4) ===');
      
      const agendamentos = await targetPageForResults.evaluate((dataAgendamento) => {
        const resultados = [];
        
        // V4: Encontrar tabela - múltiplas estratégias melhoradas
        let table = null;
        const estrategias = [
          () => document.querySelector('table'),
          () => document.querySelector('.table'),
          () => document.querySelector('[class*="table"]'),
          () => {
            const tbody = document.querySelector('tbody');
            return tbody?.parentElement;
          },
          () => {
            const tables = document.querySelectorAll('table');
            // Escolher a tabela com mais linhas (provavelmente a de resultados)
            let maiorTabela = null;
            let maiorNumLinhas = 0;
            tables.forEach(t => {
              const linhas = t.querySelectorAll('tr').length;
              if (linhas > maiorNumLinhas) {
                maiorNumLinhas = linhas;
                maiorTabela = t;
              }
            });
            return maiorTabela;
          }
        ];
        
        for (const estrategia of estrategias) {
          table = estrategia();
          if (table) {
            console.log(`✅ Tabela encontrada usando estratégia`);
            break;
          }
        }

        if (!table) {
          console.log('❌ Tabela não encontrada com nenhuma estratégia');
          
          // Debug: listar todas as tabelas encontradas
          const todasTabelas = document.querySelectorAll('table');
          console.log(`📋 Total de tabelas na página: ${todasTabelas.length}`);
          todasTabelas.forEach((t, idx) => {
            const linhas = t.querySelectorAll('tr').length;
            console.log(`   Tabela ${idx}: ${linhas} linhas`);
          });
          
          return resultados;
        }

        console.log(`✅ Tabela encontrada: ${table.querySelectorAll('tr').length} linhas totais`);

        // V4: Obter todas as linhas (incluindo possíveis headers que devem ser pulados)
        const allRows = Array.from(table.querySelectorAll('tbody tr, tr'));
        console.log(`📋 Total de linhas brutas: ${allRows.length}`);
        
        // V4: Filtrar linhas válidas com técnica melhorada
        const rows = allRows.filter((row, idx) => {
          const cells = row.querySelectorAll('td');
          const cellCount = cells.length;
          
          // Pular linha se não tiver células
          if (cellCount === 0) {
            return false;
          }
          
          // V4: Detectar headers de forma mais robusta
          const primeiraCelula = cells[0]?.textContent?.trim().toUpperCase() || '';
          const todasCelulas = Array.from(cells).map(c => c.textContent?.trim().toUpperCase() || '').join(' ');
          
          // Palavras-chave que indicam header
          const palavrasHeader = ['HORA', 'CPF', 'NOME', 'TELEFONE', 'EMAIL', 'STATUS', 'AÇÃO'];
          const isHeader = palavrasHeader.some(palavra => 
            primeiraCelula.includes(palavra) || todasCelulas.includes(palavra)
          );
          
          if (isHeader) {
            console.log(`🔍 Linha ${idx} identificada como HEADER: "${primeiraCelula}"`);
            return false;
          }
          
          // Pular linhas com poucas células (menos de 3 geralmente não tem dados úteis)
          if (cellCount < 3) {
            return false;
          }
          
          // Verificar se linha tem conteúdo útil (não está vazia)
          const temConteudo = Array.from(cells).some(cell => {
            const texto = cell.textContent?.trim() || '';
            return texto.length > 0 && !texto.match(/^[\s\-\.]+$/);
          });
          
          if (!temConteudo) {
            return false;
          }
          
          return true;
        });
        
        console.log(`📋 Total de linhas na tabela: ${allRows.length}`);
        console.log(`📋 Linhas de agendamentos após filtro: ${rows.length}`);
        
        // V4: Processar linhas com mapeamento dinâmico de colunas
        rows.forEach((row, index) => {
          const cells = Array.from(row.querySelectorAll('td'));
          
          if (cells.length < 3) {
            console.log(`⚠️ Linha ${index} tem apenas ${cells.length} células, pulando`);
            return;
          }

          try {
            // V4: Mapeamento dinâmico de colunas (não assume posição fixa)
            // Primeiro, identificar qual coluna tem qual tipo de dado
            const mapeamentoColunas = {
              hora: -1,
              cpf: -1,
              nome: -1,
              telefone: -1,
              email: -1,
              tipoProcesso: -1,
              categoria: -1
            };
            
            // Analisar todas as células para identificar padrões
            cells.forEach((cell, cellIdx) => {
              const texto = cell.textContent?.trim() || '';
              const textoUpper = texto.toUpperCase();
              const digitos = texto.replace(/\D/g, '');
              
              // Identificar HORA (formato HH:MM)
              if (mapeamentoColunas.hora === -1 && /^\d{1,2}:\d{2}$/.test(texto)) {
                mapeamentoColunas.hora = cellIdx;
              }
              
              // Identificar CPF (11 dígitos)
              if (mapeamentoColunas.cpf === -1 && digitos.length === 11) {
                mapeamentoColunas.cpf = cellIdx;
              }
              
              // Identificar EMAIL (contém @)
              if (mapeamentoColunas.email === -1 && texto.includes('@')) {
                mapeamentoColunas.email = cellIdx;
              }
              
              // Identificar TELEFONE (10 ou 11 dígitos, mas não CPF)
              if (mapeamentoColunas.telefone === -1 && (digitos.length === 10 || (digitos.length === 11 && !/^\d{11}$/.test(texto)))) {
                // Verificar se não é CPF (CPF geralmente não tem parênteses ou hífens)
                if (texto.match(/[\(\)\-]/) || digitos.length === 10) {
                  mapeamentoColunas.telefone = cellIdx;
                }
              }
              
              // Identificar NOME (texto longo, geralmente > 5 caracteres, sem números)
              if (mapeamentoColunas.nome === -1 && texto.length > 5 && digitos.length === 0 && !texto.includes('@')) {
                mapeamentoColunas.nome = cellIdx;
              }
            });
            
            // Fallback para mapeamento padrão se não detectou automaticamente
            if (mapeamentoColunas.hora === -1 && cells.length > 0) mapeamentoColunas.hora = 0;
            if (mapeamentoColunas.cpf === -1 && cells.length > 1) mapeamentoColunas.cpf = 1;
            if (mapeamentoColunas.nome === -1 && cells.length > 2) mapeamentoColunas.nome = 2;
            if (mapeamentoColunas.telefone === -1 && cells.length > 3) mapeamentoColunas.telefone = 3;
            if (mapeamentoColunas.email === -1 && cells.length > 4) mapeamentoColunas.email = 4;
            if (mapeamentoColunas.tipoProcesso === -1 && cells.length > 5) mapeamentoColunas.tipoProcesso = 5;
            if (mapeamentoColunas.categoria === -1 && cells.length > 6) mapeamentoColunas.categoria = 6;
            
            // Extrair dados usando mapeamento
            const hora = mapeamentoColunas.hora >= 0 ? cells[mapeamentoColunas.hora]?.textContent?.trim() || '' : '';
            let cpfFinal = mapeamentoColunas.cpf >= 0 ? cells[mapeamentoColunas.cpf]?.textContent?.trim() || '' : '';
            const nome = mapeamentoColunas.nome >= 0 ? cells[mapeamentoColunas.nome]?.textContent?.trim() || '' : '';
            const telefone = mapeamentoColunas.telefone >= 0 ? cells[mapeamentoColunas.telefone]?.textContent?.trim() || '' : '';
            const email = mapeamentoColunas.email >= 0 ? cells[mapeamentoColunas.email]?.textContent?.trim() || '' : '';
            const tipoProcesso = mapeamentoColunas.tipoProcesso >= 0 ? cells[mapeamentoColunas.tipoProcesso]?.textContent?.trim() || '' : '';
            const categoria = mapeamentoColunas.categoria >= 0 ? cells[mapeamentoColunas.categoria]?.textContent?.trim() || '' : '';

            // V4: Buscar CPF em todas as colunas se não encontrou na esperada
            let cpfLimpo = cpfFinal.replace(/\D/g, '');
            let cpfValido = cpfLimpo.length === 11;
            
            if (!cpfValido) {
              // Buscar CPF válido em qualquer coluna
              for (let i = 0; i < cells.length; i++) {
                const cellText = cells[i]?.textContent?.trim() || '';
                const cellDigits = cellText.replace(/\D/g, '');
                
                if (cellDigits.length === 11) {
                  console.log(`   🔍 CPF encontrado na coluna ${i}: "${cellText}"`);
                  cpfFinal = cellText;
                  cpfLimpo = cellDigits;
                  cpfValido = true;
                  mapeamentoColunas.cpf = i;
                  break;
                }
              }
            }
            
            // V4: Validação melhorada de nome (não pode ser só números/separadores)
            const nomeValido = nome && nome.length > 3 && !nome.match(/^[\d\s\-\.]+$/);
            
            // V4: Log detalhado apenas para primeiras 3 linhas ou se houver problemas
            const deveLogar = index < 3 || !nomeValido || !cpfValido;
            
            if (deveLogar) {
              console.log(`\n📋 Linha ${index + 1}:`);
              console.log(`   Mapeamento: Hora[${mapeamentoColunas.hora}], CPF[${mapeamentoColunas.cpf}], Nome[${mapeamentoColunas.nome}]`);
              console.log(`   Hora: "${hora}"`);
              console.log(`   CPF: "${cpfFinal}" (${cpfLimpo.length} dígitos) ${cpfValido ? '✅' : '❌'}`);
              console.log(`   Nome: "${nome}" (${nome.length} chars) ${nomeValido ? '✅' : '❌'}`);
              console.log(`   Telefone: "${telefone}"`);
              console.log(`   Email: "${email}"`);
              console.log(`   Tipo: "${tipoProcesso}"`);
              console.log(`   Categoria: "${categoria}"`);
            }

            // V4: Validar que temos pelo menos nome e CPF válidos (melhor validação)
            if (nomeValido && cpfValido) {
              resultados.push({
                data: dataAgendamento,
                hora: hora.trim(),
                cpf: cpfLimpo, // Já limpo
                nome: nome.toUpperCase().trim(),
                telefone: telefone.trim() || null,
                email: email.toLowerCase().trim() || null,
                tipo_processo: tipoProcesso.trim() || null,
                categoria_cnh: categoria.trim() || null
              });
              console.log(`   ✅ Agendamento EXTRAÍDO com sucesso!`);
            } else {
              const reasons = [];
              if (!nomeValido) reasons.push('Nome inválido (deve ter mais de 3 caracteres)');
              if (!cpfValido) reasons.push(`CPF inválido (encontrado ${cpfLimpo.length} dígitos, precisa de 11)`);
              console.log(`   ⚠️ LINHA IGNORADA: ${reasons.join(', ')}`);
              
              // Log de todas as células para debugging
              console.log(`   🔍 Todas as células da linha:`);
              cells.forEach((cell, cellIdx) => {
                const text = cell?.textContent?.trim() || '';
                const digits = text.replace(/\D/g, '');
                console.log(`      [${cellIdx}]: "${text}" (${digits.length} dígitos)`);
              });
            }
          } catch (error) {
            console.error(`❌ Erro ao extrair linha ${index}:`, error);
            console.error(`   Células encontradas: ${cells.length}`);
          }
        });

        return resultados;
      }, dataFinal);

      console.log(`✅ Encontrados ${agendamentos.length} agendamentos`);
      
      // Se não encontrou agendamentos, salvar screenshot e HTML para debug
      if (agendamentos.length === 0) {
        console.log('⚠️ Nenhum agendamento encontrado, salvando artefatos para debug...');
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/:/g, '-').substring(0, 23);
        
        // Screenshot
        const screenshot = await targetPageForResults.screenshot({ fullPage: true });
        const screenshotPath = `codigo/artifacts/agenda-sem-resultados-${timestamp}.png`;
        fs.writeFileSync(screenshotPath, screenshot);
        console.log(`📸 Screenshot salvo: ${screenshotPath}`);
        
        // HTML
        const html = await targetPageForResults.content();
        const htmlPath = `codigo/artifacts/agenda-sem-resultados-${timestamp}.html`;
        fs.writeFileSync(htmlPath, html);
        console.log(`📄 HTML salvo: ${htmlPath}`);
      }
      
      return agendamentos;
    } catch (error) {
      console.error('❌ Erro ao buscar agendamentos:', error.message);
      
      // Capturar artefatos em caso de erro
      try {
        await this._takeScreenshotAndHtml(`erro-buscar-agendamentos-${formatarDDMMYYYY_semBarras(dataReferencia)}`);
      } catch (artError) {
        console.error('❌ Erro ao capturar artefatos:', artError.message);
      }
      
      throw new Error(`Erro ao buscar agendamentos: ${error.message}`);
    }
  }

  /**
   * Voltar para a página de pesquisa (para processar próxima data)
   * IMPORTANTE: Deve ser chamado APÓS cada busca de agendamentos, exceto na última
   */
  async voltar() {
    try {
      console.log('\n🔙 ===== VOLTANDO PARA PÁGINA DE PESQUISA =====');
      
      // Fechar modal "Importante" antes de voltar (pode aparecer aleatoriamente)
      await this.fecharModalImportante();
      
      const urlAntes = this.page.url();
      console.log(`📍 URL atual antes de voltar: ${urlAntes}`);
      
      // Verificar se há frameset
      let targetPage = this.page;
      const hasFrameset = await this.page.evaluate(() => {
        return document.querySelector('frameset') !== null;
      });

      if (hasFrameset) {
        const frames = this.page.frames();
        for (const frame of frames) {
          if (frame !== this.page.mainFrame()) {
            try {
              const frameButtons = await frame.$$('button, a, input[type="button"]').catch(() => []);
              if (frameButtons.length > 0) {
                targetPage = frame;
                break;
              }
            } catch (e) {
              // Continuar
            }
          }
        }
      }
      
      // Procurar botão "Voltar" (conforme vídeo) - priorizar texto exato
      const voltarButton = await targetPage.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'));
        
        // PRIORIDADE 1: Procurar especificamente por "Voltar"
        const botaoVoltar = buttons.find(btn => {
          const text = (btn.textContent || btn.value || btn.innerText || '').toUpperCase().trim();
          return text === 'VOLTAR' || text.includes('VOLTAR');
        });
        
        if (botaoVoltar) return botaoVoltar;
        
        // PRIORIDADE 2: Outras opções
        return buttons.find(btn => {
          const text = (btn.textContent || btn.value || btn.innerText || '').toUpperCase();
          return text.includes('BACK') || 
                 text.includes('RETORNAR') ||
                 text.includes('NOVA CONSULTA');
        });
      });

      if (voltarButton && voltarButton.asElement()) {
        console.log('✅ Botão "Voltar" encontrado, clicando...');
        try {
          const page = this.page;
          await Promise.race([
            (async () => {
              await voltarButton.asElement().click();
              await delay(2000);
              try {
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
              } catch (navError) {
                console.log('⚠️ Navegação não detectada, mas continuando...');
              }
            })(),
            delay(5000)
          ]);
        } catch (e) {
          console.log('⚠️ Erro ao clicar no botão voltar:', e.message);
        }
      } else {
        // Se não encontrar botão, tentar navegação do browser
        console.log('⚠️ Botão "Voltar" não encontrado, usando navegação do browser...');
        try {
          await this.page.goBack();
          await delay(2000);
        } catch (e) {
          console.log('⚠️ Erro ao usar goBack:', e.message);
        }
      }
      
      await delay(2000);
      
      // Fechar modal "Importante" após voltar (pode aparecer aleatoriamente)
      await this.fecharModalImportante();
      
      const urlDepois = this.page.url();
      console.log(`📍 URL após voltar: ${urlDepois}`);
      console.log('✅ Voltou para página de pesquisa');
    } catch (error) {
      console.error('⚠️ Erro ao voltar, mas continuando:', error.message);
    }
  }

  /**
   * Clicar no botão "Sair" para encerrar a sessão
   */
  async sair() {
    try {
      console.log('\n🚪 ===== ENCERRANDO SESSÃO (SAIR) =====');
      
      // Verificar se há frameset
      let targetPage = this.page;
      const hasFrameset = await this.page.evaluate(() => {
        return document.querySelector('frameset') !== null;
      });

      if (hasFrameset) {
        const frames = this.page.frames();
        for (const frame of frames) {
          if (frame !== this.page.mainFrame()) {
            try {
              const frameButtons = await frame.$$('button, a, input[type="button"]').catch(() => []);
              if (frameButtons.length > 0) {
                targetPage = frame;
                break;
              }
            } catch (e) {
              // Continuar
            }
          }
        }
      }
      
      // Procurar botão "Sair"
      const sairButton = await targetPage.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], [onclick*="sair"], [onclick*="logout"]'));
        return buttons.find(btn => {
          const text = (btn.textContent || btn.value || '').toUpperCase();
          const onclick = (btn.getAttribute('onclick') || '').toUpperCase();
          return text.includes('SAIR') || 
                 text.includes('LOGOUT') ||
                 onclick.includes('SAIR') ||
                 onclick.includes('LOGOUT');
        });
      });

      if (sairButton && sairButton.asElement()) {
        console.log('✅ Botão "Sair" encontrado, clicando...');
        await sairButton.asElement().click();
        await delay(2000);
        console.log('✅ Sessão encerrada');
      } else {
        console.log('⚠️ Botão "Sair" não encontrado (pode não ser necessário)');
      }
    } catch (error) {
      console.error('⚠️ Erro ao clicar em "Sair":', error.message);
      // Não lançar erro, apenas logar
    }
  }

  /**
   * Fechar navegador
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Navegador fechado');
    }
  }
}

module.exports = DetranScraper;


