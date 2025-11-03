const soap = require('soap');
const crypto = require('crypto');
const forge = require('node-forge');
const xmlCrypto = require('xml-crypto');
const { DOMParser } = require('xmldom');
const fs = require('fs');
const path = require('path');

class NfsEServiceReal {
  constructor(config = {}) {
    this.wsdlUrl = 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx?WSDL';
    this.certificadoPath = config.certificadoPath || './certificado.pfx';
    this.certificadoSenha = config.certificadoSenha || '';
    this.cnpj = config.cnpj || '';
    this.inscricaoMunicipal = config.inscricaoMunicipal || '';
    this.serieRPS = config.serieRPS || 'NF';
    this.codigoServico = '03417'; // Código para serviços de psicologia
    this.aliquota = 0.05; // 5% para serviços de psicologia
    this.tributacao = 'T'; // Tributado em São Paulo
  }

  /**
   * Carrega o certificado digital
   */
  async carregarCertificado() {
    try {
      console.log('📜 Carregando certificado digital...');
      
      if (!fs.existsSync(this.certificadoPath)) {
        throw new Error('Certificado digital não encontrado. Configure o caminho correto.');
      }

      const pfxData = fs.readFileSync(this.certificadoPath);
      const pfx = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(pfxData), this.certificadoSenha);
      
      // Extrair certificado e chave privada
      const bags = pfx.getBags({ bagType: forge.pki.oids.certBag });
      const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      
      if (bags[forge.pki.oids.certBag] && bags[forge.pki.oids.certBag].length > 0) {
        this.certificado = bags[forge.pki.oids.certBag][0].cert;
      }
      
      if (keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] && keyBags[forge.pki.oids.pkcs8ShroudedKeyBag].length > 0) {
        this.chavePrivada = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
      }

      console.log('✅ Certificado carregado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao carregar certificado:', error.message);
      throw error;
    }
  }

  /**
   * Cria a assinatura especial RPS (86 caracteres)
   */
  criarAssinaturaRPS(dadosRPS) {
    try {
      console.log('🔐 Criando assinatura especial RPS...');
      
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

      // Assinar com RSA-SHA1
      const md = forge.md.sha1.create();
      md.update(stringAssinatura, 'utf8');
      const signature = this.chavePrivada.sign(md);
      const assinaturaBase64 = forge.util.encode64(signature);

      console.log('✅ Assinatura RPS criada');
      return assinaturaBase64;
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
      console.log('📄 Montando XML do RPS...');
      
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

      console.log('✅ XML do RPS montado');
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
   * Assina o XML digitalmente
   */
  assinarXML(xml) {
    try {
      console.log('🔐 Assinando XML digitalmente...');
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      
      // Configurar assinatura XML
      const sig = new xmlCrypto.SignedXml();
      sig.addReference("//*[local-name()='RPS']", ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'], 'http://www.w3.org/2000/09/xmldsig#sha1', '', '', '', true);
      sig.signingKey = this.chavePrivada;
      sig.keyInfoProvider = {
        getKeyInfo: () => {
          const certPem = forge.pki.certificateToPem(this.certificado);
          return `<X509Data><X509Certificate>${certPem.replace(/-----BEGIN CERTIFICATE-----\r?\n?/, '').replace(/\r?\n?-----END CERTIFICATE-----/, '').replace(/\r?\n/g, '')}</X509Certificate></X509Data>`;
        }
      };
      
      sig.computeSignature(xml);
      const xmlAssinado = sig.getSignedXml();
      
      console.log('✅ XML assinado digitalmente');
      return xmlAssinado;
    } catch (error) {
      console.error('❌ Erro ao assinar XML:', error.message);
      throw error;
    }
  }

  /**
   * Emite NFS-e via Web Service da Prefeitura
   */
  async emitirNfsE(dadosRPS) {
    try {
      console.log('🧾 Emitindo NFS-e via Web Service da Prefeitura...');
      
      // Carregar certificado se ainda não foi carregado
      if (!this.certificado || !this.chavePrivada) {
        await this.carregarCertificado();
      }

      // Montar XML
      const xmlRPS = this.montarXMLRPS(dadosRPS);
      
      // Assinar XML
      const xmlAssinado = this.assinarXML(xmlRPS);
      
      console.log('📄 XML assinado:', xmlAssinado.substring(0, 200) + '...');

      // Conectar ao Web Service
      const client = await soap.createClientAsync(this.wsdlUrl, {
        wsdl_options: {
          rejectUnauthorized: false // Para desenvolvimento
        }
      });

      // Enviar RPS
      const resultado = await client.EnvioRPSAsync({
        PedidoEnvioRPS: xmlAssinado
      });

      console.log('📊 Resposta da Prefeitura:', resultado);

      // Processar resposta
      if (resultado && resultado.EnvioRPSResult) {
        const resposta = resultado.EnvioRPSResult;
        
        if (resposta.Sucesso === 'true') {
          return {
            success: true,
            message: 'NFS-e emitida com sucesso!',
            numeroNfsE: resposta.NumeroNFe,
            codigoVerificacao: resposta.CodigoVerificacao,
            linkVisualizacao: resposta.Link,
            dataEmissao: new Date().toISOString()
          };
        } else {
          throw new Error(`Erro na Prefeitura: ${resposta.MensagemRetorno || 'Erro desconhecido'}`);
        }
      } else {
        throw new Error('Resposta inválida da Prefeitura');
      }

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
      console.log('🧪 Testando conexão com Prefeitura de São Paulo...');
      
      const client = await soap.createClientAsync(this.wsdlUrl, {
        wsdl_options: {
          rejectUnauthorized: false
        }
      });

      console.log('✅ Conexão estabelecida com sucesso');
      return {
        success: true,
        message: 'Conexão com Prefeitura estabelecida'
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

module.exports = NfsEServiceReal;
