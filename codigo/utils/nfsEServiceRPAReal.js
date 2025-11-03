const puppeteer = require('puppeteer');
const { pool } = require('../config/database');

class NfsEServiceRPAReal {
  constructor(config = {}) {
    this.usuario = config.usuario || process.env.NFSE_USUARIO;
    this.senha = config.senha || process.env.NFSE_SENHA;
    this.cnpj = config.cnpj || process.env.CNPJ;
    this.inscricaoMunicipal = config.inscricaoMunicipal || process.env.INSCRICAO_MUNICIPAL;
    this.serieRPS = 'NF';
    this.codigoServico = '03417'; // Código para serviços de psicologia
    this.aliquota = 0.05; // 5% para serviços de psicologia
    this.tributacao = 'T'; // Tributado em São Paulo
    
    // Configurar caminhos para disco D
    this.chromePath = 'D:\\puppeteer-browsers\\chrome\\win64-141.0.7390.78\\chrome-win64\\chrome.exe';
  }

  /**
   * Emite NFS-e REAL via automação do portal da Prefeitura
   */
  async emitirNfsE(dadosRPS) {
    let browser = null;
    
    try {
      console.log('🤖 Iniciando automação RPA REAL com Puppeteer...');
      console.log('📊 Dados RPS:', {
        paciente: dadosRPS.tomador?.razaoSocial,
        valor: dadosRPS.valorServicos,
        cpf: dadosRPS.tomador?.cpfCnpj
      });

      // Configurar navegador com caminho do disco D
      browser = await puppeteer.launch({ 
        headless: false, // Mostrar navegador para debug
        slowMo: 2000,   // Delay entre ações
        executablePath: this.chromePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      const page = await browser.newPage();
      
      // Configurar viewport e user agent
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // 1. Acessar portal da Prefeitura
      console.log('🌐 Acessando portal da Prefeitura...');
      await page.goto('https://nfe.prefeitura.sp.gov.br/login.aspx', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Aguardar carregamento da página
      await page.waitForSelector('#txtUsuario', { timeout: 10000 });
      
      // 2. Fazer login
      console.log('🔐 Fazendo login...');
      await page.type('#txtUsuario', this.usuario, { delay: 100 });
      await page.type('#txtSenha', this.senha, { delay: 100 });
      await page.click('#btnEntrar');
      
      // 3. Aguardar carregamento após login
      console.log('⏳ Aguardando carregamento após login...');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      // 4. Navegar para emissão de NFS-e
      console.log('📝 Navegando para emissão de NFS-e...');
      
      // Procurar por link de emissão (pode variar)
      const emissaoLink = await page.$('a[href*="nota.aspx"]') || 
                          await page.$('text=Emissão de NFS-e') ||
                          await page.$('text=Emissão') ||
                          await page.$('text=NFS-e');
      
      if (emissaoLink) {
        await emissaoLink.click();
      } else {
        // Tentar navegar diretamente
        await page.goto('https://nfe.prefeitura.sp.gov.br/contribuinte/nota.aspx');
      }
      
      // Aguardar carregamento da página de emissão
      await page.waitForSelector('#txtCPFCNPJTomador', { timeout: 30000 });
      
      // 5. Preencher dados do tomador
      console.log('👤 Preenchendo dados do tomador...');
      await page.type('#txtCPFCNPJTomador', dadosRPS.tomador.cpfCnpj, { delay: 100 });
      await page.type('#txtRazaoSocialTomador', dadosRPS.tomador.razaoSocial, { delay: 100 });
      await page.type('#txtEnderecoTomador', dadosRPS.tomador.endereco, { delay: 100 });
      await page.type('#txtNumeroTomador', dadosRPS.tomador.numero, { delay: 100 });
      await page.type('#txtBairroTomador', dadosRPS.tomador.bairro, { delay: 100 });
      await page.type('#txtCidadeTomador', dadosRPS.tomador.cidade, { delay: 100 });
      await page.type('#txtUFTomador', dadosRPS.tomador.uf, { delay: 100 });
      await page.type('#txtCEPTomador', dadosRPS.tomador.cep, { delay: 100 });
      await page.type('#txtTelefoneTomador', dadosRPS.tomador.telefone, { delay: 100 });
      await page.type('#txtEmailTomador', dadosRPS.tomador.email, { delay: 100 });
      
      // 6. Preencher dados do serviço
      console.log('💼 Preenchendo dados do serviço...');
      await page.type('#txtCodigoServico', this.codigoServico, { delay: 100 });
      await page.type('#txtDescricaoServico', dadosRPS.discriminacao, { delay: 100 });
      await page.type('#txtValorServicos', dadosRPS.valorServicos.toString(), { delay: 100 });
      await page.type('#txtAliquotaISS', (this.aliquota * 100).toString(), { delay: 100 });
      
      // 7. Submeter NFS-e
      console.log('🚀 Submetendo NFS-e...');
      await page.click('#btnEmitir');
      
      // 8. Aguardar processamento
      console.log('⏳ Aguardando processamento...');
      await page.waitForSelector('#lblNumeroNFS-e', { timeout: 60000 });
      
      // 9. Capturar dados da NFS-e emitida
      const numeroNfsE = await page.$eval('#lblNumeroNFS-e', el => el.textContent.trim());
      const codigoVerificacao = await page.$eval('#lblCodigoVerificacao', el => el.textContent.trim());
      const linkVisualizacao = 'https://nfe.prefeitura.sp.gov.br/contribuinte/consultas.aspx';
      
      console.log('✅ NFS-e REAL emitida:', numeroNfsE);
      console.log('📊 Código de verificação:', codigoVerificacao);
      
      // 10. Salvar no banco
      const nfsEId = await this.salvarNfsE({
        numeroNfsE,
        codigoVerificacao,
        linkVisualizacao,
        dataEmissao: new Date().toISOString(),
        status: 'emitida'
      }, dadosRPS);
      
      console.log('💾 NFS-e salva no banco com ID:', nfsEId);
      
      return {
        success: true,
        message: 'NFS-e emitida com SUCESSO na Prefeitura de São Paulo!',
        numeroNfsE,
        codigoVerificacao,
        linkVisualizacao,
        dataEmissao: new Date().toISOString(),
        status: 'emitida',
        observacoes: 'Emitida via automação RPA REAL - Portal Prefeitura SP'
      };
      
    } catch (error) {
      console.error('❌ Erro na automação RPA:', error.message);
      
      // Capturar screenshot em caso de erro
      if (browser) {
        try {
          const pages = await browser.pages();
          if (pages && pages.length > 0) {
            await pages[0].screenshot({ 
              path: `erro-rpa-real-${Date.now()}.png`,
              fullPage: true 
            });
            console.log('📸 Screenshot salvo: erro-rpa-real-' + Date.now() + '.png');
          }
        } catch (screenshotError) {
          console.error('❌ Erro ao capturar screenshot:', screenshotError.message);
        }
      }
      
      return {
        success: false,
        message: `Erro na emissão: ${error.message}`,
        error: error.message
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Salva NFS-e no banco de dados
   */
  async salvarNfsE(resultado, dadosRPS) {
    try {
      const query = `
        INSERT INTO nfs_e_emitidas 
        (usuario_id, paciente_id, numero_nfs_e, codigo_verificacao, status, valor, 
         discriminacao, data_emissao, link_visualizacao, observacoes, xml_nfs_e)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;
      
      const values = [
        3, // usuario_id fixo
        dadosRPS.pacienteId,
        resultado.numeroNfsE,
        resultado.codigoVerificacao,
        resultado.status,
        dadosRPS.valorServicos,
        dadosRPS.discriminacao || 'Avaliação psicológica',
        resultado.dataEmissao,
        resultado.linkVisualizacao,
        resultado.observacoes,
        JSON.stringify({
          tipo: 'emissao_real_rpa_puppeteer',
          portal: 'Prefeitura de São Paulo',
          dataProcessamento: new Date().toISOString(),
          dados: resultado
        })
      ];

      const result = await pool.query(query, values);
      return result.rows[0].id;

    } catch (error) {
      console.error('❌ Erro ao salvar NFS-e no banco:', error.message);
      throw error;
    }
  }

  /**
   * Testa conexão com portal da Prefeitura
   */
  async testarConexao() {
    let browser = null;
    
    try {
      console.log('🧪 Testando conexão REAL com portal da Prefeitura...');
      
      browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 1000,
        executablePath: this.chromePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      await page.goto('https://nfe.prefeitura.sp.gov.br/login.aspx');
      await page.waitForSelector('#txtUsuario', { timeout: 10000 });
      
      console.log('✅ Portal acessível');
      return {
        success: true,
        message: 'Conexão REAL com portal da Prefeitura de São Paulo estabelecida'
      };
      
    } catch (error) {
      console.error('❌ Erro na conexão:', error.message);
      return {
        success: false,
        message: `Erro na conexão: ${error.message}`
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = NfsEServiceRPAReal;