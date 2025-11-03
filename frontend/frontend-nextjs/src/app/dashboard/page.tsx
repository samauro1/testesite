'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Users, 
  ClipboardList, 
  TestTube, 
  Package,
  AlertTriangle,
  RefreshCw,
  Calendar,
  CheckCircle,
  UserX,
  TrendingDown
} from 'lucide-react';
import { pacientesService, avaliacoesService, estoqueService, agendamentosService } from '@/services/api';
// import LoadingSpinner from '@/components/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import Layout from '@/components/Layout';
import { staggerContainer, staggerItem, slideUp, modalBackdrop, modalContent } from '@/lib/animations';
import { ModalAnimated } from '@/components/animated/ModalAnimated';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const [mostrarModalPendentes, setMostrarModalPendentes] = React.useState(false);

  const handleRefresh = () => {
    // Invalidação mais eficiente - apenas queries críticas
    queryClient.invalidateQueries({ 
      queryKey: ['total-avaliados-todos-tempos'],
      exact: true 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['avaliacoes-mes-atual'],
      exact: true 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['pendentes-resultado'],
      exact: true 
    });
  };

  // Total Avaliados - TODOS OS TEMPOS (pessoas que fizeram pelo menos um teste)
  const { data: totalAvaliados, isLoading: totalAvaliadosLoading } = useQuery({
    queryKey: ['total-avaliados-todos-tempos'],
    queryFn: async () => {
      // Buscar todas as avaliações de todos os tempos
      const response = await avaliacoesService.list({ limit: 10000 });
      const avaliacoes = (response as any)?.data?.data?.avaliacoes || [];
      
      // Criar um Set com IDs únicos de pacientes que têm avaliações
      const pacientesUnicos = new Set(
        avaliacoes
          .map((av: any) => av.paciente_id)
          .filter((id: any) => id != null)
      );
      
      return pacientesUnicos.size;
    },
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  // Avaliações Realizadas - DO MÊS ATUAL
  const { data: avaliacoesMes, isLoading: avaliacoesMesLoading } = useQuery({
    queryKey: ['avaliacoes-mes-atual'],
    queryFn: async () => {
      const response = await avaliacoesService.list({ limit: 10000 });
      const todasAvaliacoes = (response as any)?.data?.data?.avaliacoes || [];
      
      // Filtrar avaliações do mês atual
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      
      const avaliacoesMes = todasAvaliacoes.filter((av: any) => {
        const dataAv = new Date(av.created_at || av.data_aplicacao);
        return dataAv >= inicioMes && dataAv <= fimMes;
      });
      
      return avaliacoesMes.length;
    },
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  // Avaliados na Semana
  const { data: avaliadosSemana, isLoading: avaliadosSemanaLoading } = useQuery({
    queryKey: ['avaliados-semana'],
    queryFn: async () => {
      const response = await avaliacoesService.list({ limit: 10000 });
      const todasAvaliacoes = (response as any)?.data?.data?.avaliacoes || [];
      
      // Filtrar avaliações da semana atual
      const hoje = new Date();
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay()); // Domingo
      inicioSemana.setHours(0, 0, 0, 0);
      
      const avaliacoesSemana = todasAvaliacoes.filter((av: any) => {
        const dataAv = new Date(av.created_at || av.data_aplicacao);
        return dataAv >= inicioSemana;
      });
      
      // Contar pacientes únicos da semana
      const pacientesUnicosSemana = new Set(
        avaliacoesSemana
          .map((av: any) => av.paciente_id)
          .filter((id: any) => id != null)
      );
      
      return pacientesUnicosSemana.size;
    },
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  // Pendentes de Resultado
  const { data: pendentesResultado, isLoading: pendentesLoading } = useQuery({
    queryKey: ['pendentes-resultado'],
    queryFn: async () => {
      const response = await avaliacoesService.list({ limit: 10000 });
      const todasAvaliacoes = (response as any)?.data?.data?.avaliacoes || [];
      
      // Avaliações sem aptidão definida = pendentes de resultado
      const pendentes = todasAvaliacoes.filter((av: any) => 
        !av.aptidao || av.aptidao === null || av.aptidao === ''
      );
      
      return {
        total: pendentes.length,
        lista: pendentes
      };
    },
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  const { data: estoqueBaixo, isLoading: estoqueLoading } = useQuery({
    queryKey: ['estoque-low'],
    queryFn: () => estoqueService.list(),
    select: (response) => {
      const itens = response?.data?.data?.data || [];
      return itens.filter((item) => item.quantidade <= item.estoqueMinimo).length;
    },
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  // Query para estatísticas de agendamentos do mês atual
  const { data: agendamentosStats, isLoading: agendamentosLoading } = useQuery({
    queryKey: ['agendamentos-stats'],
    queryFn: async () => {
      const response = await agendamentosService.list({ limit: 10000 });
      const agendamentos = (response as any)?.data?.data?.agendamentos || [];
      
      // Filtrar agendamentos do mês atual
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      
      const agendamentosMes = agendamentos.filter((ag: any) => {
        const dataAg = new Date(ag.data_agendamento);
        return dataAg >= inicioMes && dataAg <= fimMes;
      });
      
      // Total Agendados do Mês
      const totalAgendados = agendamentosMes.length;
      
      // Avaliados do Mês = agendamentos que foram convertidos (têm paciente_id E status Compareceu)
      const avaliadosMes = agendamentosMes.filter((ag: any) => 
        ag.paciente_id && ag.status === 'Compareceu'
      ).length;
      
      // Ausentes do Mês = agendados que NÃO foram convertidos em avaliados
      // (não têm paciente_id OU status Faltou OU status Agendado com data passada)
      const ausentesMes = agendamentosMes.filter((ag: any) => {
        // Se não foi convertido em paciente, é ausente
        if (!ag.paciente_id) {
          // Se a data já passou e ainda está agendado, é ausente
          const dataAg = new Date(ag.data_agendamento);
          if (ag.status === 'Agendado' && dataAg < hoje) return true;
          // Se faltou, é ausente
          if (ag.status === 'Faltou') return true;
        }
        return false;
      }).length;
      
      const percentualFalta = totalAgendados > 0 ? ((ausentesMes / totalAgendados) * 100).toFixed(1) : 0;
      
      return {
        totalAgendados,
        avaliadosMes,
        ausentesMes,
        percentualFalta
      };
    },
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  // Query para estatísticas de aptidão do MÊS
  const { data: aptidaoStats, isLoading: aptidaoLoading } = useQuery({
    queryKey: ['aptidao-stats'],
    queryFn: async () => {
      // Buscar TODAS as avaliações (limit alto) para calcular estatísticas corretas
      const response = await avaliacoesService.list({ limit: 10000 });
      const todasAvaliacoes = (response as any)?.data?.data?.avaliacoes || [];
      
      // Filtrar avaliações do mês atual
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      
      const avaliacoesMes = todasAvaliacoes.filter((av: any) => {
        const dataAv = new Date(av.created_at || av.data_aplicacao);
        return dataAv >= inicioMes && dataAv <= fimMes;
      });
      
      // Filtrar apenas avaliações que têm aptidão definida
      const avaliacoesComAptidao = avaliacoesMes.filter((av: any) => 
        av.aptidao && av.aptidao !== null && av.aptidao !== ''
      );
      
      const aptos = avaliacoesComAptidao.filter((av: any) => av.aptidao === 'Apto').length;
      const inaptosTemporarios = avaliacoesComAptidao.filter((av: any) => av.aptidao === 'Inapto Temporário').length;
      const inaptos = avaliacoesComAptidao.filter((av: any) => av.aptidao === 'Inapto').length;
      const total = avaliacoesComAptidao.length;
      const totalInaptos = inaptosTemporarios + inaptos;
      const percentualInaptidao = total > 0 ? ((totalInaptos / total) * 100).toFixed(1) : 0;
      
      return {
        aptos,
        inaptos: totalInaptos,
        inaptosTemporarios,
        inaptosDefinitivos: inaptos,
        total,
        percentualInaptidao
      };
    },
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  const statsRow1 = [
    {
      name: 'Total de Pacientes',
      subtitle: '(Todos os tempos)',
      value: totalAvaliadosLoading ? '...' : totalAvaliados,
      icon: Users,
      color: 'bg-blue-500',
      href: '/pacientes'
    },
    {
      name: 'Avaliações Realizadas',
      subtitle: '(Mês atual)',
      value: avaliacoesMesLoading ? '...' : avaliacoesMes,
      icon: ClipboardList,
      color: 'bg-green-500',
      href: '/avaliacoes'
    },
    {
      name: 'Pacientes na Semana',
      subtitle: '(Semana atual)',
      value: avaliadosSemanaLoading ? '...' : avaliadosSemana,
      icon: Calendar,
      color: 'bg-purple-500',
      href: '/pacientes'
    },
    {
      name: 'Pendentes de Resultado',
      subtitle: '(Clique para ver lista)',
      value: pendentesLoading ? '...' : pendentesResultado?.total,
      icon: AlertTriangle,
      color: 'bg-orange-500',
      onClick: () => setMostrarModalPendentes(true),
      clickable: true
    }
  ];

  const statsRow2 = [
    {
      name: 'Testes Disponíveis',
      value: '9',
      icon: TestTube,
      color: 'bg-indigo-500',
      href: '/testes'
    },
    {
      name: 'Itens com Estoque Baixo',
      value: estoqueLoading ? '...' : estoqueBaixo,
      icon: Package,
      color: (estoqueBaixo || 0) > 0 ? 'bg-red-500' : 'bg-gray-500',
      href: '/estoque'
    }
  ];

  const quickActions = [
    { name: 'Adicionar Pessoa', href: '/pacientes', icon: Users, color: 'bg-blue-500' },
    { name: 'Nova Avaliação', href: '/avaliacoes', icon: ClipboardList, color: 'bg-green-500' },
    { name: 'Realizar Teste', href: '/testes', icon: TestTube, color: 'bg-purple-500' },
    { name: 'Ver Relatórios', href: '/relatorios', icon: ClipboardList, color: 'bg-indigo-500' }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          className="flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
            <p className={`${isDark ? 'text-dark-300' : 'text-gray-600'}`}>Visão geral do sistema de avaliação psicológica</p>
          </div>
          <motion.button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </motion.button>
        </motion.div>

        {/* Stats Grid */}
        {/* Primeira Linha de Stats */}
        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {statsRow1.map((stat: any, index: number) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.name}
                variants={staggerItem}
                onClick={() => {
                  if (stat.clickable && stat.onClick) {
                    stat.onClick();
                  } else if (stat.href) {
                    router.push(stat.href);
                  }
                }}
                className={`relative overflow-hidden rounded-lg ${isDark ? 'bg-dark-800' : 'bg-white'} px-4 py-5 shadow hover:shadow-md transition-shadow cursor-pointer`}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-md ${stat.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      {stat.subtitle && (
                        <dt className="text-xs text-gray-400 truncate mt-0.5">
                          {stat.subtitle}
                        </dt>
                      )}
                      <dd className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Estatísticas de Aptidão do Mês */}
        {!aptidaoLoading && aptidaoStats && aptidaoStats.total > 0 && (
          <div className={`${isDark ? 'bg-dark-800' : 'bg-white'} shadow rounded-lg`}>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ✅ Resultados de Aptidão do Mês ({new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
                </h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Aptos */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-dark-700 border-dark-600' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center">
                    <CheckCircle className={`h-8 w-8 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>Aptos</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {aptidaoStats.aptos}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inaptos Temporários */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-dark-700 border-dark-600' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center">
                    <AlertTriangle className={`h-8 w-8 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>Inaptos Temporários</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {aptidaoStats.inaptosTemporarios}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inaptos Definitivos */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-dark-700 border-dark-600' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center">
                    <UserX className={`h-8 w-8 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>Inaptos</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {aptidaoStats.inaptosDefinitivos}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Percentual de Inaptidão */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-dark-700 border-dark-600' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-center">
                    <TrendingDown className={`h-8 w-8 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>% de Inaptidão</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {aptidaoStats.percentualInaptidao}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Segunda Linha de Stats */}
        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {statsRow2.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.name}
                variants={staggerItem}
                onClick={() => router.push(stat.href)}
                className={`relative overflow-hidden rounded-lg ${isDark ? 'bg-dark-800' : 'bg-white'} px-4 py-5 shadow hover:shadow-md transition-shadow cursor-pointer`}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-md ${stat.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
                {stat.name === 'Itens com Estoque Baixo' && (estoqueBaixo || 0) > 0 && (
                  <div className="absolute top-2 right-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Estatísticas de Agendamentos do Mês */}
        {!agendamentosLoading && agendamentosStats && agendamentosStats.totalAgendados > 0 && (
          <div className={`${isDark ? 'bg-dark-800' : 'bg-white'} shadow rounded-lg`}>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  📅 Agendamentos do Mês ({new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
                </h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Agendados */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-dark-700 border-dark-600' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center">
                    <Calendar className={`h-8 w-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>Total Agendados</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {agendamentosStats.totalAgendados}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Avaliados do Mês */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-dark-700 border-dark-600' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center">
                    <CheckCircle className={`h-8 w-8 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>Pacientes do Mês</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {agendamentosStats.avaliadosMes}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ausentes do Mês */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-dark-700 border-dark-600' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center">
                    <UserX className={`h-8 w-8 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>Ausentes do Mês</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {agendamentosStats.ausentesMes}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Percentual de Falta */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-dark-700 border-dark-600' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center">
                    <TrendingDown className={`h-8 w-8 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>Taxa de Falta</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {agendamentosStats.percentualFalta}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-gray-600'}`}>
                    Taxa de Comparecimento
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {agendamentosStats.totalAgendados > 0 
                      ? ((agendamentosStats.avaliadosMes / agendamentosStats.totalAgendados) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className={`w-full ${isDark ? 'bg-dark-600' : 'bg-gray-200'} rounded-full h-2.5`}>
                  <div 
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${agendamentosStats.totalAgendados > 0 
                        ? (agendamentosStats.avaliadosMes / agendamentosStats.totalAgendados) * 100
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <motion.div
          className={`${isDark ? 'bg-dark-800' : 'bg-white'} shadow rounded-lg`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="px-4 py-5 sm:p-6">
            <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Ações Rápidas</h3>
            <motion.div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.name}
                    variants={staggerItem}
                    onClick={() => router.push(action.href)}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <div className={`p-2 rounded-md ${action.color} mr-3`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {action.name}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        </motion.div>

        {/* Alerts */}
        {(estoqueBaixo || 0) > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Atenção: Estoque Baixo
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    {estoqueBaixo} {(estoqueBaixo || 0) === 1 ? 'item está' : 'itens estão'} com estoque baixo. 
                    <button
                      onClick={() => router.push('/estoque')}
                      className="ml-1 font-medium underline hover:text-red-600"
                    >
                      Ver detalhes
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Pendentes de Resultado */}
        <ModalAnimated
          isOpen={mostrarModalPendentes}
          onClose={() => setMostrarModalPendentes(false)}
          title={`Pendentes de Resultado (${pendentesResultado?.total || 0})`}
          size="lg"
        >
          <div className="overflow-y-auto max-h-[60vh]">
            {pendentesResultado && pendentesResultado.lista.length > 0 ? (
              <motion.div
                className="space-y-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {pendentesResultado.lista.map((avaliacao: any, index: number) => (
                  <motion.div
                    key={avaliacao.id}
                    variants={staggerItem}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setMostrarModalPendentes(false);
                      router.push(`/pacientes?id=${avaliacao.paciente_id}`);
                    }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              ID Avaliação: {avaliacao.id}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Paciente ID: {avaliacao.paciente_id}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Data: {new Date(avaliacao.created_at || avaliacao.data_avaliacao).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="ml-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Pendente
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    className="text-center py-8"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Nenhuma avaliação pendente de resultado!
                    </p>
                  </motion.div>
                )}
          </div>
        </ModalAnimated>
      </div>
    </Layout>
  );
}
