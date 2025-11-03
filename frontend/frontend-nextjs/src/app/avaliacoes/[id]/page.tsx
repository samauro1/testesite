'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { avaliacoesService } from '@/services/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Calendar, User, ClipboardList, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const AvaliacaoDetalhesPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const avaliacaoId = params.id as string;
  
  const [aptidao, setAptidao] = useState<string>('');

  // Buscar detalhes da avaliação
  const { data: avaliacaoData, isLoading: loadingAvaliacao } = useQuery({
    queryKey: ['avaliacao', avaliacaoId],
    queryFn: () => avaliacoesService.get(avaliacaoId),
    enabled: !!avaliacaoId,
  });

  // Buscar testes realizados
  const { data: testesData, isLoading: loadingTestes } = useQuery({
    queryKey: ['avaliacao-testes', avaliacaoId],
    queryFn: () => avaliacoesService.getTestes(avaliacaoId),
    enabled: !!avaliacaoId,
  });

  const avaliacao = (avaliacaoData as any)?.data?.avaliacao;
  const testes = (testesData as any)?.data?.data?.testes || [];

  // Sincronizar aptidão quando avaliação carregar
  React.useEffect(() => {
    if (avaliacao?.aptidao) {
      setAptidao(avaliacao.aptidao);
    }
  }, [avaliacao]);

  // Mutation para atualizar aptidão
  const updateAptidaoMutation = useMutation({
    mutationFn: (aptidaoValue: string) => {
      if (!avaliacao.paciente_id) {
        throw new Error('ID do paciente não encontrado');
      }
      
      return avaliacoesService.update(avaliacaoId, {
        paciente_id: avaliacao.paciente_id,
        numero_laudo: avaliacao.numero_laudo,
        data_aplicacao: avaliacao.data_aplicacao,
        aplicacao: avaliacao.aplicacao,
        tipo_habilitacao: avaliacao.tipo_habilitacao,
        observacoes: avaliacao.observacoes || '',
        aptidao: aptidaoValue
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avaliacao', avaliacaoId] });
      toast.success('Aptidão atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar aptidão:', error);
      toast.error(error.response?.data?.error || 'Erro ao atualizar aptidão');
    }
  });

  const handleAptidaoChange = (value: string) => {
    setAptidao(value);
    updateAptidaoMutation.mutate(value);
  };

  const handleEnviarResultado = () => {
    // TODO: Implementar no futuro
    toast('📧 Funcionalidade de envio será implementada em breve', {
      icon: '🚀',
      duration: 3000
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (loadingAvaliacao || loadingTestes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Carregando detalhes da avaliação...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!avaliacao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">Avaliação não encontrada.</p>
            <button
              onClick={() => router.push('/avaliacoes')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              Voltar para Avaliações
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/avaliacoes')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para Avaliações
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                <FileText className="w-10 h-10 text-blue-600" />
                Detalhes da Avaliação
              </h1>
              <p className="text-gray-600">Laudo: {avaliacao.numero_laudo}</p>
            </div>
            
            <div className="flex gap-3">
              {/* Botões de Aptidão */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAptidaoChange('Apto')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    aptidao === 'Apto'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-white text-green-600 border-2 border-green-600 hover:bg-green-50'
                  }`}
                  disabled={updateAptidaoMutation.isPending}
                >
                  <CheckCircle className="w-5 h-5" />
                  Apto
                </button>
                
                <button
                  onClick={() => handleAptidaoChange('Inapto Temporário')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    aptidao === 'Inapto Temporário'
                      ? 'bg-yellow-600 text-white shadow-lg'
                      : 'bg-white text-yellow-600 border-2 border-yellow-600 hover:bg-yellow-50'
                  }`}
                  disabled={updateAptidaoMutation.isPending}
                >
                  <AlertCircle className="w-5 h-5" />
                  Inapto Temp.
                </button>
                
                <button
                  onClick={() => handleAptidaoChange('Inapto')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    aptidao === 'Inapto'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'bg-white text-red-600 border-2 border-red-600 hover:bg-red-50'
                  }`}
                  disabled={updateAptidaoMutation.isPending}
                >
                  <XCircle className="w-5 h-5" />
                  Inapto
                </button>
              </div>
              
              {/* Botão Enviar Resultado */}
              <button
                onClick={handleEnviarResultado}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md"
              >
                <Send className="w-5 h-5" />
                Enviar Resultado
              </button>
            </div>
          </div>
        </div>

        {/* Informações da Avaliação */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Informações da Avaliação</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Número do Laudo</label>
              <p className="text-gray-800 font-semibold">{avaliacao.numero_laudo}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data de Aplicação
              </label>
              <p className="text-gray-800 font-semibold">{formatDate(avaliacao.data_aplicacao)}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Tipo de Aplicação</label>
              <p className="text-gray-800 font-semibold">{avaliacao.aplicacao}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Tipo de Habilitação</label>
              <p className="text-gray-800 font-semibold">{avaliacao.tipo_habilitacao}</p>
            </div>
            
            {/* Aptidão Atual */}
            {aptidao && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Observação de Aptidão</label>
                <div className={`mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                  aptidao === 'Apto' 
                    ? 'bg-green-100 text-green-800' 
                    : aptidao === 'Inapto Temporário'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {aptidao === 'Apto' && <CheckCircle className="w-5 h-5" />}
                  {aptidao === 'Inapto Temporário' && <AlertCircle className="w-5 h-5" />}
                  {aptidao === 'Inapto' && <XCircle className="w-5 h-5" />}
                  {aptidao}
                </div>
              </div>
            )}
          </div>

          {avaliacao.observacoes && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-600">Observações</label>
              <p className="text-gray-800 mt-1 whitespace-pre-wrap">{avaliacao.observacoes}</p>
            </div>
          )}
        </div>

        {/* Informações do Paciente */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            Informações do Paciente
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Nome</label>
              <p className="text-gray-800 font-semibold">{avaliacao.paciente_nome}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">CPF</label>
              <p className="text-gray-800 font-semibold">{avaliacao.paciente_cpf}</p>
            </div>
            
            {avaliacao.idade && (
              <div>
                <label className="text-sm font-medium text-gray-600">Idade</label>
                <p className="text-gray-800 font-semibold">{avaliacao.idade} anos</p>
              </div>
            )}
            
            {avaliacao.escolaridade && (
              <div>
                <label className="text-sm font-medium text-gray-600">Escolaridade</label>
                <p className="text-gray-800 font-semibold">{avaliacao.escolaridade}</p>
              </div>
            )}
          </div>
        </div>

        {/* Testes Realizados */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Testes Realizados ({testes.length})
          </h2>
          
          {testes.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum teste realizado ainda</p>
              <button
                onClick={() => router.push(`/testes?avaliacao_id=${avaliacaoId}&numero_laudo=${avaliacao.numero_laudo}`)}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Realizar Testes
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {testes.map((teste: any, index: number) => {
                const resultado = teste.resultado;
                
                // Função auxiliar para renderizar badge de classificação
                const renderClassificacaoBadge = (classificacao: string) => {
                  const cores: Record<string, string> = {
                    'Superior': 'bg-purple-100 text-purple-800 border-purple-200',
                    'Médio Superior': 'bg-blue-100 text-blue-800 border-blue-200',
                    'Médio': 'bg-green-100 text-green-800 border-green-200',
                    'Médio Inferior': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    'Inferior': 'bg-orange-100 text-orange-800 border-orange-200',
                    'Deficitário': 'bg-red-100 text-red-800 border-red-200',
                    'Muito Deficitário': 'bg-red-200 text-red-900 border-red-300',
                  };
                  const corClasse = cores[classificacao] || 'bg-gray-100 text-gray-800 border-gray-200';
                  return (
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold border ${corClasse}`}>
                      {classificacao}
                    </span>
                  );
                };

                return (
                  <div
                    key={index}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    {/* Cabeçalho do Teste */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-gray-800">{teste.nome}</h3>
                      {resultado.classificacao && renderClassificacaoBadge(resultado.classificacao)}
                    </div>

                    {/* Resultados por tipo de teste */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* MEMORE */}
                      {teste.tipo === 'memore' && (
                        <>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Resultado Final</p>
                            <p className="text-2xl font-bold text-blue-700">{resultado.resultado_final}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Percentil</p>
                            <p className="text-2xl font-bold text-green-700">{resultado.percentil}</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">VP/VN/FN/FP</p>
                            <p className="text-xl font-semibold text-purple-700">
                              {resultado.vp}/{resultado.vn}/{resultado.fn}/{resultado.fp}
                            </p>
                          </div>
                        </>
                      )}

                      {/* MIG */}
                      {teste.tipo === 'mig' && (
                        <>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Acertos</p>
                            <p className="text-2xl font-bold text-blue-700">{resultado.acertos}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Percentil</p>
                            <p className="text-2xl font-bold text-green-700">{resultado.percentil}</p>
                          </div>
                          {resultado.qi && (
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 mb-1">QI</p>
                              <p className="text-2xl font-bold text-purple-700">{resultado.qi}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* AC - Atenção Concentrada */}
                      {teste.tipo === 'ac' && (
                        <>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Acertos</p>
                            <p className="text-2xl font-bold text-green-700">{resultado.acertos}</p>
                          </div>
                          <div className="bg-red-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Erros</p>
                            <p className="text-2xl font-bold text-red-700">{resultado.erros}</p>
                          </div>
                          <div className="bg-yellow-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Omissões</p>
                            <p className="text-2xl font-bold text-yellow-700">{resultado.omissoes}</p>
                          </div>
                          {resultado.percentil && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 mb-1">Percentil</p>
                              <p className="text-2xl font-bold text-blue-700">{resultado.percentil}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* ROTAS */}
                      {teste.tipo === 'rotas' && (
                        <>
                          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                            <p className="text-sm font-semibold text-blue-800 mb-2">🎯 Atenção Concentrada</p>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-gray-600">Acertos:</span> <span className="font-bold text-blue-700">{resultado.acertos_rota_c || 0}</span></p>
                              <p><span className="text-gray-600">Erros:</span> <span className="font-bold text-red-600">{resultado.erros_rota_c || 0}</span></p>
                              <p><span className="text-gray-600">Omissões:</span> <span className="font-bold text-yellow-600">{resultado.omissoes_rota_c || 0}</span></p>
                            </div>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                            <p className="text-sm font-semibold text-green-800 mb-2">🔄 Atenção Alternada</p>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-gray-600">Acertos:</span> <span className="font-bold text-green-700">{resultado.acertos_rota_a || 0}</span></p>
                              <p><span className="text-gray-600">Erros:</span> <span className="font-bold text-red-600">{resultado.erros_rota_a || 0}</span></p>
                              <p><span className="text-gray-600">Omissões:</span> <span className="font-bold text-yellow-600">{resultado.omissoes_rota_a || 0}</span></p>
                            </div>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                            <p className="text-sm font-semibold text-purple-800 mb-2">✨ Atenção Dividida</p>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-gray-600">Acertos:</span> <span className="font-bold text-purple-700">{resultado.acertos_rota_d || 0}</span></p>
                              <p><span className="text-gray-600">Erros:</span> <span className="font-bold text-red-600">{resultado.erros_rota_d || 0}</span></p>
                              <p><span className="text-gray-600">Omissões:</span> <span className="font-bold text-yellow-600">{resultado.omissoes_rota_d || 0}</span></p>
                            </div>
                          </div>
                          {resultado.percentil_geral && (
                            <div className="md:col-span-3 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border-2 border-blue-200">
                              <p className="text-sm font-semibold text-gray-700 mb-2">📊 Atenção Geral</p>
                              <div className="flex items-center gap-6">
                                <div>
                                  <p className="text-xs text-gray-600">Percentil Geral</p>
                                  <p className="text-3xl font-bold text-blue-700">{resultado.percentil_geral}</p>
                                </div>
                                {resultado.classificacao_geral && (
                                  <div className="flex-1">
                                    {renderClassificacaoBadge(resultado.classificacao_geral)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* BETA-III, BPA-2, MVT, R-1, Palográfico - Adicionar conforme necessário */}
                      {(teste.tipo === 'beta-iii' || teste.tipo === 'r1' || teste.tipo === 'mvt') && (
                        <>
                          {resultado.acertos !== undefined && (
                            <div className="bg-green-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 mb-1">Acertos</p>
                              <p className="text-2xl font-bold text-green-700">{resultado.acertos}</p>
                            </div>
                          )}
                          {resultado.erros !== undefined && (
                            <div className="bg-red-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 mb-1">Erros</p>
                              <p className="text-2xl font-bold text-red-700">{resultado.erros}</p>
                            </div>
                          )}
                          {resultado.omissao !== undefined && (
                            <div className="bg-yellow-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 mb-1">Omissões</p>
                              <p className="text-2xl font-bold text-yellow-700">{resultado.omissao}</p>
                            </div>
                          )}
                          {resultado.percentil && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-600 mb-1">Percentil</p>
                              <p className="text-2xl font-bold text-blue-700">{resultado.percentil}</p>
                            </div>
                          )}
                        </>
                      )}

                      {teste.tipo === 'bpa2' && resultado.tipo_atencao && (
                        <div className="md:col-span-3">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              {resultado.tipo_atencao === 'sustentada' && '🎯 Atenção Sustentada'}
                              {resultado.tipo_atencao === 'alternada' && '🔄 Atenção Alternada'}
                              {resultado.tipo_atencao === 'dividida' && '✨ Atenção Dividida'}
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <p className="text-xs text-gray-600">Acertos</p>
                                <p className="text-xl font-bold text-green-700">{resultado.acertos}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Erros</p>
                                <p className="text-xl font-bold text-red-700">{resultado.erros}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Omissões</p>
                                <p className="text-xl font-bold text-yellow-700">{resultado.omissoes}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Informações Adicionais */}
        <div className="mt-6 bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          <p><strong>Avaliador:</strong> {avaliacao.usuario_nome}</p>
          <p className="mt-1"><strong>Data de Criação:</strong> {formatDate(avaliacao.created_at)}</p>
        </div>
      </div>
    </div>
  );
};

export default AvaliacaoDetalhesPage;

