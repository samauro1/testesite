'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, FileText, User, Mail, Eye, Send, CheckCircle, XCircle, AlertCircle, Upload, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { pacientesService, avaliacoesService, configuracoesService, nfsEService } from '@/services/api';
import PhoneInputWithValidation from '@/components/PhoneInputWithValidation';
import PhoneInput from '@/components/PhoneInput';
import EmailInputWithValidation from '@/components/EmailInputWithValidation';
import LaudoInput from '@/components/LaudoInput';
import ComunicarResultadoButton from '@/components/ComunicarResultadoButton';
import EnviarResultadoButton from '@/components/EnviarResultadoButton';
import { formatPhoneDisplay, generateWhatsAppLink } from '@/utils/phoneUtils';
import { formatDateToBrazilian, calculateAge } from '@/utils/dateUtils';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useConfiguracoes } from '@/contexts/ConfiguracoesContext';
import LoginModal from '@/components/LoginModal';
import axios from 'axios';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { configureAuthInterceptor } from '@/services/api';

interface Patient {
  id: string;
  nome: string;
  cpf: string;
  idade?: number;
  data_nascimento?: string;
  numero_laudo?: string;
  contexto?: string;
  tipo_transito?: string;
  escolaridade?: string;
  telefone?: string;
  telefone_fixo?: string;
  telefone_celular?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Campos extraídos do RENACH
  numero_renach?: string;
  sexo?: string;
  categoria_cnh?: string;
  nome_pai?: string;
  nome_mae?: string;
  naturalidade?: string;
  nacionalidade?: string;
  tipo_documento_rg?: string;
  rg?: string;
  orgao_expedidor_rg?: string;
  uf_rg?: string;
  resultado_exame?: string;
  data_exame?: string;
  data_primeira_habilitacao?: string;
  numero_laudo_renach?: string;
  crp_renach?: string;
  credenciado_renach?: string;
  regiao_renach?: string;
  renach_arquivo?: string;
  renach_foto?: string;
  logradouro?: string;
  numero_endereco?: string;
  bairro?: string;
  cep?: string;
  municipio?: string;
}

interface Avaliacao {
  id: string;
  numero_laudo: string;
  data_aplicacao: string;
  aplicacao: string;
  tipo_habilitacao: string;
  observacoes?: string;
  aptidao?: string;
  created_at: string;
  paciente_nome: string;
  paciente_cpf: string;
  usuario_nome: string;
}

const PacientesPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { configuracoes } = useConfiguracoes();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('data_agendamento');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDetail, setShowPatientDetail] = useState(false);
  const [allowDuplicatePhone, setAllowDuplicatePhone] = useState(false);
  const [renachArquivo, setRenachArquivo] = useState<string | null>(null);
  const [renachFoto, setRenachFoto] = useState<string | null>(null);
  const [uploadandoRenach, setUploadandoRenach] = useState(false);
  const [nfsEmitidas, setNfsEmitidas] = useState<any[]>([]);
  
  // Estados para NFS-e na ficha
  const [nfsNumero, setNfsNumero] = useState('');
  const [nfsFormaPagamento, setNfsFormaPagamento] = useState<'dinheiro' | 'pix' | 'misto'>('pix');
  const [nfsValor, setNfsValor] = useState('');
  const [nfsValorDinheiro, setNfsValorDinheiro] = useState('');
  const [nfsValorPix, setNfsValorPix] = useState('');
  const [nfsValorPadrao, setNfsValorPadrao] = useState('0.00');
  
  // Estados para modal de login
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Estados para modal de confirmação de NFS-e
  const [showNfsEConfirmModal, setShowNfsEConfirmModal] = useState(false);
  const [nfsEConfirmData, setNfsEConfirmData] = useState<{paciente: Patient, nfsEExistente: any} | null>(null);
  
  // Hook de autenticação
  const { isAuthenticated, login, logout, error: authError } = useAuthHook();
  
  // Configurar interceptor de autenticação
  React.useEffect(() => {
    configureAuthInterceptor(
      () => {
        console.log('🔐 Autenticação necessária - mostrando modal');
        setShowLoginModal(true);
      },
      () => {
        console.log('✅ Autenticação bem-sucedida');
        setShowLoginModal(false);
        setLoginError(null);
      }
    );
  }, []);
  
  // Funções de login
  const handleLogin = async (credentials: { username: string; password: string; remember: boolean }) => {
    try {
      setLoginError(null);
      const success = await login(credentials);
      
      if (success) {
        setShowLoginModal(false);
        toast.success('Login realizado com sucesso!');
        // Recarregar dados se necessário
        if (selectedPatient) {
          carregarNfsEmitidas(selectedPatient.id);
        }
      } else {
        setLoginError('Credenciais inválidas. Tente novamente.');
      }
    } catch (error) {
      setLoginError('Erro no login. Tente novamente.');
    }
  };
  
  const handleCloseLogin = () => {
    setShowLoginModal(false);
    setLoginError(null);
  };
  
  const [allowDuplicateEmail, setAllowDuplicateEmail] = useState(false);
  
  // Função para carregar NFS-e emitidas
  const carregarNfsEmitidas = async (pacienteId: string) => {
    try {
      const response = await nfsEService.listar({ paciente_id: pacienteId });
      setNfsEmitidas(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar NFS-e emitidas:', error);
      setNfsEmitidas([]);
    }
  };

  // Função para carregar valor das configurações de NFS-e
  const carregarValorNfsE = async () => {
    if (!selectedPatient) return;
    
    try {
      const response = await axios.get('http://localhost:3001/api/nfs-e/configuracoes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const valor = response.data.data?.valor_padrao;
      let valorFormatado: string;
      
      if (valor === undefined || valor === null) {
        // Se não existir, não usar fallback - deixar o valor vazio para mostrar erro
        console.warn('⚠️ Valor padrão não encontrado na API');
        valorFormatado = '0.00';
      } else if (typeof valor === 'number') {
        valorFormatado = valor.toFixed(2);
      } else if (typeof valor === 'string') {
        const valorParseado = parseFloat(valor.replace(',', '.')) || 0;
        valorFormatado = valorParseado.toFixed(2);
      } else {
        console.warn('⚠️ Tipo de valor padrão desconhecido:', typeof valor);
        valorFormatado = '0.00';
      }
      
      // NÃO forçar fallback - usar o valor real da API (mesmo se for 0.00)
      setNfsValorPadrao(valorFormatado);
      
      console.log('💰 Valor padrão carregado:', {
        valor_original: valor,
        tipo: typeof valor,
        valor_formatado: valorFormatado,
        contexto: selectedPatient.contexto,
        forma_pagamento: nfsFormaPagamento,
        response_data: response.data.data
      });
      
      // Aplicar valor padrão ao campo nfsValor baseado nas regras:
      // 1. Para Trânsito, SEMPRE usar valor padrão (independente de valor salvo ou forma de pagamento)
      // 2. Para outros contextos não-misto: usar valor salvo se existir e for > 0, senão usar valor padrão
      // 3. Para misto: ajustar valores separados se necessário
      
      const valorSalvo = selectedPatient.nfs_valor;
      const valorSalvoNum = valorSalvo ? parseFloat(String(valorSalvo).replace(',', '.').replace(/[^\d.]/g, '')) || 0 : 0;
      
      if (selectedPatient.contexto === 'Trânsito') {
        // Trânsito: SEMPRE usar valor padrão
        if (nfsFormaPagamento === 'misto') {
          // Para misto e Trânsito, garantir que o total seja sempre o valor padrão
          const valorDinheiroNum = parseFloat(nfsValorDinheiro.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
          const valorPixNum = parseFloat(nfsValorPix.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
          const totalAtual = valorDinheiroNum + valorPixNum;
          const valorPadraoNum = parseFloat(valorFormatado);
          
          if (totalAtual !== valorPadraoNum && totalAtual > 0) {
            // Ajustar proporcionalmente
            const proporcaoDinheiro = valorDinheiroNum / totalAtual;
            const proporcaoPix = valorPixNum / totalAtual;
            setNfsValorDinheiro((valorPadraoNum * proporcaoDinheiro).toFixed(2));
            setNfsValorPix((valorPadraoNum * proporcaoPix).toFixed(2));
          } else if (totalAtual === 0) {
            // Dividir igualmente se não há valores
            const meioValor = (valorPadraoNum / 2).toFixed(2);
            setNfsValorDinheiro(meioValor);
            setNfsValorPix(meioValor);
          }
        }
        // Trânsito sempre usa valor padrão (não editável, fixo)
        console.log('💰 Trânsito: aplicando valor padrão:', valorFormatado);
        setNfsValor(valorFormatado);
      } else {
        // Outros contextos: usar valor salvo se válido, senão usar padrão
        if (nfsFormaPagamento === 'misto') {
          // Para misto, os valores já foram carregados anteriormente, não precisa ajustar o total
        } else {
          // PIX ou Dinheiro
          if (valorSalvoNum > 0) {
            console.log('💰 Usando valor salvo:', valorSalvo);
            setNfsValor(String(valorSalvo));
          } else {
            console.log('💰 Sem valor salvo: aplicando valor padrão:', valorFormatado);
            setNfsValor(valorFormatado);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar valor da NFS-e:', error);
      setNfsValorPadrao('0.00');
      setNfsValor('0.00');
    }
  };

  // Função para salvar dados da NFS-e
  const salvarDadosNfsE = async () => {
    if (!selectedPatient) return;
    
    try {
      // Garantir que temos o valor padrão carregado
      let valorPadraoFinal = nfsValorPadrao || '2.00';
      
      // Se ainda não carregou o valor padrão, tentar carregar agora
      if (!nfsValorPadrao || nfsValorPadrao === '0.00') {
        try {
          const response = await axios.get('http://localhost:3001/api/nfs-e/configuracoes', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          const valor = response.data.data?.valor_padrao || 2.00;
          if (typeof valor === 'number') {
            valorPadraoFinal = valor.toFixed(2);
          } else {
            valorPadraoFinal = parseFloat(String(valor).replace(',', '.')) || 2.00;
            valorPadraoFinal = valorPadraoFinal.toFixed(2);
          }
          setNfsValorPadrao(valorPadraoFinal);
        } catch (error) {
          console.error('Erro ao carregar valor padrão ao salvar:', error);
          valorPadraoFinal = '2.00'; // Fallback
        }
      }
      
      // Se for pagamento misto, calcular valor total e salvar valores separados
      let valorFinal = nfsValor || valorPadraoFinal;
      let dadosEnvio: any = {
        nfs_numero: nfsNumero || null,
        nfs_forma_pagamento: nfsFormaPagamento || null
      };
      
      // Converter valorPadraoFinal para número para garantir que valorFinal seja sempre número
      const valorPadraoFinalNum = parseFloat(String(valorPadraoFinal).replace(/[^\d.]/g, '').replace(',', '.')) || 0;
      
      // Contexto Trânsito: SEMPRE usar valor padrão (fixo)
      if (selectedPatient.contexto === 'Trânsito') {
        valorFinal = valorPadraoFinalNum;
      }
      
      if (nfsFormaPagamento === 'misto') {
        const valorDinheiroNum = parseFloat(String(nfsValorDinheiro).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
        const valorPixNum = parseFloat(String(nfsValorPix).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
        
        // Se for Trânsito, sempre usar valor padrão como total
        if (selectedPatient.contexto === 'Trânsito') {
          valorFinal = valorPadraoFinalNum;
        } else {
          // Outros contextos: usar soma dos valores
          const soma = valorDinheiroNum + valorPixNum;
          valorFinal = soma > 0 ? soma : valorPadraoFinalNum;
        }
        
        // Garantir que valorFinal seja um número válido
        if (isNaN(valorFinal) || valorFinal <= 0) {
          valorFinal = valorPadraoFinalNum > 0 ? valorPadraoFinalNum : 0;
        }
        
        dadosEnvio.nfs_valor = valorFinal.toFixed(2);
        dadosEnvio.nfs_valor_dinheiro = valorDinheiroNum >= 0 ? valorDinheiroNum.toFixed(2) : '0.00';
        dadosEnvio.nfs_valor_pix = valorPixNum >= 0 ? valorPixNum.toFixed(2) : '0.00';
      } else {
        // Para dinheiro ou pix
        // Se for Trânsito, sempre usar valor padrão
        if (selectedPatient.contexto === 'Trânsito') {
          valorFinal = valorPadraoFinalNum;
        } else {
          // Se não for Trânsito e o valor estiver vazio ou 0, usar padrão
          const valorAtual = parseFloat(String(nfsValor).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
          if (valorAtual > 0) {
            valorFinal = valorAtual;
          } else {
            valorFinal = valorPadraoFinalNum;
          }
        }
        
        // Garantir que valorFinal seja um número válido
        if (isNaN(valorFinal) || valorFinal <= 0) {
          valorFinal = valorPadraoFinalNum > 0 ? valorPadraoFinalNum : 0;
        }
        
        dadosEnvio.nfs_valor = valorFinal.toFixed(2);
      }
      
      console.log('💾 Salvando NFS-e:', {
        contexto: selectedPatient.contexto,
        forma_pagamento: nfsFormaPagamento,
        valor_final: valorFinal,
        valor_padrao: valorPadraoFinal,
        valor_dinheiro: dadosEnvio.nfs_valor_dinheiro,
        valor_pix: dadosEnvio.nfs_valor_pix
      });
      
      const response = await axios.patch(`http://localhost:3001/api/pacientes/${selectedPatient.id}/nfs-e`, dadosEnvio, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('Dados NFS-e salvos:', response.data);
      toast.success('Dados NFS-e salvos com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar dados NFS-e:', error);
      toast.error('Erro ao salvar dados NFS-e');
    }
  };
  const [showNewAvaliacao, setShowNewAvaliacao] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    data_nascimento: '',
    numero_laudo: '',
    contexto: '',
    tipo_transito: '',
    escolaridade: '',
    telefone: '',
    telefone_fixo: '',
    telefone_celular: '',
    email: '',
    endereco: '',
    observacoes: ''
  });
  const [avaliacaoData, setAvaliacaoData] = useState({
    numero_laudo: '',
    data_aplicacao: new Date().toISOString().split('T')[0],
    aplicacao: 'Individual',
    tipo_habilitacao: '1ª Habilitação',
    observacoes: '',
    aptidao: '',
    testes_selecionados: [] as string[]
  });
  const [showDeleteAvaliacaoConfirm, setShowDeleteAvaliacaoConfirm] = useState(false);
  const [avaliacaoToDelete, setAvaliacaoToDelete] = useState<Avaliacao | null>(null);
  const [showDeleteTesteConfirm, setShowDeleteTesteConfirm] = useState(false);
  const [testeToDelete, setTesteToDelete] = useState<any>(null);
  const [expandedLaudo, setExpandedLaudo] = useState<string | null>(null);
  const [expandedLaudos, setExpandedLaudos] = useState<Set<string>>(new Set());
  const [testesData, setTestesData] = useState<any>({});
  const [loadingTestes, setLoadingTestes] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // Buscar pacientes - DESABILITAR CACHE EM DESENVOLVIMENTO
  const { data, isLoading, error } = useQuery({
    queryKey: ['pacientes', currentPage, searchTerm, sortBy, sortOrder],
    queryFn: () => pacientesService.list({ 
      page: currentPage, 
      limit: 10, 
      search: searchTerm,
      sortBy,
      sortOrder
    }),
    placeholderData: (previousData) => previousData,
    staleTime: 0, // Dados sempre considerados stale (desatualizados)
    gcTime: 0, // Cache expira imediatamente (antes era cacheTime)
    refetchOnMount: true, // Sempre buscar ao montar
    refetchOnWindowFocus: true, // Sempre buscar ao focar na janela
  });

  // Buscar avaliações do paciente selecionado
  const { data: avaliacoesData } = useQuery({
    queryKey: ['avaliacoes-paciente', selectedPatient?.id],
    queryFn: () => {
      return avaliacoesService.list({ 
      page: 1, 
      limit: 100, 
        paciente_id: selectedPatient?.id 
      });
    },
    enabled: !!selectedPatient,
  });

  const pacientes = (data as any)?.data?.data?.pacientes || [];
  const pagination = (data as any)?.data?.data?.pagination;
  const avaliacoes = (avaliacoesData as any)?.data?.data?.avaliacoes || [];

  // useEffect para abrir modal automaticamente se houver ID na URL
  React.useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam && !showPatientDetail) {
      const pacienteId = parseInt(idParam);
      
      // Tentar buscar no cache primeiro
      let paciente = pacientes.find((p: Patient) => p.id === pacienteId);
      
      if (paciente) {
        console.log('✅ Paciente encontrado no cache, abrindo modal...', paciente);
        setSelectedPatient(paciente);
        setShowPatientDetail(true);
        // Limpar o parâmetro da URL após abrir o modal
        setTimeout(() => router.replace('/pacientes'), 100);
      } else if (!isLoading) {
        // Se não estiver no cache e os dados já carregaram, buscar da API
        console.log('🔍 Paciente não encontrado no cache, buscando da API...', pacienteId);
        pacientesService.get(pacienteId.toString()).then((response: any) => {
          console.log('📦 Resposta completa da API:', response);
          console.log('📦 response.data:', response?.data);
          console.log('📦 response.data.data:', response?.data?.data);
          
          // Tentar ambas as estruturas possíveis
          const pacienteData = response?.data?.data || response?.data;
          
          if (pacienteData && pacienteData.id) {
            console.log('✅ Paciente encontrado na API, abrindo modal...', pacienteData);
            setSelectedPatient(pacienteData);
            setShowPatientDetail(true);
            setTimeout(() => router.replace('/pacientes'), 100);
          } else {
            console.error('❌ Paciente não encontrado - response:', response);
            toast.error('Avaliado não encontrado');
            router.replace('/pacientes');
          }
        }).catch((error: any) => {
          console.error('❌ Erro ao buscar paciente:', error);
          console.error('❌ Detalhes do erro:', error.response?.data);
          toast.error('Erro ao carregar detalhes do avaliado');
          router.replace('/pacientes');
        });
      }
    }
  }, [searchParams, pacientes, isLoading, showPatientDetail, router]);
  
  // Agrupar avaliações por número de laudo (não por data)
  // Múltiplas avaliações com mesmo laudo = mesma avaliação aplicada em datas diferentes
  const avaliacoesAgrupadas = avaliacoes.reduce((grupos: any, avaliacao: Avaliacao) => {
    const laudo = avaliacao.numero_laudo;
    if (!grupos[laudo]) {
      grupos[laudo] = [];
    }
    grupos[laudo].push(avaliacao);
    return grupos;
  }, {});

  // Mutations
  const createMutation = useMutation({
    mutationFn: pacientesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      toast.success('Avaliado criado com sucesso!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar avaliado');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => pacientesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      toast.success('Avaliado atualizado com sucesso!');
      resetForm();
      setShowEditModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar avaliado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: pacientesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      toast.success('Avaliado excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao excluir avaliado');
    },
  });

  const createAvaliacaoMutation = useMutation({
    mutationFn: avaliacoesService.create,
    onSuccess: async (response) => {
      // Invalidar e forçar refetch imediato
      await queryClient.invalidateQueries({ queryKey: ['avaliacoes-paciente'] });
      await queryClient.refetchQueries({ queryKey: ['avaliacoes-paciente'] });
      await queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      await queryClient.refetchQueries({ queryKey: ['pacientes'] });
      toast.success('Avaliação criada com sucesso!');
      
      // Limpar cache de testes para forçar recarregamento
      setTestesData({});
      
      // Redirecionar para página de testes com dados vinculados E testes pré-selecionados
      const avaliacaoId = (response as any).data?.avaliacao?.id;
      if (avaliacaoId && selectedPatient) {
        const testesParam = avaliacaoData.testes_selecionados.length > 0 
          ? `&testes=${avaliacaoData.testes_selecionados.join(',')}` 
          : '';
        router.push(`/testes?avaliacao_id=${avaliacaoId}&paciente_id=${selectedPatient.id}&numero_laudo=${avaliacaoData.numero_laudo}${testesParam}`);
      } else {
        setShowNewAvaliacao(false);
        resetAvaliacaoForm();
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar avaliação');
    },
  });

  const deleteAvaliacaoMutation = useMutation({
    mutationFn: avaliacoesService.delete,
    onSuccess: async () => {
      // Invalidar e forçar refetch imediato de todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['avaliacoes-paciente'] });
      await queryClient.refetchQueries({ queryKey: ['avaliacoes-paciente'] });
      await queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      await queryClient.refetchQueries({ queryKey: ['pacientes'] });
      toast.success('Avaliação excluída com sucesso!');
      setShowDeleteAvaliacaoConfirm(false);
      setAvaliacaoToDelete(null);
      // Limpar também o cache de testes
      setTestesData({});
      setExpandedLaudo(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao excluir avaliação');
    },
  });

  // Mutation para deletar teste individual
  const deleteTesteMutation = useMutation({
    mutationFn: async (teste: any) => {
      // TODO: Implementar API para deletar teste individual
      // Por enquanto, vamos simular
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes-paciente'] });
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      setShowDeleteTesteConfirm(false);
      setTesteToDelete(null);
      toast.success('Resultado do teste excluído com sucesso!');
      
      // Recarregar testes do laudo atual
      if (expandedLaudo) {
        const laudoAtual = expandedLaudo;
        setExpandedLaudo(null);
        setTimeout(() => {
          handleToggleLaudo(laudoAtual);
        }, 100);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao excluir resultado do teste');
    },
  });

  const updateAptidaoMutation = useMutation({
    mutationFn: ({ id, aptidao }: { id: string; aptidao: string }) => 
      avaliacoesService.update(id, { aptidao }),
    onSuccess: async () => {
      // Invalidar e forçar refetch imediato de todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['avaliacoes-paciente'] });
      await queryClient.refetchQueries({ queryKey: ['avaliacoes-paciente'] });
      await queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      await queryClient.refetchQueries({ queryKey: ['pacientes'] });
      toast.success('Aptidão atualizada com sucesso!');
      
      // Se há um laudo expandido, recarregar os testes
      if (expandedLaudo) {
        const laudoAtual = expandedLaudo;
        setExpandedLaudo(null);
        setTimeout(() => {
          handleToggleLaudo(laudoAtual);
        }, 100);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar aptidão');
    },
  });

  // Função calculateAge agora vem do dateUtils

  const abreviarEscolaridade = (escolaridade: string): string => {
    if (!escolaridade) return '-';
    const map: Record<string, string> = {
      'E. Fundamental': 'F',
      'E. Médio': 'M',
      'E. Superior': 'S',
      'Pós-Graduação': 'PG',
      'Não Escolarizado': 'NE'
    };
    return map[escolaridade] || escolaridade.substring(0, 2);
  };

  // Função para formatar CPF
  const formatCPF = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11);
    
    // Aplica a formatação: 000.000.000-00
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    } else if (limited.length <= 9) {
      return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    } else {
      return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
    }
  };

  // Handler para CPF
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData(prev => ({ ...prev, cpf: formatted }));
  };

  // Função para fazer upload do arquivo RENACH
  const handleUploadRenach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatient) return;

    // Validar tipo de arquivo
    if (file.type !== 'application/pdf') {
      toast.error('Por favor, selecione apenas arquivos PDF');
      return;
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }

    setUploadandoRenach(true);
    toast.loading('Processando arquivo RENACH e extraindo dados...');

    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const base64Data = base64.split(',')[1]; // Remove o prefixo data:application/pdf;base64,
        
        // Salvar arquivo no banco e processar
        const response = await pacientesService.uploadRenach(selectedPatient.id, {
          renach_arquivo: base64Data
        });
        
        setRenachArquivo(base64Data);
        
        // Verificar se houve extração de dados
        const responseData = response.data?.data;
        if (responseData?.extracted_data && Object.keys(responseData.extracted_data).length > 0) {
          const extractedData = responseData.extracted_data;
          let message = 'Arquivo RENACH processado com sucesso!\n\n';
          message += 'Dados extraídos automaticamente:\n';
          
          if (extractedData.numero_renach) message += `• Número RENACH: ${extractedData.numero_renach}\n`;
          if (extractedData.nome) message += `• Nome: ${extractedData.nome}\n`;
          if (extractedData.cpf) message += `• CPF: ${extractedData.cpf}\n`;
          if (extractedData.data_nascimento) message += `• Data de Nascimento: ${extractedData.data_nascimento}\n`;
          if (extractedData.sexo) message += `• Sexo: ${extractedData.sexo}\n`;
          if (extractedData.categoria_cnh) message += `• Categoria CNH: ${extractedData.categoria_cnh}\n`;
          if (extractedData.resultado_exame) message += `• Resultado Exame: ${extractedData.resultado_exame}\n`;
          
          toast.dismiss();
          toast.success(message, { duration: 8000 });
          
          // Recarregar dados do paciente para mostrar as informações extraídas
          const pacienteResponse = await pacientesService.get(selectedPatient.id);
          const pacienteData = pacienteResponse.data?.data || pacienteResponse.data;
          if (pacienteData) {
            setSelectedPatient(pacienteData);
          }
          
          // Recarregar foto do RENACH para atualizar na interface
          // Adicionar pequeno delay para garantir que o banco foi atualizado
          setTimeout(async () => {
            try {
              console.log('🔄 Recarregando foto do RENACH após upload...');
              const renachResponse = await pacientesService.getRenach(selectedPatient.id);
              const renachData = renachResponse.data?.data;
              console.log('📸 Dados do RENACH recebidos:', {
                temFoto: !!renachData?.renach_foto,
                tamanhoFoto: renachData?.renach_foto?.length,
                fotoPreview: renachData?.renach_foto?.substring(0, 50)
              });
              
              if (renachData?.renach_foto) {
                // Garantir que a foto está no formato correto (data:image se for base64)
                let fotoFormatada = renachData.renach_foto;
                if (!fotoFormatada.startsWith('data:image')) {
                  // Se não começar com data:image, assumir que é base64 puro e adicionar o prefixo
                  fotoFormatada = `data:image/jpeg;base64,${fotoFormatada}`;
                }
                console.log('✅ Foto formatada e sendo aplicada');
                setRenachFoto(fotoFormatada);
                setRenachArquivo(renachData.renach_arquivo || null);
              } else {
                console.log('⚠️ Nenhuma foto encontrada no RENACH');
                setRenachFoto(null);
              }
            } catch (error) {
              console.error('❌ Erro ao recarregar foto do RENACH:', error);
            }
          }, 500); // Delay de 500ms para garantir que o banco foi atualizado
        } else {
          toast.dismiss();
          toast.success('Arquivo RENACH salvo com sucesso!');
          
          // Mesmo sem dados extraídos, recarregar a foto do RENACH
          setTimeout(async () => {
            try {
              console.log('🔄 Recarregando foto do RENACH após upload (sem dados extraídos)...');
              const renachResponse = await pacientesService.getRenach(selectedPatient.id);
              const renachData = renachResponse.data?.data;
              console.log('📸 Dados do RENACH recebidos:', {
                temFoto: !!renachData?.renach_foto,
                tamanhoFoto: renachData?.renach_foto?.length
              });
              
              if (renachData?.renach_foto) {
                // Garantir que a foto está no formato correto (data:image se for base64)
                let fotoFormatada = renachData.renach_foto;
                if (!fotoFormatada.startsWith('data:image')) {
                  // Se não começar com data:image, assumir que é base64 puro e adicionar o prefixo
                  fotoFormatada = `data:image/jpeg;base64,${fotoFormatada}`;
                }
                console.log('✅ Foto formatada e sendo aplicada');
                setRenachFoto(fotoFormatada);
                setRenachArquivo(renachData.renach_arquivo || null);
              } else {
                console.log('⚠️ Nenhuma foto encontrada no RENACH');
                setRenachFoto(null);
              }
            } catch (error) {
              console.error('❌ Erro ao recarregar foto do RENACH:', error);
            }
          }, 500); // Delay de 500ms para garantir que o banco foi atualizado
        }
        
        queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      };
      
      reader.onerror = () => {
        toast.dismiss();
        toast.error('Erro ao ler o arquivo');
        setUploadandoRenach(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao fazer upload do RENACH:', error);
      toast.dismiss();
      toast.error('Erro ao salvar arquivo RENACH');
    } finally {
      setUploadandoRenach(false);
    }
  };

  // Função para enviar resultado via WhatsApp ou E-mail
  const handleEnviarResultado = async (paciente: Patient, aptidao: string, testesReprovados?: string[]) => {
    try {
      // Buscar configurações de notificações do usuário
      const configResponse = await configuracoesService.getNotificacoes();
      const config = configResponse.data?.data || {};
      
      const metodoEnvio = config.notificacao_metodo || 'whatsapp';
      
      // Validar se tem contato
      if (metodoEnvio === 'whatsapp' && !paciente.telefone) {
        toast.error('Paciente não possui telefone cadastrado');
        return;
      }
      
      if (metodoEnvio === 'email' && !paciente.email) {
        toast.error('Paciente não possui e-mail cadastrado');
        return;
      }

      // Nome do psicólogo
      const nomePsicologo = (currentUser as any)?.nome || 'o psicólogo';
      
      // Primeiro nome do paciente
      const primeiroNome = paciente.nome.split(' ')[0];
      
      // Calcular datas
      const dataReavaliacao = new Date();
      dataReavaliacao.setDate(dataReavaliacao.getDate() + 30);
      const dataReaFormatada = dataReavaliacao.toLocaleDateString('pt-BR');
      
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() + 30);
      const dataLimFormatada = dataLimite.toLocaleDateString('pt-BR');
      
      const testesTexto = testesReprovados && testesReprovados.length > 0 
        ? testesReprovados.join(', ')
        : 'alguns testes';
      
      // Selecionar template baseado na aptidão
      let templateTexto = '';
      
      if (aptidao === 'Apto') {
        templateTexto = config.notificacao_texto_apto || `Prezado(a) {nome}, aqui Psicólogo {psicologo}, e escrevo para informar sobre o resultado de sua avaliação.

Tenho o prazer de comunicar que seu resultado foi APTO, e o mesmo já foi devidamente cadastrado no sistema do DETRAN.

Parabéns pela aprovação!

Estou à disposição para quaisquer dúvidas adicionais.

Atenciosamente,
{psicologo}`;
      } 
      else if (aptidao === 'Inapto Temporário') {
        templateTexto = config.notificacao_texto_inapto_temporario || `Prezado(a) {nome}, aqui Psicólogo {psicologo}, e escrevo para informar sobre o resultado de sua avaliação.

Após a análise dos testes realizados, seu resultado foi INAPTO TEMPORÁRIO.

Será necessário reavaliar alguns aspectos. Conforme regulamentação, você deverá aguardar um período de 30 dias antes de realizar uma nova avaliação (a partir de {data_reavaliacao}).

Após essa data, entre em contato para agendarmos uma nova avaliação.

Caso não concorde com este resultado, você pode solicitar uma Junta Administrativa junto ao DETRAN. Se optar por este caminho, por gentileza, comunique-me para que possamos reter seu prontuário.

Estou à disposição para quaisquer dúvidas adicionais.

Atenciosamente,
{psicologo}`;
      } 
      else if (aptidao === 'Inapto') {
        templateTexto = config.notificacao_texto_inapto || `Prezado(a) {nome}, aqui Psicólogo {psicologo}, e escrevo para informar sobre o resultado de sua avaliação.

Após a análise dos testes realizados, seu resultado foi INAPTO.

Conforme regulamentação, caso você não concorde com esta decisão, é possível solicitar uma Junta Administrativa junto ao DETRAN/Poupatempo. O prazo limite para essa solicitação é de 30 dias a partir da data de emissão do resultado (data final: {data_limite}).

Se decidir prosseguir com a Junta, por gentileza, comunique-me para que possamos reter seu prontuário.

Estou à disposição para quaisquer dúvidas adicionais.

Atenciosamente,
{psicologo}`;
      }
      
      // Processar variáveis no template
      const mensagem = templateTexto
        .replace(/{nome}/g, primeiroNome)
        .replace(/{psicologo}/g, nomePsicologo)
        .replace(/{testes}/g, testesTexto)
        .replace(/{data_reavaliacao}/g, dataReaFormatada)
        .replace(/{data_limite}/g, dataLimFormatada);

      // Enviar por WhatsApp ou E-mail
      if (metodoEnvio === 'whatsapp') {
        // Processar múltiplos telefones se necessário
        let telefonesParaWhatsApp = [];
        
        if (paciente.telefone.startsWith('[') && paciente.telefone.endsWith(']')) {
          // Telefones salvos como JSON
          try {
            telefonesParaWhatsApp = JSON.parse(paciente.telefone);
          } catch (e) {
            telefonesParaWhatsApp = [paciente.telefone.replace(/\D/g, '')];
          }
        } else {
          // Telefone único
          telefonesParaWhatsApp = [paciente.telefone.replace(/\D/g, '')];
        }
        
        // Abrir WhatsApp para o primeiro telefone
        const primeiroTelefone = telefonesParaWhatsApp[0];
        const whatsappLink = `https://wa.me/55${primeiroTelefone}?text=${encodeURIComponent(mensagem)}`;
        window.open(whatsappLink, '_blank');
        
        if (telefonesParaWhatsApp.length > 1) {
          toast.success(`📱 WhatsApp aberto para ${paciente.nome} (${telefonesParaWhatsApp.length} telefones disponíveis)`);
        } else {
          toast.success(`📱 WhatsApp aberto para ${paciente.nome}`);
        }
      } else {
        const assunto = `Resultado da Avaliação Psicológica - ${aptidao}`;
        const mailtoLink = `mailto:${paciente.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
        window.open(mailtoLink);
        toast.success(`📧 Cliente de e-mail aberto para ${paciente.nome}`);
      }
      
    } catch (error) {
      console.error('Erro ao enviar resultado:', error);
      toast.error('Erro ao enviar resultado');
    }
  };

  // Função para verificar e emitir NFS-e (com verificação de 7 dias)
  const handleEmitirNfsE = async (paciente: Patient) => {
    try {
      // Verificar se o paciente tem dados necessários
      if (!paciente.cpf) {
        toast.error('Paciente não possui CPF cadastrado');
        return;
      }

      // Verificar se há NFS-e nos últimos 7 dias
      try {
        const verificacaoResponse = await nfsEService.verificarUltimos7Dias(paciente.id);
        const verificacao = verificacaoResponse.data?.data || verificacaoResponse.data;
        
        if (verificacao?.tem_nfs_e && verificacao.nfs_e) {
          // Mostrar modal de confirmação
          setNfsEConfirmData({
            paciente,
            nfsEExistente: verificacao.nfs_e
          });
          setShowNfsEConfirmModal(true);
          return; // Não continuar até o usuário confirmar
        }
      } catch (error) {
        console.error('Erro ao verificar NFS-e dos últimos 7 dias:', error);
        // Continuar mesmo se houver erro na verificação
      }

      // Se chegou aqui, não há NFS-e nos últimos 7 dias ou houve erro na verificação
      // Continuar com a emissão normalmente
      await emitirNfsE(paciente);

    } catch (error: any) {
      console.error('Erro ao processar emissão de NFS-e:', error);
      toast.error(error.response?.data?.error || 'Erro ao processar emissão de NFS-e');
    }
  };

  // Função interna para realizar a emissão da NFS-e
  const emitirNfsE = async (paciente: Patient) => {
    try {
      // Buscar configurações de NFS-e
      const configResponse = await nfsEService.getConfiguracoes();
      const config = configResponse.data?.data || {};

      if (!config.ativo) {
        toast.error('NFS-e não está ativada. Configure em Configurações > NFS-e');
        return;
      }

      // Verificar se tem dados básicos (endereço é opcional)
      if (!paciente.nome) {
        toast.error('Paciente não possui nome cadastrado');
        return;
      }

      // Avisar se endereço está incompleto, mas permitir continuar
      if (!paciente.cep || !paciente.logradouro || !paciente.numero_endereco) {
        toast('⚠️ Endereço incompleto, usando dados padrão para NFS-e', {
          duration: 3000,
          icon: '⚠️'
        });
      }

      // Emitir NFS-e
      toast.loading('Emitindo NFS-e...');
      
      // Usar número NFS-e do paciente se existir, senão usar padrão 0000
      const numeroNfsE = paciente.nfs_numero || nfsNumero || '0000';
      
      // Usar valor salvo do paciente (se existir e não for 0), senão usar valor padrão
      const valorServico = (paciente.nfs_valor && parseFloat(String(paciente.nfs_valor).replace(',', '.')) > 0) 
        ? paciente.nfs_valor 
        : (config.valor_padrao || 150.00);
      
      // Usar forma de pagamento salva do paciente se existir, senão usar PIX como padrão
      const formaPagamento = paciente.nfs_forma_pagamento || 'pix';
      
      console.log('📝 Emitindo NFS-e:', {
        paciente_id: paciente.id,
        numero_nfs_e: numeroNfsE,
        valor_servico: valorServico,
        forma_pagamento: formaPagamento
      });
      
      const response = await nfsEService.emitir({
        paciente_id: paciente.id,
        numero_nfs_e: numeroNfsE,
        valor_servico: valorServico,
        forma_pagamento: formaPagamento,
        observacoes: `Avaliação psicológica para ${paciente.nome}`
      });

      toast.dismiss();
      toast.success('NFS-e emitida com sucesso!');
      
      // Recarregar NFS-e emitidas se o modal estiver aberto
      if (selectedPatient && showPatientDetail) {
        carregarNfsEmitidas(selectedPatient.id);
      }
      
      // Mostrar informações da NFS-e
      if (response.data?.nfs_e) {
        const nfsE = response.data.nfs_e;
        toast.success(`NFS-e ${nfsE.numero_nfs_e} emitida com sucesso!`, {
          duration: 5000
        });
      }

    } catch (error: any) {
      console.error('Erro ao emitir NFS-e:', error);
      toast.dismiss();
      toast.error(error.response?.data?.error || 'Erro ao emitir NFS-e');
    }
  };

  // Função para confirmar emissão mesmo com NFS-e existente
  const handleConfirmarEmitirNfsE = async () => {
    if (!nfsEConfirmData?.paciente) return;
    
    setShowNfsEConfirmModal(false);
    await emitirNfsE(nfsEConfirmData.paciente);
    setNfsEConfirmData(null);
  };

  // Função para cancelar emissão
  const handleCancelarEmitirNfsE = () => {
    setShowNfsEConfirmModal(false);
    setNfsEConfirmData(null);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cpf: '',
      data_nascimento: '',
      numero_laudo: '',
      contexto: '',
      tipo_transito: '',
      escolaridade: '',
      telefone: '',
      telefone_fixo: '',
      telefone_celular: '',
      email: '',
      endereco: '',
      observacoes: ''
    });
    setEditingPatient(null);
    setAllowDuplicatePhone(false);
    setAllowDuplicateEmail(false);
  };

  // Carregar arquivo RENACH quando abrir detalhes do paciente
  React.useEffect(() => {
    if (showPatientDetail && selectedPatient?.id) {
      const pacienteId = selectedPatient.id;
      
      // Buscar RENACH do paciente
      pacientesService.getRenach(pacienteId)
        .then(response => {
          const data = response.data?.data;
          if (data) {
            setRenachArquivo(data.renach_arquivo);
            
            // Garantir que a foto está no formato correto (data:image se for base64)
            if (data.renach_foto) {
              let fotoFormatada = data.renach_foto;
              if (!fotoFormatada.startsWith('data:image')) {
                // Se não começar com data:image, assumir que é base64 puro e adicionar o prefixo
                fotoFormatada = `data:image/jpeg;base64,${fotoFormatada}`;
              }
              setRenachFoto(fotoFormatada);
            } else {
              setRenachFoto(null);
            }
          }
        })
        .catch(error => {
          console.log('Sem arquivo RENACH para este paciente:', error);
          setRenachFoto(null);
          setRenachArquivo(null);
        });
    } else {
      setRenachArquivo(null);
      setRenachFoto(null);
    }
  }, [showPatientDetail, selectedPatient?.id]); // Mudança: usar selectedPatient?.id em vez de selectedPatient

  // useEffect para atualizar o valor quando nfsValorPadrao for carregado e não houver valor salvo
  React.useEffect(() => {
    if (!showPatientDetail || !selectedPatient) return;
    
    // Se o valor padrão foi carregado (não é 0.00) e o valor atual é 0.00 e não há valor salvo
    const valorSalvo = selectedPatient.nfs_valor;
    const valorSalvoNum = valorSalvo ? parseFloat(String(valorSalvo).replace(',', '.')) : 0;
    const valorAtualNum = parseFloat(String(nfsValor).replace(',', '.')) || 0;
    
    if (nfsValorPadrao && nfsValorPadrao !== '0.00' && valorAtualNum === 0 && valorSalvoNum <= 0 && nfsFormaPagamento !== 'misto') {
      console.log('💰 useEffect: Aplicando valor padrão automaticamente:', nfsValorPadrao);
      setNfsValor(nfsValorPadrao);
    }
  }, [nfsValorPadrao, showPatientDetail, selectedPatient, nfsFormaPagamento, nfsValor]);

  const resetAvaliacaoForm = () => {
    setAvaliacaoData({
      numero_laudo: '',
      data_aplicacao: new Date().toISOString().split('T')[0],
      aplicacao: 'Individual',
      tipo_habilitacao: '1ª Habilitação',
      observacoes: '',
      testes_selecionados: []
    });
  };

  const handleEdit = (paciente: Patient) => {
    setEditingPatient(paciente);
    
    // Converter data_nascimento para formato YYYY-MM-DD do input type="date"
    let dataNascimentoFormatada = '';
    if (paciente.data_nascimento) {
      const date = new Date(paciente.data_nascimento);
      // Garantir que a data seja válida
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dataNascimentoFormatada = `${year}-${month}-${day}`;
      }
    }
    
    // Preparar telefones: usar telefone_fixo e telefone_celular se disponíveis, senão usar telefone
    let telefoneFixo = paciente.telefone_fixo || '';
    let telefoneCelular = paciente.telefone_celular || '';
    
    // Se não tem telefone_fixo/telefone_celular mas tem telefone, tentar processar
    if (!telefoneFixo && !telefoneCelular && paciente.telefone) {
      // Se telefone contém "/", separar
      if (paciente.telefone.includes('/')) {
        const parts = paciente.telefone.split('/').map((p: string) => p.trim().replace(/\D/g, ''));
        parts.forEach((part: string) => {
          if (part.length === 11 && !telefoneCelular) {
            telefoneCelular = part;
          } else if ((part.length === 8 || part.length === 10) && !telefoneFixo) {
            telefoneFixo = part;
          }
        });
      } else {
        // Telefone único: determinar se é fixo ou celular
        const clean = paciente.telefone.replace(/\D/g, '');
        if (clean.length === 11) {
          telefoneCelular = clean;
        } else if (clean.length === 8 || clean.length === 10) {
          telefoneFixo = clean;
        }
      }
    }
    
    setFormData({
      nome: paciente.nome,
      cpf: paciente.cpf,
      data_nascimento: dataNascimentoFormatada,
      numero_laudo: paciente.numero_laudo || '',
      contexto: paciente.contexto || '',
      tipo_transito: paciente.tipo_transito || '',
      escolaridade: paciente.escolaridade || '',
      telefone: paciente.telefone || '',
      telefone_fixo: telefoneFixo,
      telefone_celular: telefoneCelular,
      email: paciente.email || '',
      endereco: paciente.endereco || '',
      observacoes: paciente.observacoes || ''
    });
    setShowEditModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      allow_duplicate_phone: allowDuplicatePhone,
      allow_duplicate_email: allowDuplicateEmail
    };
    
    if (editingPatient) {
      updateMutation.mutate({ id: editingPatient.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este avaliado?')) {
      deleteMutation.mutate(id);
    }
  };

  const handlePatientClick = async (paciente: Patient) => {
    // Invalidar cache para garantir dados atualizados do banco
    await queryClient.invalidateQueries({ queryKey: ['pacientes'] });
    await queryClient.refetchQueries({ queryKey: ['pacientes'] });
    
    // Buscar dados atualizados do paciente diretamente do banco (sem cache)
    try {
      const response = await axios.get(`http://localhost:3001/api/pacientes/${paciente.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const pacienteAtualizado = response.data?.data || response.data;
      if (pacienteAtualizado) {
        setSelectedPatient(pacienteAtualizado);
        paciente = pacienteAtualizado; // Usar dados atualizados
      } else {
        setSelectedPatient(paciente);
      }
    } catch (error) {
      console.error('Erro ao buscar dados atualizados do paciente:', error);
      setSelectedPatient(paciente); // Usar dados do cache se falhar
    }
    
    setShowPatientDetail(true);
    setShowNewAvaliacao(false);
    // Carregar NFS-e emitidas para este paciente
    carregarNfsEmitidas(paciente.id);
    
    // Carregar valor das configurações de NFS-e (deve ser chamado depois de setSelectedPatient)
    // Usar timeout para garantir que setSelectedPatient foi executado
    setTimeout(() => {
      console.log('🔄 Chamando carregarValorNfsE para paciente:', paciente.nome);
      // Usar selectedPatient do estado (já foi setado acima), mas garantir que está definido
      const pacienteAtual = selectedPatient || paciente;
      if (pacienteAtual) {
        carregarValorNfsE();
      } else {
        // Se ainda não está definido, tentar novamente após mais um pouco
        setTimeout(() => {
          console.log('🔄 Tentativa 2: Chamando carregarValorNfsE');
          carregarValorNfsE();
        }, 300);
      }
    }, 400); // Aumentado para 400ms para garantir que selectedPatient foi atualizado
    
    // Carregar dados NFS-e existentes do paciente
    setNfsNumero(paciente.nfs_numero || '');
    // SEMPRE usar PIX como padrão se não houver forma de pagamento salva
    const formaPagamento = paciente.nfs_forma_pagamento || 'pix';
    setNfsFormaPagamento(formaPagamento);
    console.log('🔍 Carregando paciente:', {
      nome: paciente.nome,
      contexto: paciente.contexto,
      formaPagamento: formaPagamento,
      nfs_valor_salvo: paciente.nfs_valor,
      nfs_forma_pagamento_salvo: paciente.nfs_forma_pagamento
    });
    
    // Carregar valores separados se for misto
    if (formaPagamento === 'misto') {
      const valorDinheiro = paciente.nfs_valor_dinheiro || 0;
      const valorPix = paciente.nfs_valor_pix || 0;
      const valorDinheiroStr = typeof valorDinheiro === 'number' ? valorDinheiro.toFixed(2) : String(valorDinheiro || '0.00');
      const valorPixStr = typeof valorPix === 'number' ? valorPix.toFixed(2) : String(valorPix || '0.00');
      setNfsValorDinheiro(valorDinheiroStr);
      setNfsValorPix(valorPixStr);
      
      // Calcular valor total para misto
      const valorDinheiroNum = parseFloat(String(valorDinheiro).replace(',', '.')) || 0;
      const valorPixNum = parseFloat(String(valorPix).replace(',', '.')) || 0;
      
      // Se for Trânsito, o total será ajustado para o valor padrão quando carregarValorNfsE for chamado
      // Por enquanto, usar a soma dos valores salvos (será corrigido depois)
      const valorTotal = valorDinheiroNum + valorPixNum;
      setNfsValor(valorTotal > 0 ? valorTotal.toFixed(2) : '0.00');
    } else {
      // Para PIX ou Dinheiro: limpar valores mistos
      setNfsValorDinheiro('');
      setNfsValorPix('');
      
      // Se houver valor salvo e for maior que 0, usar o valor salvo
      // Senão, deixar vazio para que carregarValorNfsE aplique o valor padrão
      if (paciente.nfs_valor && parseFloat(String(paciente.nfs_valor).replace(',', '.')) > 0) {
        setNfsValor(String(paciente.nfs_valor));
      } else {
        // Inicializar com valor vazio - carregarValorNfsE aplicará o padrão após carregar
        setNfsValor('0.00'); // Temporariamente 0.00, será atualizado por carregarValorNfsE
      }
    }
  };

  const handleNewAvaliacao = () => {
    if (!selectedPatient) return;
    
    // Gerar número de laudo automaticamente baseado no ID do paciente
    const currentYear = new Date().getFullYear();
    const laudoNumber = selectedPatient.numero_laudo || `LAU-${currentYear}-${String(selectedPatient.id).padStart(4, '0')}`;
    
    // Redirecionar para página de testes com dados pré-preenchidos
    router.push(`/testes?paciente_id=${selectedPatient.id}&numero_laudo=${encodeURIComponent(laudoNumber)}`);
  };

  const handleDeleteAvaliacao = (avaliacao: Avaliacao) => {
    setAvaliacaoToDelete(avaliacao);
    setShowDeleteAvaliacaoConfirm(true);
  };

  const handleDeleteTeste = (teste: any) => {
    setTesteToDelete(teste);
    setShowDeleteTesteConfirm(true);
  };

  const handleToggleLaudo = async (laudo: string) => {
    const isCurrentlyExpanded = expandedLaudos.has(laudo);
    
    if (isCurrentlyExpanded) {
      // Recolher
      const newExpanded = new Set(expandedLaudos);
      newExpanded.delete(laudo);
      setExpandedLaudos(newExpanded);
      // Remover do loading também
      const newLoading = new Set(loadingTestes);
      newLoading.delete(laudo);
      setLoadingTestes(newLoading);
    } else {
      // Expandir
      const newExpanded = new Set(expandedLaudos);
      newExpanded.add(laudo);
      setExpandedLaudos(newExpanded);
      
      // Marcar como carregando
      const newLoading = new Set(loadingTestes);
      newLoading.add(laudo);
      setLoadingTestes(newLoading);
      
      // SEMPRE buscar testes novamente (não usar cache) para pegar atualizações
      const avaliacoesDoLaudo = avaliacoesAgrupadas[laudo];
      const todosOsTestes: any[] = [];
      
      try {
        console.log(`🔍 Buscando testes para laudo ${laudo}...`);
        for (const avaliacao of avaliacoesDoLaudo) {
          try {
            console.log(`  → Buscando testes da avaliação ${avaliacao.id} (Laudo ${avaliacao.numero_laudo})`);
            const response = await avaliacoesService.getTestes(avaliacao.id);
            console.log(`  📦 Resposta completa da API:`, response);
            console.log(`  📦 response.data:`, (response as any)?.data);
            console.log(`  📦 response.data?.data:`, (response as any)?.data?.data);
            
            // Tentar múltiplos caminhos possíveis para acessar os testes
            const testes = (response as any)?.data?.data?.testes || 
                          (response as any)?.data?.testes || 
                          (response as any)?.testes || 
                          [];
            
            console.log(`  ✅ Encontrados ${testes.length} testes para avaliação ${avaliacao.id}`);
            
            if (testes.length > 0) {
              console.log(`  📊 Tipos de testes encontrados:`, testes.map((t: any) => t.tipo || t.nome || 'desconhecido'));
            }
            
            testes.forEach((teste: any) => {
              todosOsTestes.push({
                ...teste,
                avaliacaoId: avaliacao.id,
                numeroLaudo: avaliacao.numero_laudo,
                dataAplicacao: avaliacao.data_aplicacao
              });
            });
          } catch (error: any) {
            console.error(`❌ Erro ao buscar testes da avaliação ${avaliacao.numero_laudo}:`, error);
            console.error(`   Status: ${error.response?.status}, Mensagem: ${error.response?.data?.error || error.message}`);
            console.error(`   Response completa:`, error.response?.data);
            // Se der erro em uma avaliação, continua com as outras
            if (error.response?.status !== 404) {
              // Se não for 404, pode ser um problema real
              console.warn('⚠️ Erro ao buscar testes, mas continuando:', error.message);
            }
          }
        }
        
        console.log(`✅ Total de testes encontrados para laudo ${laudo}: ${todosOsTestes.length}`);
        
        // Atualizar o cache de testes
        setTestesData((prev: any) => ({
          ...prev,
          [laudo]: todosOsTestes
        }));
        
        // Remover do loading
        const newLoadingFinal = new Set(loadingTestes);
        newLoadingFinal.delete(laudo);
        setLoadingTestes(newLoadingFinal);
        
        if (todosOsTestes.length === 0) {
          toast('ℹ️ Nenhum teste encontrado para este laudo', {
            duration: 3000,
            icon: 'ℹ️'
          });
        }
      } catch (error) {
        console.error('❌ Erro ao buscar testes:', error);
        toast.error('Erro ao carregar testes');
        // Remover do loading em caso de erro
        const newLoadingFinal = new Set(loadingTestes);
        newLoadingFinal.delete(laudo);
        setLoadingTestes(newLoadingFinal);
      }
    }
  };

  const confirmDeleteAvaliacao = () => {
    if (avaliacaoToDelete) {
      deleteAvaliacaoMutation.mutate(avaliacaoToDelete.id);
    }
  };

  const handleVerTodas = async () => {
    const todosLaudos = Object.keys(avaliacoesAgrupadas);
    
    // Se todos já estão expandidos, recolher todos
    const todosExpandidos = todosLaudos.every(laudo => expandedLaudos.has(laudo));
    
    if (todosExpandidos) {
      setExpandedLaudos(new Set());
      toast('Todas as avaliações foram recolhidas', { icon: '📋', duration: 2000 });
    } else {
      // Expandir todos de uma vez
      toast('⏳ Carregando todas as avaliações...', { icon: '⏳', duration: 2000 });
      
      // Criar um novo Set com todos os laudos
      const novosExpandidos = new Set(expandedLaudos);
      
      // Adicionar todos os laudos ao Set
      todosLaudos.forEach(laudo => novosExpandidos.add(laudo));
      setExpandedLaudos(novosExpandidos);
      
      // Marcar todos como carregando
      const novosLoading = new Set(loadingTestes);
      todosLaudos.forEach(laudo => novosLoading.add(laudo));
      setLoadingTestes(novosLoading);
      
      // Buscar testes de todos os laudos que não foram buscados ainda
      for (const laudo of todosLaudos) {
        if (!testesData[laudo]) {
          const avaliacoesDoLaudo = avaliacoesAgrupadas[laudo];
          const todosOsTestes: any[] = [];
          
          try {
            for (const avaliacao of avaliacoesDoLaudo) {
              try {
                console.log(`  → Buscando testes da avaliação ${avaliacao.id} (Laudo ${avaliacao.numero_laudo})`);
                const response = await avaliacoesService.getTestes(avaliacao.id);
                
                // Tentar múltiplos caminhos possíveis para acessar os testes
                const testes = (response as any)?.data?.data?.testes || 
                              (response as any)?.data?.testes || 
                              (response as any)?.testes || 
                              [];
                
                console.log(`  ✅ Encontrados ${testes.length} testes para avaliação ${avaliacao.id}`);
                
                testes.forEach((teste: any) => {
                  todosOsTestes.push({
                    ...teste,
                    avaliacaoId: avaliacao.id,
                    numeroLaudo: avaliacao.numero_laudo,
                    dataAplicacao: avaliacao.data_aplicacao
                  });
                });
              } catch (error: any) {
                console.error(`❌ Erro ao buscar testes da avaliação ${avaliacao.numero_laudo}:`, error);
                console.error(`   Status: ${error.response?.status}, Mensagem: ${error.response?.data?.error || error.message}`);
              }
            }
            
            setTestesData((prev: any) => ({
              ...prev,
              [laudo]: todosOsTestes
            }));
          } catch (error) {
            console.error('Erro ao buscar testes:', error);
          } finally {
            // Remover do loading após buscar (mesmo que dê erro)
            const novosLoadingFinal = new Set(loadingTestes);
            novosLoadingFinal.delete(laudo);
            setLoadingTestes(novosLoadingFinal);
          }
        } else {
          // Se já tem dados em cache, remover do loading imediatamente
          const novosLoadingFinal = new Set(loadingTestes);
          novosLoadingFinal.delete(laudo);
          setLoadingTestes(novosLoadingFinal);
        }
      }
      
      toast.success('✅ Todas as avaliações foram expandidas!');
    }
  };

  const handleAvaliacaoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      toast.error('Nenhum paciente selecionado');
      return;
    }
    
    // Remover o campo testes_selecionados do objeto enviado ao backend
    // O backend não espera esse campo no schema de validação
    const { testes_selecionados, ...avaliacaoDataWithoutTests } = avaliacaoData;
    
    const dataToSubmit = {
      ...avaliacaoDataWithoutTests,
      paciente_id: parseInt(selectedPatient.id),
      observacoes: avaliacaoData.observacoes || undefined
    };
    
    createAvaliacaoMutation.mutate(dataToSubmit);
  };

  const handleTestToggle = (testId: string) => {
    setAvaliacaoData(prev => ({
      ...prev,
      testes_selecionados: prev.testes_selecionados.includes(testId)
        ? prev.testes_selecionados.filter(id => id !== testId)
        : [...prev.testes_selecionados, testId]
    }));
  };

  const availableTests = [
    { id: 'ac', name: 'AC - Atenção Concentrada' },
    { id: 'beta-iii', name: 'BETA-III - Raciocínio Matricial' },
    { id: 'bpa2', name: 'BPA-2 - Bateria Psicológica para Avaliação da Atenção' },
    { id: 'rotas', name: 'Rotas de Atenção' },
    { id: 'memore', name: 'MEMORE - Memória de Reconhecimento' },
    { id: 'mig', name: 'MIG - Memória Imediata Geral' },
    { id: 'mvt', name: 'MVT - Memória Visual para o Trânsito' },
    { id: 'r1', name: 'R-1 - Teste Não-Verbal de Inteligência' },
    { id: 'palografico', name: 'Palográfico' }
  ];

  if (isLoading) return <div className="flex justify-center items-center h-64">Carregando...</div>;
  if (error) return <div className="text-red-500">Erro ao carregar pacientes</div>;

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pacientes e Avaliados</h1>
          <p className="text-gray-600">Gerencie pacientes e suas avaliações psicológicas</p>
        </div>

      {/* Lista de Pacientes */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            {/* Linha de busca e botão novo */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar pacientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Paciente
              </button>
            </div>
            
            {/* Filtros de ordenação */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Ordenar por:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="data">Data de Agendamento</option>
                  <option value="nome">Nome</option>
                  <option value="data_criacao">Data de Criação</option>
                  <option value="data_agendamento">Próximo Agendamento</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Ordem:</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="asc">Crescente</option>
                  <option value="desc">Decrescente</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSortBy('nome');
                    setSortOrder('asc');
                  }}
                  className={`px-3 py-1 text-sm rounded-md border ${
                    sortBy === 'nome' && sortOrder === 'asc'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  A-Z
                </button>
                <button
                  onClick={() => {
                    setSortBy('nome');
                    setSortOrder('desc');
                  }}
                  className={`px-3 py-1 text-sm rounded-md border ${
                    sortBy === 'nome' && sortOrder === 'desc'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Z-A
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avaliado
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CPF
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Idade
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contexto
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Esc
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contato
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Próximo Agendamento
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Resultado
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                // Agrupar pacientes por data de agendamento
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                
                const pacientesComAgendamento = pacientes.filter(p => (p as any).proximo_agendamento);
                const pacientesSemAgendamento = pacientes.filter(p => !(p as any).proximo_agendamento);
                
                // Ordenar pacientes com agendamento por data
                pacientesComAgendamento.sort((a, b) => {
                  const dataA = new Date((a as any).proximo_agendamento);
                  const dataB = new Date((b as any).proximo_agendamento);
                  return dataA.getTime() - dataB.getTime();
                });
                
                // Agrupar por data
                const gruposPorData: { [key: string]: any[] } = {};
                pacientesComAgendamento.forEach(paciente => {
                  const dataAgendamento = new Date((paciente as any).proximo_agendamento);
                  const dataKey = dataAgendamento.toISOString().split('T')[0];
                  if (!gruposPorData[dataKey]) {
                    gruposPorData[dataKey] = [];
                  }
                  gruposPorData[dataKey].push(paciente);
                });
                
                const renderizarPaciente = (paciente: Patient) => (
                  <tr 
                    key={paciente.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handlePatientClick(paciente)}
                  >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 max-w-[180px] truncate" title={paciente.nome}>
                      {paciente.nome}
                    </div>
                    <div className="text-xs text-gray-500">
                      {paciente.numero_laudo || `ID: ${paciente.id}`}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-900">
                    {paciente.cpf}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-center font-medium">
                    {paciente.data_nascimento ? calculateAge(paciente.data_nascimento) : '-'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm text-gray-900">{paciente.contexto || '-'}</div>
                    {paciente.tipo_transito && (
                      <div className="text-xs text-gray-500 truncate max-w-[120px]" title={paciente.tipo_transito}>
                        {paciente.tipo_transito.substring(0, 18)}{paciente.tipo_transito.length > 18 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span 
                      className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded font-semibold text-xs"
                      title={paciente.escolaridade || 'Não informado'}
                    >
                      {abreviarEscolaridade(paciente.escolaridade)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {(paciente.telefone_fixo || paciente.telefone_celular || paciente.telefone) && (
                      <div className="space-y-1">
                        {paciente.telefone_fixo && (
                          <div className="text-xs text-gray-600">
                            Fixo: {formatPhoneDisplay(paciente.telefone_fixo)}
                          </div>
                        )}
                        {paciente.telefone_celular && (
                          <a
                            href={generateWhatsAppLink(paciente.telefone_celular)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 text-xs block"
                            title="WhatsApp"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📱 {formatPhoneDisplay(paciente.telefone_celular)}
                          </a>
                        )}
                        {!paciente.telefone_fixo && !paciente.telefone_celular && paciente.telefone && (
                          <a
                            href={generateWhatsAppLink(paciente.telefone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 text-sm block whitespace-pre-line"
                            title="WhatsApp"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {formatPhoneDisplay(paciente.telefone || '')}
                          </a>
                        )}
                      </div>
                    )}
                    {paciente.email && (
                      <a
                        href={`mailto:${paciente.email}`}
                        className="text-blue-600 hover:text-blue-800 text-xs block truncate max-w-[140px]"
                        title={paciente.email}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {paciente.email}
                      </a>
                    )}
                    {!paciente.telefone_fixo && !paciente.telefone_celular && !paciente.telefone && !paciente.email && '-'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {(paciente as any).proximo_agendamento ? (
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {new Date((paciente as any).proximo_agendamento).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date((paciente as any).proximo_agendamento).toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {(paciente as any).ultima_aptidao ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                        (paciente as any).ultima_aptidao === 'Apto' 
                          ? 'bg-green-100 text-green-800'
                          : (paciente as any).ultima_aptidao === 'Inapto Temporário'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(paciente as any).ultima_aptidao === 'Apto' && <CheckCircle className="h-3.5 w-3.5" />}
                        {(paciente as any).ultima_aptidao === 'Inapto Temporário' && <AlertCircle className="h-3.5 w-3.5" />}
                        {(paciente as any).ultima_aptidao === 'Inapto' && <XCircle className="h-3.5 w-3.5" />}
                        {(paciente as any).ultima_aptidao === 'Apto' ? 'Apto' : (paciente as any).ultima_aptidao === 'Inapto Temporário' ? 'Inap.T' : 'Inap.'}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      {/* Botão de enviar resultado - adicionado na área de ações */}
                      {(paciente as any).ultima_aptidao && (paciente as any).ultima_avaliacao_id && (
                        <ComunicarResultadoButton
                          avaliacaoId={(paciente as any).ultima_avaliacao_id}
                          aptidao={(paciente as any).ultima_aptidao}
                          pacienteNome={paciente.nome}
                          pacienteEmail={paciente.email}
                          pacienteTelefone={
                            // Priorizar telefone_celular para WhatsApp, senão telefone_fixo, senão telefone
                            paciente.telefone_celular || paciente.telefone_fixo || paciente.telefone || ''
                          }
                          variant="list"
                          className="text-xs"
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(paciente);
                        }}
                        className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(paciente.id);
                        }}
                        className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                        title="Deletar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
                
                // Renderizar grupos por data - ordenação correta
                const hojeOrdenacao = new Date();
                hojeOrdenacao.setHours(0, 0, 0, 0);
                
                // Separar datas em categorias
                const datasFuturas: string[] = [];
                const datasPassadas: string[] = [];
                const dataHoje = hojeOrdenacao.toISOString().split('T')[0];
                
                Object.keys(gruposPorData).forEach(dataKey => {
                  if (dataKey === dataHoje) {
                    // Hoje será tratado separadamente
                    return;
                  } else if (new Date(dataKey) > hojeOrdenacao) {
                    datasFuturas.push(dataKey);
                  } else {
                    datasPassadas.push(dataKey);
                  }
                });
                
                // Ordenar datas futuras (mais próximas primeiro)
                datasFuturas.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                
                // Ordenar datas passadas (mais recentes primeiro)
                datasPassadas.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                
                const elementos = [];
                
                // Função para renderizar cabeçalho e pacientes de uma data
                const renderizarData = (dataKey: string, headerText: string, headerColor: string) => {
                  const data = new Date(dataKey);
                  
                  elementos.push(
                    <tr key={`header-${dataKey}`} className={headerColor}>
                      <td colSpan={9} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="font-semibold text-gray-800">
                            {headerText} - {data.toLocaleDateString('pt-BR', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                          <span className="text-sm text-gray-600">
                            ({gruposPorData[dataKey].length} paciente{gruposPorData[dataKey].length !== 1 ? 's' : ''})
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                  
                  gruposPorData[dataKey].forEach(paciente => {
                    elementos.push(renderizarPaciente(paciente));
                  });
                };
                
                // 1. Primeiro: HOJE (se existir)
                if (gruposPorData[dataHoje]) {
                  renderizarData(dataHoje, 'Hoje', 'bg-green-50');
                }
                
                // 2. Segundo: Datas futuras (mais próximas primeiro)
                datasFuturas.forEach(dataKey => {
                  const data = new Date(dataKey);
                  const amanha = new Date(hojeOrdenacao.getTime() + 24 * 60 * 60 * 1000);
                  amanha.setHours(0, 0, 0, 0);
                  
                  let headerText = 'Agendamentos';
                  let headerColor = 'bg-blue-50';
                  
                  if (data.getTime() === amanha.getTime()) {
                    headerText = 'Amanhã';
                    headerColor = 'bg-yellow-50';
                  }
                  
                  renderizarData(dataKey, headerText, headerColor);
                });
                
                // 3. Terceiro: Datas passadas (mais recentes primeiro)
                datasPassadas.forEach(dataKey => {
                  renderizarData(dataKey, 'Passado', 'bg-gray-50');
                });
                
                // Adicionar pacientes sem agendamento
                if (pacientesSemAgendamento.length > 0) {
                  elementos.push(
                    <tr key="header-sem-agendamento" className="bg-gray-50">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                          <span className="font-semibold text-gray-800">
                            Sem Agendamento
                          </span>
                          <span className="text-sm text-gray-600">
                            ({pacientesSemAgendamento.length} paciente{pacientesSemAgendamento.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                  
                  pacientesSemAgendamento.forEach(paciente => {
                    elementos.push(renderizarPaciente(paciente));
                  });
                }
                
                return elementos;
              })()}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * 10) + 1} a {Math.min(currentPage * 10, pagination.total)} de {pagination.total} resultados
              </div>
              
              {/* Navegação por números de página */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ‹
                </button>
                
                {/* Números de página */}
                {(() => {
                  const totalPages = pagination.totalPages;
                  const current = currentPage;
                  const pages = [];
                  
                  // Mostrar páginas próximas à atual
                  const start = Math.max(1, current - 2);
                  const end = Math.min(totalPages, current + 2);
                  
                  for (let i = start; i <= end; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          i === current
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  
                  return pages;
                })()}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                  disabled={currentPage === pagination.totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(pagination.totalPages)}
                  disabled={currentPage === pagination.totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Avaliado */}
      {showPatientDetail && selectedPatient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  {/* Foto do RENACH */}
                  {renachFoto ? (
                    <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-blue-300 shadow-md">
                      <img 
                        src={renachFoto} 
                        alt="Foto do paciente" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Erro ao carregar imagem:', e);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Detalhes do Avaliado
                    </h3>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {selectedPatient.nome}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowPatientDetail(false);
                    setRenachArquivo(null);
                    setRenachFoto(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>


              {/* Upload de RENACH */}
              <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      📄 Documento RENACH (DETRAN)
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Faça upload do documento RENACH em PDF
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {renachArquivo ? (
                      <>
                        <a
                          href={renachArquivo}
                          download={`RENACH_${selectedPatient.nome.replace(/\s+/g, '_')}.pdf`}
                          className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Baixar PDF
                        </a>
                        <label className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Substituir
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleUploadRenach}
                            className="hidden"
                            disabled={uploadandoRenach}
                          />
                        </label>
                      </>
                    ) : (
                      <label className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        {uploadandoRenach ? 'Processando...' : 'Fazer Upload'}
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleUploadRenach}
                          className="hidden"
                          disabled={uploadandoRenach}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Dados extraídos do RENACH */}
              {selectedPatient.numero_renach && (
                <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                    🎯 Dados Extraídos do RENACH
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedPatient.numero_renach && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Número RENACH</label>
                        <p className="text-sm font-semibold text-green-700">{selectedPatient.numero_renach}</p>
                      </div>
                    )}
                    {selectedPatient.sexo && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Sexo</label>
                        <p className="text-sm text-gray-900">{selectedPatient.sexo}</p>
                      </div>
                    )}
                    {selectedPatient.categoria_cnh && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Categoria CNH</label>
                        <p className="text-sm text-gray-900">{selectedPatient.categoria_cnh}</p>
                      </div>
                    )}
                    {selectedPatient.nome_pai && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Nome do Pai</label>
                        <p className="text-sm text-gray-900">{selectedPatient.nome_pai}</p>
                      </div>
                    )}
                    {selectedPatient.nome_mae && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Nome da Mãe</label>
                        <p className="text-sm text-gray-900">{selectedPatient.nome_mae}</p>
                      </div>
                    )}
                    {selectedPatient.naturalidade && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Naturalidade</label>
                        <p className="text-sm text-gray-900">{selectedPatient.naturalidade}</p>
                      </div>
                    )}
                    {selectedPatient.nacionalidade && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Nacionalidade</label>
                        <p className="text-sm text-gray-900">{selectedPatient.nacionalidade}</p>
                      </div>
                    )}
                    {selectedPatient.resultado_exame && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Resultado do Exame</label>
                        <p className={`text-sm font-semibold ${
                          selectedPatient.resultado_exame === 'Apto' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selectedPatient.resultado_exame}
                        </p>
                      </div>
                    )}
                    {selectedPatient.data_exame && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Data do Exame</label>
                        <p className="text-sm text-gray-900">{formatDateToBrazilian(selectedPatient.data_exame)}</p>
                        <p className="text-xs text-green-600 mt-1">✓ Extraído do RENACH</p>
                      </div>
                    )}
                    {selectedPatient.data_primeira_habilitacao && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Data da Primeira Habilitação</label>
                        <p className="text-sm text-gray-900">{formatDateToBrazilian(selectedPatient.data_primeira_habilitacao)}</p>
                        <p className="text-xs text-green-600 mt-1">✓ Extraído do RENACH</p>
                      </div>
                    )}
                    {selectedPatient.numero_laudo_renach && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Número do Laudo RENACH</label>
                        <p className="text-sm text-gray-900">{selectedPatient.numero_laudo_renach}</p>
                        <p className="text-xs text-green-600 mt-1">✓ Extraído do RENACH</p>
                      </div>
                    )}
                    {selectedPatient.crp_renach && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">CRP</label>
                        <p className="text-sm text-gray-900">{selectedPatient.crp_renach}</p>
                      </div>
                    )}
                    {selectedPatient.regiao_renach && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Região</label>
                        <p className="text-sm text-gray-900">{selectedPatient.regiao_renach}</p>
                      </div>
                    )}
                    {selectedPatient.rg && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">RG</label>
                        <p className="text-sm text-gray-900">{selectedPatient.rg}</p>
                      </div>
                    )}
                    {selectedPatient.orgao_expedidor_rg && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Órgão Expedidor</label>
                        <p className="text-sm text-gray-900">{selectedPatient.orgao_expedidor_rg}</p>
                      </div>
                    )}
                    {selectedPatient.uf_rg && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">UF</label>
                        <p className="text-sm text-gray-900">{selectedPatient.uf_rg}</p>
                      </div>
                    )}
                    {selectedPatient.tipo_documento_rg && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600">Tipo de Documento</label>
                        <p className="text-sm text-gray-900">{selectedPatient.tipo_documento_rg}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPatient.nome}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CPF</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPatient.cpf}</p>
                    {selectedPatient.cpf && selectedPatient.numero_renach && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Extraído do RENACH
                      </p>
                    )}
                  </div>
                  {selectedPatient.numero_renach && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Número RENACH</label>
                      <p className="mt-1 text-sm text-gray-900 font-semibold text-blue-600">
                        {selectedPatient.numero_renach}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Extraído do RENACH
                      </p>
                    </div>
                  )}
                  {selectedPatient.rg && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">RG</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedPatient.rg}
                        {selectedPatient.orgao_expedidor_rg && ` - ${selectedPatient.orgao_expedidor_rg}`}
                        {selectedPatient.uf_rg && `/${selectedPatient.uf_rg}`}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Extraído do RENACH
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPatient.data_nascimento ? 
                        `${formatDateToBrazilian(selectedPatient.data_nascimento)} (${calculateAge(selectedPatient.data_nascimento)} anos)` 
                        : '-'}
                    </p>
                    {selectedPatient.data_nascimento && selectedPatient.numero_renach && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Extraído do RENACH
                      </p>
                    )}
                  </div>
                  {selectedPatient.sexo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sexo</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedPatient.sexo}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Extraído do RENACH
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contexto</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPatient.contexto || '-'}</p>
                    {selectedPatient.tipo_transito && (
                      <p className="mt-1 text-sm text-gray-600">{selectedPatient.tipo_transito}</p>
                    )}
                  </div>
                  {selectedPatient.categoria_cnh && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Categoria Pretendida</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedPatient.categoria_cnh}</p>
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Extraído do RENACH
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Escolaridade</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPatient.escolaridade || '-'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone</label>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                      {selectedPatient.telefone_fixo || selectedPatient.telefone_celular ? (
                        <div className="space-y-1">
                          {selectedPatient.telefone_fixo && (
                            <div>
                              <span className="text-gray-600 text-xs">Fixo: </span>
                              <span className="text-gray-900">{formatPhoneDisplay(selectedPatient.telefone_fixo)}</span>
                            </div>
                          )}
                          {selectedPatient.telefone_celular && (
                            <div>
                              <span className="text-gray-600 text-xs">WhatsApp: </span>
                              <a
                                href={generateWhatsAppLink(selectedPatient.telefone_celular)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-800 hover:underline"
                              >
                                {formatPhoneDisplay(selectedPatient.telefone_celular)}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : selectedPatient.telefone ? (
                        <a
                          href={generateWhatsAppLink(selectedPatient.telefone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 hover:underline"
                        >
                          {formatPhoneDisplay(selectedPatient.telefone || '')}
                        </a>
                      ) : '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">E-mail</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPatient.email || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Endereço</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPatient.endereco || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Número do Laudo</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPatient.numero_laudo || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Observações</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPatient.observacoes || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Avaliações do Avaliado */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-900">Avaliações Realizadas</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleVerTodas}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {Object.keys(avaliacoesAgrupadas).every(laudo => expandedLaudos.has(laudo)) && Object.keys(avaliacoesAgrupadas).length > 0 ? 'Recolher Todas' : 'Ver Todas'}
                    </button>
                  <button
                    onClick={handleNewAvaliacao}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Nova Avaliação
                  </button>
                  </div>
                </div>

                {Object.keys(avaliacoesAgrupadas).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(avaliacoesAgrupadas).map(([laudo, avaliacoesArray]: [string, any]) => {
                      const avaliacoesDoLaudo = avaliacoesArray as Avaliacao[];
                      const isExpanded = expandedLaudos.has(laudo);
                      const testes = testesData[laudo] || [];
                      const isLoadingTestes = loadingTestes.has(laudo);
                      
                      // Pegar todas as datas únicas das avaliações deste laudo
                      const datas = [...new Set(avaliacoesDoLaudo.map(av => 
                        formatDateToBrazilian(av.data_aplicacao)
                      ))];
                      
                      // Pegar a última aptidão definida
                      const ultimaAptidao = avaliacoesDoLaudo.find(av => av.aptidao)?.aptidao;
                      
                      return (
                        <div key={laudo} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Cabeçalho do laudo */}
                          <div className="bg-blue-50 p-4">
                            <div className="flex justify-between items-center">
                          <div className="flex-1">
                                <h5 className="font-semibold text-gray-900 text-lg mb-2">📋 {laudo}</h5>
                                <div className="flex flex-wrap gap-2 items-center">
                                  <span className="text-sm text-gray-600">
                                    📅 Datas: {datas.join(', ')}
                                  </span>
                                  {ultimaAptidao && (
                                    <span className={`inline-flex items-center px-3 py-1 bg-white rounded-full text-sm font-medium ${
                                      ultimaAptidao === 'Apto' ? 'text-green-600' :
                                      ultimaAptidao === 'Inapto Temporário' ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                      {ultimaAptidao === 'Apto' && '✅ '}
                                      {ultimaAptidao === 'Inapto Temporário' && '⚠️ '}
                                      {ultimaAptidao === 'Inapto' && '❌ '}
                                      {ultimaAptidao}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                {/* Botão Enviar Resultado - PRIMEIRO */}
                                {ultimaAptidao && avaliacoesDoLaudo.find(av => av.aptidao)?.id && (
                                  <EnviarResultadoButton
                                    avaliacaoId={avaliacoesDoLaudo.find(av => av.aptidao)!.id}
                                    aptidao={ultimaAptidao}
                                    pacienteNome={selectedPatient?.nome || ''}
                                    pacienteTelefone={
                                      // Priorizar telefone_celular para WhatsApp, senão telefone_fixo, senão telefone
                                      selectedPatient?.telefone_celular || selectedPatient?.telefone_fixo || selectedPatient?.telefone || ''
                                    }
                                    pacienteEmail={selectedPatient?.email}
                                    onMessageSent={() => {
                                      console.log('Resultado enviado para laudo', laudo);
                                    }}
                                    variant="ficha"
                                  />
                                )}
                                
                                {/* Botão Ver/Ocultar Resultados - SEGUNDO */}
                                <button
                                  onClick={() => handleToggleLaudo(laudo)}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                                >
                                  <Eye className="h-4 w-4" />
                                  {isExpanded ? 'Ocultar Resultados' : 'Ver Resultados'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Resultados expandidos */}
                          {isExpanded && (
                            <div className="p-4 bg-white">
                              {isLoadingTestes ? (
                                <div className="text-center py-8">
                                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                                  <p className="text-gray-500">Carregando testes...</p>
                                </div>
                              ) : testes.length > 0 ? (
                                <div className="space-y-4">
                                  {testes.map((teste: any, index: number) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                      <h6 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <span className="text-blue-600">🧪</span>
                                        {teste.nome}
                                        <span className="text-sm text-gray-500 font-normal">
                                          - {teste.created_at ? 
                                            new Date(teste.created_at).toLocaleString('pt-BR', {
                                              day: '2-digit',
                                              month: '2-digit', 
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              timeZone: 'America/Sao_Paulo'
                                            }) : 
                                            formatDateToBrazilian(teste.dataAplicacao)
                                          }
                                        </span>
                                        <button
                                          onClick={() => handleDeleteTeste(teste)}
                                          className="ml-auto text-red-500 hover:text-red-700 p-1"
                                          title="Excluir este resultado"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </h6>
                                      
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {/* AC */}
                                        {teste.tipo === 'ac' && (
                                          <>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Acertos</p>
                                              <p className="text-lg font-semibold text-green-600">{teste.resultado.acertos}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Percentil</p>
                                              <p className="text-lg font-semibold text-blue-600">{teste.resultado.percentil}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Classificação</p>
                                              <p className="text-lg font-semibold text-purple-600">{teste.resultado.classificacao}</p>
                                            </div>
                                            {teste.tabela_normativa && (
                                              <div className="col-span-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs text-blue-800">
                                                  <strong>📊 Tabela:</strong> {teste.tabela_normativa}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* MIG */}
                                        {teste.tipo === 'mig' && (
                                          <>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Acertos</p>
                                              <p className="text-lg font-semibold text-green-600">{teste.resultado.acertos}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Percentil</p>
                                              <p className="text-lg font-semibold text-blue-600">{teste.resultado.percentil}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">QI</p>
                                              <p className="text-lg font-semibold text-indigo-600">{teste.resultado.qi}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Classificação</p>
                                              <p className="text-lg font-semibold text-purple-600">{teste.resultado.classificacao}</p>
                                            </div>
                                            {teste.tabela_normativa && (
                                              <div className="col-span-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs text-blue-800">
                                                  <strong>📊 Tabela:</strong> {teste.tabela_normativa}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* MEMORE */}
                                        {teste.tipo === 'memore' && (
                                          <>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Acertos</p>
                                              <p className="text-lg font-semibold text-green-600">{teste.resultado.acertos}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Erros</p>
                                              <p className="text-lg font-semibold text-red-600">{teste.resultado.erros}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Percentil</p>
                                              <p className="text-lg font-semibold text-blue-600">{teste.resultado.percentil}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Classificação</p>
                                              <p className="text-lg font-semibold text-purple-600">{teste.resultado.classificacao}</p>
                                            </div>
                                            {teste.tabela_normativa && (
                                              <div className="col-span-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs text-blue-800">
                                                  <strong>📊 Tabela:</strong> {teste.tabela_normativa}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* BPA-2 */}
                                        {teste.tipo === 'bpa2' && (
                                          <>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Acertos</p>
                                              <p className="text-lg font-semibold text-green-600">{teste.resultado.acertos}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Erros</p>
                                              <p className="text-lg font-semibold text-red-600">{teste.resultado.erros}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Percentil</p>
                                              <p className="text-lg font-semibold text-blue-600">{teste.resultado.percentil}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Classificação</p>
                                              <p className="text-lg font-semibold text-purple-600">{teste.resultado.classificacao}</p>
                                            </div>
                                            {teste.tabela_normativa && (
                                              <div className="col-span-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs text-blue-800">
                                                  <strong>📊 Tabela:</strong> {teste.tabela_normativa}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* R-1 */}
                                        {teste.tipo === 'r1' && (
                                          <>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Acertos</p>
                                              <p className="text-lg font-semibold text-green-600">{teste.resultado.acertos}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Percentil</p>
                                              <p className="text-lg font-semibold text-blue-600">{teste.resultado.percentil}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">QI</p>
                                              <p className="text-lg font-semibold text-indigo-600">{teste.resultado.qi}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Classificação</p>
                                              <p className="text-lg font-semibold text-purple-600">{teste.resultado.classificacao}</p>
                                            </div>
                                            {teste.tabela_normativa && (
                                              <div className="col-span-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs text-blue-800">
                                                  <strong>📊 Tabela:</strong> {teste.tabela_normativa}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* MVT */}
                                        {teste.tipo === 'mvt' && (
                                          <>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Acertos</p>
                                              <p className="text-lg font-semibold text-green-600">{teste.resultado.acertos}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Erros</p>
                                              <p className="text-lg font-semibold text-red-600">{teste.resultado.erros}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Percentil</p>
                                              <p className="text-lg font-semibold text-blue-600">{teste.resultado.percentil}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Classificação</p>
                                              <p className="text-lg font-semibold text-purple-600">{teste.resultado.classificacao}</p>
                                            </div>
                                            {teste.tabela_normativa && (
                                              <div className="col-span-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs text-blue-800">
                                                  <strong>📊 Tabela:</strong> {teste.tabela_normativa}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* PALOGRÁFICO */}
                                        {teste.tipo === 'palografico' && (
                                          <>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Acertos</p>
                                              <p className="text-lg font-semibold text-green-600">{teste.resultado.acertos}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Erros</p>
                                              <p className="text-lg font-semibold text-red-600">{teste.resultado.erros}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Percentil</p>
                                              <p className="text-lg font-semibold text-blue-600">{teste.resultado.percentil}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Classificação</p>
                                              <p className="text-lg font-semibold text-purple-600">{teste.resultado.classificacao}</p>
                                            </div>
                                            {teste.tabela_normativa && (
                                              <div className="col-span-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs text-blue-800">
                                                  <strong>📊 Tabela:</strong> {teste.tabela_normativa}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* BETA-III */}
                                        {teste.tipo === 'beta-iii' && (
                                          <>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Acertos</p>
                                              <p className="text-lg font-semibold text-green-600">{teste.resultado.acertos}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Percentil</p>
                                              <p className="text-lg font-semibold text-blue-600">{teste.resultado.percentil}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-md">
                                              <p className="text-xs text-gray-500">Classificação</p>
                                              <p className="text-lg font-semibold text-purple-600">{teste.resultado.classificacao}</p>
                                            </div>
                                            {teste.tabela_normativa && (
                                              <div className="col-span-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs text-blue-800">
                                                  <strong>📊 Tabela:</strong> {teste.tabela_normativa}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}

                                        {/* ROTAS - Array de resultados (A, C, D) */}
                                        {teste.tipo === 'rotas' && Array.isArray(teste.resultado) && (
                                          <div className="col-span-3 space-y-3">
                                            {teste.resultado.map((rota: any, idx: number) => (
                                              <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                <h5 className="font-semibold text-gray-800 mb-3">
                                                  Atenção {rota.rota_tipo === 'A' ? 'Alternada' : rota.rota_tipo === 'C' ? 'Concentrada' : 'Dividida'} ({rota.rota_tipo})
                                                </h5>
                                                <div className="grid grid-cols-3 gap-3">
                                                  <div className="bg-white p-2 rounded-md">
                                                    <p className="text-xs text-gray-500">Acertos</p>
                                                    <p className="text-sm font-semibold text-green-600">{rota.acertos}</p>
                                                  </div>
                                                  <div className="bg-white p-2 rounded-md">
                                                    <p className="text-xs text-gray-500">Erros</p>
                                                    <p className="text-sm font-semibold text-red-600">{rota.erros}</p>
                                                  </div>
                                                  <div className="bg-white p-2 rounded-md">
                                                    <p className="text-xs text-gray-500">Omissões</p>
                                                    <p className="text-sm font-semibold text-orange-600">{rota.omissoes}</p>
                                                  </div>
                                                  <div className="bg-white p-2 rounded-md">
                                                    <p className="text-xs text-gray-500">PB</p>
                                                    <p className="text-sm font-semibold text-indigo-600">{rota.pb}</p>
                                                  </div>
                                                  <div className="bg-white p-2 rounded-md">
                                                    <p className="text-xs text-gray-500">Percentil</p>
                                                    <p className="text-sm font-semibold text-blue-600">{rota.percentil || '-'}</p>
                                                  </div>
                                                  <div className="bg-white p-2 rounded-md">
                                                    <p className="text-xs text-gray-500">Classificação</p>
                                                    <p className="text-sm font-semibold text-purple-600">{rota.classificacao || '-'}</p>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                            
                                            {/* Tabela Normativa Usada */}
                                            {teste.tabela_normativa && (
                                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                                                <p className="text-xs text-blue-800">
                                                  <strong>📊 Tabela Normativa:</strong> {teste.tabela_normativa}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Outros testes - mostrar campos disponíveis */}
                                        {!['ac', 'mig', 'beta-iii', 'rotas'].includes(teste.tipo) && (
                                          <>
                                            {Object.entries(teste.resultado).map(([key, value]: [string, any]) => {
                                              if (['id', 'avaliacao_id', 'created_at', 'updated_at', 'tabela_normativa_id', 'tabela_normativa_nome'].includes(key)) return null;
                                              
                                              // Se o valor for um objeto, converter para string legível
                                              let displayValue = value;
                                              if (typeof value === 'object' && value !== null) {
                                                displayValue = JSON.stringify(value, null, 2);
                                              }
                                              
                                              return (
                                                <div key={key} className="bg-white p-3 rounded-md">
                                                  <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                                                  <p className="text-lg font-semibold text-gray-700">{displayValue}</p>
                                                </div>
                                              );
                                            })}
                                            {teste.tabela_normativa && (
                                              <div className="col-span-full bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs text-blue-800">
                                                  <strong>📊 Tabela:</strong> {teste.tabela_normativa}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}
                            </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <p className="mb-2">📭 Nenhum teste encontrado para este laudo</p>
                                  <p className="text-sm text-gray-400">Realize testes através da opção &quot;Nova Avaliação&quot;</p>
                                </div>
                              )}

                              {/* Seleção de Aptidão e Botões de ação */}
                              <div className="mt-6 border-t border-gray-200 pt-4">
                                {/* Usar a primeira avaliação do laudo para aptidão (todas compartilham) */}
                                {(() => {
                                  const primeiraAvaliacao = avaliacoesDoLaudo[0];
                                  const ultimaAptidaoDefinida = avaliacoesDoLaudo.find(av => av.aptidao)?.aptidao;
                                  
                                  return (
                                    <div>
                                      <div className="flex items-center justify-between gap-4 mb-4">
                                        <div className="flex-1">
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Aptidão do Laudo {laudo}
                                          </label>
                            <div className="flex gap-2">
                              <button
                                              onClick={() => {
                                                // Atualizar todas as avaliações do laudo
                                                avaliacoesDoLaudo.forEach((av: Avaliacao) => {
                                                  updateAptidaoMutation.mutate({ id: av.id, aptidao: 'Apto' });
                                                });
                                              }}
                                              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                                                ultimaAptidaoDefinida === 'Apto'
                                                  ? 'bg-green-600 text-white'
                                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                              }`}
                                            >
                                              ✅ Apto
                              </button>
                              <button
                                              onClick={() => {
                                                // Atualizar todas as avaliações do laudo
                                                avaliacoesDoLaudo.forEach((av: Avaliacao) => {
                                                  updateAptidaoMutation.mutate({ id: av.id, aptidao: 'Inapto Temporário' });
                                                });
                                              }}
                                              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                                                ultimaAptidaoDefinida === 'Inapto Temporário'
                                                  ? 'bg-yellow-600 text-white'
                                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                              }`}
                                            >
                                              ⚠️ Inapto Temporário
                                            </button>
                                            <button
                                              onClick={() => {
                                                // Atualizar todas as avaliações do laudo
                                                avaliacoesDoLaudo.forEach((av: Avaliacao) => {
                                                  updateAptidaoMutation.mutate({ id: av.id, aptidao: 'Inapto' });
                                                });
                                              }}
                                              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                                                ultimaAptidaoDefinida === 'Inapto'
                                                  ? 'bg-red-600 text-white'
                                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                              }`}
                                            >
                                              ❌ Inapto
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Botões de ação por data */}
                                      <div className="flex gap-2 justify-end">
                                        {avaliacoesDoLaudo.map((avaliacao: Avaliacao) => (
                                          <div key={avaliacao.id} className="flex items-center gap-2">
                                            {/* Botão Enviar Resultado */}
                                            {avaliacao.aptidao && avaliacao.id && (
                                              <EnviarResultadoButton
                                                avaliacaoId={avaliacao.id}
                                                aptidao={avaliacao.aptidao}
                                                pacienteNome={selectedPatient?.nome || ''}
                                                pacienteTelefone={
                                                  // Priorizar telefone_celular para WhatsApp, senão telefone_fixo, senão telefone
                                                  selectedPatient?.telefone_celular || selectedPatient?.telefone_fixo || selectedPatient?.telefone || ''
                                                }
                                                pacienteEmail={selectedPatient?.email}
                                                onMessageSent={() => {
                                                  // Recarregar dados se necessário
                                                  console.log('Resultado enviado para avaliação', avaliacao.id);
                                                }}
                                              />
                                            )}
                                            
                                            {/* Botão Excluir */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteAvaliacao(avaliacao);
                                              }}
                                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                                              title={`Excluir avaliação de ${new Date(avaliacao.data_aplicacao).toLocaleDateString('pt-BR')}`}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                              Excluir {new Date(avaliacao.data_aplicacao).toLocaleDateString('pt-BR')}
                                            </button>
                                          </div>
                                        ))}
                            </div>
                          </div>
                                  );
                                })()}
                        </div>
                      </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma avaliação realizada ainda</p>
                    <p className="text-sm">Clique em &quot;Nova Avaliação&quot; para começar</p>
                  </div>
                )}
              </div>

              {/* Seção NFS-e - Final da ficha */}
              <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                  <Receipt className="h-4 w-4" />
                  NFS-e
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Número da NFS-e */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Número NFS-e
                    </label>
                    <input
                      type="text"
                      value={nfsNumero}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setNfsNumero(value);
                        // Salvar automaticamente após 1 segundo de inatividade
                        setTimeout(() => {
                          if (value !== nfsNumero) {
                            salvarDadosNfsE();
                          }
                        }, 1000);
                      }}
                      placeholder="0000"
                      maxLength={4}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono text-sm"
                    />
                  </div>
                  
                  {/* Forma de Pagamento */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Forma de Pagamento
                    </label>
                    <select
                      value={nfsFormaPagamento}
                      onChange={(e) => {
                        const novaForma = e.target.value as 'dinheiro' | 'pix' | 'misto';
                        setNfsFormaPagamento(novaForma);
                        
                        // Se mudar de misto para outro, limpar valores separados
                        if (novaForma !== 'misto') {
                          setNfsValorDinheiro('');
                          setNfsValorPix('');
                          // Sempre usar valor padrão ao mudar de misto para dinheiro/pix
                          // Para Trânsito, sempre usar valor padrão (fixo)
                          // Para outros contextos, usar valor padrão inicialmente (pode editar depois)
                          setNfsValor(nfsValorPadrao || '0.00');
                        } else {
                          // Se mudar para misto, dividir o valor atual entre os dois campos
                          // Se for Trânsito, usar sempre o valor padrão
                          const valorBase = selectedPatient?.contexto === 'Trânsito' 
                            ? parseFloat(nfsValorPadrao.replace(',', '.').replace(/[^\d.]/g, '')) || 0
                            : parseFloat(nfsValor.replace(/[^\d,.-]/g, '').replace(',', '.')) || parseFloat(nfsValorPadrao.replace(',', '.').replace(/[^\d.]/g, '')) || 0;
                          const meioValor = (valorBase / 2).toFixed(2);
                          setNfsValorDinheiro(meioValor);
                          setNfsValorPix(meioValor);
                          if (selectedPatient?.contexto === 'Trânsito') {
                            setNfsValor(nfsValorPadrao);
                          } else {
                            setNfsValor(valorBase.toFixed(2));
                          }
                        }
                        
                        // Salvar automaticamente
                        setTimeout(() => {
                          salvarDadosNfsE();
                        }, 500);
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="misto">Misto</option>
                    </select>
                  </div>
                  
                  {/* Valor - Condicional baseado na forma de pagamento e contexto */}
                  {nfsFormaPagamento === 'misto' ? (
                    <div className="md:col-span-3 grid grid-cols-2 gap-3">
                      {/* Valor Dinheiro */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Valor Dinheiro (R$)
                        </label>
                        <input
                          type="text"
                          value={nfsValorDinheiro}
                          onChange={(e) => {
                            const valor = e.target.value.replace(/[^\d,.-]/g, '');
                            const valorDinheiroNum = parseFloat(valor.replace(',', '.')) || 0;
                            
                            if (selectedPatient?.contexto === 'Trânsito') {
                              // Trânsito: Ajustar automaticamente o PIX para que o total seja sempre o valor padrão
                              const valorPadraoNum = parseFloat(String(nfsValorPadrao).replace(',', '.').replace(/[^\d.]/g, '')) || 0;
                              
                              // Se o valor digitado for maior que o padrão, limitar ao padrão
                              if (valorDinheiroNum > valorPadraoNum) {
                                setNfsValorDinheiro(valorPadraoNum.toFixed(2));
                                setNfsValorPix('0.00');
                              } else {
                                // Calcular o valor do PIX para completar o total
                                const valorPixAjustado = valorPadraoNum - valorDinheiroNum;
                                setNfsValorDinheiro(valor);
                                setNfsValorPix(valorPixAjustado >= 0 ? valorPixAjustado.toFixed(2) : '0.00');
                              }
                              
                              // Total sempre igual ao valor padrão
                              setNfsValor(valorPadraoNum.toFixed(2));
                            } else {
                              // Se não for Trânsito, usar a soma livre
                              setNfsValorDinheiro(valor);
                              const valorPixAtual = nfsValorPix ? parseFloat(nfsValorPix.replace(/[^\d,.-]/g, '').replace(',', '.')) : 0;
                              const valorTotal = valorDinheiroNum + valorPixAtual;
                              setNfsValor(valorTotal.toFixed(2));
                            }
                            setTimeout(() => salvarDadosNfsE(), 1000);
                          }}
                          placeholder="0,00"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                      </div>
                      {/* Valor PIX */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Valor PIX (R$)
                        </label>
                        <input
                          type="text"
                          value={nfsValorPix}
                          onChange={(e) => {
                            const valor = e.target.value.replace(/[^\d,.-]/g, '');
                            const valorPixNum = parseFloat(valor.replace(',', '.')) || 0;
                            
                            if (selectedPatient?.contexto === 'Trânsito') {
                              // Trânsito: Ajustar automaticamente o Dinheiro para que o total seja sempre o valor padrão
                              const valorPadraoNum = parseFloat(String(nfsValorPadrao).replace(',', '.').replace(/[^\d.]/g, '')) || 0;
                              
                              // Se o valor digitado for maior que o padrão, limitar ao padrão
                              if (valorPixNum > valorPadraoNum) {
                                setNfsValorPix(valorPadraoNum.toFixed(2));
                                setNfsValorDinheiro('0.00');
                              } else {
                                // Calcular o valor do Dinheiro para completar o total
                                const valorDinheiroAjustado = valorPadraoNum - valorPixNum;
                                setNfsValorPix(valor);
                                setNfsValorDinheiro(valorDinheiroAjustado >= 0 ? valorDinheiroAjustado.toFixed(2) : '0.00');
                              }
                              
                              // Total sempre igual ao valor padrão
                              setNfsValor(valorPadraoNum.toFixed(2));
                            } else {
                              // Se não for Trânsito, usar a soma livre
                              setNfsValorPix(valor);
                              const valorDinheiroAtual = nfsValorDinheiro ? parseFloat(nfsValorDinheiro.replace(/[^\d,.-]/g, '').replace(',', '.')) : 0;
                              const valorTotal = valorDinheiroAtual + valorPixNum;
                              setNfsValor(valorTotal.toFixed(2));
                            }
                            setTimeout(() => salvarDadosNfsE(), 1000);
                          }}
                          placeholder="0,00"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        />
                      </div>
                      {/* Valor Total */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Valor Total (R$)
                        </label>
                        {selectedPatient?.contexto === 'Trânsito' ? (
                          <>
                            <input
                              type="text"
                              value={nfsValor}
                              readOnly
                              className={`w-full px-2 py-1.5 border-2 rounded-md bg-gray-50 font-mono text-sm font-bold ${
                                (() => {
                                  const totalNum = parseFloat(String(nfsValor).replace(',', '.')) || 0;
                                  const padraoNum = parseFloat(String(nfsValorPadrao).replace(',', '.')) || 0;
                                  if (totalNum > padraoNum) {
                                    return 'border-orange-500 text-orange-700 bg-orange-50';
                                  } else if (totalNum < padraoNum) {
                                    return 'border-red-500 text-red-700 bg-red-50';
                                  } else {
                                    return 'border-green-500 text-green-700 bg-green-50';
                                  }
                                })()
                              }`}
                            />
                            <div className="mt-1 flex items-center gap-2">
                              <p className="text-xs text-gray-500">
                                Valor padrão: <span className="font-semibold">{nfsValorPadrao || '0.00'}</span>
                              </p>
                              {(() => {
                                const totalNum = parseFloat(String(nfsValor).replace(',', '.')) || 0;
                                const padraoNum = parseFloat(String(nfsValorPadrao).replace(',', '.')) || 0;
                                const diferenca = Math.abs(totalNum - padraoNum);
                                
                                if (totalNum > padraoNum && diferenca > 0.01) {
                                  return (
                                    <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                                      Sobra: R$ {diferenca.toFixed(2)}
                                    </span>
                                  );
                                } else if (totalNum < padraoNum && diferenca > 0.01) {
                                  return (
                                    <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                      Falta: R$ {diferenca.toFixed(2)}
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                                      ✓ Valor correto
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={nfsValor}
                              readOnly
                              className={`w-full px-2 py-1.5 border-2 rounded-md bg-gray-50 font-mono text-sm font-bold ${
                                (() => {
                                  const totalNum = parseFloat(String(nfsValor).replace(',', '.')) || 0;
                                  const padraoNum = parseFloat(String(nfsValorPadrao).replace(',', '.').replace(/[^\d.]/g, '')) || 0;
                                  if (totalNum > padraoNum && padraoNum > 0) {
                                    return 'border-orange-500 text-orange-700 bg-orange-50';
                                  } else if (totalNum < padraoNum && padraoNum > 0) {
                                    return 'border-red-500 text-red-700 bg-red-50';
                                  } else {
                                    return 'border-green-500 text-green-700 bg-green-50';
                                  }
                                })()
                              }`}
                            />
                            <div className="mt-1 flex items-center gap-2">
                              <p className="text-xs text-gray-500">
                                Valor padrão: <span className="font-semibold">{nfsValorPadrao || '0.00'}</span>
                              </p>
                              {(() => {
                                const totalNum = parseFloat(String(nfsValor).replace(',', '.')) || 0;
                                const padraoNum = parseFloat(String(nfsValorPadrao).replace(',', '.').replace(/[^\d.]/g, '')) || 0;
                                const diferenca = Math.abs(totalNum - padraoNum);
                                
                                if (padraoNum === 0 || padraoNum === null) {
                                  return (
                                    <span className="text-xs text-gray-500">
                                      Soma automática dos valores
                                    </span>
                                  );
                                }
                                
                                if (totalNum > padraoNum && diferenca > 0.01) {
                                  return (
                                    <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                                      Sobra: R$ {diferenca.toFixed(2)}
                                    </span>
                                  );
                                } else if (totalNum < padraoNum && diferenca > 0.01) {
                                  return (
                                    <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                      Falta: R$ {diferenca.toFixed(2)}
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                                      ✓ Valor correto
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Valor (R$)
                      </label>
                      <input
                        type="text"
                        value={
                          selectedPatient?.contexto === 'Trânsito' 
                            ? (nfsValorPadrao || '2.00') 
                            : (nfsValor || nfsValorPadrao || '2.00')
                        }
                        onChange={(e) => {
                          // Trânsito: BLOQUEAR qualquer tentativa de edição
                          if (selectedPatient?.contexto === 'Trânsito') {
                            e.preventDefault();
                            return false;
                          }
                          const valor = e.target.value.replace(/[^\d,.-]/g, '');
                          setNfsValor(valor);
                          setTimeout(() => salvarDadosNfsE(), 1000);
                        }}
                        onKeyDown={(e) => {
                          // Trânsito: Bloquear teclado completamente
                          if (selectedPatient?.contexto === 'Trânsito') {
                            e.preventDefault();
                            return false;
                          }
                        }}
                        onPaste={(e) => {
                          // Trânsito: Bloquear colar
                          if (selectedPatient?.contexto === 'Trânsito') {
                            e.preventDefault();
                            return false;
                          }
                        }}
                        readOnly={selectedPatient?.contexto === 'Trânsito'}
                        disabled={selectedPatient?.contexto === 'Trânsito'}
                        className={`w-full px-2 py-1.5 border border-gray-300 rounded-md font-mono text-sm ${
                          selectedPatient?.contexto === 'Trânsito' 
                            ? 'bg-gray-100 text-gray-600 cursor-not-allowed' 
                            : 'focus:outline-none focus:ring-2 focus:ring-blue-500'
                        }`}
                        tabIndex={selectedPatient?.contexto === 'Trânsito' ? -1 : 0}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedPatient?.contexto === 'Trânsito' 
                          ? `Valor padrão fixo: ${nfsValorPadrao || '0.00'} (não editável - contexto Trânsito)` 
                          : `Valor padrão: ${nfsValorPadrao || '0.00'} (editável)`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPatientDetail(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    handleEmitirNfsE(selectedPatient);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Emitir NFS-e
                </button>
                <button
                  onClick={() => {
                    handleEdit(selectedPatient);
                    setShowPatientDetail(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Editar Avaliado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Avaliação */}
      {showNewAvaliacao && selectedPatient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Nova Avaliação - {selectedPatient.nome}
                </h3>
                <button
                  onClick={() => setShowNewAvaliacao(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAvaliacaoSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Número do Laudo</label>
                    <input
                      type="text"
                      value={avaliacaoData.numero_laudo}
                      onChange={(e) => setAvaliacaoData(prev => ({ ...prev, numero_laudo: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data de Aplicação</label>
                    <input
                      type="date"
                      value={avaliacaoData.data_aplicacao}
                      onChange={(e) => setAvaliacaoData(prev => ({ ...prev, data_aplicacao: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Aplicação</label>
                    <select
                      value={avaliacaoData.aplicacao}
                      onChange={(e) => setAvaliacaoData(prev => ({ ...prev, aplicacao: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Coletiva">Coletiva</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Habilitação</label>
                    <select
                      value={avaliacaoData.tipo_habilitacao}
                      onChange={(e) => setAvaliacaoData(prev => ({ ...prev, tipo_habilitacao: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1ª Habilitação">1ª Habilitação</option>
                      <option value="Renovação">Renovação</option>
                      <option value="Adição/Mudança de Categoria">Adição/Mudança de Categoria</option>
                      <option value="Curso Escolar">Curso Escolar</option>
                      <option value="Instrutor">Instrutor</option>
                      <option value="Segunda via">Segunda via</option>
                      <option value="Reincidente">Reincidente</option>
                      <option value="EAR - Exerce Atividade Remunerada">EAR - Exerce Atividade Remunerada</option>
                      <option value="Cassação">Cassação</option>
                      <option value="Reg. Estrangeiro">Reg. Estrangeiro</option>
                      <option value="Psicológica">Psicológica</option>
                    </select>
                  </div>
                </div>

                {/* Aptidão (para contexto de Trânsito) */}
                {selectedPatient?.contexto === 'Trânsito' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Observação de Aptidão</label>
                    <select
                      value={avaliacaoData.aptidao}
                      onChange={(e) => setAvaliacaoData(prev => ({ ...prev, aptidao: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sem observação</option>
                      <option value="Apto">Apto</option>
                      <option value="Inapto Temporário">Inapto Temporário</option>
                      <option value="Inapto">Inapto</option>
                    </select>
                  </div>
                )}

                {/* Seleção de Testes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Testes a Aplicar</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableTests.map((test) => (
                      <label key={test.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={avaliacaoData.testes_selecionados.includes(test.id)}
                          onChange={() => handleTestToggle(test.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{test.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Observações</label>
                  <textarea
                    value={avaliacaoData.observacoes}
                    onChange={(e) => setAvaliacaoData(prev => ({ ...prev, observacoes: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações sobre a avaliação..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewAvaliacao(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createAvaliacaoMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {createAvaliacaoMutation.isPending ? 'Criando...' : 'Criar Avaliação'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição/Criação de Avaliado */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingPatient ? 'Editar Avaliado' : 'Novo Avaliado'}
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome Completo *</label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CPF *</label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={handleCPFChange}
                      placeholder="000.000.000-00"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formData.data_nascimento || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_nascimento: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Número do Laudo</label>
                    <LaudoInput
                      value={formData.numero_laudo}
                      onChange={(value) => setFormData(prev => ({ ...prev, numero_laudo: value }))}
                      placeholder="Digite 4 números (ex: 1234)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Digite exatamente 4 números (ex: 1234). Será completado com zeros automaticamente se necessário. O formato LAU-{new Date().getFullYear()}-XXXX será aplicado automaticamente.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contexto</label>
                    <select
                      value={formData.contexto || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, contexto: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione o contexto</option>
                      <option value="Clínico">Clínico</option>
                      <option value="Organizacional">Organizacional</option>
                      <option value="Trânsito">Trânsito</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Escolaridade</label>
                    <select
                      value={formData.escolaridade || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, escolaridade: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione a escolaridade</option>
                      <option value="E. Fundamental">E. Fundamental</option>
                      <option value="E. Médio">E. Médio</option>
                      <option value="E. Superior">E. Superior</option>
                      <option value="Pós-Graduação">Pós-Graduação</option>
                      <option value="Não Escolarizado">Não Escolarizado</option>
                    </select>
                  </div>
                </div>

                {formData.contexto === 'Trânsito' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Trânsito</label>
                    <select
                      value={formData.tipo_transito || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_transito: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione o tipo</option>
                      <option value="1ª Habilitação">1ª Habilitação</option>
                      <option value="Renovação">Renovação</option>
                      <option value="Adição/Mudança de Categoria">Adição/Mudança de Categoria</option>
                      <option value="Curso Escolar">Curso Escolar</option>
                      <option value="Instrutor">Instrutor</option>
                      <option value="Segunda via">Segunda via</option>
                      <option value="Reincidente">Reincidente</option>
                      <option value="EAR - Exerce Atividade Remunerada">EAR - Exerce Atividade Remunerada</option>
                      <option value="Cassação">Cassação</option>
                      <option value="Reg. Estrangeiro">Reg. Estrangeiro</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone Fixo</label>
                    <PhoneInput
                      value={formData.telefone_fixo}
                      onChange={(value) => setFormData(prev => ({ ...prev, telefone_fixo: value }))}
                      placeholder="(11) 1234-5678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone Celular (WhatsApp)</label>
                    <PhoneInput
                      value={formData.telefone_celular}
                      onChange={(value) => setFormData(prev => ({ ...prev, telefone_celular: value }))}
                      placeholder="(11) 91234-5678"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">E-mail</label>
                    <EmailInputWithValidation
                      value={formData.email}
                      onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                      onDuplicateConfirm={(confirmed) => setAllowDuplicateEmail(confirmed)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Endereço</label>
                  <input
                    type="text"
                    value={formData.endereco || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Observações</label>
                  <textarea
                    value={formData.observacoes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações sobre o paciente..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending 
                      ? (editingPatient ? 'Atualizando...' : 'Criando...') 
                      : (editingPatient ? 'Atualizar' : 'Criar')
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Avaliação */}
      {showDeleteAvaliacaoConfirm && avaliacaoToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir a avaliação <strong>{avaliacaoToDelete.numero_laudo}</strong>?
              <br /><br />
              <span className="text-sm text-gray-500">
                Data: {new Date(avaliacaoToDelete.data_aplicacao).toLocaleDateString('pt-BR')}
                <br />
                Tipo: {avaliacaoToDelete.tipo_habilitacao}
              </span>
              <br /><br />
              <strong className="text-red-600">Esta ação não pode ser desfeita.</strong>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteAvaliacaoConfirm(false);
                  setAvaliacaoToDelete(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteAvaliacao}
                disabled={deleteAvaliacaoMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleteAvaliacaoMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Teste Individual */}
      {showDeleteTesteConfirm && testeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o resultado do teste <strong>{testeToDelete.nome}</strong>?
              <br /><br />
              <span className="text-sm text-gray-500">
                Data/Hora: {testeToDelete.created_at ? 
                  new Date(testeToDelete.created_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo'
                  }) : 
                  formatDateToBrazilian(testeToDelete.dataAplicacao)
                }
              </span>
              <br /><br />
              <strong className="text-red-600">Esta ação não pode ser desfeita.</strong>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteTesteConfirm(false);
                  setTesteToDelete(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteTesteMutation.mutate(testeToDelete)}
                disabled={deleteTesteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleteTesteMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Login */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleCloseLogin}
        onLogin={handleLogin}
        title="Autenticação Necessária"
        message="Para emitir NFS-e, faça login com suas credenciais:"
      />

      {/* Modal de Confirmação de NFS-e (últimos 7 dias) */}
      {showNfsEConfirmModal && nfsEConfirmData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  NFS-e já emitida recentemente
                </h3>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-4">
                  A pessoa <strong>{nfsEConfirmData.paciente.nome}</strong> (CPF: <strong>{nfsEConfirmData.paciente.cpf}</strong>) já possui uma nota fiscal emitida nos últimos 7 dias.
                </p>
                
                {nfsEConfirmData.nfsEExistente && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">NFS-e existente:</p>
                    <p className="text-xs text-gray-600">
                      Número: <strong>{nfsEConfirmData.nfsEExistente.numero_nfs_e}</strong>
                    </p>
                    <p className="text-xs text-gray-600">
                      Data: <strong>{new Date(nfsEConfirmData.nfsEExistente.data_emissao).toLocaleDateString('pt-BR')}</strong>
                    </p>
                    <p className="text-xs text-gray-600">
                      Valor: <strong>R$ {Number(nfsEConfirmData.nfsEExistente.valor).toFixed(2).replace('.', ',')}</strong>
                    </p>
                  </div>
                )}
                
                <p className="text-sm text-gray-700 mb-4">
                  Deseja emitir uma nova NFS-e mesmo assim?
                </p>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelarEmitirNfsE}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEmitirNfsE}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Sim, emitir nova NFS-e
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

export default PacientesPage;