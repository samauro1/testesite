import React, { useState } from 'react';
import { Send, CheckCircle, MessageSquare, Mail, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNotification } from '@/contexts/NotificationContext';
import axios from 'axios';

interface EnviarResultadoButtonProps {
  avaliacaoId: number;
  aptidao: string;
  pacienteNome: string;
  pacienteTelefone?: string;
  pacienteEmail?: string;
  onMessageSent?: () => void;
  className?: string;
  variant?: 'list' | 'ficha';
}

const EnviarResultadoButton: React.FC<EnviarResultadoButtonProps> = ({
  avaliacaoId,
  aptidao,
  pacienteNome,
  pacienteTelefone,
  pacienteEmail,
  onMessageSent,
  className = '',
  variant = 'list'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const { getDefaultMethod } = useNotification();

  const handleSendResult = async () => {
    if (!aptidao || aptidao.trim() === '') {
      toast.error('Aptidão não foi definida para esta avaliação');
      return;
    }

    const defaultMethod = getDefaultMethod();
    
    // Verificar se tem contato disponível
    if (defaultMethod === 'whatsapp' && !pacienteTelefone) {
      toast.error('Número de WhatsApp não disponível para este paciente');
      return;
    }
    
    if (defaultMethod === 'email' && !pacienteEmail) {
      toast.error('Email não disponível para este paciente');
      return;
    }

    setIsLoading(true);
    
    try {
      // 1. Buscar configurações de notificação
      const configResponse = await axios.get('http://localhost:3001/api/configuracoes/notificacoes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const config = configResponse.data.data; // Acessar os dados dentro de data.data
      console.log('🔍 Config recebida:', config);
      console.log('🔍 Nome do psicólogo:', config.nome);
      console.log('🔍 Aptidão recebida:', aptidao);
      let messageTemplate = '';

      // 2. Selecionar template baseado na aptidão
      if (aptidao.toLowerCase().includes('inapto temporário')) {
        messageTemplate = config.notificacao_texto_inapto_temporario || 'Resultado: INAPTO TEMPORÁRIO';
      } else if (aptidao.toLowerCase().includes('inapto')) {
        messageTemplate = config.notificacao_texto_inapto || 'Resultado: INAPTO';
      } else if (aptidao.toLowerCase().includes('apto')) {
        messageTemplate = config.notificacao_texto_apto || 'Resultado: APTO';
      } else {
        messageTemplate = `Resultado: ${aptidao}`;
      }

      // 3. Substituir variáveis na mensagem
      console.log('🔍 Template original:', messageTemplate);
      console.log('🔍 Nome do paciente:', pacienteNome);
      console.log('🔍 Nome do psicólogo para substituição:', config.nome || 'Psicólogo');
      
      // Calcular data de reavaliação para "Inapto Temporário" (30 dias a partir de hoje)
      let dataReavaliacao = '';
      if (aptidao.toLowerCase().includes('inapto temporário')) {
        const hoje = new Date();
        const dataReavaliacaoCalculada = new Date(hoje);
        dataReavaliacaoCalculada.setDate(hoje.getDate() + 30);
        dataReavaliacao = dataReavaliacaoCalculada.toLocaleDateString('pt-BR');
        console.log('🔍 Data de reavaliação calculada:', dataReavaliacao);
      }
      
      // Calcular data limite para "Inapto" (30 dias a partir de hoje)
      let dataLimite = '';
      if (aptidao.toLowerCase().includes('inapto') && !aptidao.toLowerCase().includes('temporário')) {
        const hoje = new Date();
        const dataLimiteCalculada = new Date(hoje);
        dataLimiteCalculada.setDate(hoje.getDate() + 30);
        dataLimite = dataLimiteCalculada.toLocaleDateString('pt-BR');
        console.log('🔍 Data limite calculada:', dataLimite);
      }
      
      const personalizedMessage = messageTemplate
        .replace(/{nome}/g, pacienteNome)
        .replace(/{psicologo}/g, config.nome || 'Psicólogo')
        .replace(/{resultado}/g, aptidao)
        .replace(/{data_reavaliacao}/g, dataReavaliacao)
        .replace(/{data_limite}/g, dataLimite);
      
      console.log('🔍 Mensagem final:', personalizedMessage);

      // 4. Se for WhatsApp, abrir com mensagem pré-carregada
      if (defaultMethod === 'whatsapp') {
        const cleanPhone = pacienteTelefone?.replace(/\D/g, '') || '';
        const whatsappNumber = cleanPhone.length === 11 ? `55${cleanPhone}` : `5511${cleanPhone}`;
        const encodedMessage = encodeURIComponent(personalizedMessage);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
        
        // Abrir WhatsApp em nova aba com mensagem pré-carregada
        window.open(whatsappUrl, '_blank');
        
        // Marcar como enviado
        setMessageSent(true);
        toast.success('WhatsApp aberto com mensagem pré-carregada!');
        
        if (onMessageSent) {
          onMessageSent();
        }
        return;
      }

      // 5. Para email, fazer envio via API
      const response = await fetch(`http://localhost:3001/api/avaliacoes/${avaliacaoId}/enviar-mensagem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          preferencia: defaultMethod,
          avaliacaoId,
          mensagem: personalizedMessage
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessageSent(true);
        toast.success(`Resultado enviado por ${defaultMethod === 'whatsapp' ? 'WhatsApp' : 'Email'}!`);
        if (onMessageSent) {
          onMessageSent();
        }
      } else {
        if (data.alreadySent) {
          setMessageSent(true);
          toast.success('Resultado já foi enviado para esta avaliação');
        } else {
          toast.error(data.error || 'Erro ao enviar resultado');
        }
      }
    } catch (error) {
      console.error('Erro ao enviar resultado:', error);
      toast.error('Erro ao enviar resultado');
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    const iconSize = variant === 'ficha' ? 'h-4 w-4' : 'h-3.5 w-3.5';
    
    if (messageSent) {
      return <CheckCircle className={iconSize} />;
    }

    if (isLoading) {
      return <div className={`animate-spin rounded-full ${iconSize} border-b-2 border-white`}></div>;
    }

    // Sempre usar o ícone de avião (Send) para consistência
    return <Send className={iconSize} />;
  };

  const getButtonClass = () => {
    const baseClass = variant === 'ficha' ? "p-2 rounded transition-all" : "p-1.5 rounded transition-all";
    
    if (messageSent) {
      return `${baseClass} bg-green-600 text-white cursor-default`;
    }
    
    if (isLoading) {
      return `${baseClass} bg-blue-100 text-blue-700 cursor-not-allowed`;
    }
    
    return `${baseClass} bg-blue-600 text-white hover:bg-blue-700`;
  };

  const getTooltip = () => {
    if (messageSent) {
      return "Resultado Enviado";
    }
    
    const defaultMethod = getDefaultMethod();
    return `Enviar Resultado por ${defaultMethod === 'whatsapp' ? 'WhatsApp' : 'Email'} (com mensagem personalizada)`;
  };

  // Verificar se tem contato disponível
  const defaultMethod = getDefaultMethod();
  const hasContact = (defaultMethod === 'whatsapp' && pacienteTelefone) || 
                    (defaultMethod === 'email' && pacienteEmail);

  if (!hasContact) {
    return (
      <div className="flex items-center gap-1 text-gray-500 text-xs">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>Sem contato</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleSendResult}
      disabled={messageSent || isLoading || !aptidao}
      className={`${getButtonClass()} ${className}`}
      title={getTooltip()}
    >
      {getButtonContent()}
    </button>
  );
};

export default EnviarResultadoButton;
