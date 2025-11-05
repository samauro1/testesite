/**
 * Gerador de Laudos Periciais
 * 
 * Funcionalidades:
 * - Geração de PDF (usando PDFKit)
 * - Geração de Word (usando docx)
 * - Template de laudo (máx. 2 páginas)
 * - Interpretação automática contextualizada
 */

const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, WidthType } = require('docx');
const fs = require('fs-extra');
const path = require('path');

class ReportGenerator {
  constructor(pacienteData, avaliadorData, contextoDados) {
    this.paciente = pacienteData;
    this.avaliador = avaliadorData;
    this.contexto = contextoDados;
    this.dataRelatorio = new Date();
  }
  
  /**
   * Gera laudo em PDF (máximo 2 páginas)
   * @param {Array} testesResultados - Array com resultados dos testes
   * @returns {Promise<Buffer>} Buffer do PDF
   */
  async gerarPDF(testesResultados) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          size: 'A4', 
          margin: 50,
          info: {
            Title: `Laudo Psicológico - ${this.paciente.nome}`,
            Author: this.avaliador.nome,
            Subject: 'Laudo Pericial Psicológico',
            Keywords: 'laudo, psicologia, avaliação'
          }
        });
        
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        
        // Cabeçalho
        doc.fontSize(16).font('Helvetica-Bold')
           .text('LAUDO PERICIAL PSICOLÓGICO', { align: 'center' });
        
        doc.moveDown();
        doc.fontSize(10).font('Helvetica')
           .text(`Número do Laudo: ${this.contexto.numero_laudo || 'LAU-' + Date.now()}`, { align: 'center' });
        doc.text(`Data: ${this.dataRelatorio.toLocaleDateString('pt-BR')}`, { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(8).text('─'.repeat(100), { align: 'center' });
        doc.moveDown(0.5);
        
        // Dados do Paciente
        doc.fontSize(12).font('Helvetica-Bold').text('1. IDENTIFICAÇÃO DO AVALIADO');
        doc.fontSize(10).font('Helvetica');
        doc.text(`Nome: ${this.paciente.nome}`);
        if (this.paciente.cpf) {
          doc.text(`CPF: ${this.paciente.cpf}`);
        }
        if (this.paciente.data_nascimento) {
          const idade = this.calcularIdade(this.paciente.data_nascimento);
          doc.text(`Idade: ${idade} anos`);
        }
        doc.moveDown(0.3);
        
        // Dados do Avaliador
        doc.fontSize(12).font('Helvetica-Bold').text('2. IDENTIFICAÇÃO DO AVALIADOR');
        doc.fontSize(10).font('Helvetica');
        doc.text(`Nome: ${this.avaliador.nome}`);
        if (this.avaliador.crp) {
          doc.text(`CRP: ${this.avaliador.crp}`);
        }
        doc.moveDown(0.3);
        
        // Objetivo
        doc.fontSize(12).font('Helvetica-Bold').text('3. OBJETIVO');
        doc.fontSize(10).font('Helvetica');
        const objetivos = {
          transito: 'Avaliar aptidão psicológica para condução de veículos automotores.',
          rh: 'Avaliar perfil psicológico para adequação ocupacional.',
          clinico: 'Avaliar aspectos psicológicos para fins diagnósticos.'
        };
        doc.text(objetivos[this.contexto?.tipo] || objetivos.transito);
        doc.moveDown(0.3);
        
        // Procedimentos
        doc.fontSize(12).font('Helvetica-Bold').text('4. PROCEDIMENTOS');
        doc.fontSize(10).font('Helvetica');
        doc.text('Foram aplicados os seguintes instrumentos de avaliação psicológica:');
        doc.moveDown(0.2);
        
        testesResultados.forEach((teste, index) => {
          const nomesTestes = {
            ac: 'Teste AC (Atenção Concentrada)',
            palografico: 'Teste Palográfico',
            memoria: 'Teste de Memória',
            atencao: 'Teste de Atenção'
          };
          doc.text(`${index + 1}. ${nomesTestes[teste.tipo] || 'Teste Psicológico'}`, { indent: 20 });
        });
        doc.moveDown(0.3);
        
        // Resultados
        doc.fontSize(12).font('Helvetica-Bold').text('5. RESULTADOS');
        doc.fontSize(10).font('Helvetica');
        
        testesResultados.forEach((teste, index) => {
          doc.text(`${index + 1}. ${this.formatarResultadoTeste(teste)}`, { indent: 10 });
          doc.moveDown(0.2);
        });
        doc.moveDown(0.3);
        
        // Conclusão
        const parecer = this.gerarParecerFinal(testesResultados);
        doc.fontSize(12).font('Helvetica-Bold').text('6. CONCLUSÃO');
        doc.fontSize(10).font('Helvetica');
        doc.text(parecer.descricao);
        doc.moveDown(0.3);
        
        doc.fontSize(11).font('Helvetica-Bold')
           .text(`PARECER: ${parecer.parecer.toUpperCase()}`, { align: 'center' });
        doc.moveDown(0.5);
        
        // Recomendações
        if (parecer.recomendacoes && parecer.recomendacoes.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').text('7. RECOMENDAÇÕES');
          doc.fontSize(10).font('Helvetica');
          parecer.recomendacoes.forEach(rec => {
            doc.text(`• ${rec}`, { indent: 10 });
          });
        }
        
        // Rodapé
        const yRodape = doc.page.height - 50;
        doc.fontSize(8).font('Helvetica')
           .text(`Laudo gerado em ${this.dataRelatorio.toLocaleString('pt-BR')}`, 
                 50, yRodape, { align: 'left' });
        doc.text(`Página ${doc.page.number}`, 
                 50, yRodape, { align: 'right' });
        
        // Assinatura
        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica')
           .text('─'.repeat(80), { align: 'center' });
        doc.text(this.avaliador.nome, { align: 'center' });
        if (this.avaliador.crp) {
          doc.text(`CRP: ${this.avaliador.crp}`, { align: 'center' });
        }
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Gera laudo em Word
   * @param {Array} testesResultados - Array com resultados dos testes
   * @returns {Promise<Buffer>} Buffer do documento Word
   */
  async gerarWord(testesResultados) {
    try {
      const parecer = this.gerarParecerFinal(testesResultados);
      
      const objetivos = {
        transito: 'Avaliar aptidão psicológica para condução de veículos automotores.',
        rh: 'Avaliar perfil psicológico para adequação ocupacional.',
        clinico: 'Avaliar aspectos psicológicos para fins diagnósticos.'
      };
      
      const nomesTestes = {
        ac: 'Teste AC (Atenção Concentrada)',
        palografico: 'Teste Palográfico',
        memoria: 'Teste de Memória',
        atencao: 'Teste de Atenção'
      };
      
      const children = [
        new Paragraph({
          text: 'LAUDO PERICIAL PSICOLÓGICO',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          text: `Número do Laudo: ${this.contexto.numero_laudo || 'LAU-' + Date.now()}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          text: `Data: ${this.dataRelatorio.toLocaleDateString('pt-BR')}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        
        new Paragraph({
          text: '1. IDENTIFICAÇÃO DO AVALIADO',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: `Nome: ${this.paciente.nome}`, break: 1 }),
            this.paciente.cpf ? new TextRun({ text: `CPF: ${this.paciente.cpf}`, break: 1 }) : null
          ].filter(Boolean),
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          text: '2. IDENTIFICAÇÃO DO AVALIADOR',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: `Nome: ${this.avaliador.nome}`, break: 1 }),
            this.avaliador.crp ? new TextRun({ text: `CRP: ${this.avaliador.crp}`, break: 1 }) : null
          ].filter(Boolean),
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          text: '3. OBJETIVO',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        
        new Paragraph({
          text: objetivos[this.contexto?.tipo] || objetivos.transito,
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          text: '4. PROCEDIMENTOS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        
        new Paragraph({
          text: 'Foram aplicados os seguintes instrumentos de avaliação psicológica:',
          spacing: { after: 200 }
        }),
        
        ...testesResultados.map((teste, index) => 
          new Paragraph({
            text: `${index + 1}. ${nomesTestes[teste.tipo] || 'Teste Psicológico'}`,
            spacing: { after: 100 }
          })
        ),
        
        new Paragraph({
          text: '5. RESULTADOS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        
        ...testesResultados.map((teste, index) =>
          new Paragraph({
            text: `${index + 1}. ${this.formatarResultadoTeste(teste)}`,
            spacing: { after: 200 }
          })
        ),
        
        new Paragraph({
          text: '6. CONCLUSÃO',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        
        new Paragraph({
          text: parecer.descricao,
          spacing: { after: 300 }
        }),
        
        new Paragraph({
          text: `PARECER: ${parecer.parecer.toUpperCase()}`,
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 300 }
        }),
        
        ...(parecer.recomendacoes && parecer.recomendacoes.length > 0 ? [
          new Paragraph({
            text: '7. RECOMENDAÇÕES',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          ...parecer.recomendacoes.map(rec =>
            new Paragraph({
              text: `• ${rec}`,
              spacing: { after: 100 }
            })
          )
        ] : []),
        
        new Paragraph({
          text: '─'.repeat(80),
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 200 }
        }),
        
        new Paragraph({
          text: this.avaliador.nome,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        
        ...(this.avaliador.crp ? [
          new Paragraph({
            text: `CRP: ${this.avaliador.crp}`,
            alignment: AlignmentType.CENTER
          })
        ] : [])
      ];
      
      const doc = new Document({
        sections: [{
          properties: {},
          children
        }]
      });
      
      const buffer = await Packer.toBuffer(doc);
      return buffer;
      
    } catch (error) {
      console.error('Erro ao gerar Word:', error);
      throw error;
    }
  }
  
  formatarResultadoTeste(teste) {
    if (teste.tipo === 'ac') {
      return `Teste AC: ${teste.acertos} acertos, ${teste.erros} erros, ${teste.omissoes} omissões. ` +
             `Pontos Brutos: ${teste.pb}. ` +
             (teste.percentil ? `Percentil: ${teste.percentil}. ` : '') +
             (teste.classificacao ? `Classificação: ${teste.classificacao}.` : '');
    } else if (teste.tipo === 'palografico') {
      return `Teste Palográfico: Produtividade: ${teste.produtividade} palos. ` +
             `NOR: ${teste.nor}. ` +
             (teste.classificacoes?.produtividade ? `Classificação Produtividade: ${teste.classificacoes.produtividade}. ` : '') +
             (teste.classificacoes?.nor ? `Classificação NOR: ${teste.classificacoes.nor}.` : '');
    } else if (teste.tipo === 'memoria') {
      return `Teste de Memória: Evocação Tardia: ${teste.evocacao_tardia}. ` +
             `Retenção: ${teste.retencao} (${teste.percentual_retencao}%). ` +
             (teste.classificacoes?.retencao ? `Classificação: ${teste.classificacoes.retencao}.` : '');
    }
    return 'Resultado do teste psicológico.';
  }
  
  calcularIdade(dataNascimento) {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  }
  
  /**
   * Gera parecer final baseado nos resultados
   */
  gerarParecerFinal(testesResultados) {
    const pareceres = {
      transito: this.determinarParecerTransito(testesResultados),
      rh: this.determinarParecerRH(testesResultados),
      clinico: this.determinarParecerClinico(testesResultados)
    };
    
    return pareceres[this.contexto?.tipo] || pareceres.transito;
  }
  
  determinarParecerTransito(testesResultados) {
    const atencao = testesResultados.find(t => t.tipo === 'atencao' || t.tipo === 'ac');
    const palografico = testesResultados.find(t => t.tipo === 'palografico');
    
    const sinaisDeAlerta = [];
    
    if (atencao?.classificacao === 'Abaixo da Média' || atencao?.percentil < 25) {
      sinaisDeAlerta.push('Atenção deficiente para segurança no trânsito');
    }
    
    if (palografico?.emotividade_indice > 6) {
      sinaisDeAlerta.push('Emotividade instável incompatível com segurança');
    }
    
    if (sinaisDeAlerta.length === 0) {
      return {
        parecer: 'apto',
        descricao: 'O candidato apresenta resultados psicomotores, atencionais e de controle emocional adequados para a prática segura da condução de veículos automotores.',
        recomendacoes: ['Realização de exame prático de direção', 'Reavaliação a cada 5 anos']
      };
    } else if (sinaisDeAlerta.length === 1) {
      return {
        parecer: 'inapto_temporario',
        descricao: `O candidato apresenta limitações leves em alguns aspectos: ${sinaisDeAlerta[0]}. Recomenda-se reavaliação após período de tratamento ou reabilitação.`,
        recomendacoes: ['Reavaliação em 30 dias', 'Avaliação com especialista se necessário']
      };
    } else {
      return {
        parecer: 'inapto',
        descricao: `O candidato apresenta limitações que prejudicam a segurança na condução: ${sinaisDeAlerta.join(', ')}. Não recomenda-se concessão da CNH neste momento.`,
        recomendacoes: ['Encaminhamento para avaliação clínica completa', 'Reavaliação após 6 meses mínimo']
      };
    }
  }
  
  determinarParecerRH(testesResultados) {
    return {
      parecer: 'apto',
      descricao: 'Candidato apresenta perfil psicológico compatível com os requisitos da função.'
    };
  }
  
  determinarParecerClinico(testesResultados) {
    return {
      parecer: 'apto',
      descricao: 'Avaliação psicológica realizada conforme protocolos técnicos.'
    };
  }
}

module.exports = ReportGenerator;
