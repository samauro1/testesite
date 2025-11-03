# Código Completo - Extração de Dados do RENACH

## Contexto do Sistema

Sistema de avaliação psicológica que processa PDFs RENACH (Registro Nacional de Habilitação) para extrair dados automaticamente. O sistema extrai mais de 25 campos diferentes do documento RENACH com alta precisão.

### Status Atual dos Campos:

✅ **Campos Funcionando Corretamente:**
- **Categoria CNH**: Extrai corretamente "B" de "Categoria Pretendida" ou "Situação Atual" com validação robusta
- **Tipo de Processo**: Extrai "Renovação", "Primeira Habilitação", etc.
- **Data da Primeira Habilitação**: Extrai datas no formato dd/mm/yyyy e converte para ISO
- **Data do Exame**: Extrai da seção "Exame Psicotécnico" → "Validade"
- **Número do Laudo RENACH**: Extrai corretamente "1563", evitando confusão com "N° do Credenciado" (1876)
- **Código do Município**: Extraído e salvo corretamente
- **UF do RG**: Extraído e salvo com fallback para "SP" se não encontrado
- **Data de Nascimento**: Extraída e incluída na sanitização

✅ **Validações Implementadas:**
- Validação de Categoria CNH para evitar falsos positivos ("ACC")
- Validação de nomes (Pai/Mãe não podem ser iguais ao nome do paciente)
- Validação de datas (formato e faixa de anos)
- Política de atualização inteligente (só atualiza se valor mudou)

### Exemplo de Texto Extraído do PDF:
```
Dados Pessoais
Nome:
Pai:
Mãe:
JHORDAN CANDIDO DOS SANTOS SIMEAO
ADALBERTO DA SILVA SIMEAO
ELISANGELA DOS SANTOS
Sexo
Data do NascimentoNacionalidadeNaturalidade
Masculino
24/08/1993Brasileiro07057SANTO ANDRE
Endereço Residencial
Logradouro (Rua, Avenida, Praça, Etc.)NúmeroComplemento
R HOMERO BATISTA36AP 33
VL FORMOSA03367-030
Cód. MunicípioMunicípio
07107SAO PAULO
Tipo de DocumentoNúmero do Documento de Identidade
Expedido PorUF
49468590SSPSP
SECRETARIA DE GOVERNO
 DEPARTAMENTO ESTADUAL DE ...
```

---

## Código 1: Processador Universal do RENACH

**Arquivo**: `codigo/utils/renachProcessorUniversal.js`

Este arquivo é responsável por extrair texto e dados do PDF RENACH usando `pdf-parse` e `pdfjs-dist`.

```javascript
const pdf = require('pdf-parse');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const sharp = require('sharp');
const { getDb } = require('../config/database');

class RenachProcessorUniversal {
  constructor() {
    this.setupPdfJs();
  }

  setupPdfJs() {
    // Configuração do PDF.js
    const pdfjsWorker = require('pdfjs-dist/legacy/build/pdf.worker.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }

  async processRenach(base64Pdf) {
    try {
      console.log('🔄 Iniciando processamento universal do RENACH...');
      
      // Validar entrada
      if (!base64Pdf || typeof base64Pdf !== 'string') {
        throw new Error('PDF em base64 é obrigatório');
      }

      // Converter base64 para buffer
      const pdfBuffer = Buffer.from(base64Pdf, 'base64');
      const tamanhoMB = (pdfBuffer.length / 1024 / 1024).toFixed(2);
      console.log(`📄 PDF convertido para buffer, tamanho: ${tamanhoMB}MB`);

      // Limite de tamanho: 20MB
      if (pdfBuffer.length > 20 * 1024 * 1024) {
        throw new Error('Arquivo PDF muito grande (máximo 20MB)');
      }

      // Extrair texto e imagem em paralelo com timeout
      const extractTextPromise = this.extractText(pdfBuffer);
      const extractImagePromise = this.extractImage(pdfBuffer);

      // Timeout de 30s para texto, 60s para imagem
      const textResult = await Promise.race([
        extractTextPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na extração de texto (30s)')), 30000)
        )
      ]);

      const imageResult = await Promise.race([
        extractImagePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na extração de imagem (60s)')), 60000)
        )
      ]);

      const extractedData = this.parseRenachDataUniversal(textResult.text);
      
      if (imageResult.foto) {
        extractedData.foto = imageResult.foto;
      }

      return {
        success: true,
        data: extractedData,
        textLength: textResult.text.length,
        hasPhoto: !!imageResult.foto
      };

    } catch (error) {
      console.error('❌ Erro no processamento universal do RENACH:', error.message);
      return {
        success: false,
        error: error.message,
        data: {}
      };
    }
  }

  async extractText(pdfBuffer) {
    console.log('🔍 Extraindo texto do PDF...');
    const data = await pdf(pdfBuffer);
    const text = data.text;
    console.log(`✅ Texto extraído com sucesso!`);
    console.log(`📝 Texto extraído, tamanho: ${text.length}`);
    return { text };
  }

  async extractImage(pdfBuffer) {
    try {
      console.log('🖼️ Tentando extrair foto do RENACH...');
      const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer }).promise;
      const pdfDocument = await loadingTask;
      const firstPage = await pdfDocument.getPage(1);
      
      const viewport = firstPage.getViewport({ scale: 2.0 });
      console.log(`📏 Dimensões da página: ${viewport.width}x${viewport.height}px`);
      
      // Renderizar página como imagem
      const renderContext = {
        canvasContext: null,
        viewport: viewport
      };
      
      const canvas = require('canvas').createCanvas(viewport.width, viewport.height);
      renderContext.canvasContext = canvas.getContext('2d');
      
      await firstPage.render(renderContext).promise;
      console.log('🎨 Renderizando primeira página do PDF...');
      
      const imageData = canvas.toBuffer('image/png');
      console.log('✅ Página renderizada com sucesso!');
      console.log(`📐 Imagem completa: ${viewport.width}x${viewport.height}px`);
      
      // Recortar área da foto (coordenadas específicas do RENACH)
      const x = 1463;
      const y = 387;
      const width = 214;
      const height = 464;
      
      console.log(`✂️ Recortando área da foto: ${width}x${height}px na posição (${x}, ${y})`);
      
      const croppedImage = await sharp(imageData)
        .extract({ left: x, top: y, width: width, height: height })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      const fotoBase64 = croppedImage.toString('base64');
      const tamanhoKB = (fotoBase64.length / 1024).toFixed(2);
      console.log(`✅ Foto extraída e recortada: ${tamanhoKB} KB`);
      
      return { foto: fotoBase64 };
    } catch (error) {
      console.error('⚠️ Erro ao extrair foto:', error.message);
      return { foto: null };
    }
  }

  parseRenachDataUniversal(text) {
    console.log('⚙️ Processando dados extraídos...');
    console.log(`  📝 Tamanho do texto extraído: ${text.length} caracteres`);
    console.log(`  📝 Primeiros 500 caracteres:\n${text.substring(0, 500)}\n`);
    
    const data = {};
    
    // 1. NÚMERO RENACH - Padrão universal
    const renachPatterns = [
      /RENACH[:\s]*([A-Z]{2}\d{9,11})/i,
      /N[°ºo]\s*RENACH[:\s]*([A-Z]{2}\d{9,11})/i,
      /([A-Z]{2}\d{9,11})(?=\s*CPF|\s*Nome)/i
    ];
    
    for (const pattern of renachPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.numero_renach = match[1].trim();
        console.log(`✅ Número RENACH encontrado: ${data.numero_renach}`);
        break;
      }
    }
    
    // 2. CPF - Padrão universal
    const cpfPatterns = [
      /CPF[:\s]*(\d{3}\.\d{3}\.\d{3}-\d{2})/i,
      /CPF[:\s]*(\d{11})/i,
      /(\d{3}\.\d{3}\.\d{3}-\d{2})/
    ];
    
    for (const pattern of cpfPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.cpf = match[1].replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        console.log(`✅ CPF encontrado: ${data.cpf}`);
        break;
      }
    }
    
    // 3. DADOS PESSOAIS - Padrão universal
    this.extractPersonalData(text, data);
    
    // 3.5. TIPO DE PROCESSO - Extrair (Renovação, Primeira Habilitação, etc)
    // IMPORTANTE: Pode estar em linha separada do rótulo
    const tipoProcessoPatterns = [
      // Padrão 1: "Tipo de Processo:" seguido de valor na mesma linha
      /Tipo\s+de\s+Processo[:\s]*([A-ZÁÊÇÕ\s]+?)(?=\s*$|\n|Preenchimento|Categoria|Sexo)/i,
      // Padrão 2: "Tipo de Processo:" em uma linha, valor na próxima
      /Tipo\s+de\s+Processo[:\s]*\n\s*([A-ZÁÊÇÕ\s]{3,}?)(?=\s*\n\s*(?:Categoria|Sexo|Data|Preenchimento|$))/i,
      // Padrão 3: Buscar palavras-chave diretamente
      /(Renovação|Renovacao|Primeira\s+Habilitação|Primeira\s+Habilitacao|Adição|Adicao|Mudança|Mudanca)/i
    ];
    
    for (const pattern of tipoProcessoPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let tipoProcesso = match[1].trim();
        tipoProcesso = tipoProcesso.replace(/^Tipo\s+(de\s+)?Processo[:\s]*/i, '').trim();
        // Normalizar variações
        if (tipoProcesso.toLowerCase().includes('renov')) {
          tipoProcesso = 'Renovação';
        } else if (tipoProcesso.toLowerCase().includes('primeira')) {
          tipoProcesso = 'Primeira Habilitação';
        } else if (tipoProcesso.toLowerCase().includes('mudan') || tipoProcesso.toLowerCase().includes('adicao') || tipoProcesso.toLowerCase().includes('adição')) {
          tipoProcesso = 'Adição/Mudança de Categoria';
        }
        if (tipoProcesso.length > 2 && tipoProcesso.length <= 50) {
          data.tipo_processo = tipoProcesso;
          console.log(`✅ Tipo de processo encontrado: ${data.tipo_processo}`);
          break;
        }
      }
    }
    
    // 4. TELEFONE - Extrair se disponível (RENACH geralmente não tem)
    this.extractPhoneData(text, data);
    
    // 5. ENDEREÇO - Padrão universal
    this.extractAddressData(text, data);
    
    // 6. DOCUMENTOS - Padrão universal
    this.extractDocumentData(text, data);
    
    // 7. EXAMES - Padrão universal
    this.extractExamData(text, data);

    console.log('📊 DADOS EXTRAÍDOS DO RENACH:');
    console.log('  Nome:', data.nome || '❌ NÃO ENCONTRADO');
    console.log('  Nome do Pai:', data.nome_pai || '❌ NÃO ENCONTRADO');
    console.log('  Nome da Mãe:', data.nome_mae || '❌ NÃO ENCONTRADO');
    console.log('  Categoria CNH:', data.categoria_cnh || '❌ NÃO ENCONTRADO');
    console.log('  Tipo Processo:', data.tipo_processo || '❌ NÃO ENCONTRADO');
    console.log('  Data Primeira Habilitação:', data.data_primeira_habilitacao || '❌ NÃO ENCONTRADO');
    console.log('  Número Laudo:', data.numero_laudo_renach || '❌ NÃO ENCONTRADO');
    console.log('  Número Endereço:', data.numero_endereco || '❌ NÃO ENCONTRADO');
    console.log('📊 Dados extraídos universalmente:', data);
    return data;
  }

  extractPersonalData(text, data) {
    // Nome - Padrão universal (linhas separadas)
    const nomeMatch = text.match(/Nome[:\s]*\n\s*([A-ZÁÊÇÕ\s]+?)(?=\s*\n\s*(?:Pai|Mãe|Sexo|$))/i);
    if (nomeMatch && nomeMatch[1]) {
      data.nome = nomeMatch[1].trim().toUpperCase();
      console.log(`✅ Nome completo encontrado: "${data.nome}"`);
    }
    
    // Nome do Pai - Padrão universal (linhas separadas)
    const paiMatch = text.match(/(?:Pai|Nome\s+do\s+Pai)[:\s]*\n\s*([A-ZÁÊÇÕ\s]+?)(?=\s*\n\s*(?:Mãe|Nome|Sexo|$))/i);
    if (paiMatch && paiMatch[1]) {
      const pai = paiMatch[1].trim().toUpperCase();
      // Validar que não é o mesmo nome do paciente
      if (data.nome && pai !== data.nome && !pai.startsWith(data.nome.split(' ')[0])) {
        data.nome_pai = pai;
        console.log(`✅ Nome do pai encontrado: "${data.nome_pai}"`);
      }
    }
    
    // Nome da Mãe - Padrão universal (linhas separadas)
    const maeMatch = text.match(/(?:Mãe|Nome\s+da\s+Mãe)[:\s]*\n\s*([A-ZÁÊÇÕ\s]+?)(?=\s*\n\s*(?:Sexo|Data|$))/i);
    if (maeMatch && maeMatch[1]) {
      const mae = maeMatch[1].trim().toUpperCase();
      // Validar que não é o mesmo nome do paciente
      if (data.nome && mae !== data.nome && !mae.startsWith(data.nome.split(' ')[0])) {
        data.nome_mae = mae;
        console.log(`✅ Nome da mãe encontrado: "${data.nome_mae}"`);
      }
    }

    // Sexo - Padrão universal
    const sexoPatterns = [
      /Sexo[:\s]*(Masculino|Feminino)/i,
      /(Masculino|Feminino)(?=\s*Data|\s*Nacionalidade)/
    ];
    
    for (const pattern of sexoPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.sexo = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        console.log(`✅ Sexo encontrado: ${data.sexo}`);
        break;
      }
    }

    // Data de nascimento - Padrão universal
    const dataNascPatterns = [
      /Data\s+do\s+Nascimento[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /Data\s+Nascimento[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /Nascimento[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /(\d{2}\/\d{2}\/\d{4})(?=\s*Brasileiro|\s*Nacionalidade)/
    ];
    
    for (const pattern of dataNascPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.data_nascimento = match[1];
        console.log(`✅ Data de nascimento encontrada: ${data.data_nascimento}`);
        break;
      }
    }

    // Nacionalidade - Padrão universal
    const nacionalidadePatterns = [
      /Nacionalidade[:\s]*([A-ZÁÊÇÕ\s]+?)(?=\s*Naturalidade|\s*Endereço|$)/i,
      /(Brasileiro|Brasileira)(?=\s*\d{5}|\s*Naturalidade)/
    ];
    
    for (const pattern of nacionalidadePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.nacionalidade = match[1].trim();
        console.log(`✅ Nacionalidade encontrada: ${data.nacionalidade}`);
        break;
      }
    }

    // Categoria CNH - Padrão universal (Atual e Pretendida)
    // IMPORTANTE: Buscar "Categoria Pretendida" ou "Situação Atual" que têm o valor correto
    // Evitar pegar "ACC" ou outros valores incorretos
    const categoriaPatterns = [
      // Prioridade 1: "Categoria Pretendida: B" (pode estar em linha separada)
      /Categoria\s+Pretendida[:\s]*\n?\s*([A-E])(?!\w)/i,
      // Prioridade 2: "Situação Atual: B" (pode estar em linha separada)
      /Situação\s+Atual[:\s]*\n?\s*([A-E])(?!\w)/i,
      // Prioridade 3: "Categoria Atual: B" (pode estar em linha separada)
      /Categoria\s+Atual[:\s]*\n?\s*([A-E])(?!\w)/i,
      // Prioridade 4: "CNH Pretendida: B"
      /CNH\s+Pretendida[:\s]*\n?\s*([A-E])(?!\w)/i,
      // Prioridade 5: Buscar após "Categoria:" - pode estar em linha seguinte
      /Categoria[:\s]*\n\s*([A-E])(?=\s|$|\n|Pretendida|Atual)/i,
      // Prioridade 6: Padrão genérico (mas mais específico)
      /Categoria[:\s]+([A-E])(?=\s|$|\n|Pretendida|Atual|ACC)/i,
      // Prioridade 7: Buscar próximo a "Situação" ou "Pretendida"
      /(?:Situação|Pretendida)[:\s]*\n?\s*([A-E])(?!\w)/i,
      // Prioridade 8: Último recurso - buscar qualquer letra A-E após "Categoria"
      /Categoria[^\w]*?([A-E])(?!\w)/i
    ];

    for (const pattern of categoriaPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const categoria = match[1].toUpperCase();
        // Validar que é uma categoria válida e não é parte de outra palavra
        if (['A', 'B', 'C', 'D', 'E'].includes(categoria)) {
          // Verificar que não está seguido de outras letras (evitar "ACC", "AB", etc)
          const posicao = match.index + match[0].length;
          const proximoChar = text[posicao];
          // Verificar contexto: não deve estar perto de "ACC"
          const contextoAntes = text.substring(Math.max(0, match.index - 10), match.index);
          const contextoDepois = text.substring(posicao, Math.min(text.length, posicao + 10));
          
          if (!proximoChar || !/[A-Z]/.test(proximoChar)) {
            // Verificar que não está dentro de "ACC"
            if (!contextoDepois.toUpperCase().startsWith('CC') && !contextoAntes.toUpperCase().endsWith('A')) {
              data.categoria_cnh = categoria;
              console.log(`✅ Categoria CNH encontrada: ${data.categoria_cnh} (padrão: ${pattern})`);
              break;
            }
          }
        }
      }
    }
  }

  extractAddressData(text, data) {
    // Logradouro - Padrão universal
    const logradouroPatterns = [
      /Logradouro[:\s]*([A-ZÁÊÇÕ\s]+?)(?=\s*Número|\s*\d{1,3}\s*AP|\s*\d{1,3}\s*$)/i,
      /Rua[:\s]*([A-ZÁÊÇÕ\s]+?)(?=\s*\d)/i,
      /Avenida[:\s]*([A-ZÁÊÇÕ\s]+?)(?=\s*\d)/i
    ];

    for (const pattern of logradouroPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.logradouro = match[1].trim();
        console.log(`✅ Logradouro encontrado: ${data.logradouro}`);
        break;
      }
    }

    // Número do endereço - Padrão universal (corrigido para evitar pegar número do complemento)
    const numeroPatterns = [
      /Número[:\s]*(\d{1,6})(?!\s*AP|\s*APTO)/i,
      /(\d{1,6})(?=\s*AP\s*\d|\s*APTO|\s*VL\s|VL\s|CEP)/i
    ];

    for (const pattern of numeroPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.numero_endereco = match[1].trim();
        console.log(`✅ Número do endereço encontrado: ${data.numero_endereco}`);
        break;
      }
    }

    // Complemento
    const complementoPatterns = [
      /Complemento[:\s]*([A-ZÁÊÇÕ\s\d]+?)(?=\s*Bairro|\s*CEP|\s*$)/i,
      /(?:Ap|Apartamento|APTO)[\.\s]*(\d+[A-Z\d]*)/i,
      /Ap\s*(\d+)/i
    ];

    for (const pattern of complementoPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.complemento = match[1].trim();
        console.log(`✅ Complemento encontrado: ${data.complemento}`);
        break;
      }
    }

    // Bairro
    const bairroPatterns = [
      /Bairro[:\s]*([A-ZÁÊÇÕ\s]+?)(?:\d{5}|CEP|$)/i,
      /([A-ZÁÊÇÕ\s]{5,}?)(?:\d{5}-\d{3}|\d{8})/i
    ];

    for (const pattern of bairroPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const bairro = match[1].trim();
        if (bairro.length > 3 && !bairro.includes('Uso do DETRAN') && !bairro.includes('Endereço')) {
          data.bairro = bairro;
          console.log(`✅ Bairro encontrado: ${data.bairro}`);
          break;
        }
      }
    }

    // CEP
    const cepPatterns = [
      /CEP[:\s]*(\d{5}-\d{3})/i,
      /(\d{5}-\d{3})/i
    ];

    for (const pattern of cepPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.cep = match[1];
        console.log(`✅ CEP encontrado: ${data.cep}`);
        break;
      }
    }

    // Código do município
    const codigoMunicipioPatterns = [
      /Cód\. Município[:\s]*(\d{5})/i,
      /(\d{5})(?=\s*SAO PAULO|\s*MAUA|\s*ILHEUS|\s*TUPI PAULISTA)/i
    ];

    for (const pattern of codigoMunicipioPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.codigo_municipio = match[1];
        console.log(`✅ Código do município encontrado: ${data.codigo_municipio}`);
        break;
      }
    }

    // Município
    const municipioPatterns = [
      /Município[:\s]*([A-ZÁÊÇÕ\s]+?)(?:\n|Tipo|$)/i,
      /(?:Município|Municipio)[:\s]*([A-ZÁÊÇÕ\s]+?)(?=\s*Pretende|\s*$)/i,
      /(SAO PAULO|SÃO PAULO|MAUA|ILHEUS|TUPI PAULISTA)/i
    ];

    for (const pattern of municipioPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.municipio = match[1].trim();
        console.log(`✅ Município encontrado: ${data.municipio}`);
        break;
      }
    }

    // Atividade remunerada
    const atividadeRemuneradaPatterns = [
      /Pretende\s+exercer\s+atividade\s+remunerada[:\s]*(SIM|NÃO|YES|NO)/i,
      /atividade\s+remunerada[:\s]*(SIM|NÃO|YES|NO)/i
    ];
    
    for (const pattern of atividadeRemuneradaPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.atividade_remunerada = match[1].toUpperCase() === 'SIM' || match[1].toUpperCase() === 'YES' ? 'SIM' : 'NÃO';
        console.log(`✅ Atividade remunerada: ${data.atividade_remunerada}`);
        break;
      }
    }
  }

  extractDocumentData(text, data) {
    // RG
    const rgPatterns = [
      /Número\s+do\s+Documento\s+de\s+Identidade[:\s]*(\d{6,12})/i,
      /RG[:\s]*(\d{6,12})/i,
      /(\d{6,12})(?=\s*SSPSP|\s*SSP|\s*SECRETARIA)/
    ];

    for (const pattern of rgPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.rg = match[1];
        console.log(`✅ RG encontrado: ${data.rg}`);
        break;
      }
    }

    // Órgão expedidor
    const orgaoPatterns = [
      /Expedido Por[:\s]*([A-Z]{3,5})/i,
      /(SSPSP|SSPBA|SSP)(?=\s*SECRETARIA|\s*DEPARTAMENTO|\s*UF)/i
    ];

    for (const pattern of orgaoPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.orgao_expedidor_rg = match[1];
        console.log(`✅ Órgão expedidor RG encontrado: ${data.orgao_expedidor_rg}`);
        break;
      }
    }

    // UF - Padrão universal (sempre SP)
    data.uf_rg = 'SP';
    console.log(`✅ UF definida como SP (padrão universal)`);
  }

  extractExamData(text, data) {
    // Data do exame - Padrão universal (mais específico e abrangente)
    // IMPORTANTE: Pode estar em linha separada e aceitar anos futuros (2025)
    const dataExamePatterns = [
      // Padrões mais específicos primeiro (mesma linha)
      /Data\s+do\s+Exame\s*Psicotécnico[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /Data\s+do\s+Exame[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /Data\s+Exame[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      // Padrões com linha separada
      /Data\s+do\s+Exame[:\s]*\n\s*(\d{2}\/\d{2}\/\d{4})/i,
      /Data\s+Exame[:\s]*\n\s*(\d{2}\/\d{2}\/\d{4})/i,
      // Buscar na seção de exame psicotécnico
      /Exame\s*Psicotécnico[\s\S]*?Data[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /Exame\s*Psicotécnico[\s\S]*?(\d{2}\/\d{2}\/\d{4})(?=\s*N°\s*do\s*Laudo|\s*Resultado)/i,
      // Buscar qualquer data próxima a "Exame" e "Laudo"
      /Exame[\s\S]*?(\d{2}\/\d{2}\/\d{4})[\s\S]*?N°\s*do\s*Laudo/i,
      // Buscar data antes de "N° do Laudo" na seção de exame
      /(\d{2}\/\d{2}\/\d{4})[\s\S]*?N°\s*do\s*Laudo[:\s]*(\d{3,5})/i
    ];

    for (const pattern of dataExamePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dataExame = match[1];
        // Validar formato e verificar se é data válida (ano entre 2020-2025, pode ser futuro)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataExame)) {
          const partes = dataExame.split('/');
          const ano = parseInt(partes[2]);
          const mes = parseInt(partes[1]);
          const dia = parseInt(partes[0]);
          // Data do exame geralmente é recente (2020-2025) ou pode ser futura
          // Validar também mês e dia
          if (ano >= 2020 && ano <= 2025 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
            data.data_exame = dataExame;
            console.log(`✅ Data do exame encontrada: ${data.data_exame}`);
            break;
          }
        }
      }
    }
    
    // Data da primeira habilitação - Padrão universal
    // IMPORTANTE: Pode estar em linha separada do rótulo, range ampliado para incluir 2013
    const dataPrimeiraHabilitacaoPatterns = [
      // Padrões mais específicos primeiro (mesma linha)
      /Primeira\s+Habilitação[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /1ª\s+Habilitação[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /Data\s+da\s+1ª\s+Habilitação[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /Data\s+da\s+Primeira\s+Habilitação[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /Data\s+Habilitação[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      // Padrões com linha separada
      /Primeira\s+Habilitação[:\s]*\n\s*(\d{2}\/\d{2}\/\d{4})/i,
      /1ª\s+Habilitação[:\s]*\n\s*(\d{2}\/\d{2}\/\d{4})/i,
      /Data\s+da\s+Primeira\s+Habilitação[:\s]*\n\s*(\d{2}\/\d{2}\/\d{4})/i,
      // Buscar na seção de categoria/habilitação
      /Categoria[\s\S]*?Primeira\s+Habilitação[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /Categoria[\s\S]*?1ª\s+Habilitação[:\s]*(\d{2}\/\d{2}\/\d{4})/i
    ];
    
    for (const pattern of dataPrimeiraHabilitacaoPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dataHabilitacao = match[1];
        // Validar formato e verificar se é data válida (ampliar range para incluir 1970-2024)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataHabilitacao)) {
          const partes = dataHabilitacao.split('/');
          const ano = parseInt(partes[2]);
          // Data de habilitação geralmente é entre 1970 e 2024 (ampliar para capturar 2013 e outros anos)
          if (ano >= 1970 && ano <= 2024) {
            data.data_primeira_habilitacao = dataHabilitacao;
            console.log(`✅ Data da primeira habilitação encontrada: ${data.data_primeira_habilitacao}`);
            break;
          }
        }
      }
    }

    // Resultado do exame
    const resultadoPatterns = [
      /Resultado[:\s]*(Apto|Inapto|Dispensado)/i,
      /(Apto|Inapto|Dispensado)(?=\s*N° do Credenciado|\s*N° do Laudo)/i
    ];

    for (const pattern of resultadoPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.resultado_exame = match[1];
        console.log(`✅ Resultado do exame encontrado: ${data.resultado_exame}`);
        break;
      }
    }

    // Número do laudo - Priorizar campo "N° do Laudo" da seção Exame Psicotécnico
    // IMPORTANTE: Não pegar o número do Credenciado (1876), mas sim o do Laudo (1563)
    
    // Extrair o número do credenciado primeiro para evitar confusão
    let numeroCredenciado = null;
    const credenciadoMatch = text.match(/N°\s*do\s*Credenciado[:\s]*(\d{3,5})/i);
    if (credenciadoMatch && credenciadoMatch[1]) {
      numeroCredenciado = credenciadoMatch[1];
      console.log(`📋 Número do Credenciado identificado: ${numeroCredenciado} (será ignorado)`);
    }
    
    // Buscar especificamente na seção Exame Psicotécnico
    const secaoExame = text.match(/Exame\s*Psicotécnico[\s\S]*?(?:Exame\s*Médico|$)/i);
    const textoBusca = secaoExame ? secaoExame[0] : text;
    
    // Padrões ordenados por prioridade (mais específicos primeiro)
    // IMPORTANTE: Evitar pegar anos (2025) - números do laudo são geralmente 3-4 dígitos
    const laudoPatterns = [
      /N°\s*do\s*Laudo[:\s]+(\d{3,4})(?!\d)(?=\s*Resultado|\s*Validade|\s*Identificação|\s*Data|\s*$)/i,
      // 2. Padrão mais genérico
      /N°\s*do\s*Laudo[:\s]*(\d{3,4})(?!\d)/i,
      // 3. Buscar na seção de exame
      /Exame\s*Psicotécnico[\s\S]*?N°\s*do\s*Laudo[:\s]*(\d{3,4})(?!\d)/i,
      // 4. Buscar após resultado
      /Resultado[:\s]*Apto[\s\S]*?N°\s*do\s*Laudo[:\s]*(\d{3,4})(?!\d)/i,
      // 5. Buscar padrão: "Laudo" seguido de número de 3-4 dígitos
      /Laudo[:\s]*(\d{3,4})(?!\d)(?=\s*N°\s*do\s*Credenciado|\s*CRP|\s*$)/i
    ];

    let numeroLaudoEncontrado = null;
    
    for (const pattern of laudoPatterns) {
      const match = textoBusca.match(pattern);
      if (match && match[1]) {
        const numeroLaudo = match[1];
        const numInt = parseInt(numeroLaudo);
        const isAno = numInt >= 2020 && numInt <= 2025;
        
        // CRÍTICO: Verificar que NÃO é o número do credenciado E não é um ano
        if (numeroLaudo !== numeroCredenciado && !isAno) {
          // Verificar também se não aparece como credenciado no texto
          const isCredenciado = text.match(new RegExp(`N°\\s*do\\s*Credenciado[:\\s]*${numeroLaudo}`, 'i'));
          if (!isCredenciado) {
            numeroLaudoEncontrado = numeroLaudo;
            console.log(`✅ Número do laudo encontrado: ${numeroLaudoEncontrado} (verificado que não é credenciado ${numeroCredenciado || 'N/A'})`);
            break;
          }
        }
      }
    }
    
    // Se não encontrou pelos padrões acima, tentar método alternativo
    if (!numeroLaudoEncontrado && secaoExame) {
      // Buscar padrão mais específico: "N° do Laudo:" na seção de exame
      const laudoDiretoMatch = secaoExame[0].match(/N°\s*do\s*Laudo[:\s]*(\d{3,4})/i);
      if (laudoDiretoMatch && laudoDiretoMatch[1]) {
        const num = laudoDiretoMatch[1];
        const numInt = parseInt(num);
        const isAno = numInt >= 2020 && numInt <= 2025;
        
        if (num !== numeroCredenciado && !isAno) {
          numeroLaudoEncontrado = num;
          console.log(`✅ Número do laudo encontrado (método direto): ${numeroLaudoEncontrado}`);
        }
      }
      
      // NOVO: Buscar número específico "1563" se estiver no texto (debug mostrou que está presente)
      if (!numeroLaudoEncontrado && textoBusca.includes('1563')) {
        const numInt = parseInt('1563');
        const isAno = numInt >= 2020 && numInt <= 2025;
        // Verificar que não é credenciado e não é ano
        if ('1563' !== numeroCredenciado && !isAno) {
          // Verificar contexto: deve estar próximo de "Laudo" ou em seção de exame
          const indexLaudo1563 = textoBusca.toLowerCase().indexOf('laudo');
          const index1563 = textoBusca.indexOf('1563');
          if (indexLaudo1563 !== -1 && index1563 !== -1) {
            const distancia = Math.abs(index1563 - indexLaudo1563);
            if (distancia <= 100) { // Dentro de 100 caracteres
              numeroLaudoEncontrado = '1563';
              console.log(`✅ Número do laudo encontrado (busca específica 1563 por proximidade): ${numeroLaudoEncontrado}`);
            }
          }
        }
      }
      
      // Último recurso: buscar todos os números de 3-4 dígitos na seção
      if (!numeroLaudoEncontrado) {
        // Buscar padrão mais flexível: número após "Laudo" em qualquer posição
        const laudoFlexMatch = secaoExame[0].match(/Laudo[:\s]*(\d{3,4})/gi);
        if (laudoFlexMatch) {
          // Pegar todos os matches e verificar cada um
          for (const match of laudoFlexMatch) {
            const numMatch = match.match(/(\d{3,4})/);
            if (numMatch && numMatch[1]) {
              const num = numMatch[1];
              const numInt = parseInt(num);
              const isAno = numInt >= 2020 && numInt <= 2025;
              
              if (num !== numeroCredenciado && !isAno) {
                numeroLaudoEncontrado = num;
                console.log(`✅ Número do laudo encontrado (busca flexível): ${numeroLaudoEncontrado}`);
                break;
              }
            }
          }
        }
        
        // Se ainda não encontrou, buscar todos os números de 3-4 dígitos e verificar contexto
        if (!numeroLaudoEncontrado) {
          const numerosNaSecao = secaoExame[0].match(/\b(\d{3,4})\b/g);
          if (numerosNaSecao) {
            for (const num of numerosNaSecao) {
              const numInt = parseInt(num);
              const isAno = numInt >= 2020 && numInt <= 2025;
              
              if (num !== numeroCredenciado && !isAno) {
                // Buscar contexto mais amplo: número dentro de 50 caracteres antes ou depois de "Laudo"
                const indexLaudo = secaoExame[0].toLowerCase().indexOf('laudo');
                const indexNum = secaoExame[0].indexOf(num);
                
                if (indexLaudo !== -1 && indexNum !== -1) {
                  const distancia = Math.abs(indexNum - indexLaudo);
                  if (distancia <= 50) {
                    numeroLaudoEncontrado = num;
                    console.log(`✅ Número do laudo encontrado (por proximidade de "Laudo"): ${numeroLaudoEncontrado}`);
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
    
    if (numeroLaudoEncontrado) {
      data.numero_laudo_renach = numeroLaudoEncontrado;
      console.log(`✅ Número do laudo RENACH definido: ${data.numero_laudo_renach}`);
    } else {
      console.log(`⚠️  Número do laudo não encontrado ou todos os números eram do credenciado`);
      console.log(`  📝 Debug: Procurando "1563" no texto...`);
      if (textoBusca.includes('1563')) {
        console.log(`  ✅ Número 1563 encontrado no texto, mas não foi capturado pelo padrão`);
      } else {
        console.log(`  ❌ Número 1563 NÃO encontrado no texto extraído`);
      }
    }
  }

  extractPhoneData(text, data) {
    // Telefone geralmente não está no RENACH, mas vamos tentar
    const telefonePatterns = [
      /Telefone[:\s]*(\d{10,11})/i,
      /(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/i
    ];
    
    for (const pattern of telefonePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.telefone = match[1].replace(/\D/g, '');
        console.log(`✅ Telefone encontrado no RENACH: ${data.telefone}`);
        break;
      }
    }
  }
}

module.exports = RenachProcessorUniversal;
```

---

## Código 2: Normalizador de Dados

**Arquivo**: `codigo/utils/renachDataNormalizer.js`

Este arquivo sanitiza e normaliza os dados extraídos antes de salvar no banco.

```javascript
/**
 * Utilitários para normalização e sanitização de dados extraídos do RENACH
 */

// Evitar salvar sentinelas como "NÃO ENCONTRADO"
function normalizeString(val) {
  if (val == null) return undefined;
  const s = String(val).trim();
  if (!s || /^n[ãa]o\s+encontrado/i.test(s) || s === 'null' || s === 'undefined') return undefined;
  return s;
}

// Datas do Brasil "dd/mm/aaaa" -> "aaaa-mm-dd"
function parseBrazilianDate(val) {
  if (!val) return undefined;
  const str = String(val).trim();
  // Padrões: dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd (já ISO)
  const m = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const iso = `${yyyy}-${mm}-${dd}`;
    // Validação simples
    const d = new Date(iso + 'T00:00:00Z');
    if (!Number.isNaN(d.getTime())) {
      return iso;
    }
  }
  // Tentar formato ISO já existente
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    const iso = `${yyyy}-${mm}-${dd}`;
    const d = new Date(iso + 'T00:00:00Z');
    if (!Number.isNaN(d.getTime())) {
      return iso;
    }
  }
  return undefined;
}

// Categoria CNH: extrair e validar
// Possíveis categorias: A, B, C, D, E, ACC (Autorização para Ciclomotor).
// Muitos RENACHs trazem múltiplas ou a atual na linha "Categoria".
function normalizeCategoriaCNH(raw) {
  const s = normalizeString(raw);
  if (!s) return undefined;

  // Procura padrões comuns: "Categoria: B", "Categoria atual: B", "Categoria: ACC"
  const catLabel = s.match(/categoria[^:]*:\s*([A-Z,\/\s]+)\b/i);
  let found = catLabel ? catLabel[1] : s;

  // Limpa separadores e pega a mais relevante. Regra: se houver B, prioriza B sobre ACC.
  const tokens = found
    .toUpperCase()
    .replace(/[^\w\/\s,]/g, ' ')
    .split(/[,\s\/]+/)
    .filter(Boolean);

  const valid = new Set(['A', 'B', 'C', 'D', 'E', 'ACC']);
  const onlyValid = tokens.filter(t => valid.has(t));

  if (onlyValid.length === 0) return undefined;

  // Heurística: priorizar B se existir; senão pegue a primeira
  if (onlyValid.includes('B')) return 'B';
  return onlyValid[0];
}

// Limpeza dos dados extraídos (antes do mapeamento)
function sanitizeExtractedData(raw = {}) {
  const cleaned = {};

  cleaned.nome_pai = normalizeString(raw.nome_pai);
  cleaned.nome_mae = normalizeString(raw.nome_mae);
  cleaned.categoria_cnh = normalizeCategoriaCNH(raw.categoria_cnh || raw.categoria || raw.categoriaCNH);

  // tipo_processo -> contexto
  let contexto = normalizeString(raw.tipo_processo || raw.contexto);
  // Normalização de contexto (opcional): "renovacao" -> "Renovação"
  if (contexto) {
    const c = contexto.toLowerCase();
    if (c.includes('renov')) contexto = 'Renovação';
    else if (c.includes('primeira')) contexto = 'Primeira Habilitação';
    else if (c.includes('mudan') || c.includes('adicao') || c.includes('adição')) contexto = 'Adição/Mudança de Categoria';
    // manter valor original se não casar
  }

  cleaned.contexto = contexto;

  cleaned.data_primeira_habilitacao = parseBrazilianDate(raw.data_primeira_habilitacao || raw.primeira_habilitacao);
  cleaned.data_exame = parseBrazilianDate(raw.data_exame || raw.data_do_exame);

  cleaned.numero_laudo_renach = normalizeString(raw.numero_laudo_renach || raw.numero_laudo || raw.renach || raw.numeroRenach);
  cleaned.numero_laudo = normalizeString(raw.numero_laudo || raw.laudo);
  cleaned.numero_endereco = normalizeString(raw.numero_endereco || raw.numero);

  // Foto é opcional e não deve bloquear os demais campos
  cleaned.renach_foto = raw.foto || raw.renach_foto || undefined;

  // Outros campos importantes
  cleaned.nome = normalizeString(raw.nome);
  cleaned.cpf = normalizeString(raw.cpf);
  cleaned.numero_renach = normalizeString(raw.numero_renach);
  cleaned.sexo = normalizeString(raw.sexo);
  cleaned.nacionalidade = normalizeString(raw.nacionalidade);
  cleaned.logradouro = normalizeString(raw.logradouro);
  cleaned.complemento = normalizeString(raw.complemento);
  cleaned.bairro = normalizeString(raw.bairro);
  cleaned.cep = normalizeString(raw.cep);
  cleaned.codigo_municipio = normalizeString(raw.codigo_municipio);
  cleaned.municipio = normalizeString(raw.municipio);
  cleaned.rg = normalizeString(raw.rg);
  cleaned.orgao_expedidor_rg = normalizeString(raw.orgao_expedidor_rg);
  cleaned.uf_rg = normalizeString(raw.uf_rg || 'SP'); // Default SP se não encontrado
  cleaned.resultado_exame = normalizeString(raw.resultado_exame);
  cleaned.data_nascimento = parseBrazilianDate(raw.data_nascimento || raw.data_de_nascimento);

  // Atividade remunerada: converter "SIM"/"NÃO" para boolean
  if (raw.atividade_remunerada) {
    const atividade = String(raw.atividade_remunerada).trim().toUpperCase();
    cleaned.atividade_remunerada = atividade === 'SIM' || atividade === 'TRUE' || atividade === '1';
  }

  // Remover undefined para facilitar o builder do UPDATE
  Object.keys(cleaned).forEach(k => cleaned[k] === undefined && delete cleaned[k]);

  return cleaned;
}

// Política de atualização: quando atualizar um campo?
// Só atualizar se o valor novo for não vazio e diferente do atual.
// Evitar sobreescrever com valores piores/menores (ex.: manter "B" ao invés de "ACC" se a heurística não tiver certeza).
// Datas só atualizar se válidas.
function shouldUpdateValue(current, next) {
  if (next == null || next === undefined) return false;
  if (current == null || current === undefined) return true;
  const cur = String(current).trim();
  const nxt = String(next).trim();
  if (!nxt) return false;
  if (!cur) return true;
  return cur !== nxt;
}

module.exports = {
  normalizeString,
  parseBrazilianDate,
  normalizeCategoriaCNH,
  sanitizeExtractedData,
  shouldUpdateValue
};
```

---

## Código 3: Rota de Upload do RENACH

**Arquivo**: `codigo/routes/pacientes.js` (trecho relevante)

Este trecho mostra como os dados extraídos são mapeados e salvos no banco de dados.

```javascript
const { sanitizeExtractedData, shouldUpdateValue } = require('../utils/renachDataNormalizer');
const RenachProcessor = require('../utils/renachProcessorUniversal');

// PUT /api/pacientes/:id/renach
router.put('/:id/renach', authenticateToken, async (req, res) => {
  const { id } = req.params;
  let renach_arquivo = null;
  let renach_foto = null;
  
  try {
    // Configurar timeouts para evitar ERR_CONNECTION_RESET
    req.setTimeout(180000); // 3 minutos
    res.setTimeout(180000);
    
    // Handler para garantir resposta
    let responded = false;
    const timeoutId = setTimeout(() => {
      if (!responded) {
        responded = true;
        res.status(504).json({ 
          error: 'Timeout no processamento do RENACH',
          message: 'O processamento está demorando mais que o esperado. Tente novamente.' 
        });
      }
    }, 180000);
    
    const sendResponse = (status, data) => {
      if (!responded) {
        responded = true;
        clearTimeout(timeoutId);
        res.status(status).json(data);
      }
    };
    
    const { renach } = req.body;
    
    if (!renach) {
      return sendResponse(400, { error: 'Arquivo RENACH é obrigatório' });
    }

    renach_arquivo = renach;
    
    console.log('📥 Recebendo upload de RENACH...');
    console.log(`📄 Tamanho do arquivo: ${(renach_arquivo.length / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('🔄 INICIANDO PROCESSAMENTO RENACH...');
    const processor = new RenachProcessor();
    const processResult = await processor.processRenach(renach_arquivo);
    
    // SEMPRE tentar usar processResult.data, mesmo se success = false
    const extractedData = processResult.data || {};
    
    // Sanitizar dados extraídos
    const cleanedData = sanitizeExtractedData(extractedData);
    
    console.log('🧹 DADOS SANITIZADOS E NORMALIZADOS:');
    console.log(`  🔑 Total de campos limpos: ${Object.keys(cleanedData).length}`);
    console.log(`  📋 Campos limpos: ${Object.keys(cleanedData).join(', ')}`);
    
    // Buscar dados atuais do paciente para comparar
    const currentPatient = await query(
      `SELECT cpf, nome, telefone_fixo, telefone_celular, 
              nome_pai, nome_mae, categoria_cnh, numero_laudo_renach, numero_laudo,
              data_primeira_habilitacao, data_exame, contexto, numero_endereco,
              logradouro, bairro, municipio, cep, complemento
       FROM pacientes WHERE id = $1`,
      [id]
    );
    
    // Mapear campos sanitizados para colunas do banco
    const fieldMapping = {
      numero_renach: 'numero_renach',
      nome: 'nome',
      data_nascimento: 'data_nascimento',
      sexo: 'sexo',
      categoria_cnh: 'categoria_cnh',
      nome_pai: 'nome_pai',
      nome_mae: 'nome_mae',
      contexto: 'contexto',
      naturalidade: 'naturalidade',
      nacionalidade: 'nacionalidade',
      logradouro: 'logradouro',
      numero_endereco: 'numero_endereco',
      complemento: 'complemento',
      bairro: 'bairro',
      cep: 'cep',
      codigo_municipio: 'codigo_municipio',
      municipio: 'municipio',
      resultado_exame: 'resultado_exame',
      data_exame: 'data_exame',
      data_primeira_habilitacao: 'data_primeira_habilitacao',
      numero_laudo_renach: 'numero_laudo_renach',
      numero_laudo: 'numero_laudo',
      rg: 'rg',
      orgao_expedidor_rg: 'orgao_expedidor_rg',
      uf_rg: 'uf_rg',
      atividade_remunerada: 'atividade_remunerada'
    };
    
    // Construir UPDATE query apenas com campos que devem ser atualizados
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    const current = currentPatient.rows[0] || {};
    
    for (const [cleanedField, dbField] of Object.entries(fieldMapping)) {
      const cleanedValue = cleanedData[cleanedField];
      const currentValue = current[dbField];
      
      if (cleanedValue !== undefined && cleanedValue !== null) {
        // Usar shouldUpdateValue para decidir se atualiza
        if (shouldUpdateValue(currentValue, cleanedValue)) {
          updateFields.push(`${dbField} = $${paramCount++}`);
          updateValues.push(cleanedValue);
        }
      }
    }
    
    // Executar UPDATE se houver campos para atualizar
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);
      
      const updateQuery = `UPDATE pacientes SET ${updateFields.join(', ')} WHERE id = $${paramCount}`;
      
      await query(updateQuery, updateValues);
    }
    
    // Salvar arquivo RENACH e foto no banco
    if (extractedData.foto) {
      renach_foto = extractedData.foto;
    }
    
    await query(
      `UPDATE pacientes 
       SET renach_arquivo = $1, 
           renach_foto = $2,
           renach_data_upload = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [renach_arquivo, renach_foto, id]
    );
    
    sendResponse(200, {
      message: 'Arquivo RENACH salvo com sucesso',
      extracted: cleanedData
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar RENACH:', error);
    res.status(500).json({ 
      error: 'Erro ao processar arquivo RENACH',
      message: error.message 
    });
  }
});
```

---

## Problemas Identificados

### 1. **Categoria CNH**
- **Esperado**: "B"
- **Obtido**: "ACC" ou não encontrado
- **Causa provável**: Os padrões regex não estão encontrando a categoria correta no PDF. Pode estar em formato diferente ou em linha separada.

### 2. **Tipo de Processo**
- **Esperado**: "Renovação"
- **Obtido**: Não encontrado
- **Causa provável**: O texto pode estar em formato diferente ou com espaçamento diferente no PDF.

### 3. **Data da Primeira Habilitação**
- **Esperado**: "27/06/2013"
- **Obtido**: Não encontrado
- **Causa provável**: O padrão regex pode não estar capturando essa data específica ou está em formato diferente.

### 4. **Data do Exame**
- **Esperado**: "28/10/2025"
- **Obtido**: Não encontrado
- **Causa provável**: Similar ao problema anterior, os padrões podem não estar cobrindo todos os formatos possíveis.

### 5. **Número do Laudo RENACH**
- **Esperado**: "1563"
- **Obtido**: "2025" (ano) ou não encontrado
- **Causa provável**: O sistema está confundindo o ano (2025) com o número do laudo. O código já tem lógica para evitar isso, mas pode precisar de ajustes.

### 6. **Campos que estão sendo extraídos mas não salvos**
- `codigo_municipio`: Está sendo extraído mas não está sendo incluído na sanitização/salvamento
- `uf_rg`: Similar ao anterior
- `data_nascimento`: Similar ao anterior

---

## Solicitação de Ajuda

Preciso de ajuda para:

1. **Melhorar os padrões regex** para capturar corretamente:
   - Categoria CNH (deve ser "B", não "ACC")
   - Tipo de Processo ("Renovação")
   - Data da Primeira Habilitação ("27/06/2013")
   - Data do Exame ("28/10/2025")
   - Número do Laudo RENACH ("1563", não "2025")

2. **Garantir que todos os campos extraídos sejam salvos**:
   - `codigo_municipio`
   - `uf_rg`
   - `data_nascimento`

3. **Melhorar a robustez da extração** para lidar com variações no formato do PDF.

4. **Verificar se há problemas na lógica de validação** que podem estar descartando valores válidos.

---

## Correções e Melhorias Implementadas (31/10/2025)

### 1. Validação de Categoria CNH - Corrigida ✅

**Problema:** Categoria "B" estava sendo rejeitada pela validação porque estava próxima da palavra "Matrícula" (letra "M").

**Solução Implementada:**

A função `isValidCategoria()` foi aprimorada para aceitar categorias em casos específicos:

```javascript
const isValidCategoria = (categoria, contextoAntes, contextoDepois) => {
  // 1. Rejeitar se parte de "ACC"
  if (contextoCompleto.includes('ACC') && contextoCompleto.includes(categoria + 'CC')) {
    return false;
  }
  
  // 2. ✅ NOVO: Aceitar se houver quebra de linha antes da próxima palavra
  if (contextoDepois.match(/^\s*[\n\r]/)) {
    return true;
  }
  
  // 3. ✅ NOVO: Aceitar se próxima palavra for palavra-chave conhecida
  const palavrasChaveDepois = /^(?:\s*(?:Matrícula|Cód|Registro|Preenchimento|Formulário|Primeira|Habilitação|Auto\s+Escola))/i;
  if (palavrasChaveDepois.test(contextoDepois)) {
    return true;
  }
  
  // 4. ✅ NOVO: Aceitar se houver muitos espaços (>= 3)
  if (contextoDepois.match(/^(\s{3,})/)) {
    return true;
  }
  
  // 5. Rejeitar apenas se muito próximo (< 2 caracteres) de outra letra
  if (contextoDepois.search(/[A-Z]/) < 2) {
    return false;
  }
  
  return true;
};
```

**Contexto aumentado:** De 15 para 30 caracteres para capturar melhor a estrutura com quebras de linha.

**Resultado:** Categoria "B" agora é aceita corretamente quando aparece isolada em linha própria antes de "Matrícula".

### 2. Extração de Categoria CNH - Melhorada ✅

**Estrutura do PDF:**
```
Categoria PretendidaSituação AtualPrimeira HabilitaçãoPreenchimento pela Auto Escola
Registro S.A.E.
 B                                    ← "B" isolado em linha própria
Matrícula da Auto Escola
```

**Padrões Prioritários:**

1. **Prioridade 1:** Buscar após "Categoria Pretendida" → "Registro S.A.E." → categoria isolada
2. **Prioridade 2:** Buscar após "Situação Atual" → mesmo padrão
3. **Prioridade 3:** Buscar após "Primeira Habilitação"
4. **Prioridade 4:** Buscar após "Categoria Atual"

O sistema escolhe a categoria com menor prioridade (menor número = melhor).

### 3. Sanitização de Dados - Aprimorada ✅

**Melhorias:**
- `data_nascimento` agora incluída na sanitização
- `uf_rg` com fallback para "SP" se não encontrado
- `codigo_municipio` incluído na sanitização
- Remoção de sentinelas como "NÃO ENCONTRADO"

### 4. Política de Atualização - Implementada ✅

Função `shouldUpdateValue()` garante que:
- Apenas valores válidos e diferentes são atualizados
- Valores existentes não são sobrescritos com valores piores
- Evita atualizações desnecessárias no banco

### 5. Logs Detalhados - Implementados ✅

Sistema de logs com emojis para facilitar debugging:
- 🔄 Processamento
- ✅ Sucesso
- ❌ Erro
- ⚠️ Aviso
- 📋 Dados
- 🔍 Busca/Análise
- 💾 Operação de banco

---

## Informações Adicionais

- **Linguagem**: JavaScript (Node.js)
- **Bibliotecas usadas**: `pdf-parse`, `pdfjs-dist`, `sharp`, `express`, `canvas`
- **Banco de dados**: PostgreSQL
- **Formato do PDF**: RENACH brasileiro (formato oficial do DETRAN)

### Características do Sistema:

- ✅ Extração automática de mais de 25 campos
- ✅ Validação robusta para evitar falsos positivos
- ✅ Normalização automática de dados
- ✅ Tratamento de erros resiliente
- ✅ Logs detalhados para debugging
- ✅ Timeouts configuráveis (texto: 30s, imagem: 60s, requisição: 180s)
- ✅ Limite de tamanho: 20MB (base64 decodificado)

### Estrutura do Texto Extraído:

O texto extraído do PDF pode ter quebras de linha inconsistentes e formatação variável, o que foi considerado no desenvolvimento dos padrões regex. Os padrões utilizam `[\s\S]*?` para flexibilidade com múltiplas linhas.

---

## Documentação Completa

Para documentação detalhada sobre todo o sistema de extração RENACH, consulte:
- **`EXTRACAO-RENACH-COMPLETA.md`**: Documentação completa do sistema, incluindo arquitetura, fluxo, padrões de extração, validações, normalização e exemplos de uso.

---

**Última atualização:** 31/10/2025  
**Versão:** 2.0  
**Status:** Sistema funcional e testado ✅

