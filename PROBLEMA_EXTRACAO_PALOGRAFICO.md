# Problema: Extração de Dados do Palográfico por IA

## Descrição do Problema

O sistema está fazendo upload de imagem do teste Palográfico, mas:
1. A análise retorna dados vazios `{}` ou dados incorretos
2. A confiança está em 32% quando deveria estar em 95%+
3. Continua aparecendo mensagem de erro pedindo para preencher manualmente os dados
4. Os dados não estão sendo preenchidos automaticamente no formulário

## Dados Esperados da Imagem

A imagem contém:
- **Tempos (5 minutos)**: 80, 78, 83, 84, 83
- **Total/Produtividade**: 408
- **NOR**: 2.15 ou 2.45

## Arquivos Relevantes

### 1. Backend - Extração de Dados (aiAnalyzer.js)

```javascript
// desenvolvimento-modulo-testes/backend/utils/aiAnalyzer.js

// Função principal de análise
async function analisarImagemTeste(imagemPath, testType) {
  // 1. OCR com Tesseract
  const ocrResult = await extrairTextoOCR(imagemPath);
  
  // 2. Extrair dados numéricos
  const dadosExtraidos = extrairDados(ocrResult, visionResult, testType);
  
  // 3. Calcular confiança
  const confiancaIA = calcularConfianca(ocrResult, visionResult, dadosExtraidos);
  
  return {
    dadosExtraidos,
    confiancaIA,
    ocr_extracted_text: ocrResult.text
  };
}

// Função de extração específica para Palográfico
function extrairDados(ocrResult, visionResult, testType) {
  const texto = ocrResult.text || '';
  const numeros = texto.match(/\d+/g) || [];
  
  if (testType === 'palografico') {
    // Buscar 5 tempos na faixa 50-200
    // Buscar total (300-600, próximo de 400)
    // Buscar NOR (0.1-50, formato decimal)
    
    // PROBLEMA: Os padrões não estão encontrando os dados
    // Os números podem estar em formato de tabela ou com espaçamento específico
  }
}
```

### 2. Backend - Rota de Análise (palografico.js)

```javascript
// desenvolvimento-modulo-testes/backend/routes/palografico.js

router.post('/analisar-ia', upload.single('imagem'), async (req, res) => {
  const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  const analiseResult = await analisarImagemTeste(base64Image, 'palografico');
  const dadosExtraidos = analiseResult.dadosExtraidos || {};
  
  // Se tem dados suficientes, calcular resultado
  if (dadosExtraidos.tempos || dadosExtraidos.produtividade) {
    const resultado = await calcularPalografico(null, {
      ...dadosExtraidos,
      regiao, sexo, escolaridade, idade, contexto
    });
    res.json({ success: true, data: resultado, analise_ia: {...} });
  } else {
    // PROBLEMA: Sempre cai aqui porque dadosExtraidos está vazio
    res.json({ success: false, message: '...', analise_ia: {...} });
  }
});
```

### 3. Frontend - Processamento da Resposta (testes.html)

```javascript
// desenvolvimento-modulo-testes/backend/public/testes.html

// Quando recebe resposta da análise
const analiseData = await response.json();
const dadosExtraidos = analiseData.analise_ia?.dados_extraidos || {};

// SEMPRE tentar preencher formulário
if (Object.keys(dadosExtraidos).length > 0) {
  preencherFormularioComDados(dadosExtraidos);
}

// Se dados suficientes, calcular automaticamente
if (analiseData.success && analiseData.data) {
  // Exibir resultado
} else if (temDados) {
  // PROBLEMA: Mesmo com dados, pode não ter success=true
  // E quando clica em "Calcular", validação bloqueia
  return; // Aguarda usuário clicar em "Calcular"
}

// Validação que está bloqueando
const somaTempos = tempos.reduce((a, b) => a + b, 0);
const produtividadeFornecida = document.getElementById('produtividade').value;
const norFornecida = document.getElementById('nor').value;

if (somaTempos === 0 && !produtividadeFornecida && !norFornecida) {
  // PROBLEMA: Mesmo que dados tenham sido extraídos, se não preencheu campos, bloqueia
  alert('⚠️ Por favor, preencha...');
  return;
}
```

## Problemas Identificados

1. **OCR não está extraindo texto corretamente**
   - Pode ser qualidade da imagem
   - Pode ser configuração do Tesseract
   - Pode ser formato da imagem (tabela, números em colunas)

2. **Padrões de regex não estão encontrando os dados**
   - Os números podem estar em formato de tabela
   - Espaçamento pode ser diferente do esperado
   - Pode haver caracteres especiais interferindo

3. **Dados extraídos não estão sendo preenchidos no formulário**
   - Função `preencherFormularioComDados` pode não estar funcionando
   - Campos podem não estar sendo encontrados pelo ID

4. **Validação está bloqueando mesmo com dados extraídos**
   - Validação verifica campos do formulário, não dados extraídos
   - Se campos não foram preenchidos, bloqueia mesmo tendo dados

## Soluções Tentadas

1. ✅ Melhorado padrões de regex para buscar números
2. ✅ Adicionado fallback para inferir dados
3. ✅ Ajustado cálculo de confiança baseado em dados extraídos
4. ✅ Melhorado validação para aceitar NOR como indicador
5. ✅ Adicionado recálculo automático de produtividade e NOR

## Código Completo para Análise

### Função de Extração de Dados (Completa)

```javascript
if (testType === 'palografico') {
  console.log('🔍 Extraindo dados do Palográfico do texto OCR');
  console.log('📝 Texto completo (primeiros 2000 caracteres):', texto.substring(0, 2000));
  
  const numeros = texto.match(/\d+/g) || [];
  const numerosTempos = numeros.map(n => parseInt(n)).filter(n => n >= 50 && n <= 200);
  
  // Padrão 1: Buscar sequência de 5 números
  const sequenciaPatterns = [
    /(\d{2,3})[\s\n\t]+(\d{2,3})[\s\n\t]+(\d{2,3})[\s\n\t]+(\d{2,3})[\s\n\t]+(\d{2,3})/g,
    /(\d{2,3})[,\s]+(\d{2,3})[,\s]+(\d{2,3})[,\s]+(\d{2,3})[,\s]+(\d{2,3})/g,
  ];
  
  let temposEncontrados = null;
  // ... busca por padrões ...
  
  // Padrão 2: Buscar por proximidade no texto
  if (!temposEncontrados) {
    const todosNumeros = [...texto.matchAll(/\d{2,3}/g)];
    const candidatos = todosNumeros
      .map(m => ({ valor: parseInt(m[0]), posicao: m.index }))
      .filter(n => n.valor >= 50 && n.valor <= 200)
      .sort((a, b) => a.posicao - b.posicao);
    
    for (let i = 0; i <= candidatos.length - 5; i++) {
      const grupo = candidatos.slice(i, i + 5);
      const distancia = grupo[4].posicao - grupo[0].posicao;
      if (distancia < 200) {
        temposEncontrados = grupo.map(g => g.valor);
        break;
      }
    }
  }
  
  // Buscar Total
  const totalPatterns = [
    /total[\s:]*(\d{3,4})/gi,
    /(\d{3,4})[\s]*total/gi
  ];
  
  // Buscar NOR
  const norPatterns = [
    /nor[\s:]*(\d+[.,]\d+)/gi,
    /(\d+[.,]\d+)[\s]*nor/gi,
  ];
  
  // Calcular NOR se tiver tempos
  if (dados.tempos && dados.tempos.length === 5) {
    const diferencas = [];
    for (let i = 1; i < dados.tempos.length; i++) {
      diferencas.push(Math.abs(dados.tempos[i] - dados.tempos[i-1]));
    }
    const somaDiferencas = diferencas.reduce((a, b) => a + b, 0);
    const produtividade = dados.produtividade || dados.tempos.reduce((a, b) => a + b, 0);
    dados.nor = Math.round((somaDiferencas * 100) / produtividade * 100) / 100;
  }
}
```

### Função de Preenchimento do Formulário

```javascript
function preencherFormularioComDados(dados) {
  if (selectedTest === 'palografico') {
    // Preencher tempos
    if (dados.tempos && Array.isArray(dados.tempos) && dados.tempos.length >= 5) {
      document.getElementById('tempo1').value = dados.tempos[0] || 0;
      document.getElementById('tempo2').value = dados.tempos[1] || 0;
      document.getElementById('tempo3').value = dados.tempos[2] || 0;
      document.getElementById('tempo4').value = dados.tempos[3] || 0;
      document.getElementById('tempo5').value = dados.tempos[4] || 0;
    }
    
    // Preencher produtividade
    if (dados.produtividade) {
      document.getElementById('produtividade').value = dados.produtividade;
    }
    
    // Preencher NOR
    if (dados.nor !== null && dados.nor !== undefined) {
      document.getElementById('nor').value = dados.nor;
    }
    
    // Recalcular valores automáticos
    setTimeout(() => {
      calcularProdutividadeENOR();
      calcularTamanhoMedio();
      calcularDistanciaMedia();
      calcularEmotividade();
    }, 200);
  }
}
```

## Perguntas para Claude Sonnet

1. **Por que o OCR pode não estar extraindo os números corretamente?**
   - A imagem tem formato de tabela com números em colunas
   - Pode haver ruído ou baixa qualidade
   - Configurações do Tesseract podem precisar de ajuste

2. **Como melhorar os padrões de regex para encontrar números em tabelas?**
   - Os números podem estar em formato: "80  78  83  84  83"
   - Ou em colunas verticais
   - Ou com separadores específicos

3. **Por que os dados extraídos não estão preenchendo o formulário?**
   - A função `preencherFormularioComDados` pode não estar sendo chamada
   - Os IDs dos campos podem estar incorretos
   - Pode haver timing issue (campos não existem ainda)

4. **Como garantir que a validação não bloqueie quando dados foram extraídos?**
   - A validação verifica campos do DOM, não dados extraídos
   - Precisa verificar se dados foram extraídos antes de validar
   - Ou preencher campos antes de validar

5. **Como melhorar a confiança quando dados são extraídos?**
   - Já implementado: aumenta confiança baseado em dados extraídos
   - Mas pode precisar de mais ajustes

## Sugestões de Melhorias

1. **Adicionar pré-processamento de imagem**
   - Melhorar contraste
   - Redimensionar se necessário
   - Converter para escala de cinza

2. **Tentar múltiplos modos de segmentação do Tesseract**
   - PSM_SINGLE_BLOCK
   - PSM_SINGLE_COLUMN
   - PSM_SINGLE_BLOCK_VERT_TEXT

3. **Adicionar validação visual dos dados extraídos**
   - Mostrar ao usuário o que foi extraído antes de calcular
   - Permitir edição manual se necessário

4. **Melhorar tratamento de erros**
   - Se OCR falhar, tentar novamente com configurações diferentes
   - Mostrar texto extraído para debug

5. **Adicionar fallback mais inteligente**
   - Se não encontrar padrões, tentar encontrar números próximos
   - Validar se números fazem sentido juntos
   - Usar heurísticas para inferir dados

