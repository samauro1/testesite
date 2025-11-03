'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Package, AlertTriangle, Plus, Minus, Edit, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface EstoqueItem {
  id: number;
  nome_teste: string;
  quantidade_atual: number;
  quantidade_minima: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export default function EstoquePage() {
  const [selectedItem, setSelectedItem] = useState<EstoqueItem | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [movementData, setMovementData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    quantidade: 0,
    observacoes: ''
  });
  const [editData, setEditData] = useState({
    nome_teste: '',
    quantidade_atual: 0,
    quantidade_minima: 0
  });

  const queryClient = useQueryClient();

  // Buscar estoque
  const { data: estoqueData, isLoading } = useQuery({
    queryKey: ['estoque'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/estoque`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  const estoque: EstoqueItem[] = estoqueData?.data?.estoque || [];
  const lowStockItems = estoque.filter(item => item.quantidade_atual <= item.quantidade_minima);

  // Mutation para atualizar estoque
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/estoque/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque'] });
      toast.success('Estoque atualizado com sucesso!');
      setShowEditModal(false);
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar estoque');
    }
  });

  // Mutation para adicionar movimentação
  const movementMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/estoque/movements`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque'] });
      toast.success('Movimentação registrada com sucesso!');
      setShowMovementModal(false);
      setSelectedItem(null);
      setMovementData({ tipo: 'entrada', quantidade: 0, observacoes: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao registrar movimentação');
    }
  });

  const handleEdit = (item: EstoqueItem) => {
    setSelectedItem(item);
    setEditData({
      nome_teste: item.nome_teste,
      quantidade_atual: item.quantidade_atual,
      quantidade_minima: item.quantidade_minima
    });
    setShowEditModal(true);
  };

  const handleMovement = (item: EstoqueItem) => {
    setSelectedItem(item);
    setShowMovementModal(true);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: editData });
    }
  };

  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem && movementData.quantidade > 0) {
      movementMutation.mutate({
        teste_id: selectedItem.id,
        tipo_movimentacao: movementData.tipo,
        quantidade: movementData.quantidade,
        observacoes: movementData.observacoes
      });
    }
  };

  const getStockStatus = (item: EstoqueItem) => {
    if (item.quantidade_atual <= item.quantidade_minima) {
      return { label: 'Estoque Baixo', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    }
    if (item.quantidade_atual <= item.quantidade_minima * 1.5) {
      return { label: 'Estoque Moderado', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    }
    return { label: 'Estoque Bom', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Gerenciamento de Estoque
          </h1>
          <p className="text-gray-600 mt-2">Controle de materiais de testes psicológicos</p>
        </div>

        {/* Alertas de Estoque Baixo */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-red-800 font-semibold">Atenção: {lowStockItems.length} item(ns) com estoque baixo!</h3>
                <p className="text-red-700 text-sm">
                  {lowStockItems.map(item => item.nome_teste).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Carregando estoque...</p>
          </div>
        )}

        {/* Lista de Estoque */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {estoque.map((item) => {
              const status = getStockStatus(item);
              const percentual = (item.quantidade_atual / item.quantidade_minima) * 100;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm border-2 ${status.border} p-6 hover:shadow-md transition-all`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${status.bg}`}>
                        <Package className={`w-6 h-6 ${status.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.nome_teste}</h3>
                        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Quantidade Atual:</span>
                      <span className="text-xl font-bold text-gray-900">{item.quantidade_atual}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Mínimo:</span>
                      <span className="text-sm font-medium text-gray-700">{item.quantidade_minima}</span>
                    </div>
                    
                    {/* Barra de Progresso */}
                    <div className="pt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            percentual <= 100 ? 'bg-red-500' : percentual <= 150 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentual, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{percentual.toFixed(0)}% do mínimo</p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setMovementData({ tipo: 'entrada', quantidade: 0, observacoes: '' });
                        setShowMovementModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm"
                      title="Entrada"
                    >
                      <Plus className="w-4 h-4" />
                      Entrada
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setMovementData({ tipo: 'saida', quantidade: 0, observacoes: '' });
                        setShowMovementModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm"
                      title="Saída"
                    >
                      <Minus className="w-4 h-4" />
                      Saída
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Movimentação */}
        {showMovementModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                {movementData.tipo === 'entrada' ? (
                  <>
                    <TrendingUp className="w-6 h-6 text-green-600" />
                    Entrada de Estoque
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-6 h-6 text-red-600" />
                    Saída de Estoque
                  </>
                )}
              </h3>
              
              <p className="text-gray-600 mb-4">
                <strong>{selectedItem.nome_teste}</strong>
                <br />
                <span className="text-sm">Quantidade atual: {selectedItem.quantidade_atual}</span>
              </p>

              <form onSubmit={handleSubmitMovement} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    value={movementData.quantidade || ''}
                    onChange={(e) => setMovementData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                    min={1}
                    max={movementData.tipo === 'saida' ? selectedItem.quantidade_atual : 1000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <textarea
                    value={movementData.observacoes}
                    onChange={(e) => setMovementData(prev => ({ ...prev, observacoes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Motivo da movimentação (opcional)..."
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMovementModal(false);
                      setSelectedItem(null);
                      setMovementData({ tipo: 'entrada', quantidade: 0, observacoes: '' });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={movementMutation.isPending || movementData.quantidade <= 0}
                    className={`px-4 py-2 rounded-lg text-white transition-all disabled:opacity-50 ${
                      movementData.tipo === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {movementMutation.isPending ? 'Processando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Edição */}
        {showEditModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Edit className="w-6 h-6 text-blue-600" />
                Editar Item de Estoque
              </h3>

              <form onSubmit={handleSubmitEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Teste
                  </label>
                  <input
                    type="text"
                    value={editData.nome_teste}
                    onChange={(e) => setEditData(prev => ({ ...prev, nome_teste: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade Atual
                  </label>
                  <input
                    type="number"
                    value={editData.quantidade_atual || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, quantidade_atual: parseInt(e.target.value) || 0 }))}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade Mínima
                  </label>
                  <input
                    type="number"
                    value={editData.quantidade_minima || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, quantidade_minima: parseInt(e.target.value) || 0 }))}
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedItem(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
