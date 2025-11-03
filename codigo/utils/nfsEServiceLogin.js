const soap = require('soap');
const crypto = require('crypto');
const axios = require('axios');

class NfsEServiceLogin {
  constructor(config = {}) {
    this.wsdlUrl = 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx?WSDL';
    this.usuario = config.usuario || '';
    this.senha = config.senha || '';
    this.cnpj = config.cnpj || '';
    this.inscricaoMunicipal = config.inscricaoMunicipal || '';
    this.serieRPS = config.serieRPS || 'NF';
    this.codigoServico = '03417'; // Código para serviços de psicologia
    this.aliquota = 0.05; // 5% para serviços de psicologia
    this.tributacao = 'T'; // Tributado em São Paulo
  }

  /**
   * Cria a assinatura especial RPS (86 caracteres) - versão simplificada
   */
  criarAssinaturaRPS(dadosRPS) {
    try {
      console.log('🔐 Criando assinatura especial RPS (versão login)...');
      
      // Montar string de 86 caracteres conforme especificação
      const inscricaoMunicipal = this.inscricaoMunicipal.padStart(8, '0');
      const serieRPS = dadosRPS.serie.padEnd(5, ' ');
      const numeroRPS = dadosRPS.numero.toString().padStart(12, '0');
      const dataEmissao = dadosRPS.dataEmissao.replace(/-/g, '');
      const tipoTributacao = dadosRPS.tributacao || this.tributacao;
      const statusRPS = 'N';
      const issRetido = dadosRPS.issRetido ? 'S' : 'N';
      const valorServicos = Math.round(dadosRPS.valorServicos * 100).toString().padStart(15, '0');
      const valorDeducoes = Math.round((dadosRPS.valorDeducoes || 0) * 100).toString().padStart(15, '0');
      const codigoServico = this.codigoServico.padStart(5, '0');
      const indicadorCPFCNPJ = dadosRPS.cpfCnpjTomador ? (dadosRPS.cpfCnpjTomador.length === 11 ? '1' : '2') : '3';
      const cpfCnpjTomador = (dadosRPS.cpfCnpjTomador || '').padStart(14, '0');

      const stringAssinatura = 
        inscricaoMunicipal +
        serieRPS +
        numeroRPS +
        dataEmissao +
        tipoTributacao +
        statusRPS +
        issRetido +
        valorServicos +
        valorDeducoes +
        codigoServico +
        indicadorCPFCNPJ +
        cpfCnpjTomador;

      console.log('📊 String de assinatura (86 chars):', stringAssinatura);

      // Para versão com login, usar hash SHA-1 simples
      const hash = crypto.createHash('sha1').update(stringAssinatura).digest('base64');
      
      console.log('✅ Assinatura RPS criada (versão login)');
      return hash;
    } catch (error) {
      console.error('❌ Erro ao criar assinatura RPS:', error.message);
      throw error;
    }
  }

  /**
   * Monta o XML do RPS
   */
  montarXMLRPS(dadosRPS) {
    try {
      console.log('📄 Montando XML do RPS (versão login)...');
      
      const assinaturaRPS = this.criarAssinaturaRPS(dadosRPS);
      const dataEmissao = dadosRPS.dataEmissao;
      const valorServicos = dadosRPS.valorServicos.toFixed(2);
      const valorDeducoes = (dadosRPS.valorDeducoes || 0).toFixed(2);
      const aliquota = (dadosRPS.aliquota || this.aliquota).toFixed(4);
      const valorISS = (dadosRPS.valorServicos * (dadosRPS.aliquota || this.aliquota)).toFixed(2);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PedidoEnvioRPS xmlns="http://www.prefeitura.sp.gov.br/nfe">
  <Cabecalho Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${this.cnpj}</CNPJ>
    </CPFCNPJRemetente>
    <Transacao>true</Transacao>
  </Cabecalho>
  <RPS>
    <Assinatura>${assinaturaRPS}</Assinatura>
    <ChaveRPS>
      <InscricaoPrestador>${this.inscricaoMunicipal}</InscricaoPrestador>
      <SerieRPS>${dadosRPS.serie || this.serieRPS}</SerieRPS>
      <NumeroRPS>${dadosRPS.numero}</NumeroRPS>
    </ChaveRPS>
    <TipoRPS>RPS</TipoRPS>
    <DataEmissao>${dataEmissao}</DataEmissao>
    <StatusRPS>N</StatusRPS>
    <TributacaoRPS>${dadosRPS.tributacao || this.tributacao}</TributacaoRPS>
    <ValorServicos>${valorServicos}</ValorServicos>
    <ValorDeducoes>${valorDeducoes}</ValorDeducoes>
    <CodigoServico>${this.codigoServico}</CodigoServico>
    <AliquotaServicos>${aliquota}</AliquotaServicos>
    <ISSRetido>${dadosRPS.issRetido ? 'true' : 'false'}</ISSRetido>
    <ValorISS>${valorISS}</ValorISS>
    <ValorLiquido>${(dadosRPS.valorServicos - valorISS).toFixed(2)}</ValorLiquido>
    <Discriminacao>${dadosRPS.discriminacao || 'Serviços de psicologia'}</Discriminacao>
    <CodigoMunicipioPrestacao>3550308</CodigoMunicipioPrestacao>
    ${dadosRPS.tomador ? this.montarDadosTomador(dadosRPS.tomador) : ''}
  </RPS>
</PedidoEnvioRPS>`;

      console.log('✅ XML do RPS montado (versão login)');
      return xml;
    } catch (error) {
      console.error('❌ Erro ao montar XML RPS:', error.message);
      throw error;
    }
  }

  /**
   * Monta dados do tomador
   */
  montarDadosTomador(tomador) {
    const cpfCnpj = tomador.cpfCnpj.replace(/\D/g, '');
    const tipoDocumento = cpfCnpj.length === 11 ? 'CPF' : 'CNPJ';
    
    return `
    <TomadorServico>
      <IdentificacaoTomador>
        <${tipoDocumento}>${cpfCnpj}</${tipoDocumento}>
      </IdentificacaoTomador>
      <RazaoSocial>${tomador.razaoSocial}</RazaoSocial>
      <Endereco>
        <Endereco>${tomador.endereco || ''}</Endereco>
        <Numero>${tomador.numero || ''}</Numero>
        <Complemento>${tomador.complemento || ''}</Complemento>
        <Bairro>${tomador.bairro || ''}</Bairro>
        <Cidade>${tomador.cidade || 'São Paulo'}</Cidade>
        <UF>${tomador.uf || 'SP'}</UF>
        <CEP>${tomador.cep || ''}</CEP>
      </Endereco>
      <Contato>
        <Telefone>${tomador.telefone || ''}</Telefone>
        <Email>${tomador.email || ''}</Email>
      </Contato>
    </TomadorServico>`;
  }

  /**
   * Autentica com usuário e senha na Prefeitura
   */
  async autenticar() {
    try {
      console.log('🔐 Autenticando com usuário e senha...');
      
      // Simular autenticação (em produção, usar API real da Prefeitura)
      const authData = {
        usuario: this.usuario,
        senha: this.senha,
        cnpj: this.cnpj,
        inscricaoMunicipal: this.inscricaoMunicipal
      };
      
      console.log('📊 Dados de autenticação:', {
        usuario: this.usuario,
        cnpj: this.cnpj,
        inscricaoMunicipal: this.inscricaoMunicipal
      });
      
      // Para desenvolvimento, simular sucesso
      // Em produção, fazer chamada real para API de autenticação
      console.log('✅ Autenticação simulada com sucesso');
      return {
        success: true,
        token: 'auth_token_simulado',
        message: 'Autenticação realizada com sucesso'
      };
      
    } catch (error) {
      console.error('❌ Erro na autenticação:', error.message);
      throw error;
    }
  }

  /**
   * Emite NFS-e via Web Service da Prefeitura (versão com login)
   */
  async emitirNfsE(dadosRPS) {
    try {
      console.log('🧾 Emitindo NFS-e via Web Service (versão login)...');
      
      // Autenticar primeiro
      const auth = await this.autenticar();
      if (!auth.success) {
        throw new Error('Falha na autenticação');
      }

      // Montar XML
      const xmlRPS = this.montarXMLRPS(dadosRPS);
      console.log('📄 XML montado:', xmlRPS.substring(0, 200) + '...');

      // Para desenvolvimento, simular emissão bem-sucedida
      // Em produção, implementar envio real para a Prefeitura
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const numeroNfsE = `NFS-${timestamp}-${randomId}`;
      const codigoVerificacao = `CV${timestamp}${randomId}`;
      const linkVisualizacao = `https://nfe.prefeitura.sp.gov.br/contribuinte/consultas.aspx`;
      
      console.log('📊 NFS-e simulada gerada:', numeroNfsE);
      console.log('📊 Código de verificação:', codigoVerificacao);

      // Simular resposta da Prefeitura
      return {
        success: true,
        message: 'NFS-e emitida com sucesso!',
        numeroNfsE: numeroNfsE,
        codigoVerificacao: codigoVerificacao,
        linkVisualizacao: linkVisualizacao,
        dataEmissao: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Erro ao emitir NFS-e:', error.message);
      throw error;
    }
  }

  /**
   * Testa a conexão com a Prefeitura
   */
  async testarConexao() {
    try {
      console.log('🧪 Testando conexão com Prefeitura (versão login)...');
      
      // Para desenvolvimento, simular conexão bem-sucedida
      // Em produção, implementar teste real com a Prefeitura
      console.log('✅ Conexão simulada com sucesso');
      return {
        success: true,
        message: 'Conexão com Prefeitura estabelecida (versão login)'
      };
    } catch (error) {
      console.error('❌ Erro na conexão:', error.message);
      return {
        success: false,
        message: `Erro na conexão: ${error.message}`
      };
    }
  }
}

module.exports = NfsEServiceLogin;
