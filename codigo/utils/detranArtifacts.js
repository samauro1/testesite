const fs = require('fs');
const path = require('path');

/**
 * Utilitário para capturar artefatos de debug (screenshots, HTML)
 * quando ocorrem erros no scraping
 */

// Criar diretório de artefatos se não existir
const ARTIFACTS_DIR = path.join(__dirname, '../artifacts');
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

/**
 * Captura screenshot, HTML e informações da página quando há erro
 * @param {Page} page - Página do Puppeteer
 * @param {string} prefix - Prefixo para os arquivos (ex: 'login-failed')
 * @returns {Promise<Object>} Paths dos arquivos gerados
 */
async function captureArtifactsOnError(page, prefix = 'error') {
  const timestamp = Date.now();
  const artifacts = {
    screenshot: null,
    html: null,
    info: null
  };

  try {
    // Screenshot
    const screenshotPath = path.join(ARTIFACTS_DIR, `${prefix}-${timestamp}.png`);
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    artifacts.screenshot = screenshotPath;
    console.error(`📸 Screenshot salvo: ${screenshotPath}`);
  } catch (e) {
    console.error('⚠️ Erro ao capturar screenshot:', e.message);
  }

  try {
    // HTML completo
    const htmlPath = path.join(ARTIFACTS_DIR, `${prefix}-${timestamp}.html`);
    const html = await page.content();
    fs.writeFileSync(htmlPath, html, 'utf8');
    artifacts.html = htmlPath;
    console.error(`📄 HTML salvo: ${htmlPath}`);
  } catch (e) {
    console.error('⚠️ Erro ao salvar HTML:', e.message);
  }

  try {
    // Informações estruturadas da página
    const infoPath = path.join(ARTIFACTS_DIR, `${prefix}-${timestamp}.json`);
    const info = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        inputs: Array.from(document.querySelectorAll('input')).map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          value: input.value ? '***' : '',
          visible: input.offsetParent !== null
        })),
        buttons: Array.from(document.querySelectorAll('button, input[type="submit"]')).map(btn => ({
          text: btn.textContent?.trim(),
          value: btn.value,
          type: btn.type,
          id: btn.id,
          className: btn.className,
          visible: btn.offsetParent !== null
        })),
        iframes: Array.from(document.querySelectorAll('iframe')).map(iframe => ({
          src: iframe.src,
          name: iframe.name,
          id: iframe.id
        })),
        bodyTextSnippet: document.body.innerText.substring(0, 500)
      };
    });
    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), 'utf8');
    artifacts.info = infoPath;
    console.error(`📋 Informações salvas: ${infoPath}`);
  } catch (e) {
    console.error('⚠️ Erro ao capturar informações:', e.message);
  }

  return artifacts;
}

/**
 * Limpa artefatos antigos (mantém apenas últimos 50)
 */
function cleanupOldArtifacts() {
  try {
    const files = fs.readdirSync(ARTIFACTS_DIR)
      .map(file => ({
        name: file,
        path: path.join(ARTIFACTS_DIR, file),
        time: fs.statSync(path.join(ARTIFACTS_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 50) {
      const toDelete = files.slice(50);
      toDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          // Ignorar erros de deleção
        }
      });
      console.log(`🧹 Limpeza: ${toDelete.length} artefato(s) antigo(s) removido(s)`);
    }
  } catch (e) {
    // Ignorar erros de limpeza
  }
}

module.exports = {
  captureArtifactsOnError,
  cleanupOldArtifacts,
  ARTIFACTS_DIR
};

