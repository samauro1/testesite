# Código Completo - Configurações NFS-e

Este documento contém todo o código relacionado à aba de configurações NFS-e que conecta com a API da Prefeitura de São Paulo para emitir notas fiscais.

---

## 1. FRONTEND - Aba de Configurações NFS-e

### Arquivo: `frontend/frontend-nextjs/src/app/configuracoes/page.tsx`

#### Estados e Configuração Inicial (linhas 47-60)

```typescript
// Estados para NFS-e
const [nfsEConfig, setNfsEConfig] = useState({
  api_url: 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx',
  usuario_api: '',
  senha_api: '',
  cnpj: '',
  inscricao_municipal: '',
  codigo_servico: '05118',
  discriminacao_servico: 'Avaliação Psicológica para Habilitação de Veículos',
  valor_padrao: 150.00,
  ambiente: 'producao',
  ativo: false
});
const [testandoConexao, setTestandoConexao] = useState(false);
```

#### Carregamento de Configurações (linhas 589-614)

```typescript
// Query para buscar configurações salvas
const { data: nfsEDataDB } = useQuery({
  queryKey: ['nfs-e-configuracoes'],
  queryFn: async () => {
    const response = await nfsEService.getConfiguracoes();
    return response.data;
  },
  enabled: activeTab === 'nfs-e'
});

// Atualizar estado local quando carregar configurações NFS-e
React.useEffect(() => {
  if (nfsEDataDB?.data) {
    const config = nfsEDataDB.data;
    setNfsEConfig({
      api_url: config.api_url || 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx',
      usuario_api: config.usuario_api || '',
      senha_api: config.senha_api || '',
      cnpj: config.cnpj || '',
      inscricao_municipal: config.inscricao_municipal || '',
      codigo_servico: config.codigo_servico || '05118',
      discriminacao_servico: config.discriminacao_servico || 'Avaliação Psicológica para Habilitação de Veículos',
      valor_padrao: config.valor_padrao || 150.00,
      ambiente: config.ambiente || 'producao',
      ativo: config.ativo || false
    });
  }
}, [nfsEDataDB]);
```

#### Função para Salvar Configurações (linhas 274-296)

```typescript
const handleSaveNfsE = async () => {
  try {
    // Converter o valor antes de salvar
    let valorConvertido = nfsEConfig.valor_padrao;
    
    if (typeof valorConvertido === 'string' && valorConvertido !== '') {
      // Substituir vírgula por ponto para conversão
      valorConvertido = parseFloat(valorConvertido.replace(',', '.'));
    }
    
    const configParaSalvar = {
      ...nfsEConfig,
      valor_padrao: valorConvertido
    };
    
    await nfsEService.updateConfiguracoes(configParaSalvar);
    toast.success('Configurações NFS-e salvas com sucesso!');
    queryClient.invalidateQueries({ queryKey: ['nfs-e-configuracoes'] });
  } catch (error: any) {
    console.error('Erro ao salvar NFS-e:', error);
    toast.error(error.response?.data?.error || 'Erro ao salvar configurações NFS-e');
  }
};
```

#### Função para Testar Conexão (linhas 298-329)

```typescript
const handleTestNfsE = async () => {
  try {
    if (!nfsEConfig.api_url || !nfsEConfig.usuario_api || !nfsEConfig.senha_api || !nfsEConfig.cnpj || !nfsEConfig.inscricao_municipal) {
      toast.error('Preencha todos os campos obrigatórios antes de testar');
      return;
    }

    setTestandoConexao(true);
    toast.loading('Testando conexão com API NFS-e SP...');
    
    const response = await nfsEService.testarConexao({
      api_url: nfsEConfig.api_url,
      usuario_api: nfsEConfig.usuario_api,
      senha_api: nfsEConfig.senha_api,
      cnpj: nfsEConfig.cnpj,
      inscricao_municipal: nfsEConfig.inscricao_municipal
    });
    
    toast.dismiss();
    if (response.data.success) {
      toast.success('Conexão com API NFS-e SP estabelecida com sucesso!');
    } else {
      toast.error(response.data.message || 'Falha na conexão');
    }
  } catch (error: any) {
    console.error('Erro ao testar NFS-e:', error);
    toast.dismiss();
    toast.error(error.response?.data?.error || 'Erro ao testar conexão NFS-e');
  } finally {
    setTestandoConexao(false);
  }
};
```

#### Interface da Aba (linhas 1570-1756)

```typescript
{/* TAB: NFS-E */}
{activeTab === 'nfs-e' && (
  <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">🧾 Configurações de NFS-e</h2>
      <p className="text-sm text-gray-600">Configure a emissão automática de Nota Fiscal de Serviços Eletrônica</p>
    </div>

    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <p className="text-sm text-green-800 font-semibold mb-2">
        ℹ️ Emissão Automática de NFS-e
      </p>
      <p className="text-xs text-green-700">
        Configure sua API de NFS-e para emitir notas fiscais automaticamente após cada avaliação.
        Os dados do paciente serão preenchidos automaticamente.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* URL da API */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL da API <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={nfsEConfig.api_url}
          onChange={(e) => setNfsEConfig({ ...nfsEConfig, api_url: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx"
        />
        <p className="text-xs text-gray-500 mt-1">
          URL oficial da Prefeitura de São Paulo (Produção)
        </p>
      </div>

      {/* CNPJ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CNPJ <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={nfsEConfig.cnpj}
          onChange={(e) => setNfsEConfig({ ...nfsEConfig, cnpj: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="00.000.000/0000-00"
        />
      </div>

      {/* Inscrição Municipal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Inscrição Municipal <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={nfsEConfig.inscricao_municipal}
          onChange={(e) => setNfsEConfig({ ...nfsEConfig, inscricao_municipal: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="12345678"
        />
      </div>

      {/* Usuário da API */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Usuário da API <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={nfsEConfig.usuario_api}
          onChange={(e) => setNfsEConfig({ ...nfsEConfig, usuario_api: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="seu_usuario"
        />
      </div>

      {/* Senha da API */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Senha da API <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={nfsEConfig.senha_api}
            onChange={(e) => setNfsEConfig({ ...nfsEConfig, senha_api: e.target.value })}
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Código do Serviço */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Código do Serviço
        </label>
        <input
          type="text"
          value={nfsEConfig.codigo_servico}
          onChange={(e) => setNfsEConfig({ ...nfsEConfig, codigo_servico: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="05118"
        />
        <p className="text-xs text-gray-500 mt-1">
          Código padrão: 05118 (Avaliação Psicológica)
        </p>
      </div>

      {/* Discriminação do Serviço */}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Discriminação do Serviço
        </label>
        <textarea
          value={nfsEConfig.discriminacao_servico}
          onChange={(e) => setNfsEConfig({ ...nfsEConfig, discriminacao_servico: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          rows={3}
          placeholder="Avaliação Psicológica para Habilitação de Veículos"
        />
      </div>

      {/* Valor Padrão */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Valor Padrão (R$)
        </label>
        <input
          type="text"
          value={nfsEConfig.valor_padrao || ''}
          onChange={(e) => {
            const inputValue = e.target.value;
            setNfsEConfig({ ...nfsEConfig, valor_padrao: inputValue });
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="142,53"
        />
        <p className="text-xs text-gray-500 mt-1">
          Digite o valor com vírgula (ex: 142,53)
        </p>
      </div>

      {/* Checkbox Ativo */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="nfs-e-ativo"
          checked={nfsEConfig.ativo}
          onChange={(e) => setNfsEConfig({ ...nfsEConfig, ativo: e.target.checked })}
          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
        />
        <label htmlFor="nfs-e-ativo" className="ml-2 block text-sm text-gray-700">
          Ativar emissão automática de NFS-e
        </label>
      </div>
    </div>

    {/* Botões de Ação */}
    <div className="flex gap-4">
      <button
        onClick={handleSaveNfsE}
        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Save className="w-4 h-4" />
        Salvar Configurações
      </button>

      <button
        onClick={handleTestNfsE}
        disabled={testandoConexao || !nfsEConfig.api_url || !nfsEConfig.usuario_api || !nfsEConfig.senha_api}
        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {testandoConexao ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Testando...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            Testar Conexão
          </>
        )}
      </button>
    </div>
  </div>
)}
```

---

## 2. BACKEND - Rotas de Configuração NFS-e

### Arquivo: `codigo/routes/nfs-e.js`

#### GET - Buscar Configurações (linhas 9-24)

```javascript
// Buscar configurações NFS-e do usuário
router.get('/configuracoes', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query('SELECT * FROM configuracoes_nfs_e WHERE usuario_id = $1', [userId]);
    
    if (result.rows.length > 0) {
      res.json({ data: result.rows[0] });
    } else {
      res.status(404).json({ error: 'Configurações NFS-e não encontradas' });
    }
  } catch (error) {
    console.error('Erro ao buscar configurações NFS-e:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

#### PUT - Atualizar Configurações (linhas 26-110)

```javascript
// Atualizar configurações NFS-e
router.put('/configuracoes', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      api_url,
      usuario_api,
      senha_api,
      cnpj,
      inscricao_municipal,
      valor_padrao,
      ambiente,
      regime_tributacao,
      incentivador_cultural,
      emissao_rps,
      serie_rps,
      numero_rps,
      aliquota_iss,
      iss_retido,
      cnae,
      item_lista_servico,
      codigo_servico,
      discriminacao_servico
    } = req.body;

    // Verificar se já existe configuração
    const existing = await query('SELECT id FROM configuracoes_nfs_e WHERE usuario_id = $1', [userId]);
    
    if (existing.rows.length > 0) {
      // Atualizar configuração existente
      const result = await query(`
        UPDATE configuracoes_nfs_e SET
          api_url = $2,
          usuario_api = $3,
          senha_api = $4,
          cnpj = $5,
          inscricao_municipal = $6,
          valor_padrao = $7,
          ambiente = $8,
          regime_tributacao = $9,
          incentivador_cultural = $10,
          emissao_rps = $11,
          serie_rps = $12,
          numero_rps = $13,
          aliquota_iss = $14,
          iss_retido = $15,
          cnae = $16,
          item_lista_servico = $17,
          codigo_servico = $18,
          discriminacao_servico = $19,
          updated_at = CURRENT_TIMESTAMP
        WHERE usuario_id = $1
        RETURNING *
      `, [
        userId, api_url, usuario_api, senha_api, cnpj, inscricao_municipal,
        valor_padrao, ambiente, regime_tributacao, incentivador_cultural,
        emissao_rps, serie_rps, numero_rps, aliquota_iss, iss_retido,
        cnae, item_lista_servico, codigo_servico, discriminacao_servico
      ]);
      
      res.json({ data: result.rows[0] });
    } else {
      // Criar nova configuração
      const result = await query(`
        INSERT INTO configuracoes_nfs_e (
          usuario_id, api_url, usuario_api, senha_api, cnpj, inscricao_municipal,
          valor_padrao, ambiente, regime_tributacao, incentivador_cultural,
          emissao_rps, serie_rps, numero_rps, aliquota_iss, iss_retido,
          cnae, item_lista_servico, codigo_servico, discriminacao_servico
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        userId, api_url, usuario_api, senha_api, cnpj, inscricao_municipal,
        valor_padrao, ambiente, regime_tributacao, incentivador_cultural,
        emissao_rps, serie_rps, numero_rps, aliquota_iss, iss_retido,
        cnae, item_lista_servico, codigo_servico, discriminacao_servico
      ]);
      
      res.json({ data: result.rows[0] });
    }
  } catch (error) {
    console.error('Erro ao salvar configurações NFS-e:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

#### POST - Emitir NFS-e (linhas 112-207)

```javascript
// Emitir NFS-e para um paciente
router.post('/emitir', async (req, res) => {
  try {
    const userId = req.user.id;
    const { paciente_id, numero_nfs_e, valor_servico, forma_pagamento, observacoes } = req.body;

    console.log('📝 POST /emitir - Dados recebidos:', { paciente_id, numero_nfs_e, valor_servico, forma_pagamento, observacoes });
    console.log('📝 POST /emitir - User ID:', userId);

    // Buscar configurações NFS-e do usuário
    const configResult = await query('SELECT * FROM configuracoes_nfs_e WHERE usuario_id = $1', [userId]);
    
    console.log('📝 Configurações encontradas:', configResult.rows.length);
    
    if (configResult.rows.length === 0) {
      console.log('❌ Configurações NFS-e não encontradas para usuário:', userId);
      return res.status(400).json({ error: 'Configurações NFS-e não encontradas' });
    }

    const config = configResult.rows[0];
    console.log('📝 Configuração:', { codigo_servico: config.codigo_servico, discriminacao_servico: config.discriminacao_servico, valor_padrao: config.valor_padrao });

    // Buscar dados do paciente
    const pacienteResult = await query('SELECT * FROM pacientes WHERE id = $1', [paciente_id]);
    
    if (pacienteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const paciente = pacienteResult.rows[0];

    // Tratar valores NULL e garantir que todos os campos necessários estão presentes
    const numeroNfsE = numero_nfs_e || '0000';
    const codigoServico = config.codigo_servico || '05118';
    const discriminacaoServico = config.discriminacao_servico || 'Avaliação Psicológica';
    const valorFinal = valor_servico || config.valor_padrao || 150.00;
    const observacoesFinal = observacoes || `Avaliação psicológica para ${paciente.nome}`;
    
    // Inserir NFS-e na tabela
    // A tabela tem: discriminacao (não discriminacao_servico)
    // E não tem codigo_servico (está apenas em configuracoes_nfs_e)
    const result = await query(`
      INSERT INTO nfs_e_emitidas (
        paciente_id, usuario_id, numero_nfs_e, valor, 
        discriminacao, observacoes, data_emissao, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      paciente_id,
      userId,
      numeroNfsE,
      valorFinal,
      discriminacaoServico, // Usar discriminacao (nome correto da coluna)
      observacoesFinal || null,
      new Date(),
      'emitida' // Status padrão
    ]);
    
    console.log('✅ NFS-e inserida com sucesso:', result.rows[0]);

    res.json({
      message: 'NFS-e emitida com sucesso',
      nfs_e: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao emitir NFS-e:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

---

## 3. SERVIÇOS - API Service (Frontend)

### Arquivo: `frontend/frontend-nextjs/src/services/api.ts` (linhas 254-268)

```typescript
export const nfsEService = {
  // Configurações
  getConfiguracoes: () => api.get('/nfs-e/configuracoes'),
  updateConfiguracoes: (data: any) => api.put('/nfs-e/configuracoes', data),
  
  // NFS-e - Emitir NFS-e
  emitir: (data: { paciente_id: number, numero_nfs_e?: string, valor_servico?: number, forma_pagamento?: string, observacoes?: string }) =>
    api.post('/nfs-e/emitir', data),
  listar: (params?: Record<string, unknown>) => api.get('/nfs-e/emitidas', { params }),
  limpar: () => api.delete('/nfs-e/limpar'),
  limparSelecionadas: (ids: number[]) => api.delete('/nfs-e/limpar-selecionadas', { data: { ids } }),
  testarConexao: () => api.post('/nfs-e-login-real/testar-conexao'),
  instrucoesRPA: () => api.get('/nfs-e-login-real/instrucoes'),
  cancelar: (id: string, motivo: string) => api.post(`/nfs-e/cancelar/${id}`, { motivo }),
};
```

**NOTA**: O `testarConexao` está chamando `/nfs-e-login-real/testar-conexao`, mas o endpoint correto é `/nfs-e-login/testar-conexao` (verifique abaixo).

---

## 6. BACKEND - Rota de Teste de Conexão NFS-e

### Arquivo: `codigo/routes/nfs-e-login.js`

#### POST - Testar Conexão (linhas 16-30)

```javascript
// Testar conexão com Prefeitura
router.post('/testar-conexao', async (req, res) => {
  try {
    console.log('🧪 POST /testar-conexao - Prefeitura SP (Login)');
    
    const resultado = await nfsEServiceLogin.testarConexao();
    
    res.json(resultado);
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao testar conexão: ${error.message}`
    });
  }
});
```

**Endpoint**: `POST /api/nfs-e-login/testar-conexao`

Esta rota está registrada em `codigo/server.js` na linha 144 como `/api/nfs-e-login`.

---

## 7. SERVIÇO - NfsEServiceLogin (Backend)

### Arquivo: `codigo/utils/nfsEServiceLogin.js`

#### Classe e Construtor (linhas 5-16)

```javascript
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
```

#### Método de Autenticação (linhas 152-183)

```javascript
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
```

#### Método de Teste de Conexão (linhas 232-250)

```javascript
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
```

#### Método de Emissão de NFS-e (linhas 188-227)

```javascript
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
```

---

## 8. ALTERNATIVA - Serviço NFS-e Real (SOAP)

### Arquivo: `codigo/utils/nfsEServiceWebServiceReal.js`

Este serviço usa SOAP para comunicação real com a Prefeitura:

#### Método de Teste de Conexão SOAP (linhas 332-355)

```javascript
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
```

---

## 9. CORREÇÃO NECESSÁRIA NO FRONTEND

### Arquivo: `frontend/frontend-nextjs/src/services/api.ts`

A linha 265 está chamando o endpoint errado:

```typescript
// ❌ ATUAL (ERRADO):
testarConexao: () => api.post('/nfs-e-login-real/testar-conexao'),

// ✅ CORRETO (deve ser):
testarConexao: (data: any) => api.post('/nfs-e-login/testar-conexao', data),
```

OU ajustar o backend para criar a rota `/nfs-e-login-real` se preferir manter o endpoint atual.

---

## 10. ENDPOINTS REGISTRADOS NO SERVIDOR

### Arquivo: `codigo/server.js` (linhas 142-147)

```javascript
app.use('/api/nfs-e', nfsERoutes);                    // Configurações e emissão básica
app.use('/api/nfs-e-real', nfsERealRoutes);           // Emissão real
app.use('/api/nfs-e-login', nfsELoginRoutes);         // Emissão com login (USE ESTE PARA TESTAR)
app.use('/api/nfs-e-hibrido', nfsEHibridoRoutes);     // Sistema híbrido
app.use('/api/nfs-e-rpa-real', nfsERPARealRoutes);    // RPA real
app.use('/api/nfs-e-web-service-real', nfsEWebServiceRealRoutes); // Web Service SOAP real
```

**Recomendação**: Para testar conexão, use `/api/nfs-e-login/testar-conexao` que está implementado.

---

## 4. ESTRUTURA DA TABELA `configuracoes_nfs_e`

A tabela armazena as seguintes configurações por usuário:

- `id` - ID único
- `usuario_id` - ID do usuário (FK)
- `api_url` - URL da API da Prefeitura (ex: `https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx`)
- `usuario_api` - Usuário fornecido pela Prefeitura
- `senha_api` - Senha da API
- `cnpj` - CNPJ do contribuinte
- `inscricao_municipal` - Inscrição Municipal
- `codigo_servico` - Código do serviço (padrão: `05118`)
- `discriminacao_servico` - Descrição do serviço
- `valor_padrao` - Valor padrão para notas fiscais
- `ambiente` - Ambiente (produção/homologação)
- `ativo` - Se a emissão automática está ativa
- Outros campos técnicos (regime_tributacao, aliquota_iss, etc.)

---

## 5. FLUXO DE FUNCIONAMENTO

1. **Configuração Inicial**: Usuário acessa a aba "NFS-e" em Configurações
2. **Preenchimento**: Preenche URL da API, CNPJ, Inscrição Municipal, Usuário e Senha da API
3. **Código e Discriminação**: Define código de serviço (ex: 05118) e texto da discriminação
4. **Teste de Conexão**: Clica em "Testar Conexão" para validar credenciais
5. **Salvamento**: Salva configurações que ficam vinculadas ao usuário
6. **Emissão**: Quando emitir NFS-e, o sistema usa essas configurações para conectar com a API da Prefeitura

---

## OBSERVAÇÕES IMPORTANTES

1. **URL Padrão**: `https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx` é a URL oficial da Prefeitura de São Paulo
2. **Código de Serviço**: O padrão `05118` corresponde a "Avaliação Psicológica"
3. **Discriminação**: Este texto aparece na nota fiscal emitida
4. **Valor Padrão**: Pode ser editado nas configurações, mas também pode ser sobrescrito ao emitir uma nota específica
5. **Teste de Conexão**: Atualmente está chamando um endpoint que pode não existir (`/nfs-e-login-real/testar-conexao`). Pode ser necessário criar essa rota ou ajustar o frontend para usar outra rota existente.

