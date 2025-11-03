const axios = require('axios');

class NfsEService {
  constructor(config) {
    this.apiUrl = config.apiUrl;
    this.usuario = config.usuario;
    this.senha = config.senha;
    this.codigoServico = config.codigoServico || '05118';
    this.discriminacao = config.discriminacao || 'Avaliação Psicológica para Habilitação de Veículos';
  }

  /**
   * Autentica na API de NFS-e
   */
  async autenticar() {
    try {
      console.log('🔐 Autenticando na API NFS-e...');
      
      const response = await axios.post(`${this.apiUrl}/auth`, {
        usuario: this.usuario,
        senha: this.senha
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.token) {
        this.token = response.data.token;
        console.log('✅ Autenticação realizada com sucesso!');
        return true;
      } else {
        throw new Error('Token não recebido da API');
      }
    } catch (error) {
      console.error('❌ Erro na autenticação NFS-e:', error.message);
      throw new Error(`Falha na autenticação: ${error.message}`);
    }
  }

  /**
   * Emite uma NFS-e
   */
  async emitirNfsE(dadosPaciente, valor, observacoes = '') {
    try {
      console.log('📄 Emitindo NFS-e...');
      
      // Verificar se está autenticado
      if (!this.token) {
        await this.autenticar();
      }

      // Preparar dados da NFS-e
      const dadosNfsE = {
        tomador: {
          cpf: dadosPaciente.cpf.replace(/\D/g, ''), // Remove formatação
          nome: dadosPaciente.nome,
          email: dadosPaciente.email || '',
          endereco: {
            cep: dadosPaciente.cep || '',
            logradouro: dadosPaciente.logradouro || dadosPaciente.endereco || '',
            numero: dadosPaciente.numero_endereco || dadosPaciente.numero || '',
            complemento: dadosPaciente.complemento || '',
            bairro: dadosPaciente.bairro || '',
            municipio: dadosPaciente.municipio || '',
            uf: dadosPaciente.uf || 'SP'
          }
        },
        servico: {
          codigo: this.codigoServico,
          discriminacao: this.discriminacao,
          valor: parseFloat(valor)
        },
        observacoes: observacoes
      };

      console.log('📋 Dados da NFS-e:', JSON.stringify(dadosNfsE, null, 2));

      // Emitir NFS-e
      const response = await axios.post(`${this.apiUrl}/nfs-e/emitir`, dadosNfsE, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data && response.data.numero_nfs_e) {
        console.log('✅ NFS-e emitida com sucesso!');
        return {
          success: true,
          numero_nfs_e: response.data.numero_nfs_e,
          codigo_verificacao: response.data.codigo_verificacao,
          link_visualizacao: response.data.link_visualizacao,
          xml: response.data.xml,
          data_emissao: new Date()
        };
      } else {
        throw new Error('Resposta inválida da API');
      }

    } catch (error) {
      console.error('❌ Erro ao emitir NFS-e:', error.message);
      throw new Error(`Falha na emissão: ${error.message}`);
    }
  }

  /**
   * Consulta status de uma NFS-e
   */
  async consultarStatus(numeroNfsE) {
    try {
      if (!this.token) {
        await this.autenticar();
      }

      const response = await axios.get(`${this.apiUrl}/nfs-e/status/${numeroNfsE}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('❌ Erro ao consultar status NFS-e:', error.message);
      throw error;
    }
  }

  /**
   * Cancela uma NFS-e
   */
  async cancelarNfsE(numeroNfsE, motivo = 'Cancelamento solicitado pelo contribuinte') {
    try {
      if (!this.token) {
        await this.autenticar();
      }

      const response = await axios.post(`${this.apiUrl}/nfs-e/cancelar`, {
        numero_nfs_e: numeroNfsE,
        motivo: motivo
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('❌ Erro ao cancelar NFS-e:', error.message);
      throw error;
    }
  }

  /**
   * Testa a conexão com a API
   */
  async testarConexao() {
    try {
      console.log('🔍 Testando conexão com API NFS-e...');
      
      await this.autenticar();
      
      // Tentar uma consulta simples
      const response = await axios.get(`${this.apiUrl}/status`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        timeout: 5000
      });

      return {
        success: true,
        message: 'Conexão com API estabelecida com sucesso!',
        status: response.data
      };
    } catch (error) {
      console.error('❌ Erro no teste de conexão:', error.message);
      return {
        success: false,
        message: `Falha na conexão: ${error.message}`
      };
    }
  }
}

module.exports = NfsEService;



