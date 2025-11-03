'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Calendar, DollarSign, User, Search, Trash2, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { nfsEService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { useTheme } from '@/contexts/ThemeContext';

interface NfsEmitida {
  id: number;
  numero_nfs_e: string;
  codigo_servico: string;
  discriminacao_servico: string;
  valor: number;
  forma_pagamento?: string;
  data_emissao: string;
  paciente_nome: string;
  paciente_cpf: string;
  cep?: string;
  municipio?: string;
  bairro?: string;
  numero_endereco?: string;
  email?: string;
}

export default function RelatoriosNfsE() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('hoje');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  
  // Estados para seleção múltipla
  const [selectedNfs, setSelectedNfs] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'all' | 'selected'>('all');
  
  // Usar o contexto de autenticação e tema
  const { user } = useAuth();
  const { isDark } = useTheme();
  const isAdmin = user?.perfil === 'administrador';


  // Buscar NFS-e emitidas
  const { data: nfsData, isLoading, refetch } = useQuery({
    queryKey: ['nfs-e-emitidas', currentPage, searchTerm, dateFilter, customDateStart, customDateEnd],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      // Adicionar filtros de data
      if (dateFilter !== 'todos') {
        params.append('date_filter', dateFilter);
        if (dateFilter === 'personalizada') {
          if (customDateStart) params.append('date_start', customDateStart);
          if (customDateEnd) params.append('date_end', customDateEnd);
        }
      }

      const response = await axios.get(`http://localhost:3001/api/nfs-e/emitidas?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    }
  });

  // Função para exportar Excel
  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Buscar todos os dados (sem paginação)
      const response = await axios.get('http://localhost:3001/api/nfs-e/emitidas?limit=10000', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const nfsData = response.data.data;

      if (!nfsData || nfsData.length === 0) {
        toast.error('Nenhum dado encontrado para exportar');
        return;
      }

      // Preparar dados para Excel
      const excelData = nfsData.map((nfs: NfsEmitida) => {
        // Campos separados: código de serviço e discriminação
        const codigoServico = nfs.codigo_servico || '';
        const discriminacao = nfs.discriminacao_servico || '';
        
        return {
          'NOME': nfs.paciente_nome,
          'CPF': nfs.paciente_cpf,
          'CEP': nfs.cep || '',
          'ESTADO': 'SP', // Por enquanto fixo, pode ser extraído do CEP
          'CIDADE': nfs.municipio || '',
          'BAIRRO': nfs.bairro || '',
          'NUMERO': nfs.numero_endereco || '',
          'E-MAIL': nfs.email || '',
          'CODIGO_SERVICO': codigoServico,
          'DISCRIMINACAO': discriminacao,
          'VALOR': nfs.valor,
          'FORMA_PAGAMENTO': nfs.forma_pagamento || 'Dinheiro',
          'DATA_EMISSAO': new Date(nfs.data_emissao).toLocaleDateString('pt-BR'),
          'NUMERO_NFS_E': nfs.numero_nfs_e
        };
      });

      // Criar workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 30 }, // NOME
        { wch: 15 }, // CPF
        { wch: 10 }, // CEP
        { wch: 10 }, // ESTADO
        { wch: 20 }, // CIDADE
        { wch: 20 }, // BAIRRO
        { wch: 10 }, // NUMERO
        { wch: 30 }, // E-MAIL
        { wch: 15 }, // CODIGO_SERVICO
        { wch: 50 }, // DISCRIMINACAO
        { wch: 12 }, // VALOR
        { wch: 15 }, // FORMA_PAGAMENTO
        { wch: 12 }, // DATA_EMISSAO
        { wch: 15 }  // NUMERO_NFS_E
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'NFS-e Emitidas');

      // Gerar arquivo
      const fileName = `nfs-e-emitidas-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('Arquivo Excel baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao baixar arquivo Excel');
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar CPF
  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Funções para gerenciar seleção múltipla
  const toggleNfsSelection = (nfsId: number) => {
    setSelectedNfs(prev => 
      prev.includes(nfsId) 
        ? prev.filter(id => id !== nfsId)
        : [...prev, nfsId]
    );
  };

  const selectAllNfs = () => {
    if (nfsData?.data) {
      setSelectedNfs(nfsData.data.map((nfs: NfsEmitida) => nfs.id));
    }
  };

  const clearSelection = () => {
    setSelectedNfs([]);
  };

  const isAllSelected = () => {
    return nfsData?.data && selectedNfs.length === nfsData.data.length;
  };

  const isNfsSelected = (nfsId: number) => {
    return selectedNfs.includes(nfsId);
  };

  // Função para abrir modal de confirmação
  const handleDeleteClick = () => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem limpar as NFS-e');
      return;
    }
    setShowDeleteModal(true);
  };

  // Função para limpar NFS-e (todas ou selecionadas)
  const handleLimparNfsE = async () => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem limpar as NFS-e');
      return;
    }

    try {
      toast.loading('Limpando NFS-e...');
      
      let response;
      if (deleteMode === 'all') {
        response = await nfsEService.limpar();
      } else {
        // Implementar eliminação de NFS-e selecionadas
        response = await nfsEService.limparSelecionadas(selectedNfs);
      }
      
      toast.dismiss();
      toast.success(response.data.message);
      
      // Limpar seleção e recarregar dados
      setSelectedNfs([]);
      setShowDeleteModal(false);
      refetch();
      
    } catch (error: any) {
      console.error('Erro ao limpar NFS-e:', error);
      toast.dismiss();
      
      if (error.response?.status === 403) {
        toast.error('Acesso negado. Apenas administradores podem limpar as NFS-e.');
      } else {
        toast.error(error.response?.data?.error || 'Erro ao limpar NFS-e');
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Relatórios NFS-e
              </h1>
              <p className={`mt-2 ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>
                Gerencie e exporte suas notas fiscais eletrônicas
              </p>
            </div>
            
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-5 w-5" />
              Exportar Excel
            </button>
            
            
            {isAdmin && (
              <button
                onClick={handleDeleteClick}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Eliminar NFS-e (apenas administradores)"
              >
                <Trash2 className="h-5 w-5" />
                Eliminar NFS-e
              </button>
            )}
          </div>
        </div>

        {/* Controles de Seleção */}
        {isAdmin && nfsData?.data && nfsData.data.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-yellow-800">
                  Selecionadas: {selectedNfs.length} de {nfsData.data.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllNfs}
                    disabled={isAllSelected()}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Selecionar Todas
                  </button>
                  <button
                    onClick={clearSelection}
                    disabled={selectedNfs.length === 0}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Square className="h-4 w-4" />
                    Desmarcar Todas
                  </button>
                </div>
              </div>
              {selectedNfs.length > 0 && (
                <button
                  onClick={() => {
                    setDeleteMode('selected');
                    setShowDeleteModal(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar Selecionadas ({selectedNfs.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDark ? 'text-dark-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Buscar por paciente, CPF ou número NFS-e..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  isDark 
                    ? 'bg-dark-700 border-dark-600 text-white placeholder-dark-400' 
                    : 'border-gray-300'
                }`}
              />
            </div>
            
            {/* Filtros de Data */}
            <div className="flex items-center gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                }`}
              >
                <option value="hoje">Hoje</option>
                <option value="semana">Esta Semana</option>
                <option value="mes">Este Mês</option>
                <option value="ano">Este Ano</option>
                <option value="personalizada">Data Específica</option>
                <option value="todos">Todos</option>
              </select>
              
              {dateFilter === 'personalizada' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                    }`}
                    placeholder="Data início"
                  />
                  <span className={`${isDark ? 'text-dark-300' : 'text-gray-500'}`}>até</span>
                  <input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      isDark ? 'bg-dark-700 border-dark-600 text-white' : 'border-gray-300'
                    }`}
                    placeholder="Data fim"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        {nfsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className={`p-6 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>
                    Total NFS-e
                  </p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {nfsData.pagination?.total || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>
                    Valor Total
                  </p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {(() => {
                      const total = nfsData.data?.reduce((sum: number, nfs: NfsEmitida) => {
                        return sum + (Number(nfs.valor) || 0);
                      }, 0) || 0;
                      return formatCurrency(total);
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center">
                <User className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>
                    Pacientes Únicos
                  </p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {new Set(nfsData.data?.map((nfs: NfsEmitida) => nfs.paciente_cpf)).size || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>
                    Este Mês
                  </p>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {nfsData.data?.filter((nfs: NfsEmitida) => {
                      const nfsDate = new Date(nfs.data_emissao);
                      const now = new Date();
                      return nfsDate.getMonth() === now.getMonth() && nfsDate.getFullYear() === now.getFullYear();
                    }).length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className={`rounded-lg shadow-sm ${isDark ? 'bg-dark-800' : 'bg-white'}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={`${isDark ? 'bg-dark-700' : 'bg-gray-50'}`}>
                <tr>
                  {isAdmin && (
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      isDark ? 'text-dark-300' : 'text-gray-500'
                    }`}>
                      <input
                        type="checkbox"
                        checked={isAllSelected() || false}
                        onChange={isAllSelected() ? clearSelection : selectAllNfs}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                  )}
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-dark-300' : 'text-gray-500'
                  }`}>
                    NFS-e
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-dark-300' : 'text-gray-500'
                  }`}>
                    Paciente
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-dark-300' : 'text-gray-500'
                  }`}>
                    CPF
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-dark-300' : 'text-gray-500'
                  }`}>
                    Valor
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-dark-300' : 'text-gray-500'
                  }`}>
                    Pagamento
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-dark-300' : 'text-gray-500'
                  }`}>
                    Data Emissão
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-dark-600' : 'divide-gray-200'}`}>
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className={`px-6 py-4 text-center ${isDark ? 'text-dark-300' : 'text-gray-500'}`}>
                      Carregando...
                    </td>
                  </tr>
                ) : nfsData?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className={`px-6 py-4 text-center ${isDark ? 'text-dark-300' : 'text-gray-500'}`}>
                      Nenhuma NFS-e encontrada
                    </td>
                  </tr>
                ) : (
                  nfsData?.data?.map((nfs: NfsEmitida) => (
                    <tr key={nfs.id} className={`hover:${isDark ? 'bg-dark-700' : 'bg-gray-50'} ${isNfsSelected(nfs.id) ? (isDark ? 'bg-blue-900/20' : 'bg-blue-50') : ''}`}>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isNfsSelected(nfs.id) || false}
                            onChange={() => toggleNfsSelection(nfs.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                      )}
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {nfs.numero_nfs_e}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDark ? 'text-dark-300' : 'text-gray-500'
                      }`}>
                        {nfs.paciente_nome}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDark ? 'text-dark-300' : 'text-gray-500'
                      }`}>
                        {formatCPF(nfs.paciente_cpf)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {formatCurrency(nfs.valor || 0)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDark ? 'text-dark-300' : 'text-gray-500'
                      }`}>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          nfs.forma_pagamento === 'pix' || nfs.forma_pagamento === 'PIX'
                            ? 'bg-green-100 text-green-800' 
                            : nfs.forma_pagamento === 'misto'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(() => {
                            const forma = (nfs.forma_pagamento || 'dinheiro').toLowerCase();
                            if (forma === 'pix') return 'PIX';
                            if (forma === 'misto') return 'Misto';
                            return 'Dinheiro';
                          })()}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        isDark ? 'text-dark-300' : 'text-gray-500'
                      }`}>
                        {formatDate(nfs.data_emissao)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {nfsData?.pagination && nfsData.pagination.totalPages > 1 && (
            <div className={`px-6 py-3 border-t ${isDark ? 'border-dark-600' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className={`text-sm ${isDark ? 'text-dark-300' : 'text-gray-700'}`}>
                  Mostrando {((nfsData.pagination.page - 1) * 20) + 1} a {Math.min(nfsData.pagination.page * 20, nfsData.pagination.total)} de {nfsData.pagination.total} resultados
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 text-sm rounded-md ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Anterior
                  </button>
                  <span className={`px-3 py-1 text-sm ${isDark ? 'text-dark-300' : 'text-gray-700'}`}>
                    {currentPage} de {nfsData.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, nfsData.pagination.totalPages))}
                    disabled={currentPage === nfsData.pagination.totalPages}
                    className={`px-3 py-1 text-sm rounded-md ${
                      currentPage === nfsData.pagination.totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Confirmação de Eliminação */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`max-w-md w-full mx-4 ${isDark ? 'bg-dark-800' : 'bg-white'} rounded-lg shadow-xl`}>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Confirmar Eliminação
                  </h3>
                </div>
                
                <div className="mb-6">
                  <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-gray-600'} mb-4`}>
                    {deleteMode === 'all' 
                      ? '⚠️ Esta ação irá deletar TODAS as NFS-e da base de dados!'
                      : `⚠️ Esta ação irá deletar ${selectedNfs.length} NFS-e selecionada(s)!`
                    }
                  </p>
                  
                  <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    Esta ação é IRREVERSÍVEL!
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      isDark 
                        ? 'bg-dark-700 text-dark-300 hover:bg-dark-600' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleLimparNfsE}
                    className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    {deleteMode === 'all' ? 'Eliminar Todas' : `Eliminar ${selectedNfs.length} Selecionada(s)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
