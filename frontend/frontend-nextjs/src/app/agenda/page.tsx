'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Search, Edit, Trash2, User, UserPlus, Clock, CheckCircle, XCircle, AlertCircle, Upload, Download, Grid, List, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { agendamentosService, pacientesService, detranService } from '@/services/api';
import Layout from '@/components/Layout';
import { useTheme } from '@/contexts/ThemeContext';

// Tratamento de erros de extensões do Chrome (ignora erro comum de message channel)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('message channel closed')) {
      event.preventDefault();
      return false;
    }
  }, true);
}

interface Agendamento {
  id: string;
  paciente_id?: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  data_agendamento: string;
  tipo_avaliacao?: string;
  contexto?: string;
  tipo_transito?: string;
  observacoes?: string;
  status: 'agendado' | 'confirmado' | 'realizado' | 'cancelado';
  convertido_em_paciente: boolean;
  paciente_nome?: string;
  aptidao?: 'Apto' | 'Inapto' | 'Inapto Temporário' | null;
  ultima_aptidao?: 'Apto' | 'Inapto' | 'Inapto Temporário' | null;
}

const AgendaPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mesFilter, setMesFilter] = useState('todos'); // 'todos', 'mes-atual', 'proximos-7-dias', 'hoje', 'personalizada'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [importData, setImportData] = useState('');
  const [importDate, setImportDate] = useState('');
  const [importHour, setImportHour] = useState('14:00');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sincronizandoDetran, setSincronizandoDetran] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    data_agendamento: '',
    tipo_avaliacao: '',
    contexto: '',
    tipo_transito: '',
    categoria_cnh: '',
    observacoes: ''
  });
  const [convertData, setConvertData] = useState({
    data_nascimento: '',
    contexto: '',
    escolaridade: '',
    endereco: '',
    tipo_transito: ''
  });

  const queryClient = useQueryClient();
  const { isDark } = useTheme();

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500); // Aguarda 500ms após parar de digitar

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Limpar campos de data personalizada quando filtro muda
  useEffect(() => {
    if (mesFilter !== 'personalizada') {
      setDataInicio('');
      setDataFim('');
    }
  }, [mesFilter]);

  // Buscar agendamentos
  const { data, isLoading } = useQuery({
    queryKey: ['agendamentos', debouncedSearch, statusFilter],
    queryFn: () => agendamentosService.list({ 
      search: debouncedSearch,
      status: statusFilter || undefined
    }),
  });

  // Filtrar e ordenar agendamentos
  const agendamentosBrutos = (data as any)?.data?.data?.agendamentos || [];
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();
  
  const agendamentos = agendamentosBrutos
    .filter((ag: Agendamento) => {
      const dataAg = new Date(ag.data_agendamento);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      switch (mesFilter) {
        case 'todos':
          return true; // Mostrar todos os agendamentos
          
        case 'hoje':
          const hojeInicio = new Date(hoje);
          const hojeFim = new Date(hoje);
          hojeFim.setHours(23, 59, 59, 999);
          return dataAg >= hojeInicio && dataAg <= hojeFim;
          
        case 'proximos-7-dias':
          const proximos7Dias = new Date(hoje);
          proximos7Dias.setDate(hoje.getDate() + 7);
          proximos7Dias.setHours(23, 59, 59, 999);
          return dataAg >= hoje && dataAg <= proximos7Dias;
          
        case 'mes-atual':
          const inicioMes = new Date(anoAtual, mesAtual, 1);
          const fimMes = new Date(anoAtual, mesAtual + 1, 0);
          fimMes.setHours(23, 59, 59, 999);
          return dataAg >= inicioMes && dataAg <= fimMes;
          
        case 'personalizada':
          if (!dataInicio || !dataFim) return true;
          const inicioPersonalizado = new Date(dataInicio);
          const fimPersonalizado = new Date(dataFim);
          fimPersonalizado.setHours(23, 59, 59, 999);
          return dataAg >= inicioPersonalizado && dataAg <= fimPersonalizado;
          
        default:
          return true;
      }
    })
    .sort((a: Agendamento, b: Agendamento) => {
      // Ordenar por data decrescente (mais recente primeiro)
      return new Date(b.data_agendamento).getTime() - new Date(a.data_agendamento).getTime();
    });

  // Funções auxiliares para o calendário
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getAgendamentosForDate = (date: Date) => {
    const filtered = agendamentos.filter((ag: Agendamento) => {
      const agDate = new Date(ag.data_agendamento);
      
      // Normalizar para comparação (ignorar timezone)
      const agDateNormalized = new Date(agDate.getFullYear(), agDate.getMonth(), agDate.getDate());
      const dateNormalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      return agDateNormalized.getTime() === dateNormalized.getTime();
    });
    
    return filtered;
  };

  // Aplicar filtros (data + status)
  let filteredAgendamentos = selectedDate 
    ? getAgendamentosForDate(selectedDate)
    : agendamentos;
  
  // Aplicar filtro de status no frontend também (para atualização imediata)
  if (statusFilter) {
    filteredAgendamentos = filteredAgendamentos.filter((ag: Agendamento) => ag.status === statusFilter);
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: agendamentosService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast.success('Agendamento criado com sucesso!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar agendamento');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      agendamentosService.update(id, data),
    onSuccess: async (response, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      await queryClient.refetchQueries({ queryKey: ['agendamentos'] });
      // Só mostra toast e reseta form se não for apenas mudança de status
      if (!(variables as any).silentUpdate) {
        toast.success('Agendamento atualizado com sucesso!');
        resetForm();
        setShowModal(false);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar agendamento');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: agendamentosService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast.success('Agendamento excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao excluir agendamento');
    },
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === agendamentos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(agendamentos.map((a: Agendamento) => a.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos um agendamento para excluir');
      return;
    }

    try {
      for (const id of selectedIds) {
        await agendamentosService.delete(id);
      }
      
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast.success(`${selectedIds.length} agendamentos excluídos com sucesso!`);
      setSelectedIds([]);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      toast.error('Erro ao excluir agendamentos');
    }
  };

  const convertMutation = useMutation({
    mutationFn: ({ id, dados_adicionais }: { id: string; dados_adicionais: any }) =>
      agendamentosService.converterPaciente(id, dados_adicionais),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      toast.success('🎉 Agendamento convertido em avaliado com sucesso!');
      setShowConvertModal(false);
      setSelectedAgendamento(null);
      resetConvertData();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao converter agendamento');
    },
  });

  const importMutation = useMutation({
    mutationFn: agendamentosService.importarLote,
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      const resultado = response.data?.data;
      toast.success(`✅ ${resultado.sucesso} agendamentos importados com sucesso!`);
      if (resultado.erros > 0) {
        toast.error(`⚠️ ${resultado.erros} agendamentos com erro`);
      }
      setShowImportModal(false);
      setImportData('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao importar agendamentos');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedAgendamento) {
      // Verificar se a data de agendamento foi alterada
      const dataOriginal = selectedAgendamento.data_agendamento.slice(0, 16);
      const dataAtual = formData.data_agendamento;
      
      let dataToSubmit = { ...formData };
      
      if (dataOriginal !== dataAtual) {
        // Data foi alterada - adicionar registro nas observações
        const dataOriginalFormatada = new Date(dataOriginal).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const dataNovaFormatada = new Date(dataAtual).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const registroMudanca = `\n\n[${new Date().toLocaleString('pt-BR')}] Reagendamento: Data original: ${dataOriginalFormatada} → Nova data: ${dataNovaFormatada}`;
        
        dataToSubmit = {
          ...formData,
          observacoes: (formData.observacoes || '') + registroMudanca
        };
      }
      
      updateMutation.mutate({ id: selectedAgendamento.id, data: dataToSubmit });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
    setFormData({
      nome: agendamento.nome,
      cpf: agendamento.cpf || '',
      telefone: agendamento.telefone || '',
      email: agendamento.email || '',
      data_agendamento: agendamento.data_agendamento.slice(0, 16), // formato datetime-local
      tipo_avaliacao: agendamento.tipo_avaliacao || '',
      contexto: agendamento.contexto || '',
      tipo_transito: agendamento.tipo_transito || '',
      categoria_cnh: (agendamento as any).categoria_cnh || '',
      observacoes: agendamento.observacoes || ''
    });
    setShowModal(true);
  };

  const handleConvert = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
    setShowConvertModal(true);
  };

  const handleVerDetalhes = async (agendamento: Agendamento) => {
    if (!agendamento.paciente_id) {
      toast('Este agendamento ainda não foi convertido em avaliado', {
        icon: 'ℹ️',
        duration: 3000
      });
      return;
    }

    console.log('📍 Redirecionando para detalhes do paciente ID:', agendamento.paciente_id);
    // Redirecionar para a página de avaliados com o paciente selecionado
    window.location.href = `/pacientes?id=${agendamento.paciente_id}`;
  };

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAgendamento) {
      convertMutation.mutate({ 
        id: selectedAgendamento.id, 
        dados_adicionais: convertData 
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cpf: '',
      telefone: '',
      email: '',
      data_agendamento: '',
      tipo_avaliacao: '',
      contexto: '',
      tipo_transito: '',
      categoria_cnh: '',
      observacoes: ''
    });
    setSelectedAgendamento(null);
    setShowModal(false);
  };

  const resetConvertData = () => {
    setConvertData({
      data_nascimento: '',
      contexto: '',
      escolaridade: '',
      endereco: '',
      tipo_transito: ''
    });
  };

  // Função auxiliar para processar telefones múltiplos
  const processarTelefone = (telefoneRaw: string) => {
    if (!telefoneRaw || telefoneRaw === 'NÃO INFORMADO' || telefoneRaw === 'NÃOINFORMADO') {
      return null;
    }
    
    // Se tem "/" (múltiplos telefones), processar como múltiplos telefones
    if (telefoneRaw.includes('/')) {
      const telefones = telefoneRaw.split('/').map(t => t.trim()).filter(t => t);
      
      // Processar cada telefone e adicionar DDD se necessário
      const telefonesProcessados = telefones.map(tel => {
        const numerico = tel.replace(/\D/g, '');
        // Se tem 8 dígitos, adiciona DDD 11
        if (numerico.length === 8) {
          return `11${numerico}`;
        }
        // Se tem 9 dígitos, adiciona DDD 11  
        if (numerico.length === 9) {
          return `11${numerico}`;
        }
        return numerico;
      }).filter(tel => tel.length >= 8);
      
      // Salvar como JSON string para múltiplos telefones
      return JSON.stringify(telefonesProcessados);
    }
    
    return telefoneRaw;
  };

  // Função auxiliar para formatar CPF
  const formatarCPF = (cpf: string) => {
    if (!cpf) return '';
    
    // Remove tudo que não é número
    const apenasNumeros = cpf.replace(/\D/g, '');
    
    // Se tiver 11 dígitos, formata
    if (apenasNumeros.length === 11) {
      return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    
    // Se já estiver formatado ou for inválido, retorna como está
    return cpf;
  };

  const parseImportData = (texto: string, data: string, hora: string) => {
    const linhas = texto.split('\n').map(l => l.trim()).filter(l => l);
    const agendamentos: any[] = [];
    
    // Detectar se é formato tabulado ou formato de linhas separadas
    const primeiraLinhaComTab = linhas.find(l => l.includes('\t'));
    const formatoTabulado = !!primeiraLinhaComTab;
    
    if (formatoTabulado) {
      // FORMATO TABULADO (colunas separadas por TAB)
      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        
        // Pular cabeçalhos
        if (linha.includes('Hora') || linha.includes('CPF') || linha.includes('Nome')) {
          continue;
        }
        
        const partes = linha.split(/\t+/);
        
        if (partes.length >= 3) {
          const horaAgend = partes[0]?.trim();
          const cpf = partes[1]?.trim().replace(/\D/g, '');
          const nome = partes[2]?.trim();
          const telefone = partes[3]?.trim();
          const email = partes[4]?.trim();
          const tipoProcesso = partes[5]?.trim();
          const categoria = partes[6]?.trim(); // Categoria da CNH
          
          if (nome && nome.length > 2) {
            const dataHora = `${data}T${horaAgend || hora}:00`;
            
            agendamentos.push({
              nome: nome,
              cpf: cpf.length === 11 ? cpf : null,
              telefone: processarTelefone(telefone),
              email: email !== 'NÃO INFORMADO' ? email : null,
              data_agendamento: dataHora,
              contexto: 'Trânsito', // Sempre Trânsito nas importações
              tipo_transito: tipoProcesso || 'Renovação', // Renovação, 1ª Habilitação, etc
              categoria_cnh: categoria && categoria.length <= 3 ? categoria : null, // A, B, AB, C, D, E, ACC
              observacoes: `Importado em ${new Date().toLocaleDateString('pt-BR')}`
            });
          }
        }
      }
    } else {
      // FORMATO DE LINHAS SEPARADAS
      // Padrão: cada registro tem 9 linhas (Hora, CPF, Nome, Telefone, Email, Tipo, Categoria, Status1, Status2)
      const LINHAS_POR_REGISTRO = 9;
      
      // Encontrar onde começam os dados (após cabeçalhos)
      let startIndex = 0;
      for (let i = 0; i < linhas.length; i++) {
        if (linhas[i].includes('Status doExamePsicológico') || 
            linhas[i].includes('StatusdoExamePsicológico')) {
          startIndex = i + 1;
          break;
        }
      }
      
      // Processar em blocos de 9 linhas
      for (let i = startIndex; i < linhas.length; i += LINHAS_POR_REGISTRO) {
        if (i + 5 >= linhas.length) break; // Precisa de pelo menos 6 linhas
        
        const horaAgend = linhas[i]?.trim();
        const cpf = linhas[i + 1]?.trim().replace(/\D/g, '');
        const nome = linhas[i + 2]?.trim();
        const telefone = linhas[i + 3]?.trim();
        const email = linhas[i + 4]?.trim();
        const tipoProcesso = linhas[i + 5]?.trim();
        const categoria = linhas[i + 6]?.trim(); // Categoria da CNH
        
        // Validar dados mínimos
        if (nome && nome.length > 2 && !nome.includes('Hora') && !nome.includes('Nome')) {
          // Combinar data + hora
          const dataHora = `${data}T${horaAgend || hora}:00`;
          
          agendamentos.push({
            nome: nome,
            cpf: cpf.length === 11 ? cpf : null,
            telefone: processarTelefone(telefone),
            email: email !== 'NÃO INFORMADO' && email !== 'NÃOINFORMADO' ? email : null,
            data_agendamento: dataHora,
            contexto: 'Trânsito', // Sempre Trânsito nas importações
            tipo_transito: tipoProcesso || 'Renovação', // Renovação, 1ª Habilitação, etc
            categoria_cnh: categoria && categoria.length <= 3 ? categoria : null, // A, B, AB, C, D, E, ACC
            observacoes: `Importado em ${new Date().toLocaleDateString('pt-BR')}`
          });
        }
      }
    }
    
    return agendamentos;
  };

  const handleImport = () => {
    if (!importData.trim()) {
      toast.error('Cole os dados da agenda para importar');
      return;
    }

    if (!importDate) {
      toast.error('Selecione a data base dos agendamentos');
      return;
    }

    const agendamentosParsed = parseImportData(importData, importDate, importHour);
    
    if (agendamentosParsed.length === 0) {
      toast.error('Nenhum agendamento válido encontrado nos dados colados');
      return;
    }

    // Confirmar antes de importar
    if (confirm(`Deseja importar ${agendamentosParsed.length} agendamentos?`)) {
      importMutation.mutate({ agendamentos: agendamentosParsed });
    }
  };

  const statusOptions = [
    { value: 'agendado', label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', colorDark: 'bg-yellow-900 text-yellow-200', icon: Clock },
    { value: 'realizado', label: 'Realizado', color: 'bg-green-100 text-green-800', colorDark: 'bg-green-900 text-green-200', icon: CheckCircle }
  ];

  const handleStatusChange = async (agendamento: Agendamento) => {
    // Toggle entre pendente (agendado) e realizado
    const nextStatus = agendamento.status === 'realizado' ? 'agendado' : 'realizado';
    
    try {
      // Enviar todos os dados do agendamento + novo status
      const updateData = {
        nome: agendamento.nome,
        cpf: agendamento.cpf,
        telefone: agendamento.telefone,
        email: agendamento.email,
        data_agendamento: agendamento.data_agendamento,
        tipo_avaliacao: agendamento.tipo_avaliacao,
        observacoes: agendamento.observacoes,
        status: nextStatus,
        contexto: agendamento.contexto,
        tipo_transito: agendamento.tipo_transito,
        paciente_id: agendamento.paciente_id
      };
      
      await updateMutation.mutateAsync({
        id: agendamento.id,
        data: updateData,
        silentUpdate: true
      } as any);
      
      toast.success(`Status: ${statusOptions.find(s => s.value === nextStatus)?.label}`, {
        duration: 2000
      });
    } catch (error: any) {
      toast.error('Erro ao alterar status');
    }
  };

  const getStatusBadge = (agendamento: Agendamento) => {
    const badge = statusOptions.find(s => s.value === agendamento.status) || statusOptions[0];
    const Icon = badge.icon;
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleStatusChange(agendamento);
        }}
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          isDark ? badge.colorDark : badge.color
        } hover:opacity-80 transition-opacity cursor-pointer`}
        title="Click para alternar entre Pendente ↔ Realizado"
      >
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </button>
    );
  };

  if (isLoading) return <div className="flex justify-center items-center h-64">Carregando...</div>;

  return (
    <Layout>
      <div className={`space-y-6 ${isDark ? 'text-white' : ''}`}>
        {/* Header */}
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>📅 Agenda</h1>
          <p className={isDark ? 'text-dark-300' : 'text-gray-600'}>Gerencie agendamentos e converta em pacientes</p>
        </div>

        {/* Filtros e Ações */}
        <div className={`${isDark ? 'bg-dark-800' : 'bg-white'} rounded-xl shadow-sm border ${isDark ? 'border-dark-700' : 'border-gray-200'} p-6`}>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                  }`}
                />
              </div>
              <select
                value={mesFilter}
                onChange={(e) => setMesFilter(e.target.value)}
                className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                }`}
              >
                <option value="todos">Todos</option>
                <option value="mes-atual">Mês Atual</option>
                <option value="proximos-7-dias">Próximos 7 Dias</option>
                <option value="hoje">Hoje</option>
                <option value="personalizada">Personalizada</option>
              </select>
              
              {/* Campos de data personalizada */}
              {mesFilter === 'personalizada' && (
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                    }`}
                    placeholder="Data início"
                  />
                  <span className={`${isDark ? 'text-dark-300' : 'text-gray-500'}`}>até</span>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                    }`}
                    placeholder="Data fim"
                  />
                </div>
              )}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                }`}
              >
                <option value="">Todos os Status</option>
                <option value="agendado">Pendente</option>
                <option value="realizado">Realizado</option>
              </select>
            </div>
            <div className="flex gap-2">
              {/* Toggle de Visualização */}
              <div className="flex rounded-lg overflow-hidden border border-gray-300">
                <button
                  onClick={() => {
                    setViewMode('calendar');
                    setSelectedDate(null);
                  }}
                  className={`px-3 py-2 flex items-center gap-2 transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-dark-700 text-dark-200 hover:bg-dark-600' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Visão de Calendário"
                >
                  <Grid className="w-4 h-4" />
                  <span className="hidden sm:inline">Calendário</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 flex items-center gap-2 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-dark-700 text-dark-200 hover:bg-dark-600' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Visão de Lista"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Lista</span>
                </button>
              </div>

              {selectedIds.length > 0 && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Excluir Selecionados ({selectedIds.length})
                </button>
              )}
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
              >
                <Upload className="w-5 h-5 mr-2" />
                Importar Lote
              </button>
              <button
                onClick={async () => {
                  setSincronizandoDetran(true);
                  try {
                    const response = await detranService.sincronizar({});
                    if (response.data?.success) {
                      toast.success(response.data.message || `Sincronização concluída: ${response.data.data?.importados || 0} agendamento(s) importado(s)`);
                      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
                    } else {
                      toast.error(response.data?.error || 'Erro ao sincronizar');
                    }
                  } catch (error: any) {
                    console.error('Erro ao sincronizar:', error);
                    const errorData = error.response?.data;
                    let errorMessage = errorData?.error || error.message || 'Erro ao sincronizar agendamentos do DETRAN';
                    
                    // Melhorar mensagens de erro específicas
                    if (error.response?.status === 422) {
                      errorMessage = errorData?.error || 'Não foi possível encontrar os campos de login na página do DETRAN. A estrutura pode ter mudado.';
                      if (errorData?.detalhes?.tipo === 'DetranSelectorError') {
                        errorMessage += ' Verifique os artifacts salvos no backend.';
                      }
                    } else if (error.response?.status === 401) {
                      errorMessage = errorData?.error || 'Credenciais inválidas. Verifique CPF e senha.';
                    } else if (error.response?.status === 409) {
                      errorMessage = errorData?.error || 'CAPTCHA detectado. É necessária intervenção manual.';
                    } else if (error.response?.status === 504) {
                      errorMessage = errorData?.error || 'Timeout ao aguardar resposta do DETRAN. Tente novamente.';
                    }
                    
                    toast.error(errorMessage, { duration: 8000 });
                  } finally {
                    setSincronizandoDetran(false);
                  }
                }}
                disabled={sincronizandoDetran}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sincronizar agendamentos do DETRAN SP"
              >
                {sincronizandoDetran ? (
                  <>
                    <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Sincronizar DETRAN
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Agendamento
              </button>
            </div>
          </div>
        </div>

        {/* Visão de Calendário */}
        {viewMode === 'calendar' && !selectedDate && (
          <div className={`${isDark ? 'bg-dark-800' : 'bg-white'} rounded-xl shadow-sm border ${isDark ? 'border-dark-700' : 'border-gray-200'} p-6`}>
            {/* Navegação do Mês */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}
              >
                ←
              </button>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}
              >
                →
              </button>
            </div>

            {/* Grade do Calendário */}
            <div className="grid grid-cols-7 gap-2">
              {/* Cabeçalho dos dias da semana */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div
                  key={day}
                  className={`text-center py-2 text-sm font-semibold ${isDark ? 'text-dark-300' : 'text-gray-600'}`}
                >
                  {day}
                </div>
              ))}

              {/* Dias do mês */}
              {(() => {
                const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
                const days = [];

                // Espaços vazios antes do primeiro dia
                for (let i = 0; i < startingDayOfWeek; i++) {
                  days.push(<div key={`empty-${i}`} className="p-2" />);
                }

                // Dias do mês
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(year, month, day);
                  const dayAgendamentos = getAgendamentosForDate(date);
                  const isToday = 
                    date.getDate() === new Date().getDate() &&
                    date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear();

                  days.push(
                    <button
                      key={day}
                      onClick={() => {
                        setSelectedDate(date);
                        setViewMode('list');
                      }}
                      className={`
                        relative p-2 rounded-lg min-h-[80px] flex flex-col items-start
                        ${isToday ? 'ring-2 ring-blue-500' : ''}
                        ${dayAgendamentos.length > 0 
                          ? isDark ? 'bg-blue-900/30 hover:bg-blue-900/50' : 'bg-blue-50 hover:bg-blue-100'
                          : isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-50'
                        }
                        transition-colors
                      `}
                    >
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {day}
                      </span>
                      {dayAgendamentos.length > 0 && (
                        <div className="mt-1 w-full">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {dayAgendamentos.length} ag.
                          </span>
                        </div>
                      )}
                    </button>
                  );
                }

                return days;
              })()}
            </div>
          </div>
        )}

        {/* Lista de Agendamentos */}
        {(viewMode === 'list' || selectedDate) && (
          <div className={`${isDark ? 'bg-dark-800' : 'bg-white'} rounded-xl shadow-sm border ${isDark ? 'border-dark-700' : 'border-gray-200'}`}>
            {selectedDate && (
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Agendamentos de {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => {
                    setSelectedDate(null);
                    setViewMode('calendar');
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  ← Voltar ao Calendário
                </button>
              </div>
            )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={isDark ? 'bg-dark-700' : 'bg-gray-50'}>
                <tr>
                  <th className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === agendamentos.length && agendamentos.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aptidão</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className={`${isDark ? 'bg-dark-800 divide-dark-700' : 'bg-white divide-gray-200'} divide-y`}>
                {filteredAgendamentos.length > 0 ? (
                  filteredAgendamentos.map((agendamento: Agendamento, index: number) => {
                    // Determinar se é um dia diferente do anterior
                    const dataAtual = new Date(agendamento.data_agendamento).toDateString();
                    const dataAnterior = index > 0 
                      ? new Date(filteredAgendamentos[index - 1].data_agendamento).toDateString()
                      : null;
                    
                    // Alternar cor por dia (usar index do dia, não do agendamento)
                    let diaIndex = 0;
                    if (index > 0) {
                      for (let i = 0; i < index; i++) {
                        const dataI = new Date(filteredAgendamentos[i].data_agendamento).toDateString();
                        const dataIPlus1 = i + 1 < filteredAgendamentos.length 
                          ? new Date(filteredAgendamentos[i + 1].data_agendamento).toDateString()
                          : null;
                        if (dataI !== dataIPlus1 && i < index) {
                          diaIndex++;
                        }
                      }
                    }
                    
                    const corDia = diaIndex % 2 === 0 
                      ? (isDark ? 'bg-dark-800' : 'bg-white')
                      : (isDark ? 'bg-dark-750' : 'bg-gray-50');
                    
                    return (
                      <tr key={agendamento.id} className={`${corDia} ${isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-100'} ${selectedIds.includes(agendamento.id) ? isDark ? 'bg-dark-700' : 'bg-blue-100' : ''}`}>
                      <td className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(agendamento.id)}
                          onChange={() => handleToggleSelect(agendamento.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {new Date(agendamento.data_agendamento).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleVerDetalhes(agendamento)}
                            className={`text-sm font-medium text-left hover:underline ${
                              agendamento.paciente_id 
                                ? isDark ? 'text-blue-400 cursor-pointer' : 'text-blue-600 cursor-pointer'
                                : isDark ? 'text-white cursor-default' : 'text-gray-900 cursor-default'
                            }`}
                            disabled={!agendamento.paciente_id}
                            title={agendamento.paciente_id ? 'Click para ver detalhes do avaliado' : 'Converta em avaliado primeiro'}
                          >
                            {agendamento.nome}
                          </button>
                          {agendamento.paciente_id && agendamento.status === 'realizado' && (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                              ✅
                            </span>
                          )}
                        </div>
                        {agendamento.cpf && (
                          <button
                            onClick={() => handleVerDetalhes(agendamento)}
                            className={`text-xs mt-0.5 text-left hover:underline ${
                              agendamento.paciente_id
                                ? isDark ? 'text-blue-400 cursor-pointer' : 'text-blue-600 cursor-pointer'
                                : isDark ? 'text-dark-300 cursor-default' : 'text-gray-500 cursor-default'
                            }`}
                            disabled={!agendamento.paciente_id}
                            title={agendamento.paciente_id ? 'Click para ver detalhes do avaliado' : ''}
                          >
                            CPF: {formatarCPF(agendamento.cpf)}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm ${isDark ? 'text-dark-200' : 'text-gray-900'}`}>
                          {agendamento.telefone && <div>📱 {agendamento.telefone}</div>}
                          {agendamento.email && <div className="text-xs text-gray-500">✉️ {agendamento.email}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${isDark ? 'text-dark-200' : 'text-gray-900'}`}>
                          {agendamento.contexto && (
                            <div className="font-medium">{agendamento.contexto}</div>
                          )}
                          {agendamento.tipo_transito && (
                            <div className="text-xs text-gray-500">{agendamento.tipo_transito}</div>
                          )}
                          {!agendamento.contexto && !agendamento.tipo_transito && '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(agendamento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {agendamento.paciente_id && agendamento.ultima_aptidao ? (
                          <span className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                            agendamento.ultima_aptidao === 'Apto'
                              ? isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                              : agendamento.ultima_aptidao === 'Inapto Temporário'
                                ? isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                                : isDark ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
                          }`}>
                            {agendamento.ultima_aptidao === 'Apto' ? '✅ Apto' : agendamento.ultima_aptidao === 'Inapto Temporário' ? '⚠️ Inap.T' : '❌ Inapto'}
                          </span>
                        ) : (
                          <span className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-400'}`}>-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center items-center gap-2">
                          {/* Mostrar botão se não foi convertido OU se foi convertido mas paciente foi deletado (paciente_id = null) */}
                          {(!agendamento.convertido_em_paciente || !agendamento.paciente_id) && (
                            <button
                              onClick={() => handleConvert(agendamento)}
                              className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded"
                              title={agendamento.convertido_em_paciente && !agendamento.paciente_id ? "Reconverter em Avaliado (paciente foi deletado)" : "Converter em Avaliado"}
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(agendamento)}
                            className={`p-2 ${isDark ? 'text-blue-400 hover:bg-dark-700' : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'} rounded`}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(agendamento.id)}
                            className={`p-2 ${isDark ? 'text-red-400 hover:bg-dark-700' : 'text-red-600 hover:text-red-900 hover:bg-red-50'} rounded`}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className={isDark ? 'text-dark-300' : 'text-gray-500'}>Nenhum agendamento encontrado</p>
                      <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-gray-400'}`}>
                        Clique em &quot;Novo Agendamento&quot; para começar
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {/* Modal de Criar/Editar Agendamento */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-dark-800' : 'bg-white'} rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
              <div className="p-6">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                  {selectedAgendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                        required
                        className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        CPF
                      </label>
                      <input
                        type="text"
                        value={formData.cpf}
                        onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                        placeholder="000.000.000-00"
                        className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        Telefone
                      </label>
                      <input
                        type="tel"
                        value={formData.telefone}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                        className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@exemplo.com"
                        className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        Data e Hora do Agendamento *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.data_agendamento}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_agendamento: e.target.value }))}
                        required
                        className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        Contexto
                      </label>
                      <select
                        value={formData.contexto}
                        onChange={(e) => setFormData(prev => ({ ...prev, contexto: e.target.value }))}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Selecione o contexto</option>
                        <option value="Trânsito">Trânsito</option>
                        <option value="Clínico">Clínico</option>
                        <option value="Organizacional">Organizacional</option>
                      </select>
                    </div>

                    {formData.contexto === 'Trânsito' && (
                      <>
                        <div>
                          <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                            Tipo de Trânsito
                          </label>
                          <select
                            value={formData.tipo_transito}
                            onChange={(e) => setFormData(prev => ({ ...prev, tipo_transito: e.target.value }))}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                            }`}
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
                        <div>
                          <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                            Categoria CNH
                          </label>
                          <select
                            value={formData.categoria_cnh}
                            onChange={(e) => setFormData(prev => ({ ...prev, categoria_cnh: e.target.value }))}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Selecione a categoria</option>
                            <option value="A">A - Motocicleta</option>
                            <option value="B">B - Automóvel</option>
                            <option value="AB">AB - Moto e Automóvel</option>
                            <option value="C">C - Caminhão</option>
                            <option value="D">D - Ônibus</option>
                            <option value="E">E - Caminhão com reboque</option>
                            <option value="ACC">ACC - Ciclomotor</option>
                            <option value="AC">AC - Carro e Ciclomotor</option>
                            <option value="AD">AD - Carro e Ônibus</option>
                            <option value="AE">AE - Moto e Caminhão com reboque</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className={formData.contexto === 'Trânsito' ? 'md:col-span-3' : 'md:col-span-2'}>
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        Observações
                      </label>
                      <textarea
                        value={formData.observacoes}
                        onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                        rows={6}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                        style={{ fontSize: '0.75rem', lineHeight: '1.2' }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className={`px-4 py-2 border rounded-md ${
                        isDark 
                          ? 'border-dark-600 text-dark-200 hover:bg-dark-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {selectedAgendamento ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Conversão para Avaliado */}
        {showConvertModal && selectedAgendamento && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-dark-800' : 'bg-white'} rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
              <div className="p-6">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                  🎯 Converter em Avaliado
                </h2>

                <div className={`mb-6 p-4 ${isDark ? 'bg-dark-700' : 'bg-blue-50'} rounded-lg`}>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                    Dados do Agendamento:
                  </h3>
                  <div className={`text-sm ${isDark ? 'text-dark-200' : 'text-gray-700'} space-y-1`}>
                    <p><strong>Nome:</strong> {selectedAgendamento.nome}</p>
                    {selectedAgendamento.cpf && <p><strong>CPF:</strong> {selectedAgendamento.cpf}</p>}
                    {selectedAgendamento.telefone && <p><strong>Telefone:</strong> {selectedAgendamento.telefone}</p>}
                    {selectedAgendamento.email && <p><strong>E-mail:</strong> {selectedAgendamento.email}</p>}
                  </div>
                </div>

                <form onSubmit={handleConvertSubmit} className="space-y-4">
                  <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-gray-600'} mb-4`}>
                    Preencha os dados adicionais para criar o cadastro do avaliado:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        Data de Nascimento
                      </label>
                      <input
                        type="date"
                        value={convertData.data_nascimento}
                        onChange={(e) => setConvertData(prev => ({ ...prev, data_nascimento: e.target.value }))}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        Escolaridade
                      </label>
                      <select
                        value={convertData.escolaridade}
                        onChange={(e) => setConvertData(prev => ({ ...prev, escolaridade: e.target.value }))}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Selecione</option>
                        <option value="E. Fundamental">E. Fundamental</option>
                        <option value="E. Médio">E. Médio</option>
                        <option value="E. Superior">E. Superior</option>
                        <option value="Pós-Graduação">Pós-Graduação</option>
                        <option value="Não Escolarizado">Não Escolarizado</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        Contexto
                      </label>
                      <select
                        value={convertData.contexto}
                        onChange={(e) => setConvertData(prev => ({ ...prev, contexto: e.target.value }))}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Selecione</option>
                        <option value="Trânsito">Trânsito</option>
                        <option value="Clínico">Clínico</option>
                        <option value="Organizacional">Organizacional</option>
                      </select>
                    </div>

                    {convertData.contexto === 'Trânsito' && (
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                          Tipo de Trânsito
                        </label>
                        <select
                          value={convertData.tipo_transito}
                          onChange={(e) => setConvertData(prev => ({ ...prev, tipo_transito: e.target.value }))}
                          className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Selecione</option>
                          <option value="1ª Habilitação">1ª Habilitação</option>
                          <option value="Renovação">Renovação</option>
                          <option value="Adição/Mudança de Categoria">Adição/Mudança de Categoria</option>
                        </select>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        Endereço
                      </label>
                      <input
                        type="text"
                        value={convertData.endereco}
                        onChange={(e) => setConvertData(prev => ({ ...prev, endereco: e.target.value }))}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>

                  <div className={`p-3 ${isDark ? 'bg-dark-700' : 'bg-yellow-50'} rounded-md`}>
                    <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                      ℹ️ Os dados do agendamento (nome, CPF, telefone, e-mail) serão usados para criar o cadastro do avaliado.
                      Você pode deixar os campos adicionais vazios se não tiver essas informações.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowConvertModal(false);
                        resetConvertData();
                      }}
                      className={`px-4 py-2 border rounded-md ${
                        isDark 
                          ? 'border-dark-600 text-dark-200 hover:bg-dark-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Converter em Avaliado
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Importação em Lote */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-dark-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
              <div className="p-6">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                  <Upload className="w-6 h-6" />
                  Importar Agendamentos em Lote
                </h2>

                <div className="space-y-4">
                  {/* Instruções */}
                  <div className={`p-4 ${isDark ? 'bg-dark-700' : 'bg-blue-50'} rounded-lg`}>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                      📋 Como importar:
                    </h3>
                    <ol className={`text-sm ${isDark ? 'text-dark-200' : 'text-gray-700'} space-y-1 list-decimal list-inside`}>
                      <li>Copie a tabela de agendamentos do DETRAN ou outra fonte</li>
                      <li>Cole no campo abaixo (mantenha a formatação de colunas)</li>
                      <li>Selecione a data base dos agendamentos</li>
                      <li>Clique em &quot;Importar&quot;</li>
                    </ol>
                    <p className={`text-xs ${isDark ? 'text-dark-300' : 'text-gray-500'} mt-2`}>
                      💡 O sistema extrai automaticamente: Hora, CPF, Nome, Telefone, E-mail, Tipo de Processo
                    </p>
                  </div>

                  {/* Data Base */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'} mb-1`}>
                        Data Base dos Agendamentos *
                      </label>
                      <input
                        type="date"
                        value={importDate}
                        onChange={(e) => setImportDate(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'} mb-1`}>
                        Hora Padrão (se não especificada)
                      </label>
                      <input
                        type="time"
                        value={importHour}
                        onChange={(e) => setImportHour(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Área de Cole */}
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-dark-200' : 'text-gray-700'} mb-1`}>
                      Cole os Dados da Agenda Aqui:
                    </label>
                    <textarea
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      rows={12}
                      placeholder={`Exemplo:\n14:00\t088.769.144-71\tMACIEL FRANCISCO DA SILVA\t(11) 9827-54562\tmacielfrancis-2014@hotmail.com\tRenovação\tAE\n14:00\t193.420.278-90\tRICARDO ALESSANDRO CORTEZ PEREIRA\t999708822\tricardoacpereira@gmail.com\tRenovação\tB`}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                        isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                      }`}
                    />
                    <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-gray-500'} mt-1`}>
                      {importData ? `${importData.split('\n').filter(l => l.trim()).length} linhas` : 'Cole os dados aqui'}
                    </p>
                  </div>

                  {/* Preview */}
                  {importData && importDate && (
                    <div className={`p-4 ${isDark ? 'bg-dark-700' : 'bg-gray-50'} rounded-lg`}>
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                        👀 Preview:
                      </h4>
                      <p className={`text-sm ${isDark ? 'text-dark-200' : 'text-gray-700'}`}>
                        {(() => {
                          const parsed = parseImportData(importData, importDate, importHour);
                          return `${parsed.length} agendamentos serão criados`;
                        })()}
                      </p>
                    </div>
                  )}

                  {/* Botões */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportModal(false);
                        setImportData('');
                        setImportDate('');
                      }}
                      className={`px-4 py-2 border rounded-md ${
                        isDark 
                          ? 'border-dark-600 text-dark-200 hover:bg-dark-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={!importData || !importDate}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Importar Agendamentos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão em Lote */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-dark-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full`}>
              <div className="p-6">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  Confirmar Exclusão
                </h2>

                <p className={`${isDark ? 'text-dark-200' : 'text-gray-700'} mb-4`}>
                  Tem certeza que deseja excluir <strong>{selectedIds.length} agendamento(s)</strong> selecionado(s)?
                </p>

                <div className={`p-3 ${isDark ? 'bg-dark-700' : 'bg-red-50'} rounded-md mb-4`}>
                  <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                    ⚠️ Esta ação não pode ser desfeita!
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className={`px-4 py-2 border rounded-md ${
                      isDark 
                        ? 'border-dark-600 text-dark-200 hover:bg-dark-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir {selectedIds.length} Agendamento(s)
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

export default AgendaPage;

