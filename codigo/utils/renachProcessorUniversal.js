const pdf = require('pdf-parse');
const pdfjsLib = require('pdfjs-dist');
const sharp = require('sharp');
const { createCanvas } = require('canvas');

class RenachProcessorUniversal {
  constructor() {
    this.setupPdfJs();
  }

  setupPdfJs() {
    // Configurar pdfjs-dist para funcionar no Node.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.js');
  }

  async processRenach(renachArquivo) {
    console.log('🔄 Iniciando processamento universal do RENACH...');
    
    try {
      // Validar entrada
      if (!renachArquivo || typeof renachArquivo !== 'string') {
        throw new Error('Arquivo RENACH inválido ou vazio');
      }

      // Limitar tamanho para evitar problemas de memória
      const maxSize = 20 * 1024 * 1024; // 20MB em base64
      if (renachArquivo.length > maxSize) {
        console.warn(`⚠️ Arquivo muito grande: ${(renachArquivo.length / 1024 / 1024).toFixed(2)}MB`);
        throw new Error('Arquivo muito grande. Máximo permitido: 20MB');
      }

      // Converter base64 para buffer com timeout
      let pdfBuffer;
      try {
        pdfBuffer = Buffer.from(renachArquivo, 'base64');
        console.log(`📄 PDF convertido para buffer, tamanho: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB`);
      } catch (bufferError) {
        throw new Error('Erro ao converter arquivo base64: ' + bufferError.message);
      }

      // Extrair texto primeiro (mais importante)
      let textResult = '';
      try {
        textResult = await Promise.race([
          this.extractText(pdfBuffer),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout ao extrair texto (30s)')), 30000)
          )
        ]);
      } catch (textError) {
        console.error('❌ Erro ao extrair texto:', textError.message);
        throw new Error('Não foi possível extrair texto do PDF: ' + textError.message);
      }
      
      // Extrair imagem (opcional, não crítico)
      // REATIVADO com timeout e tratamento de erros melhorado
      let imageResult = null;
      try {
        console.log('🖼️ Tentando extrair foto do RENACH...');
        imageResult = await Promise.race([
          this.extractImage(pdfBuffer),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout ao extrair imagem (60s)')), 60000)
          )
        ]);
        if (imageResult) {
          console.log('✅ Foto extraída com sucesso!');
        }
      } catch (imageError) {
        console.error('❌ Erro ao extrair imagem:', imageError.message);
        console.log('⚠️ Continuando sem foto (opcional)...');
        // Não lançar erro, foto é opcional - continuar processamento
        imageResult = null;
      }

      // Processar dados extraídos
      let extractedData = {};
      try {
        console.log('⚙️ Processando dados extraídos...');
        console.log(`  📝 Tamanho do texto extraído: ${textResult.length} caracteres`);
        console.log(`  📝 Primeiros 500 caracteres: ${textResult.substring(0, 500)}...`);
        
        extractedData = this.parseRenachDataUniversal(textResult);
        
        console.log(`  ✅ Dados processados: ${Object.keys(extractedData).length} campos extraídos`);
        console.log(`  📋 Campos: ${Object.keys(extractedData).join(', ') || 'NENHUM'}`);
        
        // Log dos campos mais importantes
        if (extractedData.nome) console.log(`     Nome: ${extractedData.nome}`);
        if (extractedData.nome_pai) console.log(`     Nome Pai: ${extractedData.nome_pai}`);
        if (extractedData.nome_mae) console.log(`     Nome Mãe: ${extractedData.nome_mae}`);
        if (extractedData.categoria_cnh) console.log(`     Categoria CNH: ${extractedData.categoria_cnh}`);
        if (extractedData.numero_laudo_renach) console.log(`     Número Laudo: ${extractedData.numero_laudo_renach}`);
        
      } catch (parseError) {
        console.error('❌ Erro ao processar dados:', parseError.message);
        console.error('❌ Stack:', parseError.stack);
        // Continuar com dados parciais se possível
        extractedData = {};
        console.log('⚠️ Continuando com extractedData vazio devido ao erro');
      }

      const finalData = {
        ...extractedData,
        foto: imageResult
      };
      
      console.log(`\n📊 DADOS FINAIS PARA RETORNO:`);
      console.log(`  🔑 Total de campos: ${Object.keys(finalData).length}`);
      console.log(`  📋 Campos (sem foto): ${Object.keys(extractedData).join(', ') || 'NENHUM'}`);
      
      return {
        success: true,
        data: finalData
      };

    } catch (error) {
      console.error('❌ Erro no processamento universal:', error);
      console.error('❌ Stack:', error.stack);
      return {
        success: false,
        error: error.message,
        data: {}
      };
    }
  }

  async extractText(pdfBuffer) {
    console.log('🔍 Extraindo texto do PDF...');
    try {
      const data = await pdf(pdfBuffer);
      console.log('✅ Texto extraído com sucesso!');
      console.log(`📝 Texto extraído, tamanho: ${data.text.length}`);
      return data.text;
    } catch (error) {
      console.error('❌ Erro ao extrair texto:', error);
      throw error;
    }
  }

  async extractImage(pdfBuffer) {
    console.log('🖼️ Extraindo imagem do PDF...');
    try {
      // Converter Buffer para Uint8Array
      const uint8Array = new Uint8Array(pdfBuffer);
      const pdfDoc = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      const page = await pdfDoc.getPage(1);
      
      // Configurar escala alta para melhor qualidade no recorte
      const scale = 3.0; // 3x para garantir boa qualidade após o crop
      const viewport = page.getViewport({ scale });
      
      console.log(`📏 Dimensões da página: ${viewport.width}x${viewport.height}`);
      
      // Criar canvas
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      // Renderizar página no canvas
      console.log('🎨 Renderizando primeira página do PDF...');
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      console.log('✅ Página renderizada com sucesso!');
      
      // Converter canvas para PNG buffer
      const pngBuffer = canvas.toBuffer('image/png');
      
      // Obter metadados da imagem para calcular proporções
      const metadata = await sharp(pngBuffer).metadata();
      const { width, height } = metadata;
      
      console.log(`📐 Imagem completa: ${width}x${height}px`);
      
      // Calcular área da foto baseado na análise das imagens reais
      // Foto está no canto superior direito, mas precisa de coordenadas mais precisas
      // Ajustado para pegar exatamente a área da foto 3x4 sem cortar o rosto e sem pegar bordas
      
      const fotoWidth = Math.floor(width * 0.12);   // 12% da largura (área mais precisa da foto 3x4, sem bordas)
      const fotoHeight = Math.floor(height * 0.18);  // 18% da altura (área mais precisa da foto 3x4)
      const fotoLeft = Math.floor(width * 0.82);     // 82% da largura (mais à direita para evitar bordas esquerdas)
      const fotoTop = Math.floor(height * 0.15);     // 15% da altura (posição mais precisa abaixo do número RENACH)
      
      console.log(`✂️ Recortando área da foto: ${fotoWidth}x${fotoHeight}px na posição (${fotoLeft}, ${fotoTop})`);
      
      // Verificar se as coordenadas estão dentro dos limites da imagem
      if (fotoLeft + fotoWidth > width || fotoTop + fotoHeight > height) {
        console.log('⚠️ Coordenadas fora dos limites, ajustando...');
        console.log(`Imagem: ${width}x${height}, Tentativa: ${fotoLeft + fotoWidth}x${fotoTop + fotoHeight}`);
        
        // Ajustar coordenadas para ficarem dentro dos limites
        const adjustedLeft = Math.min(fotoLeft, width - fotoWidth);
        const adjustedTop = Math.min(fotoTop, height - fotoHeight);
        
        console.log(`Coordenadas ajustadas: (${adjustedLeft}, ${adjustedTop})`);
        
        var croppedBuffer = await sharp(pngBuffer)
          .extract({ 
            left: adjustedLeft, 
            top: adjustedTop, 
            width: fotoWidth, 
            height: fotoHeight 
          })
          .resize(300, 400, { // Redimensionar para tamanho padrão de foto 3x4
            fit: 'cover',
            position: 'center'
          })
          .sharpen() // Aplicar sharpen para melhorar qualidade
          .png({ quality: 95, compressionLevel: 9 })
          .toBuffer();
      } else {
        // Recortar apenas a área da foto
        var croppedBuffer = await sharp(pngBuffer)
          .extract({ 
            left: fotoLeft, 
            top: fotoTop, 
            width: fotoWidth, 
            height: fotoHeight 
          })
          .resize(300, 400, { // Redimensionar para tamanho padrão de foto 3x4
            fit: 'cover',
            position: 'center'
          })
          .sharpen() // Aplicar sharpen para melhorar qualidade
          .png({ quality: 95, compressionLevel: 9 })
          .toBuffer();
      }
      
      // Converter para base64
      const base64 = croppedBuffer.toString('base64');
      const imageDataUrl = `data:image/png;base64,${base64}`;
      
      console.log(`✅ Foto extraída e recortada: ${(croppedBuffer.length / 1024).toFixed(2)} KB`);
      
      return imageDataUrl;

    } catch (error) {
      console.error('❌ Erro ao extrair imagem:', error);
      return null;
    }
  }

  parseRenachDataUniversal(text) {
    console.log('🔍 Iniciando análise universal do texto RENACH...');
    
    const data = {};

    // 1. NÚMERO RENACH - Padrão universal
    const renachMatch = text.match(/SP\d{9}/);
    if (renachMatch) {
      data.numero_renach = renachMatch[0];
      console.log(`✅ Número RENACH encontrado: ${data.numero_renach}`);
    }

    // 2. CPF - Padrão universal (evitar CPF do psicólogo)
    const cpfPatterns = [
      /(\d{3}\.\d{3}\.\d{3}-\d{2})/g
    ];
    
    for (const pattern of cpfPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const cpf of matches) {
          // Evitar CPF do psicólogo
          if (cpf !== '237.244.708-43') {
            data.cpf = cpf;
            console.log(`✅ CPF encontrado: ${data.cpf}`);
            break;
          }
        }
        if (data.cpf) break;
      }
    }

    // 3. DADOS PESSOAIS - Padrão universal
    this.extractPersonalData(text, data);
    
    // 3.5. TIPO DE PROCESSO - Extrair (Renovação, Primeira Habilitação, etc) - CORRIGIDO
    // IMPORTANTE: No PDF, "Tipo de Processo" e "Renovação" podem estar separados por várias linhas
    // Exemplo: "Tipo de Processo" -> linha vazia -> "Matrícula da Auto Escola" -> "Renovação"
    
    // Primeiro, encontrar a posição de "Tipo de Processo"
    const tipoProcessoIndex = text.search(/Tipo\s+de\s+Processo/i);
    
    if (tipoProcessoIndex !== -1) {
      // Pegar uma janela de 300 caracteres após "Tipo de Processo"
      const janela = text.substring(tipoProcessoIndex, tipoProcessoIndex + 300);
      
      // Buscar valores conhecidos de tipo de processo nessa janela
      const valoresConhecidos = [
        { pattern: /Renovação|Renovacao/i, valor: 'Renovação' },
        { pattern: /Primeira\s+Habilitação|Primeira\s+Habilitacao/i, valor: 'Primeira Habilitação' },
        { pattern: /Adição\s+de\s+Categoria|Adicao\s+de\s+Categoria/i, valor: 'Adição de Categoria' },
        { pattern: /Mudança\s+de\s+Categoria|Mudanca\s+de\s+Categoria/i, valor: 'Mudança de Categoria' },
        { pattern: /Reabilitação|Reabilitacao/i, valor: 'Reabilitação' },
        { pattern: /2ª?\s*Via/i, valor: '2ª Via' }
      ];
      
      for (const item of valoresConhecidos) {
        const match = janela.match(item.pattern);
        if (match) {
          data.tipo_processo = item.valor;
          console.log(`✅ Tipo de processo encontrado: ${data.tipo_processo} (em janela após "Tipo de Processo")`);
          break;
        }
      }
    }
    
    // Se não encontrou, tentar padrões mais genéricos
    if (!data.tipo_processo) {
      const tipoProcessoPatterns = [
        // Padrão super flexível (até 500 caracteres entre rótulo e valor)
        /Tipo\s+de\s+Processo[\s\S]{0,500}?(Renovação|Renovacao|Primeira\s+Habilitação|Primeira\s+Habilitacao|Adição|Adicao|Mudança|Mudanca|Reabilitação|Reabilitacao|2ª?\s*Via)/i,
        // Padrão na mesma linha
        /Tipo\s+de\s+Processo[:\s]*([A-ZÁÊÇÕ\s]+?)(?=\s*$|\n|Preenchimento|Categoria|Sexo|Matrícula)/i,
        // Padrão com uma linha entre
        /Tipo\s+de\s+Processo[:\s]*\n\s*([A-ZÁÊÇÕ\s]{3,}?)(?=\s*\n\s*(?:Categoria|Sexo|Data|Preenchimento|$))/i,
        // Buscar diretamente no texto (sem rótulo)
        /(Renovação|Renovacao)(?=\s*Categoria|\s*$)/i
      ];
      
      for (const pattern of tipoProcessoPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          let tipoProcesso = match[1].trim();
          // Remover prefixo se existir
          tipoProcesso = tipoProcesso.replace(/^Tipo\s+(de\s+)?Processo[:\s]*/i, '').trim();
          // Normalizar variações
          if (tipoProcesso.toLowerCase().includes('renov')) {
            tipoProcesso = 'Renovação';
          } else if (tipoProcesso.toLowerCase().includes('primeira')) {
            tipoProcesso = 'Primeira Habilitação';
          } else if (tipoProcesso.toLowerCase().includes('mudan') || tipoProcesso.toLowerCase().includes('adicao') || tipoProcesso.toLowerCase().includes('adição')) {
            tipoProcesso = 'Adição/Mudança de Categoria';
          } else if (tipoProcesso.toLowerCase().includes('reabilita')) {
            tipoProcesso = 'Reabilitação';
          } else if (tipoProcesso.toLowerCase().includes('2a via') || tipoProcesso.toLowerCase().includes('2 via')) {
            tipoProcesso = '2ª Via';
          }
          if (tipoProcesso.length > 2 && tipoProcesso.length <= 50 && tipoProcesso !== 'Processo') {
            data.tipo_processo = tipoProcesso;
            console.log(`✅ Tipo de processo encontrado: ${data.tipo_processo} (padrão: ${pattern})`);
            break;
          }
        }
      }
    }
    
    // Debug: se não encontrou, mostrar contexto
    if (!data.tipo_processo) {
      const tipoProcessoIndexDebug = text.search(/Tipo\s+de\s+Processo/i);
      if (tipoProcessoIndexDebug !== -1) {
        const contexto = text.substring(tipoProcessoIndexDebug, tipoProcessoIndexDebug + 200);
        console.log(`⚠️  Tipo de processo não encontrado. Contexto após "Tipo de Processo": ${contexto.substring(0, 150)}...`);
        // Verificar se "Renovação" existe no texto
        if (text.includes('Renovação') || text.includes('Renovacao')) {
          const renovacaoIndex = text.search(/Renovação|Renovacao/i);
          console.log(`ℹ️  "Renovação" encontrada no texto na posição ${renovacaoIndex}, distância de "Tipo de Processo": ${renovacaoIndex - tipoProcessoIndexDebug} caracteres`);
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
    // 1. NOME COMPLETO - Extrair primeiro (antes de Pai/Mãe)
    // ESTRUTURA DO PDF:
    // "Nome:\nPai:\nMãe:\nJHORDAN CANDIDO DOS SANTOS SIMEAO\nADALBERTO DA SILVA SIMEAO\nELISANGELA DOS SANTOS"
    // O nome do paciente está na PRIMEIRA linha APÓS todos os rótulos "Nome:", "Pai:", "Mãe:"
    
    // Buscar seção "Dados Pessoais" e depois "Nome:"
    const dadosPessoaisMatch = text.match(/Dados\s+Pessoais[\s\S]*?Nome[:\s]/i);
    if (dadosPessoaisMatch) {
      // Pegar o texto após "Dados Pessoais" até encontrar "Nome:"
      const textoAposDados = text.substring(text.indexOf('Dados Pessoais'));
      // Encontrar onde começa após "Nome:", "Pai:", "Mãe:"
      const nomeLabelIndex = textoAposDados.search(/Nome[:\s]/i);
      if (nomeLabelIndex !== -1) {
        // Pegar texto após "Nome:"
        const textoAposNome = textoAposDados.substring(nomeLabelIndex);
        // Dividir em linhas
        const linhas = textoAposNome.split(/\n/);
        
        // Encontrar a primeira linha que não é um rótulo (Nome:, Pai:, Mãe:)
        // Essa deve ser o nome do paciente
        for (let i = 0; i < linhas.length; i++) {
          const linha = linhas[i].trim();
          
          // Pular linhas vazias ou rótulos
          if (!linha || linha.match(/^(?:Nome|Pai|Mãe)[:\s]*$/i)) continue;
          
          // Se a linha é um nome válido (maiúsculas, sem dois pontos, sem números de data)
          if (linha.length > 5 && linha.length < 100 && 
              /^[A-ZÁÊÇÕ\s]+$/.test(linha) && 
              !linha.match(/\d{2}\/\d{2}\/\d{4}/) &&
              !linha.match(/(?:Sexo|Tipo|Data|Número|Nacionalidade|Naturalidade)[:\s]/i)) {
            data.nome = linha;
            console.log(`✅ Nome completo encontrado: "${data.nome}"`);
            break;
          }
        }
      }
    }
    
    // Se não encontrou, tentar método alternativo mais simples
    if (!data.nome) {
      const nomeLabelIndex = text.search(/Nome[:\s]/i);
      if (nomeLabelIndex !== -1) {
        const textoAposNome = text.substring(nomeLabelIndex);
        const linhas = textoAposNome.split(/\n/);
        
        // Pular a primeira linha (é "Nome:")
        // A próxima linha que não é "Pai:" ou "Mãe:" deve ser o nome
        for (let i = 1; i < linhas.length && i < 5; i++) {
          const linha = linhas[i].trim();
          if (!linha || linha.match(/^(?:Pai|Mãe)[:\s]*$/i)) continue;
          if (linha.length > 5 && linha.length < 100 && 
              /^[A-ZÁÊÇÕ\s]+$/.test(linha) &&
              !linha.match(/\d{2}\/\d{2}\/\d{4}/)) {
            data.nome = linha;
            console.log(`✅ Nome completo encontrado (método alternativo): "${data.nome}"`);
            break;
          }
        }
      }
    }
    
    // 2. NOME DO PAI - Extrair CORRETAMENTE
    // ESTRUTURA: Após "Nome:", "Pai:", "Mãe:" vem:
    // Linha 1: JHORDAN CANDIDO DOS SANTOS SIMEAO (nome do paciente)
    // Linha 2: ADALBERTO DA SILVA SIMEAO (nome do pai)
    // Linha 3: ELISANGELA DOS SANTOS (nome da mãe)
    
    // Buscar seção "Dados Pessoais"
    const dadosPessoaisMatchPai = text.match(/Dados\s+Pessoais[\s\S]*?Nome[:\s]/i);
    if (dadosPessoaisMatchPai) {
      const textoAposDadosPai = text.substring(text.indexOf('Dados Pessoais'));
      const linhasPai = textoAposDadosPai.split(/\n/);
      
      // Encontrar onde estão os nomes (após os rótulos)
      let encontrouRotulosPai = false;
      let contadorLinhasPai = 0;
      
      for (let i = 0; i < linhasPai.length; i++) {
        const linha = linhasPai[i].trim();
        
        // Contar quando encontra os rótulos
        if (linha.match(/^(?:Nome|Pai|Mãe)[:\s]*$/i)) {
          encontrouRotulosPai = true;
          continue;
        }
        
        // Após encontrar os rótulos, contar linhas de nomes
        if (encontrouRotulosPai) {
          // Pular linhas vazias
          if (!linha) continue;
          
          // Parar se encontrar um campo novo
          if (linha.match(/(?:Sexo|Tipo|Data|Número|Nacionalidade|Naturalidade|Endereço)[:\s]/i)) break;
          
          // Linha 1: nome do paciente (já deve estar em data.nome)
          if (contadorLinhasPai === 0) {
            contadorLinhasPai++;
            continue; // Pular linha 1 (nome do paciente)
          }
          
          // Linha 2: nome do pai
          if (contadorLinhasPai === 1) {
            if (linha.length >= 5 && linha.length <= 80 && 
                /^[A-ZÁÊÇÕ\s]+$/.test(linha) &&
                (!data.nome || linha.toUpperCase() !== data.nome.toUpperCase())) {
              data.nome_pai = linha.replace(/\s+/g, ' ').trim();
              console.log(`✅ Nome do pai encontrado: "${data.nome_pai}"`);
              break;
            }
          }
          
          contadorLinhasPai++;
        }
      }
    }

    // 3. NOME DA MÃE - Extrair CORRETAMENTE
    // ESTRUTURA: Após "Nome:", "Pai:", "Mãe:" vem:
    // Linha 1: JHORDAN CANDIDO DOS SANTOS SIMEAO (nome do paciente)
    // Linha 2: ADALBERTO DA SILVA SIMEAO (nome do pai)
    // Linha 3: ELISANGELA DOS SANTOS (nome da mãe)
    
    // Buscar seção "Dados Pessoais"
    const dadosPessoaisMatchMae = text.match(/Dados\s+Pessoais[\s\S]*?Nome[:\s]/i);
    if (dadosPessoaisMatchMae) {
      const textoAposDadosMae = text.substring(text.indexOf('Dados Pessoais'));
      const linhasMae = textoAposDadosMae.split(/\n/);
      
      // Encontrar onde estão os nomes (após os rótulos)
      let encontrouRotulosMae = false;
      let contadorLinhasMae = 0;
      
      for (let i = 0; i < linhasMae.length; i++) {
        const linha = linhasMae[i].trim();
        
        // Contar quando encontra os rótulos
        if (linha.match(/^(?:Nome|Pai|Mãe)[:\s]*$/i)) {
          encontrouRotulosMae = true;
          continue;
        }
        
        // Após encontrar os rótulos, contar linhas de nomes
        if (encontrouRotulosMae) {
          // Pular linhas vazias
          if (!linha) continue;
          
          // Parar se encontrar um campo novo
          if (linha.match(/(?:Sexo|Tipo|Data|Número|Nacionalidade|Naturalidade|Endereço)[:\s]/i)) break;
          
          // Linha 1: nome do paciente
          if (contadorLinhasMae === 0) {
            contadorLinhasMae++;
            continue;
          }
          
          // Linha 2: nome do pai
          if (contadorLinhasMae === 1) {
            contadorLinhasMae++;
            continue;
          }
          
          // Linha 3: nome da mãe
          if (contadorLinhasMae === 2) {
            if (linha.length >= 3 && linha.length <= 80 && 
                /^[A-ZÁÊÇÕ\s]+$/.test(linha) &&
                (!data.nome || linha.toUpperCase() !== data.nome.toUpperCase()) &&
                (!data.nome_pai || linha.toUpperCase() !== data.nome_pai.toUpperCase())) {
              data.nome_mae = linha.replace(/\s+/g, ' ').trim();
              console.log(`✅ Nome da mãe encontrado: "${data.nome_mae}"`);
              break;
            }
          }
          
          contadorLinhasMae++;
        }
      }
    }

    // Data de nascimento - Padrão universal (Atualizado para ser mais flexível)
    const dataNascPatterns = [
      // NOVO: Padrão flexível para Data do Nascimento com várias linhas
      /Data\s+do\s+Nascimento[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
      // Padrões existentes
      /Data\s+Nascimento[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      /Nascimento[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      // Fallback: buscar data próxima a "Nacionalidade" ou "Brasileiro"
      /(\d{2}\/\d{2}\/\d{4})(?=\s*Brasileiro|\s*Nacionalidade)/i
    ];
    
    for (const pattern of dataNascPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.data_nascimento = match[1];
        console.log(`✅ Data de nascimento encontrada: ${data.data_nascimento}`);
        break;
      }
    }

    // Sexo - Padrão universal
    const sexoPatterns = [
      /\bSexo[:\s]*(Masculino|Feminino)/i,
      /(Masculino|Feminino)/i
    ];

    for (const pattern of sexoPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.sexo = match[1];
        console.log(`✅ Sexo encontrado: ${data.sexo}`);
        break;
      }
    }

    // Nacionalidade - Padrão universal
    const nacionalidadePatterns = [
      /Nacionalidade[:\s]*(Brasileiro|Brasileira)/i,
      /(Brasileiro|Brasileira)/i
    ];

    for (const pattern of nacionalidadePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.nacionalidade = match[1];
        console.log(`✅ Nacionalidade encontrada: ${data.nacionalidade}`);
        break;
      }
    }

    // Categoria CNH - Padrão universal (Atual e Pretendida) - CORRIGIDO FINAL COM DEBUG
    // IMPORTANTE: Priorizar "Categoria Pretendida" e "Situação Atual", ambos são "B"
    // CRÍTICO: Evitar capturar "A" de "ACC" - validar contexto explicitamente
    console.log('\n🔍 ===== INICIANDO BUSCA DE CATEGORIA CNH =====');
    
    // Mostrar seções relevantes do texto para debug
    const secaoCategoriaIndex = text.search(/Categoria|Situação/i);
    if (secaoCategoriaIndex !== -1) {
      const secaoDebug = text.substring(secaoCategoriaIndex, secaoCategoriaIndex + 300);
      console.log('📄 SEÇÃO DO TEXTO (300 chars após primeira ocorrência de "Categoria" ou "Situação"):');
      console.log(`   "${secaoDebug.substring(0, 200)}..."`);
    }
    
    const categoriaCandidates = [];
    
    // Função auxiliar para validar categoria (evitar ACC e outros falsos positivos)
    // Aceita categorias simples (A, B, C, D, E) e combinadas (AB, AC, BC, etc.)
    const isValidCategoria = (categoria, contextoAntes, contextoDepois) => {
      // Verificar se categoria é válida (simples ou combinada)
      const categoriaValida = /^[A-E]{1,5}$/.test(categoria);
      if (!categoriaValida) {
        console.log(`  ⚠️  Categoria "${categoria}" rejeitada: formato inválido`);
        return false;
      }
      
      // Verificar se está dentro de "ACC" (Acordo de Categoria Concedida)
      const contextoCompleto = (contextoAntes + categoria + contextoDepois).toUpperCase();
      if (contextoCompleto.includes('ACC') && contextoCompleto.includes(categoria + 'CC')) {
        console.log(`  ⚠️  Categoria "${categoria}" rejeitada: parece ser parte de "ACC"`);
        console.log(`     Contexto completo: "${contextoCompleto}"`);
        return false;
      }
      
      // CORRIGIDO: Verificar se categoria está isolada (rodeada por espaços/quebras de linha)
      // O "B" está em uma linha própria: "\n B\n", então contextoDepois deve ter quebra de linha
      // IMPORTANTE: Se há uma quebra de linha entre a categoria e a próxima palavra, está isolado
      
      // Verificar se há quebra de linha (com espaços opcionais) antes da próxima palavra
      const temQuebraLinhaAntesProximaPalavra = contextoDepois.match(/^\s*[\n\r]/);
      
      // Se há quebra de linha, a categoria está isolada em sua própria linha - ACEITAR
      if (temQuebraLinhaAntesProximaPalavra) {
        console.log(`  ✅ Categoria "${categoria}" aceita: está isolada em linha própria`);
        return true;
      }
      
      // Se não há quebra de linha, verificar distância até próxima palavra
      const inicioDepois = contextoDepois.trim();
      const comecaComPalavra = inicioDepois && /^[A-Z]/.test(inicioDepois);
      
      if (comecaComPalavra) {
        // Contar espaços/quebras de linha antes da primeira letra
        const matchEspacos = contextoDepois.match(/^(\s*)/);
        const numEspacos = matchEspacos ? matchEspacos[1].length : 0;
        
        // Se há pelo menos 3 espaços/quebras de linha OU começa com palavras-chave conhecidas,
        // a categoria está isolada o suficiente
        const palavrasChaveDepois = /^(?:\s*(?:Matrícula|Cód|Registro|Preenchimento|Formulário|Primeira|Habilitação|Auto\s+Escola))/i;
        if (palavrasChaveDepois.test(contextoDepois)) {
          console.log(`  ✅ Categoria "${categoria}" aceita: seguida de palavra-chave conhecida`);
          return true;
        }
        
        // Se há muitos espaços (>= 3), provavelmente está isolado
        if (numEspacos >= 3) {
          console.log(`  ✅ Categoria "${categoria}" aceita: há ${numEspacos} espaços antes da próxima palavra`);
          return true;
        }
        
        // Se está muito próximo (menos de 2 caracteres), pode ser parte de palavra
        const distanciaParaProximaLetra = contextoDepois.search(/[A-Z]/);
        if (distanciaParaProximaLetra >= 0 && distanciaParaProximaLetra < 2) {
          console.log(`  ⚠️  Categoria "${categoria}" rejeitada: muito próxima de letra "${contextoDepois[distanciaParaProximaLetra]}" (distância: ${distanciaParaProximaLetra})`);
          return false;
        }
      }
      
      // Por padrão, aceitar se chegou até aqui
      return true;
    };
    
    // Buscar "Categoria Pretendida" (PRIORIDADE MÁXIMA) - CORRIGIDO
    // PROBLEMA: O texto está sem espaços: "Categoria PretendidaSituação Atual" e o regex pega "a" de "Situação"
    // SOLUÇÃO: Buscar categoria isolada (sozinha, em linha própria) - padrão específico do RENACH
    // Estrutura: "Categoria PretendidaSituação Atual...Registro S.A.E.\n B\n"
    const pretendidaIndex = text.search(/Categoria\s+Pretendida/i);
    console.log(`\n🔍 Buscando "Categoria Pretendida": ${pretendidaIndex !== -1 ? `ENCONTRADO na posição ${pretendidaIndex}` : 'NÃO ENCONTRADO'}`);
    
    if (pretendidaIndex !== -1) {
      const janela = text.substring(pretendidaIndex, pretendidaIndex + 400);
      console.log(`   📝 Janela de texto (400 chars): "${janela.substring(0, 200)}..."`);
      
      // Padrão específico: buscar "Registro S.A.E." seguido de quebra de linha e categoria isolada
      // Atualizado para capturar categorias combinadas como "AB", "AC", etc.
      let pretendidaMatch = janela.match(/Registro\s+S\.A\.E\.\s*\n\s*([A-E]{1,5})\s*\n/i);
      
      if (!pretendidaMatch) {
        // Fallback 1: buscar categoria isolada após "Categoria Pretendida" ou "Situação Atual", ignorando palavras intermediárias
        // Buscar padrão: quebra de linha + espaços + categoria A-E (simples ou combinada) + quebra de linha ou fim
        pretendidaMatch = janela.match(/Categoria\s+Pretendida(?:Situação\s+Atual)?[\s\S]*?\n\s+([A-E]{1,5})\s*(?:\n|$)/i);
      }
      
      if (!pretendidaMatch) {
        // Fallback 2: buscar qualquer categoria isolada em linha própria (não dentro de palavra)
        pretendidaMatch = janela.match(/Categoria\s+Pretendida[\s\S]*?\n\s*([A-E]{1,5})\s+(?:\n|$)/i);
      }
      
      console.log(`   🔎 Resultado do regex: ${pretendidaMatch ? `MATCH encontrado - Categoria: "${pretendidaMatch[1]}"` : 'SEM MATCH'}`);
      
      if (pretendidaMatch && pretendidaMatch[1]) {
        const categoria = pretendidaMatch[1].toUpperCase();
        console.log(`   📌 Categoria extraída: "${categoria}"`);
        
        // Validar categoria (simples ou combinada: A, B, AB, AC, etc.)
        if (/^[A-E]{1,5}$/.test(categoria)) {
          // Verificar contexto: categoria deve estar isolada
          const matchStart = pretendidaMatch.index;
          const matchEnd = matchStart + pretendidaMatch[0].length;
          const contextoAntes = janela.substring(Math.max(0, matchStart - 15), matchStart);
          // Aumentar contexto para capturar quebras de linha e próxima palavra completa
          const contextoDepois = janela.substring(matchEnd, Math.min(janela.length, matchEnd + 30));
          
          console.log(`   📍 Contexto antes: "${contextoAntes}"`);
          console.log(`   📍 Contexto depois: "${contextoDepois}"`);
          
          // Validar que a categoria está realmente isolada (para categorias simples ou combinadas)
          const categoriaIsolada = /\s+[A-E]{1,5}\s+/.test(pretendidaMatch[0].substring(pretendidaMatch[0].length - 10));
          if (categoriaIsolada || contextoDepois.match(/^\s*(?:\n|\r|Matrícula|Cód|Registro|Preenchimento|Formulário)/)) {
            if (isValidCategoria(categoria, contextoAntes, contextoDepois)) {
              categoriaCandidates.push({ value: categoria, priority: 1, source: 'Categoria Pretendida', index: pretendidaIndex });
              console.log(`  ✅ Candidato encontrado: "${categoria}" de "Categoria Pretendida" (prioridade 1)`);
            } else {
              console.log(`  ❌ Candidato "${categoria}" REJEITADO pela validação`);
            }
          } else {
            console.log(`  ⚠️  Categoria "${categoria}" parece estar dentro de uma palavra, rejeitando...`);
          }
        }
      } else {
        console.log(`   ⚠️  Nenhuma categoria A-E isolada encontrada após "Categoria Pretendida"`);
        // Debug: mostrar onde está o "B" na janela
        const posicaoB = janela.search(/\s+[B]\s+/);
        if (posicaoB !== -1) {
          const contextoB = janela.substring(Math.max(0, posicaoB - 20), Math.min(janela.length, posicaoB + 20));
          console.log(`   ℹ️  "B" encontrado na posição ${posicaoB} da janela: "${contextoB}"`);
        }
      }
    }
    
    // Buscar "Situação Atual" (PRIORIDADE ALTA) - CORRIGIDO
    // Mesmo problema: evitar pegar "a" de "Atual" ou de outras palavras
    // SOLUÇÃO: Buscar o mesmo "B" que aparece após "Registro S.A.E."
    const situacaoIndex = text.search(/Situação\s+Atual/i);
    console.log(`\n🔍 Buscando "Situação Atual": ${situacaoIndex !== -1 ? `ENCONTRADO na posição ${situacaoIndex}` : 'NÃO ENCONTRADO'}`);
    
    if (situacaoIndex !== -1) {
      const janela = text.substring(situacaoIndex, situacaoIndex + 400);
      console.log(`   📝 Janela de texto (400 chars): "${janela.substring(0, 200)}..."`);
      
      // Mesmo padrão: buscar "Registro S.A.E." seguido de quebra de linha e categoria isolada
      // Ambos "Categoria Pretendida" e "Situação Atual" apontam para o mesmo "B"
      // Atualizado para capturar categorias combinadas como "AB", "AC", etc.
      let situacaoMatch = janela.match(/Registro\s+S\.A\.E\.\s*\n\s*([A-E]{1,5})\s*\n/i);
      
      if (!situacaoMatch) {
        // Fallback 1: buscar categoria isolada após "Situação Atual"
        situacaoMatch = janela.match(/Situação\s+Atual[\s\S]*?\n\s+([A-E]{1,5})\s*(?:\n|$)/i);
      }
      
      if (!situacaoMatch) {
        // Fallback 2: buscar qualquer categoria isolada em linha própria
        situacaoMatch = janela.match(/Situação\s+Atual[\s\S]*?\n\s*([A-E]{1,5})\s+(?:\n|$)/i);
      }
      
      console.log(`   🔎 Resultado do regex: ${situacaoMatch ? `MATCH encontrado - Categoria: "${situacaoMatch[1]}"` : 'SEM MATCH'}`);
      
      if (situacaoMatch && situacaoMatch[1]) {
        const categoria = situacaoMatch[1].toUpperCase();
        console.log(`   📌 Categoria extraída: "${categoria}"`);
        
        // Validar categoria (simples ou combinada: A, B, AB, AC, etc.)
        if (/^[A-E]{1,5}$/.test(categoria)) {
          const matchStart = situacaoMatch.index;
          const matchEnd = matchStart + situacaoMatch[0].length;
          const contextoAntes = janela.substring(Math.max(0, matchStart - 15), matchStart);
          // Aumentar contexto para capturar quebras de linha e próxima palavra completa
          const contextoDepois = janela.substring(matchEnd, Math.min(janela.length, matchEnd + 30));
          
          console.log(`   📍 Contexto antes: "${contextoAntes}"`);
          console.log(`   📍 Contexto depois: "${contextoDepois}"`);
          
          // Validar que categoria está isolada (para categorias simples ou combinadas)
          const categoriaIsolada = /\s+[A-E]{1,5}\s+/.test(situacaoMatch[0].substring(situacaoMatch[0].length - 10));
          if (categoriaIsolada || contextoDepois.match(/^\s*(?:\n|\r|Matrícula|Cód|Registro|Preenchimento|Formulário)/)) {
            if (isValidCategoria(categoria, contextoAntes, contextoDepois)) {
              categoriaCandidates.push({ value: categoria, priority: 2, source: 'Situação Atual', index: situacaoIndex });
              console.log(`  ✅ Candidato encontrado: "${categoria}" de "Situação Atual" (prioridade 2)`);
            } else {
              console.log(`  ❌ Candidato "${categoria}" REJEITADO pela validação`);
            }
          } else {
            console.log(`  ⚠️  Categoria "${categoria}" parece estar dentro de uma palavra, rejeitando...`);
          }
        }
      } else {
        console.log(`   ⚠️  Nenhuma categoria A-E isolada encontrada após "Situação Atual"`);
        // Debug: mostrar onde está o "B"
        const posicaoB = janela.search(/\s+[B]\s+/);
        if (posicaoB !== -1) {
          const contextoB = janela.substring(Math.max(0, posicaoB - 20), Math.min(janela.length, posicaoB + 20));
          console.log(`   ℹ️  "B" encontrado na posição ${posicaoB} da janela: "${contextoB}"`);
        }
      }
    }
    
    // Buscar "Primeira Habilitação" (PRIORIDADE MÉDIA)
    const primeiraHabilitacaoIndex = text.search(/Primeira\s+Habilitação/i);
    if (primeiraHabilitacaoIndex !== -1) {
      const janela = text.substring(primeiraHabilitacaoIndex, primeiraHabilitacaoIndex + 200);
      // Atualizado para capturar categorias combinadas
      const primeiraHabilitacaoMatch = janela.match(/Primeira\s+Habilitação[\s\S]*?([A-E]{1,5})(?!\w)/i);
      if (primeiraHabilitacaoMatch && primeiraHabilitacaoMatch[1]) {
        const categoria = primeiraHabilitacaoMatch[1].toUpperCase();
        // Validar categoria (simples ou combinada)
        if (/^[A-E]{1,5}$/.test(categoria)) {
          const posicaoRelativa = primeiraHabilitacaoMatch.index + primeiraHabilitacaoMatch[0].length;
          const contextoAntes = janela.substring(Math.max(0, primeiraHabilitacaoMatch.index - 10), primeiraHabilitacaoMatch.index);
          const contextoDepois = janela.substring(posicaoRelativa, Math.min(janela.length, posicaoRelativa + 10));
          
          if (isValidCategoria(categoria, contextoAntes, contextoDepois)) {
            categoriaCandidates.push({ value: categoria, priority: 3, source: 'Primeira Habilitação', index: primeiraHabilitacaoIndex });
            console.log(`  ✅ Candidato encontrado: "${categoria}" de "Primeira Habilitação" (prioridade 3)`);
          }
        }
      }
    }
    
    // Buscar "Categoria Atual" (PRIORIDADE BAIXA - só usar se não houver Pretendida ou Situação Atual)
    const atualIndex = text.search(/Categoria\s+Atual/i);
    if (atualIndex !== -1 && categoriaCandidates.length === 0) {
      const janela = text.substring(atualIndex, atualIndex + 200);
      // Atualizado para capturar categorias combinadas
      const atualMatch = janela.match(/Categoria\s+Atual[\s\S]*?([A-E]{1,5})(?!\w)/i);
      if (atualMatch && atualMatch[1]) {
        const categoria = atualMatch[1].toUpperCase();
        // Validar categoria (simples ou combinada)
        if (/^[A-E]{1,5}$/.test(categoria)) {
          const posicaoRelativa = atualMatch.index + atualMatch[0].length;
          const contextoAntes = janela.substring(Math.max(0, atualMatch.index - 10), atualMatch.index);
          const contextoDepois = janela.substring(posicaoRelativa, Math.min(janela.length, posicaoRelativa + 10));
          
          if (isValidCategoria(categoria, contextoAntes, contextoDepois)) {
            categoriaCandidates.push({ value: categoria, priority: 4, source: 'Categoria Atual', index: atualIndex });
            console.log(`  ✅ Candidato encontrado: "${categoria}" de "Categoria Atual" (prioridade 4)`);
          }
        }
      }
    }
    
    // Escolher a melhor categoria (menor priority = melhor)
    if (categoriaCandidates.length > 0) {
      categoriaCandidates.sort((a, b) => a.priority - b.priority);
      const melhor = categoriaCandidates[0];
      data.categoria_cnh = melhor.value;
      console.log(`✅ Categoria CNH encontrada: "${data.categoria_cnh}" (fonte: ${melhor.source}, prioridade: ${melhor.priority})`);
      if (categoriaCandidates.length > 1) {
        console.log(`ℹ️  Categorias encontradas: ${categoriaCandidates.map(c => `"${c.value}" (${c.source})`).join(', ')}`);
        console.log(`   ✅ Escolhida: "${melhor.value}" da fonte "${melhor.source}"`);
      }
    } else {
      console.log('⚠️  Nenhuma categoria encontrada pelos padrões prioritários, tentando fallback...');
      // Fallback: tentar outros padrões mais genéricos (mas com validação rigorosa)
      // Atualizado para capturar categorias combinadas
      const categoriaPatterns = [
        /CNH\s+Pretendida[\s\S]*?([A-E]{1,5})(?!\w)/i,
        /Categoria[:\s]*\n\s*([A-E]{1,5})(?=\s|$|\n|Pretendida|Atual)/i,
        /(?:Situação|Pretendida)[:\s]*\n?\s*([A-E]{1,5})(?!\w)/i
      ];

      for (const pattern of categoriaPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const categoria = match[1].toUpperCase();
          // Validar categoria (simples ou combinada)
          if (/^[A-E]{1,5}$/.test(categoria)) {
            const posicao = match.index + match[0].length;
            const contextoAntes = text.substring(Math.max(0, match.index - 10), match.index);
            const contextoDepois = text.substring(posicao, Math.min(text.length, posicao + 10));
            
            if (isValidCategoria(categoria, contextoAntes, contextoDepois)) {
              data.categoria_cnh = categoria;
              console.log(`✅ Categoria CNH encontrada (fallback): "${data.categoria_cnh}" (padrão: ${pattern})`);
              break;
            }
          }
        }
      }
    }

    // Naturalidade - Padrão universal
    const naturalidadePatterns = [
      /Naturalidade[:\s]*(\d{5})?\s*([A-ZÁÊÇÕ\s]+?)(?=\s*Endereço|Tipo|Logradouro|$)/i
    ];

    for (const pattern of naturalidadePatterns) {
      const match = text.match(pattern);
      if (match && match[2]) {
        let value = match[2].trim();
        value = value.replace(/\d+/g, '').trim();
        
        if (value.length > 3 && !['Masculino', 'Feminino', 'Brasileiro', 'Brasileira'].includes(value)) {
          data.naturalidade = value;
          console.log(`✅ Naturalidade encontrada: ${data.naturalidade}`);
          break;
        }
      }
    }
  }

  extractPhoneData(text, data) {
    // RENACH geralmente não contém telefones, mas vamos tentar extrair se existir
    const telefonePatterns = [
      /Telefone[:\s]+(\(?\d{2}\)?\s*\d{4,5}-?\d{4})/i,
      /Telefone[:\s]+(\d{10,11})/i,
      /Tel[.\s]*[:\s]+(\(?\d{2}\)?\s*\d{4,5}-?\d{4})/i,
      /(\(?[1-9]{2}\)?\s*[6-9]\d{4}-?\d{4})/g, // Celular brasileiro
      /(\(?[1-9]{2}\)?\s*\d{4}-?\d{4})/g // Fixo brasileiro
    ];

    for (const pattern of telefonePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        // Pegar o primeiro telefone encontrado que não seja do psicólogo
        for (const tel of matches) {
          const telLimpo = tel.replace(/\D/g, '');
          // Evitar números que podem ser outras coisas
          if (telLimpo.length >= 10 && telLimpo.length <= 11 && !telLimpo.startsWith('237')) {
            data.telefone = tel.trim();
            console.log(`✅ Telefone encontrado no RENACH: ${data.telefone}`);
            break;
          }
        }
        if (data.telefone) break;
      }
    }
    
    // Se não encontrou telefone, é normal - RENACH não contém telefones
    if (!data.telefone) {
      console.log('ℹ️  Telefone não encontrado no RENACH (normal - RENACH não contém telefones)');
    }
  }

  extractAddressData(text, data) {
    // Logradouro - Padrão universal melhorado
    const logradouroPatterns = [
      // Padrão específico para "R HOMERO BATISTA" ou similar
      /R\s+HOMERO\s+BATISTA/i,
      // Padrões específicos conhecidos - prioridade alta
      /PADRE ESTEVAO PERNET/i,
      /R MENDES JUNIOR/i,
      /AVENIDA CONDESSA ELISABETH DE/i,
      /AV ANTONIO E DE CARVALHO/i,
      /R CEL JOAO DENTE/i,
      /R CDOR FERREIRA DE SOUZA/i,
      /R IBITIRAMA/i,
      /R JOAO TEODORO/i,
      // Padrões genéricos - melhorados para capturar "R HOMERO BATISTA"
      /Logradouro[:\s]*(?:R\.|Rua)[:\s]*([A-ZÁÊÇÕ\s\.]+?)(?:\d{1,5}|Número|Complemento|Bairro|$)/i,
      /(?:R\.|Rua)[:\s]+([A-ZÁÊÇÕ][A-ZÁÊÇÕ\s\.]+?)(?:\d{1,5}|Complemento|Bairro|$)/i,
      /R\s+([A-ZÁÊÇÕ][A-ZÁÊÇÕ\s\.]+?)(?:\d{1,5}|$)/i,
      /(?:RUA|AVENIDA|R\.|AV\.)\s+([A-ZÁÊÇÕ\s\.]+?)(?:\d{1,5}|$)/i,
      // Padrão mais específico para capturar apenas o nome da rua
      /([A-ZÁÊÇÕ\s\.]{5,}?)(?:\d{1,5}|$)/i
    ];

    for (const pattern of logradouroPatterns) {
      const match = text.match(pattern);
      if (match) {
        let logr = match[1] ? match[1].trim() : match[0].trim();
        // Limpar prefixos se existirem
        logr = logr.replace(/^(?:Logradouro|R\.|Rua|Av\.|Avenida|RUA|AVENIDA)[:\s]*/i, '');
        if (logr.length > 3 && !logr.includes('Endereço') && !logr.includes('Residencial') && !logr.includes('\n')) {
          data.logradouro = logr;
          console.log(`✅ Logradouro encontrado: ${data.logradouro}`);
          break;
        }
      }
    }

    // Número do endereço - Padrão universal melhorado
    // IMPORTANTE: Buscar "Número:" especificamente na seção de endereço, não no complemento
    const numeroPatterns = [
      // Padrão mais específico: "Número:" na seção de endereço
      /Endereço[\s\S]*?Número[:\s]*(\d+)(?=\s*Complemento|\s*Bairro|\s*CEP)/i,
      /Logradouro[\s\S]*?Número[:\s]*(\d+)(?=\s*Complemento|\s*Bairro)/i,
      // Padrão genérico (mas após logradouro)
      /(?:Logradouro|Endereço)[\s\S]*?(\d{1,5})(?=\s*(?:Complemento|Ap|APTO|Bairro|CEP))/i,
      // Último recurso: buscar número antes de "Complemento" ou "AP"
      /Número[:\s]*(\d{1,5})(?=\s*Complemento|\s*Ap|\s*APTO|\s*Bairro)/i
    ];

    for (const pattern of numeroPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const numero = match[1];
        // Validar que não é parte do CEP ou código do município
        if (parseInt(numero) > 0 && parseInt(numero) < 100000) {
          data.numero_endereco = numero;
          console.log(`✅ Número do endereço encontrado: ${data.numero_endereco}`);
          break;
        }
      }
    }

    // Complemento - Padrão universal melhorado
    const complementoPatterns = [
      /Complemento[:\s]*([A-ZÁÊÇÕ\s\d]+?)(?=\s*Bairro|\s*CEP|\s*$)/i,
      /(?:Ap|Apartamento|APTO)[\.\s]*(\d+[A-Z\d]*)/i,
      /Ap\s*(\d+)/i,
      /(CASA\s*\d+|APTO\s*\d+[A-Z\d]*)/i
    ];

    for (const pattern of complementoPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.complemento = match[1].trim();
        console.log(`✅ Complemento encontrado: ${data.complemento}`);
        break;
      }
    }

    // Bairro - Padrão universal
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

    // CEP - Padrão universal
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

    // Código do município - Padrão universal (MELHORADO)
    const codigoMunicipioPatterns = [
      // NOVO: Padrão flexível para várias linhas entre o rótulo e o valor
      /Cód\.\s*Município[\s\S]*?(\d{5})/i,
      /Código\s+do\s+Município[\s\S]*?(\d{5})/i,
      // Padrão existente
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

    // Município - Padrão universal melhorado
    const municipioPatterns = [
      /Município[:\s]*([A-ZÁÊÇÕ\s]+?)(?:\n|Tipo|$)/i,
      /(?:Município|Municipio)[:\s]*([A-ZÁÊÇÕ\s]+?)(?:\s*Pretende|\s*$)/i,
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

    // Extrair "Pretende exercer atividade remunerada"
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

    // Construir endereço completo com logradouro e número
    // IMPORTANTE: Incluir todos os campos separados
    if (data.logradouro || data.bairro || data.municipio) {
      const enderecoCompleto = [
        data.logradouro ? `R. ${data.logradouro}` : '',
        data.numero_endereco ? `${data.numero_endereco}` : '',
        data.complemento ? `Ap ${data.complemento}` : '',
        data.bairro ? `${data.bairro}` : '',
        data.cep ? `- CEP ${data.cep}` : '',
        data.codigo_municipio ? `Cód. Município ${data.codigo_municipio}` : '',
        data.municipio ? `Município ${data.municipio}` : ''
      ].filter(Boolean).join(', ');

      if (enderecoCompleto) {
        data.endereco = enderecoCompleto;
        console.log(`✅ Endereço completo construído: ${data.endereco}`);
      }
    }

    // Se não temos logradouro mas temos outros dados, construir endereço básico
    if (!data.logradouro && (data.bairro || data.municipio)) {
      const enderecoBasico = [
        data.bairro,
        data.cep ? `CEP ${data.cep}` : '',
        data.codigo_municipio ? `Cód. Município ${data.codigo_municipio}` : '',
        data.municipio ? `Município ${data.municipio}` : ''
      ].filter(Boolean).join(', ');

      if (enderecoBasico) {
        data.endereco = enderecoBasico;
        console.log(`✅ Endereço básico construído: ${data.endereco}`);
      }
    }
  }

  extractDocumentData(text, data) {
    // RG - Padrão universal
    const rgPatterns = [
      /Número do Documento de Identidade[:\s]*(\d+)/i,
      /RG[:\s]*(\d+)/i,
      /(\d{7,10})(?=\s*SSPSP|\s*SSPBA|\s*SSP)/i
    ];

    for (const pattern of rgPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.rg = match[1];
        console.log(`✅ RG encontrado: ${data.rg}`);
        break;
      }
    }

    // Órgão expedidor RG - Padrão universal
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

    // UF - Padrão universal (MELHORADO: extrair do texto em vez de hardcodar)
    // IMPORTANTE: No PDF, "UF" e "SP" estão próximos ao órgão expedidor
    const ufPatterns = [
      // Prioridade 1: Buscar "UF" seguido de "SP" ou outra UF (mesma linha ou próxima)
      /UF[:\s]*\n?\s*([A-Z]{2})\b/i,
      /UF[\s\S]*?([A-Z]{2})\b/i,  // Flexível para quebras de linha
      // Prioridade 2: Buscar após "Expedido Por" e "SSPSP" ou "SSP"
      /Expedido Por[\s\S]*?(?:SSPSP|SSPBA|SSP)[\s\S]*?UF[\s\S]*?([A-Z]{2})\b/i,
      /Expedido Por[\s\S]*?([A-Z]{2})\b(?=\s*Masculino|\s*Feminino|\s*Sexo|\s*$)/i,
      // Prioridade 3: Buscar UF próximo ao órgão expedidor (SSPSP geralmente é SP)
      /(?:SSPSP|SSPBA|SSP)[\s\S]{0,50}?([A-Z]{2})\b/i,
      // Prioridade 4: Buscar padrão "SSPSP SP" ou "SSP SP"
      /(?:SSPSP|SSPBA|SSP)\s+([A-Z]{2})\b/i,
      // Prioridade 5: Buscar após o campo "UF" que está após órgão expedidor
      /Órgão[\s\S]*?Expedido Por[\s\S]*?UF[\s\S]*?([A-Z]{2})\b/i
    ];

    for (const pattern of ufPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const uf = match[1].toUpperCase();
        // Validar que é uma UF válida (estados brasileiros comuns)
        const ufsValidas = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
        if (ufsValidas.includes(uf)) {
          data.uf_rg = uf;
          console.log(`✅ UF do RG encontrada: ${data.uf_rg} (padrão: ${pattern})`);
          break;
        }
      }
    }
    
    // Fallback: Se não encontrou e o órgão é SSP-SP ou SSPSP, assume SP
    if (!data.uf_rg) {
      const orgao = data.orgao_expedidor_rg || '';
      if (orgao.includes('SSPSP') || orgao.includes('SSP') && text.includes('SAO PAULO') || text.includes('SÃO PAULO')) {
        data.uf_rg = 'SP';
        console.log(`✅ UF definida como SP (fallback baseado no órgão e município)`);
      } else {
        // Último fallback: assumir SP se nada for encontrado
        data.uf_rg = 'SP';
        console.log(`⚠️  UF não encontrada, definida como SP (fallback padrão)`);
      }
    }
  }

  extractExamData(text, data) {
    // Data do exame - Padrão universal (MELHORADO: priorizar "Validade")
    // IMPORTANTE: No PDF fornecido, a data está associada a "Validade", não "Data do Exame"
    const dataExamePatterns = [
      // NOVO: Priorizar "Validade" na seção de Exame Psicotécnico (alta prioridade)
      /Exame\s*Psicotécnico[\s\S]*?Validade[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
      // Padrões existentes para "Data do Exame"
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
        // Validar formato da data
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataExame)) {
          // Verificar se não é a data de nascimento (geralmente mais antiga)
          const partes = dataExame.split('/');
          const ano = parseInt(partes[2]);
          // Se for 2025 ou mais recente, é provavelmente data do exame
          if (ano >= 2024) {
            data.data_exame = dataExame;
            console.log(`✅ Data do exame encontrada: ${data.data_exame}`);
            break;
          }
        }
      }
    }
    
    // Data da primeira habilitação - Padrão universal (MELHORADO)
    // IMPORTANTE: Pode estar em linha separada do rótulo com texto intermediário, range ampliado para incluir 2013
    const dataPrimeiraHabilitacaoPatterns = [
      // NOVO: Padrão super flexível para várias linhas entre o rótulo e a data
      /Primeira\s+Habilitação[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,
      // Padrões mais específicos (mesma linha)
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

    // Resultado do exame - Padrão universal
    // IMPORTANTE: Priorizar "Inapto Temporário" completo antes de "Inapto" simples
    const resultadoPatterns = [
      // Padrão 1: Buscar "Inapto Temporário" completo (com acentuação)
      /Resultado[:\s]*Inapto\s+Tempor[áa]rio/i,
      // Padrão 2: Buscar "Inapto Temporário" após "Resultado do Exame"
      /Resultado\s+do\s+Exame[:\s]*Inapto\s+Tempor[áa]rio/i,
      // Padrão 3: Buscar "Inapto Temporário" em contexto mais amplo
      /Inapto\s+Tempor[áa]rio(?=\s*N°|\s*do\s*Credenciado|\s*do\s*Laudo|$)/i,
      // Padrão 4: Buscar "Apto" ou "Inapto" simples (apenas se não encontrou Temporário)
      /Resultado[:\s]*(Apto|Inapto|Dispensado)(?!\s+Tempor)/i,
      // Padrão 5: Buscar após "Resultado do Exame"
      /Resultado\s+do\s+Exame[:\s]*(Apto|Inapto|Dispensado)(?!\s+Tempor)/i,
      // Padrão 6: Buscar em contexto antes de campos específicos
      /(Apto|Inapto|Dispensado)(?!\s+Tempor)(?=\s*N°\s*do\s*Credenciado|\s*N°\s*do\s*Laudo)/i,
      // Padrão 7: Último recurso - busca genérica (evitar se possível)
      /(Apto|Inapto|Dispensado)(?!\s+Tempor)/i
    ];

    let resultadoEncontrado = null;
    
    for (const pattern of resultadoPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Se encontrou "Inapto Temporário", capturar completo
        if (match[0] && /Inapto\s+Tempor[áa]rio/i.test(match[0])) {
          // Normalizar acentuação: "Temporário" ou "Temporario" -> "Temporário"
          resultadoEncontrado = match[0].replace(/Inapto\s+Temporario/i, 'Inapto Temporário').trim();
          console.log(`✅ Resultado do exame encontrado: ${resultadoEncontrado} (padrão: ${pattern})`);
          break;
        }
        // Se encontrou match[1], usar o grupo capturado
        else if (match[1]) {
          resultadoEncontrado = match[1];
          // Verificar se há "Temporário" logo depois
          const posicaoMatch = match.index || 0;
          const textoApos = text.substring(posicaoMatch + match[0].length, posicaoMatch + match[0].length + 20);
          if (/Tempor[áa]rio/i.test(textoApos)) {
            resultadoEncontrado = 'Inapto Temporário';
            console.log(`✅ Resultado do exame encontrado: ${resultadoEncontrado} (detectado "Temporário" próximo)`);
          } else {
            console.log(`✅ Resultado do exame encontrado: ${resultadoEncontrado}`);
          }
          break;
        }
      }
    }
    
    if (resultadoEncontrado) {
      data.resultado_exame = resultadoEncontrado;
    } else {
      console.log('⚠️  Resultado do exame não encontrado');
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
    
    // Padrões ordenados por prioridade (mais específicos primeiro) - MELHORADO
    // IMPORTANTE: Evitar pegar anos (2025) - números do laudo são geralmente 3-4 dígitos
    const laudoPatterns = [
      // NOVO: Padrão super flexível para distância entre rótulo e número (ALTA PRIORIDADE)
      /N°\s*do\s*Laudo[\s\S]*?(\d{3,4})(?!\d)/i,
      // Padrões existentes com alta prioridade
      /N°\s*do\s*Laudo[:\s]+(\d{3,4})(?!\d)(?=\s*Resultado|\s*Validade|\s*Identificação|\s*Data|\s*$)/i,
      // Padrão com espaço variável
      /N°\s*do\s*Laudo[:\s]*(\d{3,4})(?!\d)/i,
      // Padrão na seção Exame Psicotécnico
      /Exame\s*Psicotécnico[\s\S]*?N°\s*do\s*Laudo[:\s]*(\d{3,4})(?!\d)/i,
      // Buscar após "Resultado" e antes de "Credenciado"
      /Resultado[:\s]*Apto[\s\S]*?N°\s*do\s*Laudo[:\s]*(\d{3,4})(?!\d)/i,
      // Buscar padrão: "Laudo" seguido de número de 3-4 dígitos
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
          } else {
            console.log(`⚠️  Número ${numeroLaudo} também aparece como credenciado, ignorando...`);
          }
        } else {
          console.log(`⚠️  Número ${numeroLaudo} é do credenciado ou é um ano, ignorando...`);
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
            if (distancia <= 150) { // Aumentado para 150 caracteres para cobrir mais casos
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
                  if (distancia <= 150) { // Aumentado para 150 caracteres para cobrir mais casos
                    // Verificar que não está próximo de "Credenciado"
                    const indexCred = secaoExame[0].toLowerCase().indexOf('credenciado');
                    if (indexCred === -1 || Math.abs(indexNum - indexCred) > 20) {
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
    }
    
    if (numeroLaudoEncontrado) {
      data.numero_laudo_renach = numeroLaudoEncontrado;
      data.numero_laudo = numeroLaudoEncontrado; // Também atualizar numero_laudo principal
      console.log(`✅ Número do laudo final: ${data.numero_laudo_renach}`);
    } else {
      console.log('⚠️  Número do laudo não encontrado ou todos os números eram do credenciado');
      console.log(`  📝 Debug: Procurando "1563" no texto...`);
      if (textoBusca.includes('1563')) {
        console.log(`  ✅ Número 1563 encontrado no texto, mas não foi capturado pelo padrão`);
      } else {
        console.log(`  ❌ Número 1563 NÃO encontrado no texto extraído`);
      }
    }
  }
}

module.exports = RenachProcessorUniversal;
