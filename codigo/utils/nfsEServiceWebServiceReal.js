const soap = require('soap');
const fs = require('fs');
const crypto = require('crypto');
const xml2js = require('xml2js');
const xmlCrypto = require('xml-crypto');
const forge = require('node-forge');

class NfsEServiceWebServiceReal {
  constructor() {
    this.wsdlUrl = 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx?WSDL';
    this.certificadoPath = process.env.CERTIFICADO_PATH || './certificado.pfx';
    this.certificadoSenha = process.env.CERTIFICADO_SENHA || '';
    this.cnpj = process.env.NFSE_CNPJ || '47673269000100';
    this.inscricaoMunicipal = process.env.NFSE_INSCRICAO_MUNICIPAL || '12345678';
    this.serieRPS = process.env.NFSE_SERIE_RPS || 'NF';
    this.codigoServico = '05118'; // Código para serviços de psicologia
    this.aliquotaServicos = 0.05; // 5% conforme manual
  }

  /**
   * Carrega o certificado digital A1/A3/A4
   */
  async carregarCertificado() {
    try {
      console.log('🔐 Carregando certificado digital...');
      
      if (!fs.existsSync(this.certificadoPath)) {
        throw new Error(`Certificado não encontrado: ${this.certificadoPath}`);
      }

      const pfxData = fs.readFileSync(this.certificadoPath);
      const pfxBuffer = Buffer.from(pfxData);
      
      // Converter PFX para formato que o node-forge entende
      const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
      const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, this.certificadoSenha);
      
      // Extrair certificado e chave privada
      const bags = pfx.getBags({ bagType: forge.pki.oids.certBag });
      const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      
      if (!bags[forge.pki.oids.certBag] || !keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]) {
        throw new Error('Certificado ou chave privada não encontrados no arquivo PFX');
      }

      this.certificado = bags[forge.pki.oids.certBag][0].cert;
      this.chavePrivada = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
      
      console.log('✅ Certificado digital carregado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao carregar certificado:', error.message);
      throw error;
    }
  }

  /**
   * Cria assinatura especial do RPS conforme manual oficial
   */
  criarAssinaturaRPS(dadosRPS) {
    try {
      console.log('🔏 Criando assinatura especial do RPS...');
      
      // Montar string de 86 caracteres conforme manual oficial
      const inscricaoMunicipal = this.inscricaoMunicipal.padStart(8, '0');
      const serieRPS = dadosRPS.serieRPS.padEnd(5, ' ');
      const numeroRPS = dadosRPS.numeroRPS.padStart(12, '0');
      const dataEmissao = dadosRPS.dataEmissao.replace(/-/g, '');
      const tributacaoRPS = dadosRPS.tributacaoRPS || 'T';
      const statusRPS = dadosRPS.statusRPS || 'N';
      const issRetido = dadosRPS.issRetido ? 'S' : 'N';
      const valorServicos = Math.round(dadosRPS.valorServicos * 100).toString().padStart(15, '0');
      const valorDeducoes = Math.round((dadosRPS.valorDeducoes || 0) * 100).toString().padStart(15, '0');
      const codigoServico = dadosRPS.codigoServico.padStart(5, '0');
      const indicadorCPFCNPJ = dadosRPS.cpfCnpjTomador ? (dadosRPS.cpfCnpjTomador.length === 11 ? '1' : '2') : '3';
      const cpfCnpjTomador = (dadosRPS.cpfCnpjTomador || '').replace(/\D/g, '').padStart(14, '0');
      const indicadorIntermediario = dadosRPS.cpfCnpjIntermediario ? (dadosRPS.cpfCnpjIntermediario.length === 11 ? '1' : '2') : '3';
      const cpfCnpjIntermediario = (dadosRPS.cpfCnpjIntermediario || '').replace(/\D/g, '').padStart(14, '0');
      const issRetidoIntermediario = dadosRPS.issRetidoIntermediario ? 'S' : 'N';

      const stringAssinatura = 
        inscricaoMunicipal +
        serieRPS +
        numeroRPS +
        dataEmissao +
        tributacaoRPS +
        statusRPS +
        issRetido +
        valorServicos +
        valorDeducoes +
        codigoServico +
        indicadorCPFCNPJ +
        cpfCnpjTomador +
        indicadorIntermediario +
        cpfCnpjIntermediario +
        issRetidoIntermediario;

      console.log('📝 String de assinatura (86 chars):', stringAssinatura);
      console.log('📏 Tamanho da string:', stringAssinatura.length);

      // Assinar com RSA-SHA1
      const md = forge.md.sha1.create();
      md.update(stringAssinatura, 'utf8');
      const hash = md.digest().getBytes();

      const signature = this.chavePrivada.sign(md);
      const signatureBase64 = forge.util.encode64(signature);

      console.log('✅ Assinatura RPS criada com sucesso');
      return signatureBase64;
    } catch (error) {
      console.error('❌ Erro ao criar assinatura RPS:', error.message);
      throw error;
    }
  }

  /**
   * Monta XML do RPS conforme schema oficial
   */
  montarXMLRPS(dadosRPS, assinaturaRPS) {
    try {
      console.log('📄 Montando XML do RPS...');
      
      const dataEmissao = dadosRPS.dataEmissao;
      const dataFatoGerador = dadosRPS.dataFatoGerador || dataEmissao;
      
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PedidoEnvioRPS xmlns="http://www.prefeitura.sp.gov.br/nfe" Versao="1">
  <Cabecalho>
    <CPFCNPJRemetente>
      <CNPJ>${this.cnpj}</CNPJ>
    </CPFCNPJRemetente>
    <Transacao>true</Transacao>
  </Cabecalho>
  <RPS>
    <Assinatura>${assinaturaRPS}</Assinatura>
    <ChaveRPS>
      <InscricaoPrestador>${this.inscricaoMunicipal}</InscricaoPrestador>
      <SerieRPS>${dadosRPS.serieRPS}</SerieRPS>
      <NumeroRPS>${dadosRPS.numeroRPS}</NumeroRPS>
    </ChaveRPS>
    <TipoRPS>RPS</TipoRPS>
    <DataEmissao>${dataEmissao}</DataEmissao>
    <StatusRPS>${dadosRPS.statusRPS || 'N'}</StatusRPS>
    <TributacaoRPS>${dadosRPS.tributacaoRPS || 'T'}</TributacaoRPS>
    <ValorServicos>${dadosRPS.valorServicos.toFixed(2)}</ValorServicos>
    <ValorDeducoes>${(dadosRPS.valorDeducoes || 0).toFixed(2)}</ValorDeducoes>
    <CodigoServico>${dadosRPS.codigoServico}</CodigoServico>
    <AliquotaServicos>${dadosRPS.aliquotaServicos || this.aliquotaServicos}</AliquotaServicos>
    <ISSRetido>${dadosRPS.issRetido ? 'true' : 'false'}</ISSRetido>
    ${dadosRPS.cpfCnpjTomador ? `
    <CPFCNPJTomador>
      ${dadosRPS.cpfCnpjTomador.length === 11 ? `<CPF>${dadosRPS.cpfCnpjTomador}</CPF>` : `<CNPJ>${dadosRPS.cpfCnpjTomador}</CNPJ>`}
    </CPFCNPJTomador>
    ${dadosRPS.inscricaoMunicipalTomador ? `<InscricaoMunicipalTomador>${dadosRPS.inscricaoMunicipalTomador}</InscricaoMunicipalTomador>` : ''}
    ${dadosRPS.razaoSocialTomador ? `<RazaoSocialTomador>${dadosRPS.razaoSocialTomador}</RazaoSocialTomador>` : ''}
    ${dadosRPS.enderecoTomador ? `
    <EnderecoTomador>
      ${dadosRPS.enderecoTomador.logradouro ? `<Logradouro>${dadosRPS.enderecoTomador.logradouro}</Logradouro>` : ''}
      ${dadosRPS.enderecoTomador.numero ? `<NumeroEndereco>${dadosRPS.enderecoTomador.numero}</NumeroEndereco>` : ''}
      ${dadosRPS.enderecoTomador.complemento ? `<ComplementoEndereco>${dadosRPS.enderecoTomador.complemento}</ComplementoEndereco>` : ''}
      ${dadosRPS.enderecoTomador.bairro ? `<Bairro>${dadosRPS.enderecoTomador.bairro}</Bairro>` : ''}
      ${dadosRPS.enderecoTomador.cidade ? `<Cidade>${dadosRPS.enderecoTomador.cidade}</Cidade>` : ''}
      ${dadosRPS.enderecoTomador.uf ? `<UF>${dadosRPS.enderecoTomador.uf}</UF>` : ''}
      ${dadosRPS.enderecoTomador.cep ? `<CEP>${dadosRPS.enderecoTomador.cep}</CEP>` : ''}
    </EnderecoTomador>
    ` : ''}
    ${dadosRPS.emailTomador ? `<EmailTomador>${dadosRPS.emailTomador}</EmailTomador>` : ''}
    ` : ''}
    ${dadosRPS.cpfCnpjIntermediario ? `
    <CPFCNPJIntermediario>
      ${dadosRPS.cpfCnpjIntermediario.length === 11 ? `<CPF>${dadosRPS.cpfCnpjIntermediario}</CPF>` : `<CNPJ>${dadosRPS.cpfCnpjIntermediario}</CNPJ>`}
    </CPFCNPJIntermediario>
    ${dadosRPS.inscricaoMunicipalIntermediario ? `<InscricaoMunicipalIntermediario>${dadosRPS.inscricaoMunicipalIntermediario}</InscricaoMunicipalIntermediario>` : ''}
    <ISSRetidoIntermediario>${dadosRPS.issRetidoIntermediario ? 'true' : 'false'}</ISSRetidoIntermediario>
    ${dadosRPS.emailIntermediario ? `<EmailIntermediario>${dadosRPS.emailIntermediario}</EmailIntermediario>` : ''}
    ` : ''}
    <Discriminacao>${dadosRPS.discriminacao || 'Avaliação psicológica organizacional'}</Discriminacao>
  </RPS>
</PedidoEnvioRPS>`;

      console.log('✅ XML do RPS montado com sucesso');
      return xml;
    } catch (error) {
      console.error('❌ Erro ao montar XML RPS:', error.message);
      throw error;
    }
  }

  /**
   * Assina o XML digitalmente conforme padrão W3C
   */
  assinarXML(xml) {
    try {
      console.log('🔏 Assinando XML digitalmente...');
      
      const signer = new xmlCrypto.SignedXml();
      signer.addReference("//*[local-name()='PedidoEnvioRPS']", ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"], "http://www.w3.org/2000/09/xmldsig#sha1", "", "", "", true);
      
      signer.signingKey = this.chavePrivada;
      signer.keyInfoProvider = {
        getKeyInfo: () => {
          const certPem = forge.pki.certificateToPem(this.certificado);
          return `<X509Data><X509Certificate>${certPem.replace(/-----BEGIN CERTIFICATE-----\n/, '').replace(/\n-----END CERTIFICATE-----/, '').replace(/\n/g, '')}</X509Certificate></X509Data>`;
        }
      };

      const signedXml = signer.getSignedXml(xml);
      console.log('✅ XML assinado digitalmente com sucesso');
      return signedXml;
    } catch (error) {
      console.error('❌ Erro ao assinar XML:', error.message);
      throw error;
    }
  }

  /**
   * Envia RPS para a Prefeitura via Web Service
   */
  async enviarRPS(dadosRPS) {
    try {
      console.log('🚀 Enviando RPS para Prefeitura de São Paulo...');
      
      // Carregar certificado
      await this.carregarCertificado();
      
      // Criar assinatura especial do RPS
      const assinaturaRPS = this.criarAssinaturaRPS(dadosRPS);
      
      // Montar XML
      const xmlRPS = this.montarXMLRPS(dadosRPS, assinaturaRPS);
      
      // Assinar XML digitalmente
      const xmlAssinado = this.assinarXML(xmlRPS);
      
      // Criar cliente SOAP
      const client = await soap.createClientAsync(this.wsdlUrl, {
        wsdl_options: {
          timeout: 30000,
          rejectUnauthorized: false
        }
      });

      // Configurar certificado para autenticação SSL
      client.setSecurity(new soap.ClientSSLSecurityPFX(
        this.certificadoPath,
        this.certificadoSenha
      ));

      // Enviar RPS
      const resultado = await client.EnvioRPSAsync({
        VersaoSchema: 1,
        MensagemXML: xmlAssinado
      });

      console.log('✅ RPS enviado com sucesso');
      return this.processarResposta(resultado);
      
    } catch (error) {
      console.error('❌ Erro ao enviar RPS:', error.message);
      throw error;
    }
  }

  /**
   * Processa resposta da Prefeitura
   */
  processarResposta(resultado) {
    try {
      console.log('📊 Processando resposta da Prefeitura...');
      
      const parser = new xml2js.Parser();
      let xmlResposta;
      
      if (typeof resultado === 'string') {
        xmlResposta = resultado;
      } else if (resultado.EnvioRPSResult) {
        xmlResposta = resultado.EnvioRPSResult;
      } else {
        throw new Error('Formato de resposta não reconhecido');
      }

      return new Promise((resolve, reject) => {
        parser.parseString(xmlResposta, (err, result) => {
          if (err) {
            reject(err);
            return;
          }

          try {
            const retorno = result.RetornoEnvioRPS || result;
            const sucesso = retorno.Cabecalho[0].Sucesso[0] === 'true';
            
            if (sucesso) {
              const chaveNFe = retorno.ChaveNFeRPS[0];
              resolve({
                sucesso: true,
                numeroNfsE: chaveNFe.ChaveNFe[0].Numero[0],
                codigoVerificacao: chaveNFe.ChaveNFe[0].CodigoVerificacao[0],
                link: `https://nfe.prefeitura.sp.gov.br/contribuinte/consultas.aspx`
              });
            } else {
              const erros = retorno.Erro || [];
              const alertas = retorno.Alerta || [];
              
              resolve({
                sucesso: false,
                erros: erros.map(erro => ({
                  codigo: erro.Codigo[0],
                  descricao: erro.Descricao[0]
                })),
                alertas: alertas.map(alerta => ({
                  codigo: alerta.Codigo[0],
                  descricao: alerta.Descricao[0]
                }))
              });
            }
          } catch (parseError) {
            reject(parseError);
          }
        });
      });
    } catch (error) {
      console.error('❌ Erro ao processar resposta:', error.message);
      throw error;
    }
  }

  /**
   * Testa conexão com Web Service
   */
  async testarConexao() {
    try {
      console.log('🧪 Testando conexão com Web Service...');
      
      const client = await soap.createClientAsync(this.wsdlUrl, {
        wsdl_options: {
          timeout: 10000,
          rejectUnauthorized: false
        }
      });

      console.log('✅ Conexão com Web Service estabelecida');
      return {
        sucesso: true,
        message: 'Conexão com Web Service da Prefeitura de São Paulo estabelecida com sucesso'
      };
    } catch (error) {
      console.error('❌ Erro na conexão:', error.message);
      return {
        sucesso: false,
        message: `Erro na conexão: ${error.message}`
      };
    }
  }

  /**
   * Emite NFS-e real
   */
  async emitirNfsE(dadosPaciente) {
    try {
      console.log('📋 Emitindo NFS-e real via Web Service...');
      
      // Preparar dados do RPS
      const dadosRPS = {
        serieRPS: this.serieRPS,
        numeroRPS: Date.now().toString(), // Número único
        dataEmissao: new Date().toISOString().split('T')[0],
        dataFatoGerador: new Date().toISOString().split('T')[0],
        statusRPS: 'N',
        tributacaoRPS: 'T',
        valorServicos: dadosPaciente.valor || 0.50,
        valorDeducoes: 0,
        codigoServico: this.codigoServico,
        aliquotaServicos: this.aliquotaServicos,
        issRetido: false,
        cpfCnpjTomador: dadosPaciente.cpf,
        razaoSocialTomador: dadosPaciente.nome,
        emailTomador: dadosPaciente.email,
        discriminacao: 'Avaliação psicológica organizacional'
      };

      // Enviar RPS
      const resultado = await this.enviarRPS(dadosRPS);
      
      if (resultado.sucesso) {
        console.log('✅ NFS-e emitida com sucesso!');
        return resultado;
      } else {
        console.log('❌ Erro na emissão da NFS-e:', resultado.erros);
        throw new Error(`Erro na emissão: ${resultado.erros.map(e => e.descricao).join(', ')}`);
      }
    } catch (error) {
      console.error('❌ Erro ao emitir NFS-e:', error.message);
      throw error;
    }
  }
}

module.exports = NfsEServiceWebServiceReal;
