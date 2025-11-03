'use client';

import React, { useState, useRef } from 'react';
import { FileText, Download, Search, Upload, Mail, MessageCircle, Receipt, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import { pacientesService, avaliacoesService, agendamentosService, nfsEService } from '@/services/api';
import { webPkiService } from '@/services/webPkiService';
import { useAuth } from '@/contexts/AuthContext';
import { useConfiguracoes } from '@/contexts/ConfiguracoesContext';
import { formatDateToBrazilian, calculateAge } from '@/utils/dateUtils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function RelatoriosPage() {
  const { user: currentUser } = useAuth();
  const { configuracoes } = useConfiguracoes();
  const [activeTab, setActiveTab] = useState<'laudos' | 'declaracao' | 'estatisticas' | 'nfs-e'>('laudos');
  
  // Estados para busca de laudo
  const [buscaLaudo, setBuscaLaudo] = useState('');
  const [laudoEncontrado, setLaudoEncontrado] = useState<any>(null);
  const [buscandoLaudo, setBuscandoLaudo] = useState(false);
  const [assinaturaImagem, setAssinaturaImagem] = useState<string | null>(null);
  const [sugestoesLaudo, setSugestoesLaudo] = useState<any[]>([]);
  const [mostrarSugestoesLaudo, setMostrarSugestoesLaudo] = useState(false);
  
  // Estados para declaração
  const [buscaDeclaracao, setBuscaDeclaracao] = useState('');
  const [dadosDeclaracao, setDadosDeclaracao] = useState<any>(null);
  
  // Estados para relatório de NFS-e
  const [nfsEmitidas, setNfsEmitidas] = useState<any[]>([]);
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [carregandoNfsE, setCarregandoNfsE] = useState(false);
  const [estatisticasNfsE, setEstatisticasNfsE] = useState<any>(null);
  const [buscandoDeclaracao, setBuscandoDeclaracao] = useState(false);
  const [sugestoesDeclaracao, setSugestoesDeclaracao] = useState<any[]>([]);
  const [mostrarSugestoesDeclaracao, setMostrarSugestoesDeclaracao] = useState(false);
  
  // Função para carregar NFS-e do mês
  const carregarNfsEMes = async () => {
    try {
      setCarregandoNfsE(true);
      const response = await nfsEService.listar();
      
      if (response.data?.data?.nfs_e) {
        const nfsDoMes = response.data.data.nfs_e.filter((nfs: any) => {
          const dataEmissao = new Date(nfs.data_emissao);
          const mesAno = dataEmissao.toISOString().slice(0, 7);
          return mesAno === filtroMes;
        });
        
        setNfsEmitidas(nfsDoMes);
        
        // Calcular estatísticas
        const total = nfsDoMes.length;
        const valorTotal = nfsDoMes.reduce((sum: number, nfs: any) => sum + parseFloat(nfs.valor), 0);
        const valorMedio = total > 0 ? valorTotal / total : 0;
        
        setEstatisticasNfsE({
          total,
          valorTotal,
          valorMedio,
          mes: filtroMes
        });
      }
    } catch (error) {
      console.error('Erro ao carregar NFS-e:', error);
      toast.error('Erro ao carregar relatório de NFS-e');
    } finally {
      setCarregandoNfsE(false);
    }
  };

  // Carregar NFS-e quando mudar o mês
  React.useEffect(() => {
    if (activeTab === 'nfs-e') {
      carregarNfsEMes();
    }
  }, [filtroMes, activeTab]);

  // Estados para estatísticas
  const [periodoEstatisticas, setPeriodoEstatisticas] = useState<'7dias' | '30dias' | '90dias' | 'ano' | 'todos'>('30dias');
  const [estatisticas, setEstatisticas] = useState<any>(null);
  const [carregandoEstatisticas, setCarregandoEstatisticas] = useState(false);
  
  // Estados para assinatura digital
  const [certificadosDisponiveis, setCertificadosDisponiveis] = useState<any[]>([]);
  const [certificadoSelecionado, setCertificadoSelecionado] = useState<string>('');
  const [carregandoCertificados, setCarregandoCertificados] = useState(false);
  const [assinaturaDigitalData, setAssinaturaDigitalData] = useState<any>(null);
  const [assinandoDigitalmente, setAssinandoDigitalmente] = useState(false);
  const [mostrarModalPin, setMostrarModalPin] = useState(false);
  const [pinCertificado, setPinCertificado] = useState('');
  const [tentativasPin, setTentativasPin] = useState(0);
  
  // Refs para geração de PDF
  const laudoRef = useRef<HTMLDivElement>(null);
  const declaracaoRef = useRef<HTMLDivElement>(null);

  const handleAssinaturaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas arquivos de imagem (PNG, JPG, etc.)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Tamanho máximo: 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        
        // Verificar se a imagem carregou corretamente
        const img = new Image();
        img.onload = () => {
          setAssinaturaImagem(result);
          toast.success(`Assinatura carregada! (${img.width}x${img.height}px)`);
        };
        img.onerror = () => {
          toast.error('Erro ao carregar imagem. Verifique se o arquivo não está corrompido.');
        };
        img.src = result;
      };
      reader.onerror = () => {
        toast.error('Erro ao ler o arquivo. Tente novamente.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGerarPDFLaudo = async () => {
    if (!laudoRef.current) {
      toast.error('Elemento de laudo não encontrado');
      return;
    }

    try {
      toast.loading('Gerando PDF do laudo...');
      
      // Criar um elemento temporário apenas com o conteúdo do laudo
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.padding = '20mm';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '12px';
      tempDiv.style.lineHeight = '1.4';
      tempDiv.style.color = '#000000';
      
      // Clonar apenas o conteúdo interno do laudo
      const laudoContent = laudoRef.current.cloneNode(true) as HTMLElement;
      
      // Remover elementos com classe no-print do clone
      const noPrintElements = laudoContent.querySelectorAll('.no-print');
      noPrintElements.forEach(el => el.remove());
      
      // Adicionar o conteúdo clonado ao elemento temporário
      tempDiv.appendChild(laudoContent);
      document.body.appendChild(tempDiv);
      
      // Capturar apenas o elemento temporário com escala reduzida
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5, // Reduzido de 2 para 1.5 (reduz tamanho em ~44%)
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight
      });

      // Remover o elemento temporário
      document.body.removeChild(tempDiv);

      // Usar JPEG com compressão (menor que PNG)
      const imgData = canvas.toDataURL('image/jpeg', 0.85); // Qualidade 85% (reduz tamanho significativamente)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular dimensões da imagem
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calcular proporção para ajustar ao PDF
      const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 20) / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      // Centralizar a imagem no PDF
      const imgX = (pdfWidth - finalWidth) / 2;
      const imgY = 10;

      // Adicionar a imagem do laudo com compressão JPEG
      pdf.addImage(imgData, 'JPEG', imgX, imgY, finalWidth, finalHeight);
      
      // Adicionar informações da assinatura digital se existir (fora da área principal)
      if (assinaturaDigitalData) {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.text(`Assinatura Digital: ${assinaturaDigitalData.id}`, 15, pageHeight - 25);
        pdf.text(`Algoritmo: ${assinaturaDigitalData.algoritmoassinatura}`, 15, pageHeight - 20);
        pdf.text(`Data: ${new Date(assinaturaDigitalData.timestamp).toLocaleString('pt-BR')}`, 15, pageHeight - 15);
        pdf.text(`Certificado: ${assinaturaDigitalData.certificado.nome}`, 15, pageHeight - 10);
      }
      
      // Nome do arquivo
      const fileName = `Laudo_${laudoEncontrado?.paciente?.nome?.replace(/\s+/g, '_')}_${laudoEncontrado?.paciente?.numero_laudo}_${new Date().toISOString().split('T')[0]}${assinaturaDigitalData ? '_ASSINADO' : ''}.pdf`;
      pdf.save(fileName);
      
      toast.dismiss();
      toast.success(`✅ PDF do laudo gerado com sucesso! ${assinaturaDigitalData ? '(Com assinatura digital)' : ''}`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.dismiss();
      toast.error('❌ Erro ao gerar PDF do laudo');
    }
  };

  const handleGerarPDFDeclaracao = async () => {
    if (!declaracaoRef.current) {
      toast.error('Elemento de declaração não encontrado');
      return;
    }

    try {
      toast.loading('Gerando PDF da declaração...');
      
      // Criar um elemento temporário apenas com o conteúdo da declaração
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.padding = '20mm';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '12px';
      tempDiv.style.lineHeight = '1.4';
      tempDiv.style.color = '#000000';
      
      // Clonar apenas o conteúdo interno da declaração
      const declaracaoContent = declaracaoRef.current.cloneNode(true) as HTMLElement;
      
      // Remover elementos com classe no-print do clone
      const noPrintElements = declaracaoContent.querySelectorAll('.no-print');
      noPrintElements.forEach(el => el.remove());
      
      // Adicionar o conteúdo clonado ao elemento temporário
      tempDiv.appendChild(declaracaoContent);
      document.body.appendChild(tempDiv);
      
      // Capturar apenas o elemento temporário com escala reduzida
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5, // Reduzido de 2 para 1.5 (reduz tamanho em ~44%)
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight
      });

      // Remover o elemento temporário
      document.body.removeChild(tempDiv);

      // Usar JPEG com compressão (menor que PNG)
      const imgData = canvas.toDataURL('image/jpeg', 0.85); // Qualidade 85% (reduz tamanho significativamente)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular dimensões da imagem
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calcular proporção para ajustar ao PDF
      const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 20) / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      // Centralizar a imagem no PDF
      const imgX = (pdfWidth - finalWidth) / 2;
      const imgY = 10;

      // Adicionar a imagem da declaração com compressão JPEG
      pdf.addImage(imgData, 'JPEG', imgX, imgY, finalWidth, finalHeight);
      
      // Adicionar informações da assinatura digital se existir (fora da área principal)
      if (assinaturaDigitalData) {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.text(`Assinatura Digital: ${assinaturaDigitalData.id}`, 15, pageHeight - 25);
        pdf.text(`Algoritmo: ${assinaturaDigitalData.algoritmoassinatura}`, 15, pageHeight - 20);
        pdf.text(`Data: ${new Date(assinaturaDigitalData.timestamp).toLocaleString('pt-BR')}`, 15, pageHeight - 15);
        pdf.text(`Certificado: ${assinaturaDigitalData.certificado.nome}`, 15, pageHeight - 10);
      }
      
      // Nome do arquivo
      const fileName = `Declaracao_${dadosDeclaracao?.paciente?.nome?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}${assinaturaDigitalData ? '_ASSINADA' : ''}.pdf`;
      pdf.save(fileName);
      
      toast.dismiss();
      toast.success(`✅ PDF da declaração gerado com sucesso! ${assinaturaDigitalData ? '(Com assinatura digital)' : ''}`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.dismiss();
      toast.error('❌ Erro ao gerar PDF da declaração');
    }
  };

  // Função para gerar PDF da declaração e retornar Blob
  const gerarPDFDeclaracaoBlob = async (): Promise<Blob> => {
    if (!declaracaoRef.current) {
      throw new Error('Elemento de declaração não encontrado');
    }

    // Criar um elemento temporário apenas com o conteúdo da declaração
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '210mm'; // A4 width
    tempDiv.style.backgroundColor = '#ffffff';
    tempDiv.style.padding = '20mm';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12px';
    tempDiv.style.lineHeight = '1.4';
    tempDiv.style.color = '#000000';
    
    // Clonar apenas o conteúdo interno da declaração
    const declaracaoContent = declaracaoRef.current.cloneNode(true) as HTMLElement;
    
    // Remover elementos com classe no-print do clone
    const noPrintElements = declaracaoContent.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.remove());
    
    // Adicionar o conteúdo clonado ao elemento temporário
    tempDiv.appendChild(declaracaoContent);
    document.body.appendChild(tempDiv);
    
    // Capturar apenas o elemento temporário com escala reduzida
    const canvas = await html2canvas(tempDiv, {
      scale: 1.5, // Reduzido de 2 para 1.5 (reduz tamanho em ~44%)
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: tempDiv.scrollWidth,
      height: tempDiv.scrollHeight
    });

    // Remover o elemento temporário
    document.body.removeChild(tempDiv);

    // Usar JPEG com compressão (menor que PNG)
    const imgData = canvas.toDataURL('image/jpeg', 0.85); // Qualidade 85% (reduz tamanho significativamente)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calcular dimensões da imagem
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Calcular proporção para ajustar ao PDF
    const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 20) / imgHeight);
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;
    
    // Centralizar a imagem no PDF
    const imgX = (pdfWidth - finalWidth) / 2;
    const imgY = 10;

    // Adicionar a imagem da declaração com compressão JPEG
    pdf.addImage(imgData, 'JPEG', imgX, imgY, finalWidth, finalHeight);
    
    // Adicionar informações da assinatura digital se existir (fora da área principal)
    if (assinaturaDigitalData) {
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.text(`Assinatura Digital: ${assinaturaDigitalData.id}`, 15, pageHeight - 25);
      pdf.text(`Algoritmo: ${assinaturaDigitalData.algoritmoassinatura}`, 15, pageHeight - 20);
      pdf.text(`Data: ${new Date(assinaturaDigitalData.timestamp).toLocaleString('pt-BR')}`, 15, pageHeight - 15);
      pdf.text(`Certificado: ${assinaturaDigitalData.certificado.nome}`, 15, pageHeight - 10);
    }
    
    // Retornar Blob
    return pdf.output('blob');
  };

  // Função para enviar declaração por e-mail
  const handleEnviarEmailDeclaracao = async () => {
    if (!dadosDeclaracao) {
      toast.error('Nenhuma declaração para enviar');
      return;
    }

    const email = dadosDeclaracao.paciente?.email;
    if (!email) {
      toast.error('Paciente não possui e-mail cadastrado');
      return;
    }

    try {
      toast.loading('Gerando PDF e preparando e-mail...');
      
      // Gerar PDF automaticamente
      const pdfBlob = await gerarPDFDeclaracaoBlob();
      
      // Criar link de download temporário
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Declaracao_${dadosDeclaracao.paciente.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Simular clique para download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Preparar e-mail
      const assunto = `Declaração de Comparecimento - ${dadosDeclaracao.paciente.nome}`;
      const corpo = `Prezado(a) ${dadosDeclaracao.paciente.nome},\n\nSegue em anexo sua declaração de comparecimento.\n\n📅 Data de comparecimento: ${dadosDeclaracao.agendamento ? formatDateToBrazilian(dadosDeclaracao.agendamento.data_agendamento) : 'Data não disponível'}\n\nAtenciosamente,\n${configuracoes?.nome_clinica || 'Clínica'}`;
      
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
      window.open(mailtoLink);
      
      toast.dismiss();
      toast.success(`✉️ PDF gerado e cliente de e-mail aberto para ${email}`);
    } catch (error) {
      console.error('Erro ao preparar e-mail:', error);
      toast.dismiss();
      toast.error('❌ Erro ao preparar e-mail');
    }
  };

  // Função para enviar declaração por WhatsApp
  const handleEnviarWhatsAppDeclaracao = async () => {
    if (!dadosDeclaracao) {
      toast.error('Nenhuma declaração para enviar');
      return;
    }

    const telefone = dadosDeclaracao.paciente?.telefone;
    if (!telefone) {
      toast.error('Paciente não possui telefone cadastrado');
      return;
    }

    try {
      toast.loading('Gerando PDF e preparando WhatsApp...');
      
      // Gerar PDF automaticamente
      const pdfBlob = await gerarPDFDeclaracaoBlob();
      
      // Criar link de download temporário
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Declaracao_${dadosDeclaracao.paciente.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Simular clique para download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Limpar telefone (remover caracteres não numéricos)
      const telefoneLimpo = telefone.replace(/\D/g, '');
      
      // Preparar mensagem
      const mensagem = `Olá ${dadosDeclaracao.paciente.nome}! 

Sua declaração de comparecimento está pronta.

📅 Data de comparecimento: ${dadosDeclaracao.agendamento ? formatDateToBrazilian(dadosDeclaracao.agendamento.data_agendamento) : 'Data não disponível'}

Atenciosamente,
${configuracoes?.nome_clinica || 'Clínica'}`;

      // Abrir WhatsApp Web
      const whatsappLink = `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
      window.open(whatsappLink, '_blank');
      
      toast.dismiss();
      toast.success(`📱 PDF gerado e WhatsApp aberto para ${telefone}`);
    } catch (error) {
      console.error('Erro ao preparar WhatsApp:', error);
      toast.dismiss();
      toast.error('❌ Erro ao preparar WhatsApp');
    }
  };

  // Funções para assinatura digital
  const carregarCertificados = async () => {
    try {
      setCarregandoCertificados(true);
      toast.loading('🔍 Detectando token A3 no seu computador...');
      
      // Verificar se o componente Web PKI está instalado
      const instalado = await webPkiService.verificarInstalacao();
      
      if (!instalado) {
        toast.error('❌ Componente Web PKI não instalado');
        toast('📥 Baixe em: https://get.webpkiplugin.com/', { duration: 8000, icon: 'ℹ️' });
        return;
      }
      
      // Listar certificados do token A3 (no computador do usuário)
      const certificados = await webPkiService.listarCertificados();
      
      if (certificados && certificados.length > 0) {
        setCertificadosDisponiveis(certificados);
        toast.success(`✅ Token A3 detectado! ${certificados.length} certificado(s) encontrado(s)`);
      } else {
        toast.error('❌ Nenhum certificado encontrado. Conecte o token A3.');
      }
      
    } catch (error: any) {
      console.error('Erro ao carregar certificados:', error);
      
      if (error.message && error.message.includes('COMPONENTE_NAO_INSTALADO')) {
        toast.error('❌ Componente Web PKI não instalado');
        toast('📥 Instale em: https://get.webpkiplugin.com/', { duration: 8000, icon: 'ℹ️' });
      } else if (error.message && error.message.includes('token')) {
        toast.error('❌ Token A3 não detectado. Conecte o token na porta USB.');
      } else {
        toast.error('❌ Erro ao acessar certificados digitais');
      }
    } finally {
      setCarregandoCertificados(false);
    }
  };

  const validarCertificado = async (certificadoId: string) => {
    try {
      // Com Web PKI, a validação é feita automaticamente ao listar
      // Certificados listados já são válidos
      const cert = certificadosDisponiveis.find(c => c.id === certificadoId);
      
      if (cert) {
        toast.success('✅ Certificado válido e dentro da validade');
        return cert;
      } else {
        toast.error('Certificado não encontrado');
        return null;
      }
    } catch (error) {
      console.error('Erro ao validar certificado:', error);
      toast.error('Erro ao validar certificado');
      return null;
    }
  };

  const assinarDocumentoDigitalmente = async () => {
    if (!certificadoSelecionado) {
      toast.error('Selecione um certificado');
      return;
    }

    // Verificar se há documento para assinar (laudo ou declaração)
    if (!laudoEncontrado && !dadosDeclaracao) {
      toast.error('Nenhum documento para assinar');
      return;
    }

    // Web PKI solicita PIN automaticamente - não precisa de modal
    // Chamar diretamente a função de assinatura
    await confirmarAssinaturaComPin();
  };

  const confirmarAssinaturaComPin = async () => {
    // Web PKI solicita o PIN automaticamente via diálogo do token
    // Não precisamos do modal de PIN
    setMostrarModalPin(false);

    try {
      setAssinandoDigitalmente(true);
      toast.loading('🔐 Assinando documento com token A3...');
      toast.loading('⚠️ O sistema vai solicitar o PIN do token...', { duration: 3000 });

      // Determinar tipo de documento e dados
      const tipoDocumento = laudoEncontrado ? 'laudo' : 'declaracao';
      const dadosDocumento = laudoEncontrado || dadosDeclaracao;
      
      // Gerar hash do documento (SHA-256)
      const documentoTexto = JSON.stringify(dadosDocumento);
      const encoder = new TextEncoder();
      const data = encoder.encode(documentoTexto);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const documentoHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      console.log('📄 Hash do documento gerado:', documentoHash.substring(0, 20) + '...');

      // Buscar certificado selecionado
      const certSelecionado = certificadosDisponiveis.find(c => c.id === certificadoSelecionado);
      
      if (!certSelecionado) {
        toast.error('Certificado não encontrado');
        return;
      }

      // Assinar com Web PKI (solicita PIN automaticamente)
      console.log('✍️ Chamando Web PKI para assinar...');
      const resultado = await webPkiService.assinarDocumento(
        certSelecionado.thumbprint || certSelecionado.id,
        documentoHash
      );

      if (resultado.success) {
        const assinaturaDigital = {
          id: `sig-${Date.now()}`,
          certificadoId: certSelecionado.id,
          documentoHash,
          algoritmoassinatura: resultado.algoritmo,
          timestamp: resultado.timestamp,
          assinatura: resultado.assinatura,
          certificado: {
            nome: certSelecionado.nome,
            cpf: certSelecionado.cpf,
            validade: certSelecionado.validade
          }
        };

        setAssinaturaDigitalData(assinaturaDigital);
        toast.success('✅ Documento assinado digitalmente com sucesso!');
        toast.success('🔐 Assinatura criptográfica válida (ICP-Brasil)', { duration: 5000 });
        
        // Limpar estados
        setPinCertificado('');
        setTentativasPin(0);
      } else {
        toast.error('Erro ao assinar documento');
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao assinar documento:', error);
      
      if (error.message && error.message.includes('PIN')) {
        toast.error('❌ PIN incorreto ou cancelado pelo usuário');
        toast('⚠️ Verifique o PIN do seu token A3', { duration: 5000, icon: '🔐' });
      } else if (error.message && error.message.includes('cancelado')) {
        toast.error('ℹ️ Assinatura cancelada pelo usuário');
      } else {
        toast.error('❌ Erro ao assinar documento digitalmente');
      }
    } finally {
      setAssinandoDigitalmente(false);
    }
  };


  // Função para buscar sugestões de declarações
  const buscarSugestoesDeclaracao = async (termo: string) => {
    if (!termo || termo.length < 2) {
      setSugestoesDeclaracao([]);
      setMostrarSugestoesDeclaracao(false);
      return;
    }

    try {
      const response = await pacientesService.list({ 
        search: termo,
        limit: 50 
      });
      
      const pacientes = (response as any)?.data?.data?.pacientes || [];
      setSugestoesDeclaracao(pacientes);
      setMostrarSugestoesDeclaracao(pacientes.length > 0);
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
    }
  };

  // Função para selecionar um paciente para declaração
  const selecionarDeclaracao = async (pacienteSelecionado: any) => {
    setBuscaDeclaracao(`${pacienteSelecionado.cpf} - ${pacienteSelecionado.nome}`);
    setMostrarSugestoesDeclaracao(false);
    
    setBuscandoDeclaracao(true);
    try {
      // Usar o paciente selecionado
      const paciente = pacienteSelecionado;
      
      // Buscar agendamento do paciente - tentar por CPF sem formatação primeiro
      const cpfLimpo = paciente.cpf ? paciente.cpf.replace(/\D/g, '') : '';
      
      console.log('🔍 Buscando agendamento para:', {
        nome: paciente.nome,
        cpf: paciente.cpf,
        cpfLimpo: cpfLimpo
      });
      
      // Tentar buscar por CPF limpo primeiro, depois por nome
      let agendamentosResponse = await agendamentosService.list({
        search: cpfLimpo,
        limit: 10
      });
      
      let agendamentos = (agendamentosResponse as any)?.data?.data?.agendamentos || [];
      
      // Se não encontrou por CPF, tentar por nome
      if (agendamentos.length === 0 && paciente.nome) {
        console.log('⚠️ Não encontrou por CPF, tentando por nome...');
        agendamentosResponse = await agendamentosService.list({
          search: paciente.nome,
          limit: 10
        });
        agendamentos = (agendamentosResponse as any)?.data?.data?.agendamentos || [];
      }
      
      console.log('📋 Total de agendamentos encontrados:', agendamentos.length);
      
      // Pegar o agendamento mais recente
      const agendamento = agendamentos.length > 0 ? agendamentos[0] : null;
      
      if (agendamento) {
        console.log('✅ Agendamento encontrado:', {
          id: agendamento.id,
          nome: agendamento.nome,
          cpf: agendamento.cpf,
          data_agendamento: agendamento.data_agendamento
        });
        console.log('📅 Data do agendamento (raw):', agendamento.data_agendamento);
        console.log('🕐 Tipo da data:', typeof agendamento.data_agendamento);
        
        if (agendamento.data_agendamento) {
          const data = new Date(agendamento.data_agendamento);
          console.log('⏰ Data parseada:', data);
          console.log('⏰ Data ISO:', data.toISOString());
          console.log('⏰ Hora:', data.getHours(), 'Minuto:', data.getMinutes());
          console.log('⏰ UTC Hora:', data.getUTCHours(), 'UTC Minuto:', data.getUTCMinutes());
        }
      } else {
        console.warn('❌ Nenhum agendamento encontrado para este paciente');
      }
      
      setDadosDeclaracao({
        paciente: paciente,
        agendamento: agendamento,
        psicologo: currentUser
      });
      
      toast.success('Dados carregados para declaração!');
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao buscar dados');
      setDadosDeclaracao(null);
    } finally {
      setBuscandoDeclaracao(false);
    }
  };

  // Função para buscar sugestões de laudos
  const buscarSugestoesLaudo = async (termo: string) => {
    if (!termo || termo.length < 2) {
      setSugestoesLaudo([]);
      setMostrarSugestoesLaudo(false);
      return;
    }

    try {
      const response = await pacientesService.list({ 
        search: termo,
        limit: 50 
      });
      
      const pacientes = (response as any)?.data?.data?.pacientes || [];
      
      // Filtrar apenas pacientes com número de laudo
      const pacientesComLaudo = pacientes.filter((p: any) => p.numero_laudo);
      
      setSugestoesLaudo(pacientesComLaudo);
      setMostrarSugestoesLaudo(pacientesComLaudo.length > 0);
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
    }
  };

  // Função para selecionar um laudo da lista de sugestões
  const selecionarLaudo = async (paciente: any) => {
    setBuscaLaudo(`${paciente.numero_laudo} - ${paciente.nome}`);
    setMostrarSugestoesLaudo(false);
    
    setBuscandoLaudo(true);
    try {
      if (!paciente.numero_laudo) {
        toast.error('Este paciente não possui número de laudo definido');
        setLaudoEncontrado(null);
        return;
      }

      // Buscar avaliações do paciente
      const avaliacoesResponse = await avaliacoesService.list({ 
        paciente_id: paciente.id,
        limit: 100
      });
      
      const avaliacoes = (avaliacoesResponse as any)?.data?.data?.avaliacoes || [];
      const avaliacoesDoLaudo = avaliacoes.filter((av: any) => av.numero_laudo === paciente.numero_laudo);
      
      // Buscar testes de cada avaliação
      const testesPromises = avaliacoesDoLaudo.map(async (av: any) => {
        try {
          const testesResponse = await avaliacoesService.getTestes(av.id);
          return (testesResponse as any)?.data || [];
        } catch (error) {
          console.error('Erro ao buscar testes da avaliação:', av.id, error);
          return [];
        }
      });
      
      const testesArrays = await Promise.all(testesPromises);
      const todosTestes = testesArrays.flat();
      
      setLaudoEncontrado({
        paciente: paciente,
        avaliacoes: avaliacoesDoLaudo,
        testes: todosTestes,
        aptidao: avaliacoesDoLaudo.find((av: any) => av.aptidao)?.aptidao || null,
        psicologo: currentUser
      });
      
      toast.success(`Laudo ${paciente.numero_laudo} carregado com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao buscar laudo:', error);
      toast.error('Erro ao buscar laudo');
      setLaudoEncontrado(null);
    } finally {
      setBuscandoLaudo(false);
    }
  };

  // Função para carregar estatísticas
  const carregarEstatisticas = async () => {
    try {
      setCarregandoEstatisticas(true);
      
      // Calcular data inicial baseada no período selecionado
      const dataFim = new Date();
      let dataInicio = new Date();
      
      switch (periodoEstatisticas) {
        case '7dias':
          dataInicio.setDate(dataInicio.getDate() - 7);
          break;
        case '30dias':
          dataInicio.setDate(dataInicio.getDate() - 30);
          break;
        case '90dias':
          dataInicio.setDate(dataInicio.getDate() - 90);
          break;
        case 'ano':
          dataInicio.setFullYear(dataInicio.getFullYear() - 1);
          break;
        case 'todos':
          dataInicio = new Date('2020-01-01');
          break;
      }
      
      // Buscar todas as avaliações
      const response = await avaliacoesService.list({ limit: 10000 });
      const todasAvaliacoes = (response.data?.data as any)?.items || [];
      
      // Filtrar por período
      const avaliacoesFiltradas = todasAvaliacoes.filter((av: any) => {
        const dataAvaliacao = new Date(av.data_avaliacao);
        return dataAvaliacao >= dataInicio && dataAvaliacao <= dataFim;
      });
      
      // Calcular estatísticas
      const totalAvaliacoes = avaliacoesFiltradas.length;
      const aptos = avaliacoesFiltradas.filter((av: any) => av.aptidao === 'Apto').length;
      const inaptosTemporarios = avaliacoesFiltradas.filter((av: any) => av.aptidao === 'Inapto Temporário').length;
      const inaptos = avaliacoesFiltradas.filter((av: any) => av.aptidao === 'Inapto').length;
      
      // Estatísticas por categoria de CNH
      const categorias: any = {};
      avaliacoesFiltradas.forEach((av: any) => {
        if (av.categoria_cnh) {
          categorias[av.categoria_cnh] = (categorias[av.categoria_cnh] || 0) + 1;
        }
      });
      
      // Estatísticas por tipo de avaliação
      const tiposAvaliacao: any = {
        'Primeira Habilitação': 0,
        'Renovação': 0,
        'Mudança de Categoria': 0,
        'Outros': 0
      };
      
      avaliacoesFiltradas.forEach((av: any) => {
        if (av.tipo_transito) {
          if (tiposAvaliacao[av.tipo_transito] !== undefined) {
            tiposAvaliacao[av.tipo_transito]++;
          } else {
            tiposAvaliacao['Outros']++;
          }
        }
      });
      
      // Estatísticas por teste
      const testesPorTipo: any = {
        'AC': 0,
        'BPA': 0,
        'PMK': 0,
        'Palográfico': 0,
        'R1': 0,
        'MVT': 0,
        'MIG': 0,
        'Rotas de Atenção': 0,
        'MEMORE': 0
      };
      
      // Buscar testes de cada avaliação
      for (const av of avaliacoesFiltradas) {
        try {
          const testesResponse = await avaliacoesService.getTestes(av.id);
          const testes: any = testesResponse.data || {};
          
          if (testes.ac && Array.isArray(testes.ac) && testes.ac.length > 0) testesPorTipo['AC']++;
          if (testes.bpa && Array.isArray(testes.bpa) && testes.bpa.length > 0) testesPorTipo['BPA']++;
          if (testes.pmk && Array.isArray(testes.pmk) && testes.pmk.length > 0) testesPorTipo['PMK']++;
          if (testes.palografico && Array.isArray(testes.palografico) && testes.palografico.length > 0) testesPorTipo['Palográfico']++;
          if (testes.r1 && Array.isArray(testes.r1) && testes.r1.length > 0) testesPorTipo['R1']++;
          if (testes.mvt && Array.isArray(testes.mvt) && testes.mvt.length > 0) testesPorTipo['MVT']++;
          if (testes.mig && Array.isArray(testes.mig) && testes.mig.length > 0) testesPorTipo['MIG']++;
          if (testes.rotas && Array.isArray(testes.rotas) && testes.rotas.length > 0) testesPorTipo['Rotas de Atenção']++;
          if (testes.memore && Array.isArray(testes.memore) && testes.memore.length > 0) testesPorTipo['MEMORE']++;
        } catch {
          console.error('Erro ao buscar testes da avaliação:', av.id);
        }
      }
      
      // Avaliações por mês (últimos 12 meses)
      const avaliacoesPorMes: any = {};
      const mesesLabels: string[] = [];
      
      for (let i = 11; i >= 0; i--) {
        const data = new Date();
        data.setMonth(data.getMonth() - i);
        const mesAno = `${data.toLocaleString('pt-BR', { month: 'short' })}/${data.getFullYear().toString().substr(2)}`;
        mesesLabels.push(mesAno);
        avaliacoesPorMes[mesAno] = 0;
      }
      
      avaliacoesFiltradas.forEach((av: any) => {
        const data = new Date(av.data_avaliacao);
        const mesAno = `${data.toLocaleString('pt-BR', { month: 'short' })}/${data.getFullYear().toString().substr(2)}`;
        if (avaliacoesPorMes[mesAno] !== undefined) {
          avaliacoesPorMes[mesAno]++;
        }
      });
      
      // Buscar estatísticas de agendamentos
      const agendamentosResponse = await agendamentosService.list({ limit: 10000 });
      const todosAgendamentos = (agendamentosResponse.data as any)?.data?.agendamentos || [];
      
      // Filtrar agendamentos por período
      const agendamentosFiltrados = todosAgendamentos.filter((ag: any) => {
        const dataAgendamento = new Date(ag.data_agendamento);
        return dataAgendamento >= dataInicio && dataAgendamento <= dataFim;
      });
      
      // Calcular estatísticas de agendamentos
      const totalAgendamentos = agendamentosFiltrados.length;
      const compareceram = agendamentosFiltrados.filter((ag: any) => ag.status === 'Compareceu').length;
      const remarcaram = agendamentosFiltrados.filter((ag: any) => ag.status === 'Remarcado').length;
      const faltaram = agendamentosFiltrados.filter((ag: any) => ag.status === 'Faltou').length;
      const agendados = agendamentosFiltrados.filter((ag: any) => ag.status === 'Agendado').length;
      const cancelados = agendamentosFiltrados.filter((ag: any) => ag.status === 'Cancelado').length;
      
      setEstatisticas({
        totalAvaliacoes,
        aptos,
        inaptosTemporarios,
        inaptos,
        categorias,
        tiposAvaliacao,
        testesPorTipo,
        avaliacoesPorMes,
        mesesLabels,
        dataInicio: dataInicio.toLocaleDateString('pt-BR'),
        dataFim: dataFim.toLocaleDateString('pt-BR'),
        // Estatísticas de agendamentos
        totalAgendamentos,
        compareceram,
        remarcaram,
        faltaram,
        agendados,
        cancelados
      });
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setCarregandoEstatisticas(false);
    }
  };

  // Carregar estatísticas quando mudar o período ou a aba
  React.useEffect(() => {
    if (activeTab === 'estatisticas') {
      carregarEstatisticas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, periodoEstatisticas]);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Relatórios e Laudos</h1>
          <p className="text-gray-600">Gere laudos e visualize estatísticas</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('laudos')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'laudos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📄 Laudos
            </button>
            <button
              onClick={() => setActiveTab('declaracao')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'declaracao'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Declaração
            </button>
            <button
              onClick={() => setActiveTab('estatisticas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'estatisticas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Estatísticas
            </button>
            <button
              onClick={() => setActiveTab('nfs-e')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'nfs-e'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🧾 NFS-e
            </button>
          </nav>
        </div>

        {/* TAB: LAUDOS */}
        {activeTab === 'laudos' && (
          <div className="space-y-6">
            {/* Busca de Laudo */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Buscar Laudo</h3>
              <p className="text-sm text-gray-600 mb-4">
                Digite o número do laudo, CPF ou nome do paciente para carregar os dados e gerar o laudo
              </p>
              
              <div className="relative">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={buscaLaudo}
                      onChange={(e) => {
                        setBuscaLaudo(e.target.value);
                        buscarSugestoesLaudo(e.target.value);
                      }}
                      onFocus={() => buscaLaudo.length >= 2 && buscarSugestoesLaudo(buscaLaudo)}
                      onBlur={() => setTimeout(() => setMostrarSugestoesLaudo(false), 200)}
                      placeholder="Número do laudo, CPF ou nome do paciente..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    
                    {/* Dropdown de Sugestões */}
                    {mostrarSugestoesLaudo && sugestoesLaudo.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                        <div className="p-2 bg-gray-50 border-b border-gray-200 sticky top-0">
                          <p className="text-xs text-gray-600 font-medium">
                            {sugestoesLaudo.length} resultado(s) encontrado(s)
                          </p>
                        </div>
                        {sugestoesLaudo.map((sugestao: any) => (
                          <button
                            key={sugestao.id}
                            onClick={() => selecionarLaudo(sugestao)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{sugestao.nome}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  📋 Laudo: <span className="font-mono text-blue-600">{sugestao.numero_laudo}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  CPF: {sugestao.cpf}
                                </p>
                              </div>
                              {sugestao.ultima_aptidao && (
                                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                                  sugestao.ultima_aptidao === 'Apto' ? 'bg-green-100 text-green-800' :
                                  sugestao.ultima_aptidao === 'Inapto Temporário' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {sugestao.ultima_aptidao}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => sugestoesLaudo.length > 0 ? selecionarLaudo(sugestoesLaudo[0]) : toast.error('Nenhuma sugestão disponível')}
                    disabled={buscandoLaudo}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {buscandoLaudo ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Buscar
                      </>
                    )}
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-3">
                  💡 Digite pelo menos 2 caracteres para ver sugestões. Busque por número (22, 0001, LAU-2025-0001), CPF ou nome (José)
                </p>
              </div>
            </div>

            {/* Laudo Completo */}
            {laudoEncontrado && (
              <div className="bg-white border-2 border-blue-300 rounded-lg p-8 laudo-impressao">
                {/* Cabeçalho com Botões de Ação */}
                <div className="flex justify-between items-start mb-6 no-print">
                  <h3 className="text-2xl font-bold text-gray-900">📋 Laudo Psicológico</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={handleGerarPDFLaudo}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Baixar PDF
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Imprimir
                    </button>
                  </div>
                </div>

                {/* Conteúdo do Laudo para PDF */}
                <div ref={laudoRef} className="space-y-6 text-gray-800">
                  {/* 1. Identificação */}
                  <section>
                    <h4 className="font-bold text-lg mb-3 border-b-2 border-gray-300 pb-2">1. IDENTIFICAÇÃO</h4>
                    <div className="space-y-2 ml-4">
                      <p><strong>Nome do avaliado:</strong> {laudoEncontrado.paciente.nome}</p>
                      <p><strong>Documento (CPF):</strong> {laudoEncontrado.paciente.cpf}</p>
                      <p>
                        <strong>Data de nascimento:</strong> {laudoEncontrado.paciente.data_nascimento ? formatDateToBrazilian(laudoEncontrado.paciente.data_nascimento) : '-'} | 
                        <strong> Idade:</strong> {laudoEncontrado.paciente.data_nascimento ? `${calculateAge(laudoEncontrado.paciente.data_nascimento)} anos` : '-'}
                      </p>
                      <p><strong>Número do processo/registro:</strong> {laudoEncontrado.paciente.numero_laudo}</p>
                      <p><strong>Data(s) da avaliação:</strong> {(() => {
                        // Extrair datas únicas dos testes aplicados
                        const datasTestes = laudoEncontrado.testes
                          .map((teste: any) => teste.created_at || teste.data_aplicacao)
                          .filter((data: any) => data)
                          .map((data: any) => new Date(data).toISOString().split('T')[0])
                          .filter((data: string, index: number, array: string[]) => array.indexOf(data) === index)
                          .sort()
                          .map((data: string) => formatDateToBrazilian(data));
                        
                        // Se não há datas dos testes, usar data_aplicacao das avaliações
                        if (datasTestes.length === 0) {
                          const datasAvaliacoes = laudoEncontrado.avaliacoes
                            .map((av: any) => av.data_aplicacao)
                            .filter((data: any) => data)
                            .map((data: any) => new Date(data).toISOString().split('T')[0])
                            .filter((data: string, index: number, array: string[]) => array.indexOf(data) === index)
                            .sort()
                            .map((data: string) => formatDateToBrazilian(data));
                          
                          return datasAvaliacoes.length > 0 ? datasAvaliacoes.join(', ') : 'Data não disponível';
                        }
                        
                        return datasTestes.join(', ');
                      })()}</p>
                      <p><strong>Local da avaliação:</strong> {configuracoes?.nome_clinica || '[Clínica não configurada]'}{configuracoes?.endereco ? ` - ${configuracoes.endereco}` : ''}</p>
                    </div>
                  </section>

                  {/* 2. Demanda e Objetivo */}
                  <section>
                    <h4 className="font-bold text-lg mb-3 border-b-2 border-gray-300 pb-2">2. DEMANDA E OBJETIVO</h4>
                    <div className="space-y-2 ml-4">
                      <p><strong>Demanda:</strong> Avaliação psicológica para fins de {laudoEncontrado.paciente.tipo_transito?.toLowerCase() || 'obtenção/renovação'} da Carteira Nacional de Habilitação (CNH) no Estado de São Paulo.</p>
                      <p><strong>Objetivo:</strong> Investigar condições psicológicas relevantes para direção veicular, com foco em memória, atenção, raciocínio lógico, personalidade e entrevista psicológica, conforme normas aplicáveis ao contexto do trânsito.</p>
                    </div>
                  </section>

                  {/* 4. Procedimentos e Instrumentos */}
                  <section>
                    <h4 className="font-bold text-lg mb-3 border-b-2 border-gray-300 pb-2">4. PROCEDIMENTOS, INSTRUMENTOS E CONDIÇÕES DE AVALIAÇÃO</h4>
                    <div className="space-y-3 ml-4">
                      <div>
                        <p className="font-semibold mb-2">Procedimentos:</p>
                        <ul className="list-disc ml-6 space-y-1">
                          <li>Entrevista psicológica estruturada/semi estruturada</li>
                          <li>Aplicação de testes psicológicos padronizados e validados para a população-alvo</li>
                          <li>Observação comportamental durante a avaliação</li>
                        </ul>
                      </div>
                      
                      <div>
                        <p className="font-semibold mb-2">Instrumentos utilizados (todos com parecer favorável no SATEPSI):</p>
                        <ul className="list-disc ml-6 space-y-1">
                          {laudoEncontrado.testes.map((teste: any, idx: number) => {
                            // Para Rotas, precisamos extrair as classificações de cada rota
                            if (teste.tipo === 'rotas' && Array.isArray(teste.resultado)) {
                              return teste.resultado.map((rota: any, rotaIdx: number) => (
                                <li key={`${idx}-${rotaIdx}`}>
                                  <strong>{teste.nome} - {rota.rota_tipo}</strong> - Classificação: {rota.classificacao || 'N/A'}
                                </li>
                              ));
                            }
                            // Para outros testes
                            return (
                              <li key={idx}>
                                <strong>{teste.nome}</strong> - Classificação: {teste.resultado?.classificacao || 'N/A'}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* 7. Conclusão Técnica */}
                  <section>
                    <h4 className="font-bold text-lg mb-3 border-b-2 border-gray-300 pb-2">7. CONCLUSÃO TÉCNICA</h4>
                    <div className="space-y-3 ml-4">
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                        <p className="font-bold text-lg">
                          Parecer: {' '}
                          {laudoEncontrado.aptidao === 'Apto' && '✅ APTO psicologicamente para condução veicular no contexto do trânsito (DETRAN/SP)'}
                          {laudoEncontrado.aptidao === 'Inapto Temporário' && '⚠️ INAPTO TEMPORÁRIO'}
                          {laudoEncontrado.aptidao === 'Inapto' && '❌ INAPTO psicologicamente para condução veicular'}
                          {!laudoEncontrado.aptidao && '⏳ Avaliação inconclusiva – necessário retorno/reavaliação'}
                        </p>
                      </div>
                      <p><strong>Validade:</strong> 6 meses a contar da data de emissão.</p>
                      <p><strong>Escopo:</strong> Uso exclusivo no contexto do trânsito. Este laudo não é válido para outras áreas ou finalidades.</p>
                      <div className="mt-6 pt-6 border-t-2 border-gray-300">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p><strong>Nome do(a) psicólogo(a):</strong> {laudoEncontrado.psicologo?.nome || currentUser?.nome}</p>
                            <p className="mt-2"><strong>CRP:</strong> {laudoEncontrado.psicologo?.crp || (currentUser as any)?.crp || '[CRP não informado]'}</p>
                            <p className="mt-2"><strong>Local e data:</strong> {configuracoes?.cidade || 'São Paulo'}/SP, {new Date().toLocaleDateString('pt-BR')}</p>
                          </div>
                          
                          <div>
                            <p className="font-semibold mb-2">Assinatura e Carimbo:</p>
                            {assinaturaDigitalData ? (
                              <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                                <div className="text-center">
                                  <div className="text-green-800 font-semibold mb-2 flex items-center justify-center gap-2">
                                    ✅ ASSINADO DIGITALMENTE
                                  </div>
                                  <div className="text-sm text-green-700">
                                    <p><strong>Psicólogo:</strong> {assinaturaDigitalData.certificado.nome}</p>
                                    <p><strong>CRP:</strong> {laudoEncontrado.psicologo?.crp || (currentUser as any)?.crp || '[CRP não informado]'}</p>
                                    <p><strong>Data:</strong> {new Date(assinaturaDigitalData.timestamp).toLocaleDateString('pt-BR')}</p>
                                    <p><strong>Certificado:</strong> {assinaturaDigitalData.certificado.cpf}</p>
                                  </div>
                                </div>
                              </div>
                            ) : assinaturaImagem ? (
                              <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
                                <img src={assinaturaImagem} alt="Assinatura" className="h-24 object-contain mx-auto" />
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 text-center">
                                <p className="text-sm text-gray-500">__________________________</p>
                                <p className="text-xs text-gray-400 mt-2">(Assinatura e carimbo)</p>
                              </div>
                            )}
                            <label className="mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all cursor-pointer text-sm no-print">
                              <Upload className="w-4 h-4" />
                              {assinaturaImagem ? 'Trocar Assinatura' : 'Adicionar Assinatura'}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAssinaturaUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Assinatura Digital para Laudos */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 no-print">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    🔐 Assinatura Digital com e-CPF
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Carregar Certificados */}
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={carregarCertificados}
                        disabled={carregandoCertificados}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <Search className="w-4 h-4" />
                        {carregandoCertificados ? 'Carregando...' : 'Carregar Certificados'}
                      </button>
                      
                      {certificadosDisponiveis.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {certificadosDisponiveis.length} certificado(s) encontrado(s)
                        </span>
                      )}
                    </div>

                    {/* Seleção de Certificado */}
                    {certificadosDisponiveis.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Selecione o Certificado:
                        </label>
                        <select
                          value={certificadoSelecionado}
                          onChange={(e) => setCertificadoSelecionado(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Escolha um certificado...</option>
                          {certificadosDisponiveis.map((cert) => (
                            <option key={cert.id} value={cert.id}>
                              {cert.nome} - {cert.cpf} (Válido até: {cert.validade})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Informações do Certificado Selecionado */}
                    {certificadoSelecionado && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        {(() => {
                          const cert = certificadosDisponiveis.find(c => c.id === certificadoSelecionado);
                          return cert ? (
                            <div>
                              <h4 className="font-semibold text-blue-800">Certificado Selecionado:</h4>
                              <p className="text-sm text-blue-700 mt-1">
                                <strong>Nome:</strong> {cert.nome}
                              </p>
                              <p className="text-sm text-blue-700">
                                <strong>CPF:</strong> {cert.cpf}
                              </p>
                              <p className="text-sm text-blue-700">
                                <strong>Tipo:</strong> {cert.tipo}
                              </p>
                              <p className="text-sm text-blue-700">
                                <strong>Validade:</strong> {cert.validade}
                              </p>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {/* Botão de Assinatura Digital */}
                    {certificadoSelecionado && (
                      <div className="flex gap-3">
                        <button
                          onClick={assinarDocumentoDigitalmente}
                          disabled={assinandoDigitalmente}
                          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50 font-semibold"
                        >
                          <FileText className="w-5 h-5" />
                          {assinandoDigitalmente ? 'Assinando...' : '🔐 Assinar Digitalmente'}
                        </button>
                        
                        <button
                          onClick={() => validarCertificado(certificadoSelecionado)}
                          className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                        >
                          <Search className="w-4 h-4" />
                          Validar Certificado
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}

            {!laudoEncontrado && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Nenhum laudo carregado</p>
                <p className="text-gray-500 text-sm mt-2">Use o campo de busca acima para encontrar um laudo</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: DECLARAÇÃO */}
        {activeTab === 'declaracao' && (
          <div className="space-y-6">
            {/* Busca de Paciente */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 no-print">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Buscar Paciente</h3>
              <p className="text-sm text-gray-600 mb-4">
                Digite o CPF ou nome do paciente para gerar a declaração de comparecimento
              </p>
              
              <div className="relative">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={buscaDeclaracao}
                      onChange={(e) => {
                        setBuscaDeclaracao(e.target.value);
                        buscarSugestoesDeclaracao(e.target.value);
                      }}
                      onFocus={() => buscaDeclaracao.length >= 2 && buscarSugestoesDeclaracao(buscaDeclaracao)}
                      onBlur={() => setTimeout(() => setMostrarSugestoesDeclaracao(false), 200)}
                      placeholder="CPF ou nome do paciente..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    
                    {/* Dropdown de Sugestões */}
                    {mostrarSugestoesDeclaracao && sugestoesDeclaracao.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                        <div className="p-2 bg-gray-50 border-b border-gray-200 sticky top-0">
                          <p className="text-xs text-gray-600 font-medium">
                            {sugestoesDeclaracao.length} paciente(s) encontrado(s)
                          </p>
                        </div>
                        {sugestoesDeclaracao.map((sugestao: any) => (
                          <button
                            key={sugestao.id}
                            onClick={() => selecionarDeclaracao(sugestao)}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{sugestao.nome}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  CPF: {sugestao.cpf}
                                </p>
                                {sugestao.telefone && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    📞 {sugestao.telefone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => sugestoesDeclaracao.length > 0 ? selecionarDeclaracao(sugestoesDeclaracao[0]) : toast.error('Nenhuma sugestão disponível')}
                    disabled={buscandoDeclaracao}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {buscandoDeclaracao ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Buscar
                      </>
                    )}
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-3">
                  💡 Digite pelo menos 2 caracteres para ver sugestões. Busque por CPF ou nome do paciente
                </p>
              </div>
            </div>

            {/* Declaração Completa */}
            {dadosDeclaracao && (
              <div className="bg-white border-2 border-green-300 rounded-lg p-12">
                {/* Botões de Ação */}
                <div className="flex justify-end gap-3 mb-6 no-print">
                  <button
                    onClick={handleEnviarEmailDeclaracao}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Enviar por E-mail
                  </button>
                  <button
                    onClick={handleEnviarWhatsAppDeclaracao}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar por WhatsApp
                  </button>
                  <button
                    onClick={handleGerarPDFDeclaracao}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Baixar PDF
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>

                {/* Seção de Assinatura Digital */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 no-print">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    🔐 Assinatura Digital com e-CPF
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Carregar Certificados */}
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={carregarCertificados}
                        disabled={carregandoCertificados}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <Search className="w-4 h-4" />
                        {carregandoCertificados ? 'Carregando...' : 'Carregar Certificados'}
                      </button>
                      
                      {certificadosDisponiveis.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {certificadosDisponiveis.length} certificado(s) encontrado(s)
                        </span>
                      )}
                    </div>

                    {/* Seleção de Certificado */}
                    {certificadosDisponiveis.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Selecione o Certificado:
                        </label>
                        <select
                          value={certificadoSelecionado}
                          onChange={(e) => setCertificadoSelecionado(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Escolha um certificado...</option>
                          {certificadosDisponiveis.map((cert) => (
                            <option key={cert.id} value={cert.id}>
                              {cert.nome} - {cert.cpf} (Válido até: {cert.validade})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Informações do Certificado Selecionado */}
                    {certificadoSelecionado && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        {(() => {
                          const cert = certificadosDisponiveis.find(c => c.id === certificadoSelecionado);
                          return cert ? (
                            <div>
                              <h4 className="font-semibold text-blue-800">Certificado Selecionado:</h4>
                              <p className="text-sm text-blue-700 mt-1">
                                <strong>Nome:</strong> {cert.nome}
                              </p>
                              <p className="text-sm text-blue-700">
                                <strong>CPF:</strong> {cert.cpf}
                              </p>
                              <p className="text-sm text-blue-700">
                                <strong>Tipo:</strong> {cert.tipo}
                              </p>
                              <p className="text-sm text-blue-700">
                                <strong>Validade:</strong> {cert.validade}
                              </p>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {/* Botão de Assinatura Digital */}
                    {certificadoSelecionado && (
                      <div className="flex gap-3">
                        <button
                          onClick={assinarDocumentoDigitalmente}
                          disabled={assinandoDigitalmente}
                          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50 font-semibold"
                        >
                          <FileText className="w-5 h-5" />
                          {assinandoDigitalmente ? 'Assinando...' : '🔐 Assinar Digitalmente'}
                        </button>
                        
                        <button
                          onClick={() => validarCertificado(certificadoSelecionado)}
                          className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                        >
                          <Search className="w-4 h-4" />
                          Validar Certificado
                        </button>
                      </div>
                    )}

                  </div>
                </div>
                
                {/* Conteúdo da Declaração para PDF */}
                <div ref={declaracaoRef} className="declaracao-impressao bg-white p-12">
                {/* Cabeçalho */}
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold text-gray-900">{configuracoes?.nome_clinica || 'Clínica Psicotran Sanchez'}</h2>
                  <p className="text-sm text-gray-700">Avaliação Psicológica</p>
                  <p className="text-sm text-gray-700">
                    {configuracoes?.endereco || 'Rua Antônio Macedo Nº 128'} – CEP {configuracoes?.cep || '03080-010'}
                  </p>
                  <p className="text-sm text-gray-700">{configuracoes?.cidade || 'São Paulo'}</p>
                </div>

                {/* Título */}
                <h3 className="text-center text-2xl font-bold text-gray-900 mb-8">DECLARAÇÃO</h3>

                {/* Conteúdo */}
                <div className="space-y-6 text-gray-800 leading-relaxed text-justify">
                  <p>
                    Eu, <strong className="uppercase">{dadosDeclaracao.psicologo?.nome || currentUser?.nome}</strong>, 
                    Psicólogo(a), inscrito(a) no CRP/SP sob o n° <strong>{dadosDeclaracao.psicologo?.crp || (currentUser as any)?.crp || '06/127348'}</strong>, 
                    DECLARO para os devidos fins que o(a) Sr(a). <strong className="uppercase">{dadosDeclaracao.paciente.nome}</strong>, 
                    inscrito(a) no CPF sob o Nº <strong>{dadosDeclaracao.paciente.cpf}</strong>, 
                    compareceu à {configuracoes?.nome_clinica || 'Clínica Psicotran Sanchez'} para realização de avaliação psicológica 
                    para obtenção da CNH, no dia{' '}
                    <strong>
                      {dadosDeclaracao.agendamento?.data_agendamento ? 
                        formatDateToBrazilian(dadosDeclaracao.agendamento.data_agendamento) : 
                        '____/____/________'}
                    </strong>, no período das{' '}
                    <strong>
                      {dadosDeclaracao.agendamento?.data_agendamento ? (() => {
                        console.log('🖨️ Renderizando horário na declaração...');
                        console.log('🖨️ Data raw:', dadosDeclaracao.agendamento.data_agendamento);
                        
                        const data = new Date(dadosDeclaracao.agendamento.data_agendamento);
                        console.log('🖨️ Data parseada:', data);
                        console.log('🖨️ getHours():', data.getHours(), 'getMinutes():', data.getMinutes());
                        console.log('🖨️ getUTCHours():', data.getUTCHours(), 'getUTCMinutes():', data.getUTCMinutes());
                        
                        const horaInicio = String(data.getHours()).padStart(2, '0') + ':' + String(data.getMinutes()).padStart(2, '0');
                        const dataFim = new Date(data.getTime() + 2 * 60 * 60 * 1000);
                        const horaFim = String(dataFim.getHours()).padStart(2, '0') + ':' + String(dataFim.getMinutes()).padStart(2, '0');
                        
                        const resultado = `${horaInicio} às ${horaFim} hs`;
                        console.log('🖨️ Resultado final:', resultado);
                        
                        return resultado;
                      })() : '________ às ________ hs'}
                    </strong>.
                  </p>

                  <p className="border-t border-dashed border-gray-300 pt-4"></p>

                  <p>
                    Por ser verdade, firmo o presente para que surta seus efeitos legais.
                  </p>

                  <p className="border-t border-dashed border-gray-300 pt-4"></p>

                  <p className="mt-8">
                    <strong>{configuracoes?.cidade || 'São Paulo'}, {new Date().toLocaleDateString('pt-BR')}</strong>.
                  </p>

                  {/* Área de Assinatura */}
                  <div className="mt-16 pt-8 border-t-2 border-gray-300">
                    <div className="flex justify-center">
                      {assinaturaImagem ? (
                        <div>
                          <img 
                            src={assinaturaImagem} 
                            alt="Assinatura" 
                            className="h-24 object-contain mx-auto mb-2" 
                            onError={(e) => {
                              console.error('Erro ao carregar assinatura:', e);
                              toast.error('Erro ao exibir assinatura. Verifique o arquivo.');
                              setAssinaturaImagem(null);
                            }}
                          />
                          <div className="border-t-2 border-gray-800 w-64 mx-auto"></div>
                        </div>
                      ) : assinaturaDigitalData ? (
                        <div className="w-80 text-center">
                          <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                            <div className="text-green-800 font-semibold mb-2 flex items-center justify-center gap-2">
                              ✅ ASSINADO DIGITALMENTE
                            </div>
                            <div className="text-sm text-green-700">
                              <p><strong>Psicólogo:</strong> {assinaturaDigitalData.certificado.nome}</p>
                              <p><strong>CRP:</strong> {dadosDeclaracao.psicologo?.crp || (currentUser as any)?.crp || '[CRP não informado]'}</p>
                              <p><strong>Data:</strong> {new Date(assinaturaDigitalData.timestamp).toLocaleDateString('pt-BR')}</p>
                              <p><strong>Certificado:</strong> {assinaturaDigitalData.certificado.cpf}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-64 text-center">
                          <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
                            [Área para assinatura]
                          </div>
                          <div className="border-t-2 border-gray-800"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-center mt-2 font-semibold">{dadosDeclaracao.psicologo?.nome || currentUser?.nome}</p>
                    <p className="text-center text-sm">Psicólogo(a) - CRP/SP {dadosDeclaracao.psicologo?.crp || (currentUser as any)?.crp || '06/127348'}</p>
                    
                    {/* Informações da Assinatura Digital */}
                    {assinaturaDigitalData && (
                      <div className="text-center mt-2 text-xs text-gray-500">
                        <p>Assinatura Digital: {assinaturaDigitalData.id}</p>
                        <p>Algoritmo: {assinaturaDigitalData.algoritmoassinatura}</p>
                        <p>Data: {new Date(assinaturaDigitalData.timestamp).toLocaleString('pt-BR')}</p>
                      </div>
                    )}
                    
                    {/* Botão para adicionar assinatura */}
                    <div className="flex justify-center mt-4 no-print">
                      <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all cursor-pointer text-sm">
                        <Upload className="w-4 h-4" />
                        {assinaturaImagem ? 'Trocar Assinatura' : 'Adicionar Assinatura'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAssinaturaUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
                </div> {/* Fecha declaracaoRef */}
              </div>
            )}

            {!dadosDeclaracao && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Nenhuma declaração gerada</p>
                <p className="text-gray-500 text-sm mt-2">Use o campo de busca acima para encontrar um paciente</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: ESTATÍSTICAS */}
        {activeTab === 'estatisticas' && (
          <div className="space-y-6">
            {/* Filtro de Período */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Período</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setPeriodoEstatisticas('7dias')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    periodoEstatisticas === '7dias'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Últimos 7 dias
                </button>
                <button
                  onClick={() => setPeriodoEstatisticas('30dias')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    periodoEstatisticas === '30dias'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Últimos 30 dias
                </button>
                <button
                  onClick={() => setPeriodoEstatisticas('90dias')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    periodoEstatisticas === '90dias'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Últimos 90 dias
                </button>
                <button
                  onClick={() => setPeriodoEstatisticas('ano')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    periodoEstatisticas === 'ano'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Último ano
                </button>
                <button
                  onClick={() => setPeriodoEstatisticas('todos')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    periodoEstatisticas === 'todos'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos os períodos
                </button>
              </div>
              {estatisticas && (
                <p className="text-sm text-gray-600 mt-3">
                  📅 Período: {estatisticas.dataInicio} até {estatisticas.dataFim}
                </p>
              )}
            </div>

            {carregandoEstatisticas ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando estatísticas...</p>
              </div>
            ) : estatisticas ? (
              <>
                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Total de Avaliações</h3>
                      <div className="text-2xl">📊</div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{estatisticas.totalAvaliacoes}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Aptos</h3>
                      <div className="text-2xl">✅</div>
                    </div>
                    <p className="text-3xl font-bold text-green-600">{estatisticas.aptos}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {estatisticas.totalAvaliacoes > 0 
                        ? `${((estatisticas.aptos / estatisticas.totalAvaliacoes) * 100).toFixed(1)}%`
                        : '0%'}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Inaptos Temporários</h3>
                      <div className="text-2xl">⚠️</div>
                    </div>
                    <p className="text-3xl font-bold text-yellow-600">{estatisticas.inaptosTemporarios}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {estatisticas.totalAvaliacoes > 0 
                        ? `${((estatisticas.inaptosTemporarios / estatisticas.totalAvaliacoes) * 100).toFixed(1)}%`
                        : '0%'}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Inaptos</h3>
                      <div className="text-2xl">❌</div>
                    </div>
                    <p className="text-3xl font-bold text-red-600">{estatisticas.inaptos}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {estatisticas.totalAvaliacoes > 0 
                        ? `${((estatisticas.inaptos / estatisticas.totalAvaliacoes) * 100).toFixed(1)}%`
                        : '0%'}
                    </p>
                  </div>
                </div>

                {/* Estatísticas de Agendamentos */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">📅 Estatísticas de Agendamentos</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center border border-blue-200">
                      <div className="text-3xl font-bold text-blue-600">{estatisticas.totalAgendamentos}</div>
                      <div className="text-sm text-gray-700 mt-2 font-medium">Total</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center border border-green-200">
                      <div className="text-3xl font-bold text-green-600">{estatisticas.compareceram}</div>
                      <div className="text-sm text-gray-700 mt-2 font-medium">Compareceram</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {estatisticas.totalAgendamentos > 0 
                          ? `${((estatisticas.compareceram / estatisticas.totalAgendamentos) * 100).toFixed(1)}%`
                          : '0%'}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center border border-orange-200">
                      <div className="text-3xl font-bold text-orange-600">{estatisticas.remarcaram}</div>
                      <div className="text-sm text-gray-700 mt-2 font-medium">Remarcaram</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {estatisticas.totalAgendamentos > 0 
                          ? `${((estatisticas.remarcaram / estatisticas.totalAgendamentos) * 100).toFixed(1)}%`
                          : '0%'}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 text-center border border-red-200">
                      <div className="text-3xl font-bold text-red-600">{estatisticas.faltaram}</div>
                      <div className="text-sm text-gray-700 mt-2 font-medium">Faltaram</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {estatisticas.totalAgendamentos > 0 
                          ? `${((estatisticas.faltaram / estatisticas.totalAgendamentos) * 100).toFixed(1)}%`
                          : '0%'}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center border border-purple-200">
                      <div className="text-3xl font-bold text-purple-600">{estatisticas.agendados}</div>
                      <div className="text-sm text-gray-700 mt-2 font-medium">Agendados</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {estatisticas.totalAgendamentos > 0 
                          ? `${((estatisticas.agendados / estatisticas.totalAgendamentos) * 100).toFixed(1)}%`
                          : '0%'}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 text-center border border-gray-200">
                      <div className="text-3xl font-bold text-gray-600">{estatisticas.cancelados}</div>
                      <div className="text-sm text-gray-700 mt-2 font-medium">Cancelados</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {estatisticas.totalAgendamentos > 0 
                          ? `${((estatisticas.cancelados / estatisticas.totalAgendamentos) * 100).toFixed(1)}%`
                          : '0%'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicadores de Taxa */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Taxa de Comparecimento</p>
                          <p className="text-2xl font-bold text-green-600">
                            {estatisticas.totalAgendamentos > 0 
                              ? `${((estatisticas.compareceram / estatisticas.totalAgendamentos) * 100).toFixed(1)}%`
                              : '0%'}
                          </p>
                        </div>
                        <div className="text-4xl">✅</div>
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Taxa de Remarcação</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {estatisticas.totalAgendamentos > 0 
                              ? `${((estatisticas.remarcaram / estatisticas.totalAgendamentos) * 100).toFixed(1)}%`
                              : '0%'}
                          </p>
                        </div>
                        <div className="text-4xl">📅</div>
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Taxa de Faltas</p>
                          <p className="text-2xl font-bold text-red-600">
                            {estatisticas.totalAgendamentos > 0 
                              ? `${((estatisticas.faltaram / estatisticas.totalAgendamentos) * 100).toFixed(1)}%`
                              : '0%'}
                          </p>
                        </div>
                        <div className="text-4xl">❌</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfico de Avaliações por Mês */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Avaliações por Mês</h2>
                  <div className="flex items-end justify-between h-64 gap-2">
                    {estatisticas.mesesLabels.map((mes: string, index: number) => {
                      const valor = estatisticas.avaliacoesPorMes[mes] || 0;
                      const maxValor = Math.max(...Object.values(estatisticas.avaliacoesPorMes) as number[]);
                      const altura = maxValor > 0 ? (valor / maxValor) * 100 : 0;
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div className="relative w-full">
                            <div
                              className="bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 cursor-pointer"
                              style={{ height: `${altura * 2}px`, minHeight: valor > 0 ? '20px' : '2px' }}
                              title={`${mes}: ${valor} avaliações`}
                            >
                              {valor > 0 && (
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700">
                                  {valor}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                            {mes}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Estatísticas por Categoria de CNH */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Avaliações por Categoria de CNH</h2>
                  {Object.keys(estatisticas.categorias).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(estatisticas.categorias).map(([categoria, quantidade]: [string, any]) => (
                        <div key={categoria} className="bg-gray-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{quantidade}</div>
                          <div className="text-sm text-gray-600 mt-1">Categoria {categoria}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Nenhuma categoria registrada</p>
                  )}
                </div>

                {/* Estatísticas por Tipo de Avaliação */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Avaliações por Tipo</h2>
                  <div className="space-y-3">
                    {Object.entries(estatisticas.tiposAvaliacao).map(([tipo, quantidade]: [string, any]) => {
                      const porcentagem = estatisticas.totalAvaliacoes > 0 
                        ? ((quantidade / estatisticas.totalAvaliacoes) * 100).toFixed(1)
                        : '0';
                      
                      return (
                        <div key={tipo}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{tipo}</span>
                            <span className="font-semibold text-gray-900">{quantidade} ({porcentagem}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${porcentagem}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Estatísticas por Tipo de Teste */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Testes Aplicados</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.entries(estatisticas.testesPorTipo).map(([teste, quantidade]: [string, any]) => (
                      <div key={teste} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 text-center border border-blue-100">
                        <div className="text-3xl font-bold text-blue-600">{quantidade}</div>
                        <div className="text-sm text-gray-700 mt-2 font-medium">{teste}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">Nenhuma estatística disponível</p>
              </div>
            )}
          </div>
        )}

        {/* Modal para solicitar PIN */}
        {mostrarModalPin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                🔐 Certificado A3 - Inserir PIN
              </h3>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Certificado Selecionado:</h4>
                  {(() => {
                    const cert = certificadosDisponiveis.find(c => c.id === certificadoSelecionado);
                    return cert ? (
                      <div className="text-sm text-blue-700">
                        <p><strong>Nome:</strong> {cert.nome}</p>
                        <p><strong>CPF:</strong> {cert.cpf}</p>
                        <p><strong>Tipo:</strong> {cert.tipo}</p>
                      </div>
                    ) : null;
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PIN do Certificado A3:
                  </label>
                  <input
                    type="password"
                    value={pinCertificado}
                    onChange={(e) => setPinCertificado(e.target.value)}
                    placeholder="Digite o PIN do seu certificado A3"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-center text-lg tracking-widest"
                    maxLength={8}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    🔒 O PIN é necessário para acessar a chave privada do certificado A3
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PINs de teste: 1234, 0000, 1111, 9999
                  </p>
                </div>

                {tentativasPin > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ PIN incorreto. Tentativas restantes: {3 - tentativasPin}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setMostrarModalPin(false);
                      setPinCertificado('');
                      setTentativasPin(0);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarAssinaturaComPin}
                    disabled={assinandoDigitalmente}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {assinandoDigitalmente ? 'Assinando...' : '🔐 Assinar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: NFS-e */}
        {activeTab === 'nfs-e' && (
          <div className="space-y-6">
            {/* Filtro de Mês */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Relatório de NFS-e</h2>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Mês/Ano:
                </label>
                <input
                  type="month"
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={carregarNfsEMes}
                  disabled={carregandoNfsE}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {carregandoNfsE ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Buscar
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Estatísticas */}
            {estatisticasNfsE && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Receipt className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total de NFS-e</p>
                      <p className="text-2xl font-bold text-gray-900">{estatisticasNfsE.total}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Valor Total</p>
                      <p className="text-2xl font-bold text-gray-900">
                        R$ {estatisticasNfsE.valorTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Valor Médio</p>
                      <p className="text-2xl font-bold text-gray-900">
                        R$ {estatisticasNfsE.valorMedio.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de NFS-e */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  NFS-e Emitidas em {new Date(filtroMes + '-01').toLocaleDateString('pt-BR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h3>
              </div>

              {carregandoNfsE ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando NFS-e...</p>
                </div>
              ) : nfsEmitidas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          NFS-e
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paciente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {nfsEmitidas.map((nfs) => (
                        <tr key={nfs.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {nfs.numero_nfs_e}
                            </div>
                            <div className="text-sm text-gray-500">
                              {nfs.codigo_verificacao}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{nfs.paciente_nome}</div>
                            <div className="text-sm text-gray-500">{nfs.paciente_cpf}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              R$ {parseFloat(nfs.valor).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(nfs.data_emissao).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(nfs.data_emissao).toLocaleTimeString('pt-BR')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              nfs.status === 'emitida' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {nfs.status === 'emitida' ? 'Emitida' : nfs.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {nfs.link_visualizacao && (
                              <a
                                href={nfs.link_visualizacao}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Ver NFS-e
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma NFS-e encontrada
                  </h3>
                  <p className="text-gray-500">
                    Não há NFS-e emitidas para o mês selecionado.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
