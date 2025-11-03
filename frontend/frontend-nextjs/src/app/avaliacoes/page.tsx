'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { avaliacoesService, pacientesService } from '@/services/api';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Eye, Trash2, Search, Calendar, User, FileText, Plus, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface Avaliacao {
  id: string;
  numero_laudo: string;
  data_aplicacao: string;
  aplicacao: string;
  tipo_habilitacao: string;
  observacoes?: string;
  paciente_nome: string;
  paciente_cpf: string;
  usuario_nome: string;
  created_at: string;
}

const AvaliacoesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<Avaliacao | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();

  // Buscar avaliações
  const { data, isLoading, error } = useQuery({
    queryKey: ['avaliacoes', currentPage, searchTerm],
    queryFn: () => avaliacoesService.list({ 
      page: currentPage, 
      limit: 10, 
      search: searchTerm 
    }),
    placeholderData: (previousData) => previousData,
  });

  const avaliacoes = (data as any)?.data?.data?.avaliacoes || [];
  const pagination = (data as any)?.data?.data?.pagination;

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: avaliacoesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes'] });
      toast.success('Avaliação deletada com sucesso!');
      setShowDeleteConfirm(false);
      setSelectedAvaliacao(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao deletar avaliação');
    },
  });

  const handleDelete = (avaliacao: Avaliacao) => {
    setSelectedAvaliacao(avaliacao);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (selectedAvaliacao) {
      deleteMutation.mutate(selectedAvaliacao.id);
    }
  };

  const handleView = (avaliacao: Avaliacao) => {
    router.push(`/avaliacoes/${avaliacao.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className={`min-h-screen p-8 ${isDark ? 'bg-dark-950' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Menu
            </button>
          </div>
          <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-800'} mb-2 flex items-center gap-3`}>
            <FileText className="w-10 h-10 text-blue-600" />
            Avaliações Psicológicas
          </h1>
          <p className={`${isDark ? 'text-dark-300' : 'text-gray-600'}`}>Gerencie as avaliações psicológicas realizadas</p>
        </div>

        {/* Search and Actions */}
        <div className={`${isDark ? 'bg-dark-800' : 'bg-white'} rounded-xl shadow-sm p-6 mb-6`}>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por número do laudo ou paciente..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              onClick={() => router.push('/pacientes')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Nova Avaliação
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Carregando avaliações...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">Erro ao carregar avaliações. Tente novamente.</p>
          </div>
        )}

        {/* Avaliações List */}
        {!isLoading && !error && (
          <>
            {avaliacoes.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma avaliação encontrada</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? 'Tente buscar com outros termos' : 'Comece criando uma nova avaliação'}
                </p>
                <button
                  onClick={() => router.push('/pacientes')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Nova Avaliação
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {avaliacoes.map((avaliacao: Avaliacao) => (
                  <div
                    key={avaliacao.id}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              Laudo: {avaliacao.numero_laudo}
                            </h3>
                            <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                              <User className="w-4 h-4" />
                              {avaliacao.paciente_nome} - CPF: {avaliacao.paciente_cpf}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Data: {formatDate(avaliacao.data_aplicacao)}</span>
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">Aplicação:</span> {avaliacao.aplicacao}
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">Tipo:</span> {avaliacao.tipo_habilitacao}
                          </div>
                        </div>
                        
                        {avaliacao.observacoes && (
                          <p className="text-sm text-gray-500 italic">
                            {avaliacao.observacoes.substring(0, 100)}
                            {avaliacao.observacoes.length > 100 && '...'}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(avaliacao)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>
                        <button
                          onClick={() => handleDelete(avaliacao)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                
                <span className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                  Página {currentPage} de {pagination.pages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                  disabled={currentPage === pagination.pages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedAvaliacao && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmar Exclusão</h3>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir a avaliação <strong>{selectedAvaliacao.numero_laudo}</strong> do paciente <strong>{selectedAvaliacao.paciente_nome}</strong>?
                <br /><br />
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedAvaliacao(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvaliacoesPage;

