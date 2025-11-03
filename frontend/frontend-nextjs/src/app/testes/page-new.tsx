'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Brain, 
  Eye, 
  Target, 
  MemoryStick, 
  Calculator,
  Navigation,
  FileText
} from 'lucide-react';
import { tabelasService, pacientesService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import Layout from '@/components/Layout';
import { Patient, TestResult } from '@/types';

interface Test {
  id: string;
  nome: string;
  descricao: string;
  icon: React.ComponentType<{ className?: string }>;
  campos: Array<{
    nome: string;
    label: string;
    tipo: string;
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
  }>;
}

export default function TestesPage() {
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [testData, setTestData] = useState<Record<string, string | number>>({});
  const [results, setResults] = useState<TestResult | null>(null);
  const [analysisType, setAnalysisType] = useState('anonymous');
  const [patientData, setPatientData] = useState({
    cpf: '',
    nome: '',
    numero_laudo: ''
  });
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  const [searchingPatient, setSearchingPatient] = useState(false);

  // Estados específicos do MIG
  const QUESTIONS_COUNT = 28;
  const [migAnswers, setMigAnswers] = useState<string[]>(Array(QUESTIONS_COUNT).fill(''));
  const [migAnswerKey, setMigAnswerKey] = useState<string[]>(Array(QUESTIONS_COUNT).fill(''));
  const [autoCalcFromGabarito, setAutoCalcFromGabarito] = useState(true);

  // Estados específicos do MEMORE
  const MEMORE_TOTAL = 30; // inclui treino A..F (6) + 24 itens
  const [memoreMarks, setMemoreMarks] = useState<boolean[]>(Array(MEMORE_TOTAL).fill(false));
  
  // Chave fixa do MEMORE (não editável pelo usuário)
  const memoreKeyVP = useMemo(() => {
    const key = Array(MEMORE_TOTAL).fill(false);
    // Treino A-F: B, C, E são VP (índices 1, 2, 4)
    key[1] = true; // B
    key[2] = true; // C  
    key[4] = true; // E
    // Teste 1-24: VP são 2,3,4,6,8,10,12,14,15,18,20,22 (índices 6+1, 6+2, etc.)
    const vpItems = [2,3,4,6,8,10,12,14,15,18,20,22];
    vpItems.forEach(item => {
      key[5 + item] = true; // +5 porque A-F ocupam índices 0-5
    });
    return key;
  }, []);

  // Estado para tabela normativa selecionada
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Contadores ao vivo do MEMORE
  const memoreLive = useMemo(() => {
    if (selectedTest?.id !== 'memore') return null;
    const vp = memoreMarks.reduce((s, m, i) => s + (i >= 6 && memoreKeyVP[i] && m ? 1 : 0), 0);
    const vn = memoreMarks.reduce((s, m, i) => s + (i >= 6 && !memoreKeyVP[i] && !m ? 1 : 0), 0);
    const fn = memoreMarks.reduce((s, m, i) => s + (i >= 6 && memoreKeyVP[i] && !m ? 1 : 0), 0);
    const fp = memoreMarks.reduce((s, m, i) => s + (i >= 6 && !memoreKeyVP[i] && m ? 1 : 0), 0);
    const eb = (vp + vn) - (fn + fp);
    return { vp, vn, fn, fp, eb };
  }, [memoreMarks, memoreKeyVP, selectedTest?.id]);

  // Auto-sincronizar contadores do crivo com os campos manuais
  useEffect(() => {
    if (selectedTest?.id !== 'memore') return;
    if (!memoreLive) return;
    
    setTestData(prev => {
      const newData = {
        vp: memoreLive.vp,
        vn: memoreLive.vn,
        fn: memoreLive.fn,
        fp: memoreLive.fp,
        eb: memoreLive.eb
      };
      
      if (prev.vp === newData.vp && prev.vn === newData.vn && 
          prev.fn === newData.fn && prev.fp === newData.fp && 
          prev.eb === newData.eb) {
        return prev;
      }
      
      return { ...prev, ...newData };
    });
  }, [memoreLive, selectedTest?.id]);

  // Cálculo automático quando campos manuais mudam
  useEffect(() => {
    if (selectedTest?.id !== 'memore') return;
    
    const vp = Number(testData.vp) || 0;
    const vn = Number(testData.vn) || 0;
    const fn = Number(testData.fn) || 0;
    const fp = Number(testData.fp) || 0;
    
    const eb = (vp + vn) - (fn + fp);
    setTestData(prev => ({ ...prev, eb }));
  }, [testData.vp, testData.vn, testData.fn, testData.fp, selectedTest?.id]);

  // Contador de acertos do MIG
  const migCorrectCount = useMemo(() => {
    return migAnswers.reduce((count, answer, idx) => {
      const key = migAnswerKey[idx];
      return count + (answer && key && answer === key ? 1 : 0);
    }, 0);
  }, [migAnswers, migAnswerKey]);

  const getChoiceClass = (idx: number, option: string) => {
    const user = migAnswers[idx];
    const key = migAnswerKey[idx];
    const isSelected = user === option;
    if (!isSelected) return 'bg-white text-gray-600 border-gray-300 hover:border-gray-400';
    if (!key) return 'bg-gray-200 text-gray-800 border-gray-400';
    return user === key
      ? 'bg-green-600 text-white border-green-700'
      : 'bg-orange-500 text-white border-orange-600';
  };

  const getButtonClass = (idx: number, option: string) => getChoiceClass(idx, option);

  const chooseOption = (idx: number, option: string) => {
    const next = [...migAnswers];
    next[idx] = next[idx] === option ? '' : option;
    setMigAnswers(next);
  };

  const toggleMemoreMark = (idx: number) => {
    setMemoreMarks(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const clearMemoreMarks = () => {
    setMemoreMarks(Array(MEMORE_TOTAL).fill(false));
  };

  const handleTestSelect = (teste: Test) => {
    setSelectedTest(teste);
    setTestData({});
    setResults(null);
    setSelectedTable(null);
    setAnalysisType('anonymous');
    setPatientData({ cpf: '', nome: '', numero_laudo: '' });
    setFoundPatient(null);
    setSearchingPatient(false);
    setMigAnswers(Array(QUESTIONS_COUNT).fill(''));
    setMigAnswerKey(Array(QUESTIONS_COUNT).fill(''));
    setAutoCalcFromGabarito(true);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setTestData({
      ...testData,
      [field]: value
    });
  };

  const handlePatientDataChange = async (field: string, value: string) => {
    const newPatientData = {
      ...patientData,
      [field]: value
    };
    setPatientData(newPatientData);
    
    if (value.trim() && (newPatientData.cpf || newPatientData.nome || newPatientData.numero_laudo)) {
      await searchPatient(newPatientData);
    } else {
      setFoundPatient(null);
    }
  };

  const searchPatient = async (data: any) => {
    setSearchingPatient(true);
    try {
      if (data.cpf && data.cpf.length >= 11) {
        const formattedCPF = formatCPF(data.cpf);
        const response = await pacientesService.list({ search: formattedCPF, limit: 1 });
        const pacientes = (response as any).data.data.pacientes || [];
        if (pacientes.length > 0) {
          setFoundPatient(pacientes[0]);
          setPatientData({
            cpf: pacientes[0].cpf,
            nome: pacientes[0].nome,
            numero_laudo: `LAU-${new Date().getFullYear()}-${String(pacientes[0].id).padStart(3, '0')}`
          });
          setTestData(prev => ({
            ...prev,
            escolaridade: pacientes[0].escolaridade
          }));
          return;
        }
      }
      
      if (data.nome && data.nome.length >= 3) {
        const response = await pacientesService.list({ search: data.nome, limit: 1 });
        const pacientes = (response as any).data.data.pacientes || [];
        if (pacientes.length > 0) {
          setFoundPatient(pacientes[0]);
          setPatientData({
            cpf: pacientes[0].cpf,
            nome: pacientes[0].nome,
            numero_laudo: `LAU-${new Date().getFullYear()}-${String(pacientes[0].id).padStart(3, '0')}`
          });
          setTestData(prev => ({
            ...prev,
            escolaridade: pacientes[0].escolaridade
          }));
          return;
        }
      }
      
      setFoundPatient(null);
    } catch (error) {
      console.error('Erro ao buscar paciente:', error);
      setFoundPatient(null);
    } finally {
      setSearchingPatient(false);
    }
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCalculate = async () => {
    if (!selectedTest) return;
    
    try {
      const dataToSend = {
        ...testData,
        ...patientData,
        analysisType,
        selectedTable
      };
      
      const response = await tabelasService.calculate(selectedTest.id, dataToSend);
      // A API retorna { resultado: {...} }, então pegamos apenas o resultado
      const resultado = response.data.resultado || response.data || {};
      setResults(resultado as TestResult);
    } catch (error) {
      console.error('Erro ao calcular resultado:', error);
    }
  };

  const tests: Test[] = [
    {
      id: 'ac',
      nome: 'AC - Atenção Concentrada',
      descricao: 'Avaliação da capacidade de atenção concentrada',
      icon: Target,
      campos: [
        { nome: 'acertos', label: 'Acertos', tipo: 'number', min: 0, max: 50 },
        { nome: 'erros', label: 'Erros', tipo: 'number', min: 0, max: 50 },
        { nome: 'omissoes', label: 'Omissões', tipo: 'number', min: 0, max: 50 },
        { nome: 'escolaridade', label: 'Escolaridade', tipo: 'select', options: ['Ensino Fundamental', 'Ensino Médio', 'Ensino Superior'] }
      ]
    },
    {
      id: 'beta-iii',
      nome: 'BETA-III - Raciocínio Matricial',
      descricao: 'Avaliação do raciocínio lógico e matricial',
      icon: Brain,
      campos: [
        { nome: 'acertos', label: 'Acertos', tipo: 'number', min: 0, max: 25 }
      ]
    },
    {
      id: 'bpa2',
      nome: 'BPA-2 - Atenção',
      descricao: 'Avaliação das três modalidades de atenção (sustentada, alternada, dividida)',
      icon: Eye,
      campos: [
        { nome: 'acertos_sustentada', label: 'Acertos - Atenção Sustentada', tipo: 'number', min: 0, max: 100 },
        { nome: 'erros_sustentada', label: 'Erros - Atenção Sustentada', tipo: 'number', min: 0, max: 100 },
        { nome: 'omissoes_sustentada', label: 'Omissões - Atenção Sustentada', tipo: 'number', min: 0, max: 100 },
        { nome: 'acertos_alternada', label: 'Acertos - Atenção Alternada', tipo: 'number', min: 0, max: 100 },
        { nome: 'erros_alternada', label: 'Erros - Atenção Alternada', tipo: 'number', min: 0, max: 100 },
        { nome: 'omissoes_alternada', label: 'Omissões - Atenção Alternada', tipo: 'number', min: 0, max: 100 },
        { nome: 'acertos_dividida', label: 'Acertos - Atenção Dividida', tipo: 'number', min: 0, max: 100 },
        { nome: 'erros_dividida', label: 'Erros - Atenção Dividida', tipo: 'number', min: 0, max: 100 },
        { nome: 'omissoes_dividida', label: 'Omissões - Atenção Dividida', tipo: 'number', min: 0, max: 100 }
      ]
    },
    {
      id: 'rotas',
      nome: 'Rotas de Atenção',
      descricao: 'Avaliação das rotas de atenção',
      icon: Navigation,
      campos: [
        { nome: 'acertos_rota_a', label: 'Acertos - Rota A', tipo: 'number', min: 0, max: 50 },
        { nome: 'erros_rota_a', label: 'Erros - Rota A', tipo: 'number', min: 0, max: 50 },
        { nome: 'omissoes_rota_a', label: 'Omissões - Rota A', tipo: 'number', min: 0, max: 50 },
        { nome: 'acertos_rota_d', label: 'Acertos - Rota D', tipo: 'number', min: 0, max: 50 },
        { nome: 'erros_rota_d', label: 'Erros - Rota D', tipo: 'number', min: 0, max: 50 },
        { nome: 'omissoes_rota_d', label: 'Omissões - Rota D', tipo: 'number', min: 0, max: 50 },
        { nome: 'acertos_rota_c', label: 'Acertos - Rota C', tipo: 'number', min: 0, max: 50 },
        { nome: 'erros_rota_c', label: 'Erros - Rota C', tipo: 'number', min: 0, max: 50 },
        { nome: 'omissoes_rota_c', label: 'Omissões - Rota C', tipo: 'number', min: 0, max: 50 }
      ]
    },
    {
      id: 'memore',
      nome: 'Memore - Memória',
      descricao: 'Avaliação da capacidade de memória',
      icon: MemoryStick,
      campos: [
        { nome: 'vp', label: 'Verdadeiros Positivos', tipo: 'number', min: 0, max: 50 },
        { nome: 'vn', label: 'Verdadeiros Negativos', tipo: 'number', min: 0, max: 50 },
        { nome: 'fn', label: 'Falsos Negativos', tipo: 'number', min: 0, max: 50 },
        { nome: 'fp', label: 'Falsos Positivos', tipo: 'number', min: 0, max: 50 }
      ]
    },
    {
      id: 'mig',
      nome: 'MIG - Avaliação Psicológica',
      descricao: 'Avaliação psicológica geral',
      icon: Calculator,
      campos: [
        { nome: 'idade', label: 'Idade', tipo: 'number', min: 15, max: 64 },
        { nome: 'escolaridade', label: 'Escolaridade', tipo: 'select', options: ['Ensino Fundamental', 'Ensino Médio', 'Ensino Superior'] },
        { nome: 'acertos', label: 'Acertos', tipo: 'number', min: 0, max: 28 }
      ]
    },
    {
      id: 'mvt',
      nome: 'MVT - Memória Visual para o Trânsito',
      descricao: 'Avaliação da memória visual relacionada ao trânsito',
      icon: Eye,
      campos: [
        { nome: 'acertos', label: 'Acertos', tipo: 'number', min: 0, max: 50 },
        { nome: 'erros', label: 'Erros', tipo: 'number', min: 0, max: 50 },
        { nome: 'omissao', label: 'Omissão', tipo: 'number', min: 0, max: 50 }
      ]
    },
    {
      id: 'r1',
      nome: 'R-1 - Raciocínio',
      descricao: 'Avaliação do raciocínio geral',
      icon: Brain,
      campos: [
        { nome: 'acertos', label: 'Acertos', tipo: 'number', min: 0, max: 50 }
      ]
    },
    {
      id: 'palografico',
      nome: 'Palográfico',
      descricao: 'Avaliação da personalidade através da escrita',
      icon: FileText,
      campos: [
        { nome: 'produtividade', label: 'Produtividade', tipo: 'number', min: 0, max: 1000 },
        { nome: 'nor', label: 'NOR', tipo: 'number', min: 0, max: 100, step: 0.01 },
        { nome: 'distancia_media', label: 'Distância Média', tipo: 'number', min: 0, max: 100, step: 0.01 },
        { nome: 'media_tamanho_palos', label: 'Média Tamanho Palos', tipo: 'number', min: 0, max: 100, step: 0.01 },
        { nome: 'impulsividade', label: 'Impulsividade', tipo: 'number', min: 0, max: 100, step: 0.01 },
        { nome: 'media_distancia_linhas', label: 'Média Distância Linhas', tipo: 'number', min: 0, max: 100, step: 0.01 },
        { nome: 'media_margem_esquerda', label: 'Média Margem Esquerda', tipo: 'number', min: 0, max: 100, step: 0.01 },
        { nome: 'media_margem_direita', label: 'Média Margem Direita', tipo: 'number', min: 0, max: 100, step: 0.01 },
        { nome: 'media_margem_superior', label: 'Média Margem Superior', tipo: 'number', min: 0, max: 100, step: 0.01 },
        { nome: 'porcentagem_ganchos', label: 'Porcentagem Ganchos', tipo: 'number', min: 0, max: 100, step: 0.01 },
        { nome: 'media_inclinacao', label: 'Média Inclinação', tipo: 'number', min: 0, max: 100, step: 0.01 },
        { nome: 'media_direcao_linhas', label: 'Média Direção Linhas', tipo: 'number', min: 0, max: 100, step: 0.01 },
        { nome: 'total_emotividade', label: 'Total Emotividade', tipo: 'number', min: 0, max: 100 }
      ]
    }
  ];

  const { data: tabelasNormativas, isLoading } = useQuery({
    queryKey: ['tabelas-normativas'],
    queryFn: () => tabelasService.list(),
    select: (data: any) => data.data.tabelas?.filter((tabela: any) => 
      tabela.tipo === 'bpa2' || tabela.tipo === 'rotas' || tabela.tipo === 'mig' || tabela.tipo === 'memore'
    ) || []
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testes Psicológicos</h1>
          <p className="text-gray-600">Selecione e execute testes de avaliação psicológica</p>
        </div>

        {/* Test Selection */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tests.map((test) => {
            const Icon = test.icon;
            return (
              <button
                key={test.id}
                onClick={() => handleTestSelect(test)}
                className={`p-6 text-left border rounded-lg transition-colors ${
                  selectedTest?.id === test.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{test.nome}</h3>
                </div>
                <p className="text-sm text-gray-600">{test.descricao}</p>
              </button>
            );
          })}
        </div>

        {/* Test Form */}
        {selectedTest && (
          <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedTest.nome}</h2>
              <p className="text-gray-600">{selectedTest.descricao}</p>
            </div>

            {/* Interface específica para cada teste */}
            {selectedTest.id === 'bpa2' ? (
              // Layout especial para BPA-2 - três modalidades de atenção
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Atenção Sustentada */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="text-lg font-semibold text-blue-800 mb-4 text-center">
                      Atenção Sustentada
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Acertos
                        </label>
                        <input
                          type="number"
                          value={testData.acertos_sustentada || ''}
                          onChange={(e) => handleInputChange('acertos_sustentada', e.target.value)}
                          min={0}
                          max={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Acertos"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Erros
                        </label>
                        <input
                          type="number"
                          value={testData.erros_sustentada || ''}
                          onChange={(e) => handleInputChange('erros_sustentada', e.target.value)}
                          min={0}
                          max={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Erros"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Omissões
                        </label>
                        <input
                          type="number"
                          value={testData.omissoes_sustentada || ''}
                          onChange={(e) => handleInputChange('omissoes_sustentada', e.target.value)}
                          min={0}
                          max={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Omissões"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Atenção Alternada */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="text-lg font-semibold text-green-800 mb-4 text-center">
                      Atenção Alternada
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Acertos
                        </label>
                        <input
                          type="number"
                          value={testData.acertos_alternada || ''}
                          onChange={(e) => handleInputChange('acertos_alternada', e.target.value)}
                          min={0}
                          max={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Acertos"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Erros
                        </label>
                        <input
                          type="number"
                          value={testData.erros_alternada || ''}
                          onChange={(e) => handleInputChange('erros_alternada', e.target.value)}
                          min={0}
                          max={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Erros"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Omissões
                        </label>
                        <input
                          type="number"
                          value={testData.omissoes_alternada || ''}
                          onChange={(e) => handleInputChange('omissoes_alternada', e.target.value)}
                          min={0}
                          max={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Omissões"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Atenção Dividida */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="text-lg font-semibold text-purple-800 mb-4 text-center">
                      Atenção Dividida
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Acertos
                        </label>
                        <input
                          type="number"
                          value={testData.acertos_dividida || ''}
                          onChange={(e) => handleInputChange('acertos_dividida', e.target.value)}
                          min={0}
                          max={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Acertos"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Erros
                        </label>
                        <input
                          type="number"
                          value={testData.erros_dividida || ''}
                          onChange={(e) => handleInputChange('erros_dividida', e.target.value)}
                          min={0}
                          max={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Erros"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Omissões
                        </label>
                        <input
                          type="number"
                          value={testData.omissoes_dividida || ''}
                          onChange={(e) => handleInputChange('omissoes_dividida', e.target.value)}
                          min={0}
                          max={100}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Omissões"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Resumo da Atenção Geral */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                    📊 Atenção Geral (Média das Três Modalidades)
                  </h4>
                  <p className="text-sm text-gray-600 text-center">
                    A atenção geral será calculada automaticamente como a média dos resultados das três modalidades
                  </p>
                </div>
              </div>
            ) : selectedTest.id === 'rotas' ? (
              // Layout especial para Rotas de Atenção
              <div className="space-y-6">
                {/* Rota A - Atenção Alternada */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-bold text-lg">A</span>
                    </div>
                    <h4 className="text-lg font-bold text-blue-800">Rota A - Atenção Alternada</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Acertos
                      </label>
                      <input
                        type="number"
                        value={testData.acertos_rota_a || ''}
                        onChange={(e) => handleInputChange('acertos_rota_a', e.target.value)}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Erros
                      </label>
                      <input
                        type="number"
                        value={testData.erros_rota_a || ''}
                        onChange={(e) => handleInputChange('erros_rota_a', e.target.value)}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Omissões
                      </label>
                      <input
                        type="number"
                        value={testData.omissoes_rota_a || ''}
                        onChange={(e) => handleInputChange('omissoes_rota_a', e.target.value)}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Rota D - Atenção Dividida */}
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-bold text-lg">D</span>
                    </div>
                    <h4 className="text-lg font-bold text-green-800">Rota D - Atenção Dividida</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-1">
                        Acertos
                      </label>
                      <input
                        type="number"
                        value={testData.acertos_rota_d || ''}
                        onChange={(e) => handleInputChange('acertos_rota_d', e.target.value)}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-1">
                        Erros
                      </label>
                      <input
                        type="number"
                        value={testData.erros_rota_d || ''}
                        onChange={(e) => handleInputChange('erros_rota_d', e.target.value)}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-1">
                        Omissões
                      </label>
                      <input
                        type="number"
                        value={testData.omissoes_rota_d || ''}
                        onChange={(e) => handleInputChange('omissoes_rota_d', e.target.value)}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Rota C - Atenção Concentrada */}
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-bold text-lg">C</span>
                    </div>
                    <h4 className="text-lg font-bold text-purple-800">Rota C - Atenção Concentrada</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-1">
                        Acertos
                      </label>
                      <input
                        type="number"
                        value={testData.acertos_rota_c || ''}
                        onChange={(e) => handleInputChange('acertos_rota_c', e.target.value)}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-1">
                        Erros
                      </label>
                      <input
                        type="number"
                        value={testData.erros_rota_c || ''}
                        onChange={(e) => handleInputChange('erros_rota_c', e.target.value)}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-700 mb-1">
                        Omissões
                      </label>
                      <input
                        type="number"
                        value={testData.omissoes_rota_c || ''}
                        onChange={(e) => handleInputChange('omissoes_rota_c', e.target.value)}
                        min="0"
                        max="50"
                        className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Layout padrão para outros testes
              <div className="space-y-4">
                {selectedTest.campos.map((campo) => (
                  <div key={campo.nome}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {campo.label}
                    </label>
                    <input
                      type={campo.tipo}
                      value={testData[campo.nome] || ''}
                      onChange={(e) => handleInputChange(campo.nome, e.target.value)}
                      min={campo.min}
                      max={campo.max}
                      step={campo.step}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Botão Calcular Resultado - apenas para testes que não são MEMORE nem MIG */}
            {selectedTest.id !== 'memore' && selectedTest.id !== 'mig' && (
              <div className="mt-6">
                <button
                  onClick={handleCalculate}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <span>📊</span>
                  Calcular Resultado
                </button>
              </div>
            )}

            {/* Layout em duas colunas para MEMORE */}
            {selectedTest.id === 'memore' && (
              <>
                <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Coluna Esquerda: Info do Teste */}
                  <div className="space-y-6">
                      {/* Header do Teste */}
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-2xl">🧠</span>
                        </div>
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900">Memore - Memória</h3>
                            <p className="text-sm text-gray-600">Avaliação da capacidade de memória</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna Direita: Crivo de Correção */}
                  <div className="space-y-6">
                    {/* Seção do Crivo */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span className="text-xl">🧠</span>
                          MEMORE - Crivo de Correção
                        </h3>
                        <button
                          type="button"
                          onClick={clearMemoreMarks}
                          className="px-5 py-2.5 text-sm font-medium text-red-700 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
                        >
                          <span>🗑️</span>
                          Limpar marcações
                        </button>
                      </div>

                      {/* Crivo Visual do MEMORE - Layout de 3 colunas */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Crivo de Correção</h4>
                        <div className="grid grid-cols-3 gap-4">
                          {/* Coluna 1: A, B, C, D, E, F, 1, 2, 3, 4 */}
                          <div className="space-y-1">
                            {['A', 'B', 'C', 'D', 'E', 'F', '1', '2', '3', '4'].map((label, r) => {
                              const idx = r; // 0-9: A-F (0-5) + 1-4 (6-9)
                              const shouldMark = memoreKeyVP[idx];
                              const isMarked = memoreMarks[idx];
                              return (
                                <div key={`mem-row-${idx}`} className="flex items-center gap-2 py-1">
                                  <span className="text-xs font-medium text-gray-700 w-4">{label}.</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleMemoreMark(idx)}
                                    className={`w-6 h-6 border-2 rounded flex items-center justify-center text-xs font-bold ${
                                      isMarked
                                        ? shouldMark
                                          ? 'bg-green-500 text-white border-green-500'
                                          : 'bg-orange-500 text-white border-orange-500'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    } shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110`}
                                  >
                                    {isMarked ? '✓' : ''}
                                  </button>
                                  <span className={`text-xs font-medium w-8 ${
                                    shouldMark ? 'text-green-600' : 'text-gray-500'
                                  }`}>
                                    {shouldMark ? 'VP' : 'VN'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Coluna 2: 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 */}
                          <div className="space-y-1">
                            {['5', '6', '7', '8', '9', '10', '11', '12', '13', '14'].map((label, r) => {
                              const idx = r + 10; // 10-19
                              const shouldMark = memoreKeyVP[idx];
                              const isMarked = memoreMarks[idx];
                              return (
                                <div key={`mem-row-${idx}`} className="flex items-center gap-2 py-1">
                                  <span className="text-xs font-medium text-gray-700 w-4">{label}.</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleMemoreMark(idx)}
                                    className={`w-6 h-6 border-2 rounded flex items-center justify-center text-xs font-bold ${
                                      isMarked
                                        ? shouldMark
                                          ? 'bg-green-500 text-white border-green-500'
                                          : 'bg-orange-500 text-white border-orange-500'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    } shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110`}
                                  >
                                    {isMarked ? '✓' : ''}
                                  </button>
                                  <span className={`text-xs font-medium w-8 ${
                                    shouldMark ? 'text-green-600' : 'text-gray-500'
                                  }`}>
                                    {shouldMark ? 'VP' : 'VN'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Coluna 3: 15, 16, 17, 18, 19, 20, 21, 22, 23, 24 */}
                          <div className="space-y-1">
                            {['15', '16', '17', '18', '19', '20', '21', '22', '23', '24'].map((label, r) => {
                              const idx = r + 20; // 20-29
                              const shouldMark = memoreKeyVP[idx];
                              const isMarked = memoreMarks[idx];
                              return (
                                <div key={`mem-row-${idx}`} className="flex items-center gap-2 py-1">
                                  <span className="text-xs font-medium text-gray-700 w-4">{label}.</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleMemoreMark(idx)}
                                    className={`w-6 h-6 border-2 rounded flex items-center justify-center text-xs font-bold ${
                                      isMarked
                                        ? shouldMark
                                          ? 'bg-green-500 text-white border-green-500'
                                          : 'bg-orange-500 text-white border-orange-500'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    } shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110`}
                                  >
                                    {isMarked ? '✓' : ''}
                                  </button>
                                  <span className={`text-xs font-medium w-8 ${
                                    shouldMark ? 'text-green-600' : 'text-gray-500'
                                  }`}>
                                    {shouldMark ? 'VP' : 'VN'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Contadores - Movidos para baixo do crivo */}
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mt-6">
                        <div className="text-base font-bold text-gray-800 mb-4">Contadores:</div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <span className="text-xs text-gray-600 font-medium">VP:</span>
                            <span className="text-lg font-bold text-gray-900 ml-2">{testData.vp || 0}</span>
                        </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <span className="text-xs text-gray-600 font-medium">VN:</span>
                            <span className="text-lg font-bold text-gray-900 ml-2">{testData.vn || 0}</span>
                        </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <span className="text-xs text-gray-600 font-medium">FN:</span>
                            <span className="text-lg font-bold text-gray-900 ml-2">{testData.fn || 0}</span>
                      </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <span className="text-xs text-gray-600 font-medium">FP:</span>
                            <span className="text-lg font-bold text-gray-900 ml-2">{testData.fp || 0}</span>
                          </div>
                        </div>
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                          <div className="text-sm font-semibold text-blue-700 mb-1">Resultado (EB):</div>
                          <div className="text-3xl font-bold text-blue-800">{testData.eb || 0}</div>
                          <div className="text-xs text-blue-600 mt-1">(VP + VN) - (FN + FP)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões unificados */}
                <div className="flex justify-center mt-8 gap-3">
                  <button
                    onClick={handleCalculate}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-8 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                  >
                    <span>📊</span>
                    Calcular Resultado
                  </button>
                </div>
              </>
            )}

            {/* Layout especial para MIG */}
            {selectedTest.id === 'mig' && (
              <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Coluna Esquerda: campos/ajustes visuais para alinhamento */}
                  <div className="md:pr-4">
                    {/* vazio propositalmente para alinhar com os campos à esquerda do formulário */}
                  </div>

                  {/* Coluna Direita: Gabarito MIG - Modelo Original */}
                  <div className="space-y-6">
                    {/* Gabarito MIG - Layout Original */}
                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span className="text-xl">📝</span>
                          Gabarito MIG
                        </h3>
                        <div className="flex items-center gap-2"></div>
                      </div>

                      {/* Gabarito no formato original - 2 colunas */}
                      <div className="max-h-[70vh] overflow-auto pr-2 space-y-2 md:min-w-[520px] lg:min-w-[600px]">
                        {/* Cabeçalhos das duas colunas */}
                        <div className="grid grid-cols-2 gap-3 sticky top-0 bg-white z-10">
                          {[0,1].map((col) => (
                            <div key={col} className="text-center">
                              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-gray-700 border-b pb-1">
                                <div>Exercício</div>
                                <div>Alternativa correta</div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-1">
                                <div></div>
                                <div className="grid grid-cols-4 gap-1 text-[10px] text-gray-500">
                                  <span>A</span><span>B</span><span>C</span><span>D</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Exemplos e Questões */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Coluna Esquerda: Exemplo 1/2 + 1-13 */}
                          <div className="space-y-1">
                            {/* Exemplo 1 */}
                            <div className="grid grid-cols-2 gap-3 py-1 text-[12px]">
                              <div className="text-center font-medium">Exemplo 1</div>
                              <div className="flex flex-col items-center">
                                <div className="grid grid-cols-4 gap-2">
                                  {['A', 'B', 'C', 'D'].map((option) => (
                                    <button
                                      key={option}
                                      onClick={() => chooseOption(0, option)}
                                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all ${getButtonClass(0, option)}`}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-[11px] text-gray-500 mt-1">
                                  <span>A</span><span>B</span><span>C</span><span>D</span>
                                </div>
                              </div>
                            </div>

                            {/* Exemplo 2 */}
                            <div className="grid grid-cols-2 gap-3 py-1 text-[12px]">
                              <div className="text-center font-medium">Exemplo 2</div>
                              <div className="flex flex-col items-center">
                                <div className="grid grid-cols-4 gap-2">
                                  {['A', 'B', 'C', 'D'].map((option) => (
                                    <button
                                      key={option}
                                      onClick={() => chooseOption(1, option)}
                                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all ${getButtonClass(1, option)}`}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-[11px] text-gray-500 mt-1">
                                  <span>A</span><span>B</span><span>C</span><span>D</span>
                                </div>
                              </div>
                            </div>

                            {/* Questões 1-13 */}
                            {Array.from({ length: 13 }, (_, i) => i + 1).map((questao) => {
                              const idx = questao + 1; // exemplos ocupam 0 e 1
                              return (
                                <div key={questao} className="grid grid-cols-2 gap-3 py-1 text-[12px]">
                                  <div className="text-center font-medium">{questao}</div>
                                  <div className="flex flex-col items-center">
                                    <div className="grid grid-cols-4 gap-2">
                                      {['A', 'B', 'C', 'D'].map((option) => (
                                        <button
                                          key={option}
                                          onClick={() => chooseOption(idx, option)}
                                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all ${getButtonClass(idx, option)}`}
                                        >
                                          {option}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[11px] text-gray-500 mt-1">
                                      <span>A</span><span>B</span><span>C</span><span>D</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Coluna Direita: 14-28 */}
                          <div className="space-y-1">
                            {Array.from({ length: 15 }, (_, i) => i + 14).map((questao) => {
                              const idx = questao + 1;
                              return (
                                <div key={questao} className="grid grid-cols-2 gap-3 py-1 text-[12px]">
                                  <div className="text-center font-medium">{questao}</div>
                                  <div className="flex flex-col items-center">
                                    <div className="grid grid-cols-4 gap-2">
                                      {['A', 'B', 'C', 'D'].map((option) => (
                                        <button
                                          key={option}
                                          onClick={() => chooseOption(idx, option)}
                                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all ${getButtonClass(idx, option)}`}
                                        >
                                          {option}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[11px] text-gray-500 mt-1">
                                      <span>A</span><span>B</span><span>C</span><span>D</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resumo dos Acertos */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mt-6">
                    <div className="text-base font-bold text-gray-800 mb-4">Resumo:</div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                        <span className="text-xs text-green-700 font-medium">Acertos:</span>
                        <span className="text-xl font-bold text-green-700 ml-2">{migCorrectCount}</span>
                        <span className="text-sm text-gray-600"> / 28</span>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 border-2 border-red-200">
                        <span className="text-xs text-red-700 font-medium">Erros:</span>
                        <span className="text-xl font-bold text-red-700 ml-2">{28 - migCorrectCount}</span>
                        <span className="text-sm text-gray-600"> / 28</span>
                      </div>
                    </div>
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                      <div className="text-xs text-blue-600 mb-1">
                        💡 {autoCalcFromGabarito ? 'Cálculo automático ativo' : 'Cálculo manual'}
                      </div>
                      <div className="text-sm font-semibold text-blue-700">Percentual:</div>
                      <div className="text-2xl font-bold text-blue-800">{((migCorrectCount / 28) * 100).toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Botão Calcular Resultado - MIG */}
                  <div className="flex justify-center mt-8 gap-3">
                    <button
                      onClick={() => {
                        setMigAnswers(Array(28).fill(''));
                        setMigAnswerKey(Array(28).fill(''));
                      }}
                      className="px-5 py-3 text-sm font-medium text-red-700 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
                    >
                      <span>🗑️</span>
                      Limpar
                    </button>
                    <button
                      onClick={handleCalculate}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-8 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                    >
                      <span>📊</span>
                      Calcular Resultado
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results Display */}
            {results && Object.keys(results).length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">📊 Resultados do Teste</h3>
                
                {selectedTest.id === 'memore' && (
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">🧠 MEMORE - Resultados</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="font-semibold text-gray-700 mb-2">Contadores</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Verdadeiros Positivos (VP):</span>
                              <span className="font-bold text-green-600">{testData.vp || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Verdadeiros Negativos (VN):</span>
                              <span className="font-bold text-green-600">{testData.vn || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Falsos Negativos (FN):</span>
                              <span className="font-bold text-red-600">{testData.fn || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Falsos Positivos (FP):</span>
                              <span className="font-bold text-red-600">{testData.fp || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h5 className="font-semibold text-blue-700 mb-2">Resultado</h5>
                          <div className="text-3xl font-bold text-blue-800 mb-2">{testData.eb || 0}</div>
                          <p className="text-sm text-blue-600">Eficiência de Busca (EB)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="space-y-2">
                    {Object.entries(results).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
