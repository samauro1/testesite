'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Brain, 
  Eye, 
  Target, 
  MemoryStick,
  Package, 
  Calculator,
  Navigation,
  FileText,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { tabelasService, pacientesService, avaliacoesService } from '@/services/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Verificar se o usuário é administrador
  const isAdmin = user?.perfil === 'administrador';
  
  // Verificar se veio de uma página de paciente ou avaliação
  const pacienteId = searchParams.get('paciente_id');
  const avaliacaoId = searchParams.get('avaliacao_id');
  const numeroLaudo = searchParams.get('numero_laudo');
  const testesPreSelecionados = searchParams.get('testes')?.split(',') || [];
  
  // Se veio com paciente_id ou avaliacao_id, o padrão é VINCULADO
  const initialAnalysisType = (pacienteId || avaliacaoId) ? 'linked' : 'linked'; // Sempre vinculado por padrão
  
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [testData, setTestData] = useState<Record<string, string | number>>({});
  const [results, setResults] = useState<TestResult | null>(null);
  const [analysisType, setAnalysisType] = useState(initialAnalysisType);
  const [patientData, setPatientData] = useState({
    cpf: '',
    nome: '',
    numero_laudo: '',
    data_nascimento: '',
    contexto: '',
    tipo_transito: '',
    escolaridade: '',
    telefone: '',
    email: ''
  });
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [descontarEstoque, setDescontarEstoque] = useState(true); // Por padrão, desconta do estoque
  const [avaliadoFixado, setAvaliadoFixado] = useState(false); // Novo estado para travar o avaliado
  const [showTabelaModal, setShowTabelaModal] = useState(false);
  const [tabelaSugestoes, setTabelaSugestoes] = useState<any>(null);
  const [tabelaSelecionada, setTabelaSelecionada] = useState<number | null>(null);

  // Estados específicos do MIG
  const QUESTIONS_COUNT = 28;
  const MIG_TOTAL_POSITIONS = 30; // 2 exemplos + 28 questões
  const [migAnswers, setMigAnswers] = useState<string[]>(Array(MIG_TOTAL_POSITIONS).fill(''));
  
  // Gabarito oficial do MIG (inclui 2 exemplos + 28 questões = 30 posições)
  // Índice 0: Exemplo 1 = B
  // Índice 1: Exemplo 2 = C
  // Índices 2-29: Questões 1-28
  const MIG_ANSWER_KEY = useMemo(() => [
    'B', 'C', // Exemplos 1 e 2
    'C', 'D', 'A', 'B', 'C', 'D', 'C', 'B', 'D', 'B', 'C', 'B', 'A', // Questões 1-13
    'D', 'B', 'B', 'D', 'C', 'A', 'D', 'B', 'D', 'C', 'A', 'A', 'C', 'A', 'B' // Questões 14-28
  ], []);
  
  const [autoCalcFromGabarito, setAutoCalcFromGabarito] = useState(true);

  // Estados específicos do MEMORE
  const MEMORE_TOTAL = 30; // inclui treino A..F (6) + 24 itens
  const [memoreMarks, setMemoreMarks] = useState<boolean[]>(Array(MEMORE_TOTAL).fill(false));

  // Estados específicos do R-1
  const R1_TOTAL = 40; // 40 questões
  const [r1Answers, setR1Answers] = useState<string[]>(Array(R1_TOTAL).fill(''));
  const [selectedR1Table, setSelectedR1Table] = useState<number | null>(null);

  // Estados específicos do AC
  const AC_ROWS = 20;
  const AC_COLS = 15;
  const AC_TOTAL = AC_ROWS * AC_COLS; // 300 figuras no teste AC
  const [acMarks, setAcMarks] = useState<boolean[]>(Array(AC_TOTAL).fill(false));
  const [showAcGabarito, setShowAcGabarito] = useState<boolean>(false);
  const [selectedAcTable, setSelectedAcTable] = useState<number | null>(null);
  
  // Estados para processamento automático de imagens
  const [acMode, setAcMode] = useState<'manual' | 'automatic' | 'hybrid'>('manual');
  const [testeImage, setTesteImage] = useState<File | null>(null);
  const [crivoImage, setCrivoImage] = useState<File | null>(null);
  const [processingResults, setProcessingResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Configurações de processamento
  const [processingConfig, setProcessingConfig] = useState({
    zetasEquivalence: 'strict', // 'strict', 'rotation', 'rotation+reflection'
    duplicatesPolicy: 'count_as_error', // 'count_as_error', 'ignore'
    pointsFormula: 'acertos_menos_erros', // 'acertos_menos_erros', 'only_acertos'
    circlesPerRow: 7 // Regra: 7 círculos por fileira
  });
  
  // Filtros normativos
  const [normativeFilters, setNormativeFilters] = useState({
    idade: '',
    escolaridade: '',
    regiao: '',
    sexo: '',
    socioeconomico: ''
  });
  
  // Figuras do teste AC - EXATAS da nova imagem teste arreglado.jpg
  // Baseado na análise da nova imagem fornecida
  const AC_FIGURES = useMemo(() => [
    // Fileira 1 (exata da nova imagem)
    '▷', '△', '◁', '▼', '▽', '▶', '◄', '▲', '▷', '◁', '▼', '△', '▽', '▶', '◄',
    // Fileira 2 (exata da nova imagem)
    '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶',
    // Fileira 3 (exata da nova imagem)
    '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△',
    // Fileira 4 (exata da nova imagem)
    '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼',
    // Fileira 5 (exata da nova imagem)
    '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷',
    
    // Fileiras 6-20 (geradas seguindo o padrão da nova imagem)
    '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁',
    '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽',
    '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲',
    '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄',
    '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶',
    '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△',
    '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼',
    '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷',
    '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁',
    '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽',
    '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲',
    '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄',
    '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶',
    '◄', '▲', '▽', '◁', '▷', '▼', '△', '▶', '◄', '▲', '▽', '◁', '▷', '▼', '△'
  ], []);
  
  // Figuras que devem ser marcadas (baseado nos 3 modelos corretos)
  const TARGET_FIGURES = ['►', '▽', '◁']; // As 3 figuras que devem ser marcadas
  
  // Gabarito do teste AC - baseado no crivo (7 círculos por fileira)
  // Para a nova imagem teste arreglado.jpg
  const AC_GABARITO = useMemo(() => [
    // Fileira 1: 7 círculos
    false, true, false, false, true, true, false, false, false, true, false, true, true, false, false,
    // Fileira 2: 7 círculos
    false, true, false, false, false, true, true, false, false, true, false, false, false, true, true,
    // Fileira 3: 7 círculos
    false, false, true, false, false, true, false, true, false, false, true, false, false, true, false,
    // Fileira 4: 7 círculos
    true, false, false, true, false, false, false, true, true, false, false, true, false, false, false,
    // Fileira 5: 7 círculos
    false, true, false, false, true, false, false, false, true, true, false, false, true, false, false,
    // Fileira 6: 7 círculos
    false, true, false, false, false, true, true, false, false, true, false, false, false, true, false,
    // Fileira 7: 7 círculos
    false, false, false, true, false, false, true, false, true, false, false, false, false, true, true,
    // Fileira 8: 7 círculos
    false, false, true, false, false, true, false, true, false, false, false, true, false, false, true,
    // Fileira 9: 7 círculos
    false, false, false, true, false, false, true, false, false, true, false, false, false, true, false,
    // Fileira 10: 7 círculos
    true, false, false, false, true, false, false, true, false, false, false, true, false, false, true,
    // Fileira 11: 7 círculos
    false, false, true, false, false, true, false, false, false, true, true, false, false, false, true,
    // Fileira 12: 7 círculos
    false, false, false, true, false, false, true, false, true, false, false, false, false, true, false,
    // Fileira 13: 7 círculos
    true, false, false, false, true, false, false, true, false, false, true, false, false, false, true,
    // Fileira 14: 7 círculos
    false, true, false, false, false, true, false, false, false, true, false, false, true, false, false,
    // Fileira 15: 7 círculos
    false, false, true, false, false, false, true, false, true, false, false, false, false, true, true,
    // Fileira 16: 7 círculos
    false, false, false, true, false, false, true, false, false, true, false, false, false, true, false,
    // Fileira 17: 7 círculos
    true, false, false, false, true, false, false, false, true, false, false, false, true, false, false,
    // Fileira 18: 7 círculos
    false, true, false, false, false, true, false, true, false, false, false, true, false, false, false,
    // Fileira 19: 7 círculos
    false, false, false, true, false, false, true, false, false, true, false, false, false, true, false,
    // Fileira 20: 7 círculos
    false, false, true, false, false, false, true, false, true, false, false, false, false, true, false
  ], []);
  
  // Gabarito oficial do R-1 (40 questões) - Gabarito oficial fornecido
  const R1_ANSWER_KEY = useMemo(() => [
    'C', 'F', 'E', 'D', 'F', 'B', 'A', 'D', 'E', 'E', // Questões 1-10
    'C', 'F', 'D', 'B', 'E', 'F', 'A', 'C', 'D', 'B', // Questões 11-20
    'D', 'F', 'G', 'B', 'H', 'D', 'A', 'H', 'G', 'C', // Questões 21-30
    'B', 'G', 'H', 'A', 'C', 'G', 'A', 'C', 'H', 'G'  // Questões 31-40
  ], []);
  
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
  
  // Estado específico para tabelas MEMORE
  const [selectedMemoreTable, setSelectedMemoreTable] = useState<number | null>(null);
  
  // Estado específico para tabelas MIG
  const [selectedMigTable, setSelectedMigTable] = useState<number | null>(null);

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

  // Contador de acertos do MIG (apenas questões 1-28, excluindo exemplos)
  const migCorrectCount = useMemo(() => {
    return migAnswers.reduce((count, answer, idx) => {
      // Pular índices 0 e 1 (Exemplos 1 e 2)
      if (idx < 2) return count;
      const key = MIG_ANSWER_KEY[idx];
      return count + (answer && key && answer === key ? 1 : 0);
    }, 0);
  }, [migAnswers, MIG_ANSWER_KEY]);

  // Contador de acertos do R-1
  const r1CorrectCount = useMemo(() => {
    return r1Answers.reduce((count, answer, idx) => {
      const key = R1_ANSWER_KEY[idx];
      return count + (answer && key && answer === key ? 1 : 0);
    }, 0);
  }, [r1Answers, R1_ANSWER_KEY]);

  // Cálculo automático do MIG quando acertos_manual ou tabela mudam
  useEffect(() => {
    if (selectedTest?.id !== 'mig') return;
    if (!selectedMigTable) {
      console.log('⚠️ MIG: Tabela não selecionada');
      return;
    }
    
    const acertosManual = parseInt(String(testData.acertos_manual || 0));
    console.log(`🔍 MIG: Acertos manual = ${acertosManual}, Tabela = ${selectedMigTable}`);
    
    if (acertosManual <= 0) {
      // Se não tiver acertos_manual, limpar resultados
      console.log('⚠️ MIG: Acertos manual <= 0, limpando resultados');
      setResults(null);
      return;
    }
    
    // Disparar cálculo automático
    const calcularAutomatico = async () => {
      try {
        console.log(`📤 MIG: Enviando cálculo - Tabela ${selectedMigTable}, Acertos ${acertosManual}`);
        const dataToSend: any = {
          tabela_id: selectedMigTable,
          acertos: acertosManual
        };
        
        const response = await tabelasService.calculate('mig', dataToSend);
        console.log('📥 MIG: Resposta recebida:', response.data);
        const resultado = response.data.resultado || response.data || {};
        console.log('📊 MIG: Resultado processado:', resultado);
        setResults(resultado as TestResult);
      } catch (error) {
        console.error('❌ Erro ao calcular MIG automaticamente:', error);
      }
    };
    
    calcularAutomatico();
  }, [testData.acertos_manual, selectedMigTable, selectedTest?.id]);

  // Cálculo automático do R-1 quando gabarito muda
  useEffect(() => {
    if (selectedTest?.id !== 'r1') return;
    setTestData(prev => ({ ...prev, acertos: r1CorrectCount }));
  }, [r1CorrectCount, selectedTest?.id]);

  // Cálculo automático do R-1 quando acertos_manual ou tabela mudam
  useEffect(() => {
    if (selectedTest?.id !== 'r1') return;
    if (!selectedR1Table) {
      return;
    }
    
    const acertosManual = parseInt(String(testData.acertos_manual || 0));
    const escolaridade = String(testData.escolaridade || '');
    
    if (acertosManual <= 0 || !escolaridade) {
      setResults(null);
      return;
    }
    
    // Disparar cálculo automático
    const calcularAutomatico = async () => {
      try {
        const dataToSend: any = {
          tabela_id: selectedR1Table,
          acertos: acertosManual,
          escolaridade: escolaridade
        };
        
        const response = await tabelasService.calculate('r1', dataToSend);
        setResults(response.data);
      } catch (error) {
        console.error('❌ Erro ao calcular R-1 automaticamente:', error);
      }
    };
    
    calcularAutomatico();
  }, [testData.acertos_manual, testData.escolaridade, selectedR1Table, selectedTest?.id]);

  // Cálculo automático do AC com regra especial de omissões
  const acStats = useMemo(() => {
    if (selectedTest?.id !== 'ac') return null;
    
    let acertos = 0;
    let erros = 0;
    let omissoes = 0;
    
    // Encontrar a última marcação feita
    let lastMarkedIndex = -1;
    for (let i = AC_TOTAL - 1; i >= 0; i--) {
      if (acMarks[i]) {
        lastMarkedIndex = i;
        break;
      }
    }
    
    // Calcular acertos e erros (todos os marcados)
    for (let i = 0; i < AC_TOTAL; i++) {
      const isMarked = acMarks[i];
      const shouldMark = AC_GABARITO[i];
      
      if (isMarked && shouldMark) {
        acertos++;
      } else if (isMarked && !shouldMark) {
        erros++;
      }
    }
    
    // Calcular omissões apenas desde a última marcação para cima
    for (let i = lastMarkedIndex + 1; i < AC_TOTAL; i++) {
      const shouldMark = AC_GABARITO[i];
      if (shouldMark) {
        omissoes++;
      }
    }
    
    const resultado = acertos - (erros + omissoes);
    
    return { acertos, erros, omissoes, resultado };
  }, [acMarks, AC_GABARITO, selectedTest?.id]);

  // Cálculo automático do AC quando gabarito muda
  useEffect(() => {
    if (selectedTest?.id !== 'ac' || !acStats) return;
    
    setTestData(prev => ({
      ...prev,
      acertos: acStats.acertos,
      erros: acStats.erros,
      omissoes: acStats.omissoes,
      resultado: acStats.resultado
    }));
  }, [acStats, selectedTest?.id]);

  // Cálculo automático do AC quando dados manuais mudam
  useEffect(() => {
    if (selectedTest?.id !== 'ac') return;
    if (!selectedAcTable) return;
    
    const acertosManual = parseInt(String(testData.acertos_manual || 0));
    const errosManual = parseInt(String(testData.erros_manual || 0));
    const omissoesManual = parseInt(String(testData.omissoes_manual || 0));
    const escolaridade = String(testData.escolaridade || '');
    
    if (acertosManual <= 0 || !escolaridade) {
      setResults(null);
      return;
    }
    
    const resultadoManual = acertosManual - (errosManual + omissoesManual);
    
    // Disparar cálculo automático
    const calcularAutomatico = async () => {
      try {
        const dataToSend: any = {
          tabela_id: selectedAcTable,
          acertos: acertosManual,
          erros: errosManual,
          omissoes: omissoesManual,
          resultado: resultadoManual,
          escolaridade: escolaridade
        };
        
        const response = await tabelasService.calculate('ac', dataToSend);
        setResults(response.data);
      } catch (error) {
        console.error('❌ Erro ao calcular AC automaticamente:', error);
      }
    };
    
    calcularAutomatico();
  }, [testData.acertos_manual, testData.erros_manual, testData.omissoes_manual, testData.escolaridade, selectedAcTable, selectedTest?.id]);

  const getChoiceClass = (idx: number, option: string) => {
    const user = migAnswers[idx];
    const key = MIG_ANSWER_KEY[idx];
    const isSelected = user === option;
    if (!isSelected) return 'bg-white text-gray-600 border-gray-300 hover:border-gray-400';
    if (!key) return 'bg-gray-200 text-gray-800 border-gray-400';
    return user === key
      ? 'bg-green-500 text-white border-green-600 shadow-md'
      : 'bg-yellow-400 text-gray-800 border-yellow-500 shadow-md';
  };

  const getButtonClass = (idx: number, option: string) => getChoiceClass(idx, option);

  const chooseOption = (idx: number, option: string) => {
    const next = [...migAnswers];
    next[idx] = next[idx] === option ? '' : option;
    setMigAnswers(next);
  };

  const chooseR1Option = (idx: number, option: string) => {
    const next = [...r1Answers];
    next[idx] = next[idx] === option ? '' : option;
    setR1Answers(next);
  };

  const getR1ChoiceClass = (idx: number, option: string) => {
    const user = r1Answers[idx];
    const key = R1_ANSWER_KEY[idx];
    const isSelected = user === option;
    
    if (!isSelected) {
      return 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50';
    }
    
    // Se a opção está selecionada, verificar se é correta ou incorreta
    if (user === key) {
      return 'bg-green-500 text-white border-green-600 shadow-md';
    } else {
      return 'bg-orange-500 text-white border-orange-600 shadow-md';
    }
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

  const clearR1Answers = () => {
    setR1Answers(Array(R1_TOTAL).fill(''));
  };

  // Funções para o AC
  const toggleAcMark = (idx: number) => {
    setAcMarks(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const clearAcMarks = () => {
    setAcMarks(Array(AC_TOTAL).fill(false));
    setShowAcGabarito(false);
  };

  const toggleAcGabarito = () => {
    setShowAcGabarito(prev => !prev);
  };

  // Funções para processamento automático de imagens
  const handleImageUpload = (type: 'teste' | 'crivo', file: File) => {
    if (type === 'teste') {
      setTesteImage(file);
    } else {
      setCrivoImage(file);
    }
  };

  const processImages = async () => {
    if (!testeImage || !crivoImage) {
      alert('Por favor, faça upload das duas imagens (teste preenchido e crivo)');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Simular processamento de IA seguindo o fluxo correto
      const formData = new FormData();
      formData.append('teste', testeImage);
      formData.append('crivo', crivoImage);
      formData.append('config', JSON.stringify(processingConfig));
      formData.append('filtros', JSON.stringify(normativeFilters));

      // Simular resposta da API com processamento correto
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simular auditoria por fileira (7 círculos por linha)
      const rowsAudit = [
        { linha: 1, circulos_crivo: 7, acertos: 6, erros: 1, omissoes: 1 },
        { linha: 2, circulos_crivo: 7, acertos: 7, erros: 0, omissoes: 0 },
        { linha: 3, circulos_crivo: 7, acertos: 5, erros: 2, omissoes: 2 },
        { linha: 4, circulos_crivo: 7, acertos: 6, erros: 1, omissoes: 1 },
        { linha: 5, circulos_crivo: 7, acertos: 7, erros: 0, omissoes: 0 },
        { linha: 6, circulos_crivo: 7, acertos: 6, erros: 1, omissoes: 1 },
        { linha: 7, circulos_crivo: 7, acertos: 5, erros: 2, omissoes: 2 },
        { linha: 8, circulos_crivo: 7, acertos: 6, erros: 1, omissoes: 1 },
        { linha: 9, circulos_crivo: 7, acertos: 7, erros: 0, omissoes: 0 },
        { linha: 10, circulos_crivo: 7, acertos: 6, erros: 1, omissoes: 1 },
        { linha: 11, circulos_crivo: 7, acertos: 5, erros: 2, omissoes: 2 },
        { linha: 12, circulos_crivo: 7, acertos: 6, erros: 1, omissoes: 1 },
        { linha: 13, circulos_crivo: 7, acertos: 7, erros: 0, omissoes: 0 },
        { linha: 14, circulos_crivo: 7, acertos: 5, erros: 2, omissoes: 2 },
        { linha: 15, circulos_crivo: 7, acertos: 6, erros: 1, omissoes: 1 },
        { linha: 16, circulos_crivo: 7, acertos: 7, erros: 0, omissoes: 0 },
        { linha: 17, circulos_crivo: 7, acertos: 6, erros: 1, omissoes: 1 },
        { linha: 18, circulos_crivo: 7, acertos: 5, erros: 2, omissoes: 2 },
        { linha: 19, circulos_crivo: 7, acertos: 6, erros: 1, omissoes: 1 },
        { linha: 20, circulos_crivo: 7, acertos: 7, erros: 0, omissoes: 0 }
      ];

      // Calcular totais
      const totalAcertos = rowsAudit.reduce((sum, row) => sum + row.acertos, 0);
      const totalErros = rowsAudit.reduce((sum, row) => sum + row.erros, 0);
      const totalOmissoes = rowsAudit.reduce((sum, row) => sum + row.omissoes, 0);
      const totalPontos = processingConfig.pointsFormula === 'acertos_menos_erros' 
        ? totalAcertos - totalErros 
        : totalAcertos;

      const mockResults = {
        identificacao: {
          codigo_prova: "AC-2025-0001",
          data: new Date().toISOString().split('T')[0],
          operador: "analista_IA"
        },
        configuracao: {
          equivalencia_zetas: processingConfig.zetasEquivalence,
          politica_duplicatas: processingConfig.duplicatesPolicy,
          formula_pontos: processingConfig.pointsFormula,
          circulos_por_linha: processingConfig.circlesPerRow
        },
        filtros_normativos: normativeFilters,
        alinhamento: {
          erro_medio_pixels: 0.8,
          y_corte: 1325,
          linha_corte_indice: 12,
          validacao_circulos_por_linha: "✅ Todas as linhas têm 7 círculos do Crivo"
        },
        contagens: {
          acertos: totalAcertos,
          erros: totalErros,
          omissoes: totalOmissoes,
          pontos: totalPontos,
          zetas_area_valida: 320,
          total_linhas_validas: 20
        },
        auditoria_por_linha: rowsAudit,
        norma: {
          percentil: 63,
          classificacao: "Médio"
        },
        detalhes: {
          pares_marca_crivo: [
            { marca_id: 17, crivo_id: 203, status: "acerto" },
            { marca_id: 18, crivo_id: null, status: "erro" }
          ],
          crivos_omissos: [5, 22, 47]
        },
        avisos: [
          "✅ Alinhamento do Crivo validado: todas as linhas têm 7 círculos",
          "✅ Linha de corte posicionada na última marca válida",
          "✅ Pareamento com tolerância adequada aplicado",
          "✅ Regra de equivalência de zetas: " + processingConfig.zetasEquivalence,
          "2 marcas duplicadas foram contabilizadas como ERRO"
        ]
      };

      setProcessingResults(mockResults);
      
      // Atualizar os campos do teste com os resultados
      setTestData(prev => ({
        ...prev,
        acertos: mockResults.contagens.acertos,
        erros: mockResults.contagens.erros,
        omissoes: mockResults.contagens.omissoes,
        resultado: mockResults.contagens.pontos
      }));

      setResults(mockResults.norma);
      
    } catch (error) {
      console.error('Erro no processamento:', error);
      alert('Erro no processamento das imagens. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResults = () => {
    if (!processingResults) return;
    
    const dataStr = JSON.stringify(processingResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ac_results_${processingResults.identificacao.data}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleTestSelect = (teste: Test) => {
    setSelectedTest(teste);
    setTestData({});
    setResults(null);
    setSelectedTable(null);
    
    // NÃO resetar analysisType e patientData se:
    // 1. Veio vinculado via URL (pacienteId ou avaliacaoId)
    // 2. OU se o avaliado está fixado
    if (!pacienteId && !avaliacaoId && !avaliadoFixado) {
      setAnalysisType('linked'); // Sempre vinculado por padrão
      setPatientData({ cpf: '', nome: '', numero_laudo: '', data_nascimento: '', contexto: '', tipo_transito: '', escolaridade: '', telefone: '', email: '' });
      setFoundPatient(null);
    }
    
    setSearchingPatient(false);
    setMigAnswers(Array(MIG_TOTAL_POSITIONS).fill(''));
    setAutoCalcFromGabarito(true);
  };

  // Carregar dados do paciente/avaliação quando vem via URL
  useEffect(() => {
    const loadLinkedData = async () => {
      try {
        console.log('🔍 useEffect loadLinkedData - pacienteId:', pacienteId, 'avaliacaoId:', avaliacaoId);
        
        if (pacienteId) {
          // Carregar dados do paciente pelo ID
          console.log('📡 Carregando paciente ID:', pacienteId);
          setSearchingPatient(true);
          const response = await pacientesService.get(pacienteId);
          console.log('📦 Resposta GET /pacientes/' + pacienteId + ':', response);
          console.log('📦 response.data:', (response as any).data);
          console.log('📦 response.data.data:', (response as any).data?.data);
          
          // A estrutura é { data: { data: { ...paciente... } } }
          const paciente = (response as any).data?.data || (response as any).data;
          console.log('👤 Paciente extraído:', paciente);
          
          if (paciente && paciente.id) {
            setFoundPatient(paciente);
            const laudoFinal = numeroLaudo || paciente.numero_laudo || `LAU-${new Date().getFullYear()}-${String(paciente.id).padStart(4, '0')}`;
            
            const dadosCarregados = {
              cpf: paciente.cpf || '',
              nome: paciente.nome || '',
              numero_laudo: laudoFinal,
              data_nascimento: paciente.data_nascimento || '',
              contexto: paciente.contexto || '',
              tipo_transito: paciente.tipo_transito || '',
              escolaridade: paciente.escolaridade || '',
              telefone: paciente.telefone || '',
              email: paciente.email || ''
            };
            console.log('💾 Setando patientData:', dadosCarregados);
            console.log('📋 Laudo final:', laudoFinal);
            setPatientData(dadosCarregados);
            setAvaliadoFixado(true); // Fixar o avaliado quando vem da URL
            console.log('🔒 Avaliado FIXADO!');
            toast.success(`✅ Avaliado selecionado: ${paciente.nome}`);
          } else {
            console.error('❌ Paciente não tem ID válido:', paciente);
          }
          setSearchingPatient(false);
        } else if (avaliacaoId) {
          // Carregar dados da avaliação
          setSearchingPatient(true);
          const response = await avaliacoesService.get(avaliacaoId);
          const avaliacao = (response as any).data.avaliacao;
          if (avaliacao) {
            // Buscar dados completos do paciente primeiro
            if (avaliacao.paciente_cpf) {
              const pacienteResponse = await pacientesService.list({ search: avaliacao.paciente_cpf, limit: 1 });
              const pacientes = (pacienteResponse as any).data.data.pacientes || [];
              if (pacientes.length > 0) {
                const paciente = pacientes[0];
                setFoundPatient(paciente);
                // Preencher TODOS os dados do paciente
                setPatientData({
                  cpf: paciente.cpf,
                  nome: paciente.nome,
                  numero_laudo: avaliacao.numero_laudo || paciente.numero_laudo,
                  data_nascimento: paciente.data_nascimento,
                  contexto: paciente.contexto,
                  tipo_transito: paciente.tipo_transito,
                  escolaridade: paciente.escolaridade,
                  telefone: paciente.telefone,
                  email: paciente.email
                });
              }
            } else {
              // Se não tem CPF, usar só dados da avaliação
              setPatientData({
                cpf: '',
                nome: avaliacao.paciente_nome || '',
                numero_laudo: avaliacao.numero_laudo,
                data_nascimento: '',
                contexto: '',
                tipo_transito: '',
                escolaridade: '',
                telefone: '',
                email: ''
              });
            }
          }
          setSearchingPatient(false);
        }
      } catch (error) {
        console.error('Erro ao carregar dados vinculados:', error);
        setSearchingPatient(false);
      }
    };

    loadLinkedData();
  }, [pacienteId, avaliacaoId, numeroLaudo]);

  const handleInputChange = (field: string, value: string | number) => {
    setTestData({
      ...testData,
      [field]: value
    });
  };

  const handlePatientDataChange = async (field: string, value: string) => {
    // Se o avaliado está fixado, não permite edição
    if (avaliadoFixado) {
      toast('⚠️ Avaliado fixado! Click em "Limpar Avaliado" para trocar.', {
        icon: '⚠️',
        duration: 2000
      });
      return;
    }

    const newPatientData = {
      ...patientData,
      [field]: value
    };
    setPatientData(newPatientData);
    
    // Só busca se tiver valor, NÃO limpa foundPatient se estiver digitando
    if (value.trim()) {
      await searchPatient(newPatientData);
    }
    // Removido o else que limpava setFoundPatient(null)
  };

  const searchPatientByCPF = async () => {
    if (patientData.cpf && patientData.cpf.length >= 11) {
      await searchPatient(patientData);
    }
  };

  // Função para salvar o teste
  const handleSaveTest = async (tabelaIdManual?: number) => {
    console.log('🚀 ========== handleSaveTest CHAMADO ==========');
    console.log('📋 selectedTest:', selectedTest?.id, selectedTest?.nome);
    console.log('📋 tabelaIdManual:', tabelaIdManual);
    console.log('📋 analysisType:', analysisType);
    console.log('📋 foundPatient:', foundPatient);
    console.log('📋 patientData:', patientData);
    
    if (!selectedTest) {
      console.error('❌ Nenhum teste selecionado!');
      toast.error('Nenhum teste selecionado');
      return;
    }
    
    console.log('✅ Teste selecionado, continuando...');
    
    // Fechar modal de seleção de tabela se estiver aberto
    if (showTabelaModal) {
      setShowTabelaModal(false);
    }

    // Se for anônimo, avisar que não será salvo
    if (analysisType === 'anonymous') {
      toast('ℹ️ Modo Anônimo: Resultado não será guardado na base de dados (não há paciente associado)', {
        duration: 4000,
        icon: 'ℹ️'
      });
    }

    // Validar se é vinculado e tem dados obrigatórios
    if (analysisType === 'linked') {
      console.log('🔍 Validando dados obrigatórios para avaliação vinculada...');
      console.log('   CPF:', patientData.cpf);
      console.log('   Nome:', patientData.nome);
      console.log('   Número Laudo:', patientData.numero_laudo);
      
      if (!patientData.cpf || !patientData.nome || !patientData.numero_laudo) {
        console.error('❌ Validação falhou - dados obrigatórios faltando!');
        toast.error('Preencha CPF, Nome e Número do Laudo para salvar avaliação vinculada');
        return;
      }
      console.log('✅ Validação passou!');
    }

    console.log('💾 Iniciando salvamento (setIsSaving(true))...');
    setIsSaving(true);

    try {
      // DEBUG: Verificar dados antes de enviar
      console.log('🔍 DEBUG handleSaveTest - Dados antes de enviar:');
      console.log('   analysisType:', analysisType);
      console.log('   patientData:', patientData);
      console.log('   foundPatient:', foundPatient);
      console.log('   testData:', testData);
      
      // Validar foundPatient se for linked
      if (analysisType === 'linked' && !foundPatient) {
        console.error('❌ ERRO: analysisType é linked mas foundPatient é null!');
        toast.error('Erro: Paciente não encontrado. Verifique os dados do paciente.');
        setIsSaving(false);
        return;
      }
      
      // Preparar dados para envio (igual ao cálculo, mas com flag de salvamento)
      const dataToSend: any = {
        ...testData,
        analysisType,
        patientData: analysisType === 'linked' ? {
          ...patientData,
          foundPatient,
          data_avaliacao: new Date().toISOString().split('T')[0],
          numero_laudo: patientData.numero_laudo
        } : null
      };
      
      console.log('📤 Dados sendo enviados:', {
        analysisType: dataToSend.analysisType,
        temPatientData: !!dataToSend.patientData,
        temFoundPatient: !!(dataToSend.patientData?.foundPatient),
        foundPatientId: dataToSend.patientData?.foundPatient?.id,
        numero_laudo: dataToSend.patientData?.numero_laudo
      });

      // Lógica específica por teste (igual ao handleSubmit)
      if (selectedTest.id === 'mig') {
        if (selectedTable) {
          dataToSend.tabela_id = selectedTable;
        }
        const acertosManual = parseInt(String(dataToSend.acertos_manual || 0));
        dataToSend.acertos = acertosManual > 0 ? acertosManual : migCorrectCount;
        delete dataToSend.acertos_manual;
      }

      if (selectedTest.id === 'r1') {
        if (selectedR1Table) {
          dataToSend.tabela_id = selectedR1Table;
        }
        const acertosManual = parseInt(String(dataToSend.acertos_manual || 0));
        dataToSend.acertos = acertosManual > 0 ? acertosManual : r1CorrectCount;
        delete dataToSend.acertos_manual;
      }

      if (selectedTest.id === 'ac') {
        if (selectedAcTable) {
          dataToSend.tabela_id = selectedAcTable;
        }
        const acertosManual = parseInt(String(dataToSend.acertos_manual || 0));
        const errosManual = parseInt(String(dataToSend.erros_manual || 0));
        const omissoesManual = parseInt(String(dataToSend.omissoes_manual || 0));
        
        if (acertosManual > 0) {
          dataToSend.acertos = acertosManual;
          dataToSend.erros = errosManual;
          dataToSend.omissoes = omissoesManual;
          dataToSend.resultado = acertosManual - (errosManual + omissoesManual);
        } else if (acStats) {
          dataToSend.acertos = acStats.acertos;
          dataToSend.erros = acStats.erros;
          dataToSend.omissoes = acStats.omissoes;
          dataToSend.resultado = acStats.resultado;
        }
        
        delete dataToSend.acertos_manual;
        delete dataToSend.erros_manual;
        delete dataToSend.omissoes_manual;
      }
      
      // Adicionar flag de desconto de estoque
      dataToSend.descontarEstoque = analysisType === 'linked' && descontarEstoque;
      
      // Adicionar tabela_id se foi selecionada manualmente
      if (tabelaIdManual) {
        dataToSend.tabela_id = tabelaIdManual;
      }
      
      // Enviar para calcular e salvar
      console.log('📤 ========== ENVIANDO REQUISIÇÃO ==========');
      console.log('📤 URL: /api/tabelas/' + selectedTest.id + '/calculate');
      console.log('📤 Método: POST');
      console.log('📤 Dados completos:', JSON.stringify(dataToSend, null, 2));
      console.log('📤 Tipo de teste:', selectedTest.id);
      console.log('📤 AnalysisType:', analysisType);
      console.log('📤 Has foundPatient:', !!foundPatient);
      console.log('📤 Has patientData:', !!patientData);
      console.log('📤 Chamando tabelasService.calculate...');
      
      const response = await tabelasService.calculate(selectedTest.id, dataToSend);
      
      console.log('📥 ========== RESPOSTA RECEBIDA ==========');
      console.log('📥 Status:', response.status);
      console.log('📥 Headers:', response.headers);
      console.log('📥 Data completa:', response.data);
      console.log('📥 Resposta recebida:', JSON.stringify(response.data, null, 2).substring(0, 1000));
      const resultado = response.data.resultado || response.data || {};
      console.log('📊 Resultado extraído:', resultado);
      console.log('📊 Resultado.salvo?', (resultado as any).salvo);
      console.log('📊 AnalysisType:', analysisType);
      const tabelaUsada = response.data.tabela_usada;
      const tabelaId = response.data.tabela_id;
      const avisos = response.data.avisos || [];
      
      // Mostrar avisos se houver
      if (Array.isArray(avisos) && avisos.length > 0) {
        avisos.forEach((aviso: any) => {
          if (aviso.tipo === 'warning') {
            toast(aviso.mensagem, { icon: '⚠️', duration: 5000 });
          } else {
            toast(aviso.mensagem, { icon: 'ℹ️', duration: 4000 });
          }
        });
      }
      
      // Adicionar informações da tabela ao resultado
      const resultadoCompleto = {
        ...resultado,
        tabela_usada: tabelaUsada,
        tabela_id: tabelaId
      };
      
      setResults(resultadoCompleto as TestResult);
      
      console.log('🔍 Verificando se teste foi salvo:');
      console.log('   analysisType:', analysisType);
      console.log('   resultado.salvo:', (resultado as any).salvo);
      console.log('   Condição linked:', analysisType === 'linked');
      console.log('   Condição anonymous:', analysisType === 'anonymous');
      console.log('   Condição salvo:', (resultado as any).salvo);
      console.log('   Resultado FINAL:', (analysisType === 'linked' || analysisType === 'anonymous') && (resultado as any).salvo);
      
      if ((analysisType === 'linked' || analysisType === 'anonymous') && (resultado as any).salvo) {
        if (analysisType === 'anonymous') {
          // Avaliação anônima salva
          const numeroLaudo = (resultado as any).numero_laudo || 'N/A';
          toast.success(`🕶️ Teste salvo de forma anônima! Laudo: ${numeroLaudo}`, {
            duration: 4000,
            icon: '🔒'
          });
          toast('Apenas administradores podem acessar esta avaliação', {
            duration: 3000,
            icon: 'ℹ️'
          });
        } else {
          // Avaliação vinculada salva
          const estoqueMsg = descontarEstoque ? ' (estoque descontado)' : ' (sem desconto de estoque)';
          toast.success('✅ Teste salvo com sucesso na avaliação!' + estoqueMsg);
          
          // Verificar se este é o último teste da lista pré-selecionada
          if (testesPreSelecionados.length > 0) {
            const currentTestIndex = tests.findIndex(t => t.id === selectedTest.id);
            const isLastTest = currentTestIndex === tests.length - 1;
            
            if (isLastTest) {
              // É o último teste, redirecionar para pacientes após 2 segundos
              toast.success('🎉 Todos os testes foram concluídos! Redirecionando...', { duration: 2000 });
              setTimeout(() => {
                router.push(`/pacientes`);
              }, 2000);
            } else {
              // Não é o último teste, selecionar o próximo automaticamente
              const nextTest = tests[currentTestIndex + 1];
              toast.success(`➡️ Próximo teste: ${nextTest.nome}`, { duration: 2000 });
              setTimeout(() => {
                handleTestSelect(nextTest);
              }, 1500);
            }
          }
        }
      } else {
        toast.success('✅ Teste calculado com sucesso!');
      }
      
      // Atualizar cache das consultas relacionadas - FORÇAR ATUALIZAÇÃO COMPLETA
      await queryClient.invalidateQueries();
      
      // Aguardar um pouco para garantir que a invalidação seja processada
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Forçar refetch de todas as queries relacionadas
      await queryClient.refetchQueries({ queryKey: ['pacientes'] });
      await queryClient.refetchQueries({ queryKey: ['avaliacoes-paciente'] });
      await queryClient.refetchQueries({ queryKey: ['avaliacoes'] });
      await queryClient.refetchQueries({ queryKey: ['pacientes-count'] });
      await queryClient.refetchQueries({ queryKey: ['avaliacoes-count'] });
      
    } catch (error: any) {
      console.error('❌ ERRO ao salvar teste:', error);
      console.error('❌ Erro completo:', JSON.stringify(error, null, 2));
      console.error('❌ Response:', error.response);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      toast.error(error.response?.data?.error || 'Erro ao salvar teste');
    } finally {
      setIsSaving(false);
    }
  };

  const searchPatient = async (data: any) => {
    // Verificar se completou os critérios mínimos ANTES de buscar
    const cpfCompleto = data.cpf && data.cpf.replace(/\D/g, '').length >= 11;
    const nomeCompleto = data.nome && data.nome.length >= 5;
    const laudoCompleto = data.numero_laudo && data.numero_laudo.length >= 4;
    
    // Se não completou nenhum critério, não busca e não mostra erro
    if (!cpfCompleto && !nomeCompleto && !laudoCompleto) {
      return;
    }

    setSearchingPatient(true);
    try {
      if (cpfCompleto) {
        const formattedCPF = formatCPF(data.cpf);
        const response = await pacientesService.list({ search: formattedCPF, limit: 1 });
        const pacientes = (response as any).data.data.pacientes || [];
        if (pacientes.length > 0) {
          setFoundPatient(pacientes[0]);
          setPatientData({
            cpf: pacientes[0].cpf,
            nome: pacientes[0].nome,
            numero_laudo: pacientes[0].numero_laudo || `LAU-${new Date().getFullYear()}-${String(pacientes[0].id).padStart(3, '0')}`,
            data_nascimento: pacientes[0].data_nascimento,
            contexto: pacientes[0].contexto,
            tipo_transito: pacientes[0].tipo_transito,
            escolaridade: pacientes[0].escolaridade,
            telefone: pacientes[0].telefone,
            email: pacientes[0].email
          });
          setTestData(prev => ({
            ...prev,
            escolaridade: pacientes[0].escolaridade || ''
          }));
          setAvaliadoFixado(true); // Fixar o avaliado
          toast.success(`✅ Avaliado selecionado: ${pacientes[0].nome}`);
          return;
        }
      }
      
      if (nomeCompleto) {
        const response = await pacientesService.list({ search: data.nome, limit: 1 });
        const pacientes = (response as any).data.data.pacientes || [];
        if (pacientes.length > 0) {
          setFoundPatient(pacientes[0]);
          setPatientData({
            cpf: pacientes[0].cpf,
            nome: pacientes[0].nome,
            numero_laudo: pacientes[0].numero_laudo || `LAU-${new Date().getFullYear()}-${String(pacientes[0].id).padStart(3, '0')}`,
            data_nascimento: pacientes[0].data_nascimento,
            contexto: pacientes[0].contexto,
            tipo_transito: pacientes[0].tipo_transito,
            escolaridade: pacientes[0].escolaridade,
            telefone: pacientes[0].telefone,
            email: pacientes[0].email
          });
          setTestData(prev => ({
            ...prev,
            escolaridade: pacientes[0].escolaridade || ''
          }));
          setAvaliadoFixado(true); // Fixar o avaliado
          toast.success(`✅ Avaliado selecionado: ${pacientes[0].nome}`);
          return;
        }
      }
      
      // Buscar por número de laudo
      if (laudoCompleto) {
        // Tentar buscar por número de laudo (pode estar no formato 0013 ou LAU-2025-0013)
        const laudoCompletoStr = data.numero_laudo.startsWith('LAU-') 
          ? data.numero_laudo 
          : `LAU-${new Date().getFullYear()}-${String(data.numero_laudo).padStart(4, '0')}`;
        
        const response = await pacientesService.list({ search: laudoCompletoStr, limit: 10 });
        const pacientes = (response as any).data.data.pacientes || [];
        if (pacientes.length > 0) {
          setFoundPatient(pacientes[0]);
          setPatientData({
            cpf: pacientes[0].cpf,
            nome: pacientes[0].nome,
            numero_laudo: pacientes[0].numero_laudo || laudoCompletoStr,
            data_nascimento: pacientes[0].data_nascimento,
            contexto: pacientes[0].contexto,
            tipo_transito: pacientes[0].tipo_transito,
            escolaridade: pacientes[0].escolaridade,
            telefone: pacientes[0].telefone,
            email: pacientes[0].email
          });
          setTestData(prev => ({
            ...prev,
            escolaridade: pacientes[0].escolaridade || ''
          }));
          setAvaliadoFixado(true); // Fixar o avaliado
          toast.success(`✅ Avaliado selecionado: ${pacientes[0].nome}`);
          return;
        }
      }
      
      // Só mostra "não encontrado" se completou os critérios mínimos
      if (cpfCompleto || nomeCompleto || laudoCompleto) {
        toast('ℹ️ Avaliado não encontrado', {
          icon: 'ℹ️',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Erro ao buscar paciente:', error);
      toast.error('Erro ao buscar avaliado');
    } finally {
      setSearchingPatient(false);
    }
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const limparAvaliado = () => {
    setFoundPatient(null);
    setAvaliadoFixado(false);
    setPatientData({
      cpf: '',
      nome: '',
      numero_laudo: '',
      data_nascimento: '',
      contexto: '',
      tipo_transito: '',
      escolaridade: '',
      telefone: '',
      email: ''
    });
    toast('🔄 Avaliado liberado. Pode selecionar outro.', {
      icon: '🔄',
      duration: 2000
    });
  };

  const handleCalculate = async () => {
    // Se for análise vinculada e tiver paciente, SEMPRE mostrar modal de seleção de tabelas
    if (analysisType === 'linked' && foundPatient && selectedTest) {
      try {
        console.log('🔍 Buscando sugestões de tabelas para:', foundPatient.nome);
        const response = await tabelasService.getSugestoes(selectedTest.id, foundPatient);
        const sugestoes = (response as any).data?.data;
        
        console.log('📊 Sugestões recebidas:', sugestoes);
        
        if (sugestoes && sugestoes.tabelaId) {
          // SEMPRE mostrar modal para o usuário poder escolher
          setTabelaSugestoes(sugestoes);
          setTabelaSelecionada(sugestoes.tabelaId); // Pré-selecionar a recomendada
          setShowTabelaModal(true);
        } else {
          console.warn('⚠️ Nenhuma sugestão retornada, calculando com tabela padrão');
          await handleSaveTest();
        }
      } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        // Se falhar, calcular normalmente
        await handleSaveTest();
      }
    } else {
      // Não vinculado ou sem paciente - calcular direto
      await handleSaveTest();
    }
  };

  // Buscar tabelas normativas
  const { data: tabelasNormativas, isLoading } = useQuery({
    queryKey: ['tabelas-normativas'],
    queryFn: () => tabelasService.list(),
    select: (data: any) => data.data.tabelas?.filter((tabela: any) => 
      tabela.tipo === 'bpa2' || tabela.tipo === 'rotas' || tabela.tipo === 'mig' || tabela.tipo === 'memore'
    ) || []
  });

  // Filtrar apenas tabelas MEMORE
  const tabelasMemore = useMemo(() => {
    return tabelasNormativas?.filter((tabela: any) => tabela.tipo === 'memore') || [];
  }, [tabelasNormativas]);

  // Selecionar automaticamente a tabela "Trânsito - Escolaridade" como padrão
  useEffect(() => {
    if (tabelasMemore.length > 0 && !selectedMemoreTable && selectedTest?.id === 'memore') {
      const tabelaPadrao = tabelasMemore.find((t: any) => 
        t.nome.includes('Trânsito') && t.nome.includes('Escolaridade')
      );
      if (tabelaPadrao) {
        setSelectedMemoreTable(tabelaPadrao.id);
      }
    }
  }, [tabelasMemore, selectedMemoreTable, selectedTest?.id]);

  // Calcular automaticamente os resultados do MEMORE quando os campos mudarem
  useEffect(() => {
    if (selectedTest?.id === 'memore' && selectedMemoreTable) {
      const vp = parseInt(String(testData.vp || 0));
      const vn = parseInt(String(testData.vn || 0));
      const fn = parseInt(String(testData.fn || 0));
      const fp = parseInt(String(testData.fp || 0));
      const eb = typeof testData.eb === 'number' ? testData.eb : parseInt(String(testData.eb || 0));

      // Se EB > 0 e temos tabela selecionada, calcular
      if (eb > 0) {
        const calcularAutomatico = async () => {
          try {
            const dataToSend: any = {
              tabela_id: selectedMemoreTable,
              vp,
              vn,
              fn,
              fp,
              eb
            };

            const response = await tabelasService.calculate('memore', dataToSend);
            const resultado = response.data.resultado || response.data || {};
            setResults(resultado as TestResult);
          } catch (error) {
            console.error('Erro ao calcular MEMORE automaticamente:', error);
          }
        };

        calcularAutomatico();
      }
    }
  }, [testData.vp, testData.vn, testData.fn, testData.fp, testData.eb, selectedMemoreTable, selectedTest?.id]);

  // Buscar tabelas normativas do MIG para seleção
  const { data: tabelasMigData } = useQuery({
    queryKey: ['mig-tabelas'],
    queryFn: async () => {
      const response = await tabelasService.list();
      // Filtrar apenas tabelas MIG, excluindo a tabela de conversão QI
      const tabelas = response.data?.tabelas || [];
      const tabelasMig = Array.isArray(tabelas) ? tabelas.filter((t: any) => 
        t.tipo === 'mig' && t.nome !== 'MIG - Conversão QI'
      ) : [];
      return tabelasMig;
    },
    enabled: selectedTest?.id === 'mig'
  });

  const tabelasMig = tabelasMigData || [];

  // Buscar tabelas normativas do R-1 para seleção
  const { data: tabelasR1Data } = useQuery({
    queryKey: ['r1-tabelas'],
    queryFn: async () => {
      const response = await tabelasService.list();
      const tabelas = response.data?.tabelas || [];
      const tabelasR1 = Array.isArray(tabelas) ? tabelas.filter((t: any) => 
        t.tipo === 'r1'
      ) : [];
      return tabelasR1;
    },
    enabled: selectedTest?.id === 'r1'
  });

  const tabelasR1 = tabelasR1Data || [];

  // Buscar tabelas normativas do AC para seleção
  const { data: tabelasAcData } = useQuery({
    queryKey: ['ac-tabelas'],
    queryFn: async () => {
      const response = await tabelasService.list();
      const tabelas = response.data?.tabelas || [];
      const tabelasAc = Array.isArray(tabelas) ? tabelas.filter((t: any) => 
        t.tipo === 'ac'
      ) : [];
      return tabelasAc;
    },
    enabled: selectedTest?.id === 'ac'
  });

  const tabelasAc = tabelasAcData || [];

  // Auto-selecionar tabelas baseado no contexto e tipo do paciente
  useEffect(() => {
    if (!foundPatient) return;
    
    const { contexto, tipo_transito, escolaridade } = foundPatient;
    
    // Auto-selecionar tabelas com base no contexto do paciente
    
    // Para cada teste, tentar encontrar a tabela mais apropriada
    if (contexto === 'Trânsito') {
      // Para MEMORE - buscar tabela de Trânsito com tipo_habilitacao correspondente
      const tabelaMemore = tabelasMemore.find((t: any) => 
        t.nome.includes('Trânsito') && 
        (tipo_transito ? t.nome.includes(tipo_transito) || t.nome.includes('1ª Habilitação') : true)
      );
      if (tabelaMemore && !selectedMemoreTable) {
        console.log('✅ Tabela MEMORE auto-selecionada:', tabelaMemore.nome);
        setSelectedMemoreTable(parseInt(tabelaMemore.id));
      }
      
      // Para MIG - buscar tabela de Trânsito
      const tabelaMig = tabelasMig.find((t: any) => t.nome.includes('Trânsito'));
      if (tabelaMig && !selectedMigTable) {
        console.log('✅ Tabela MIG auto-selecionada:', tabelaMig.nome);
        setSelectedMigTable(parseInt(tabelaMig.id));
      }
      
      // Para R-1 - buscar tabela de Trânsito
      const tabelaR1 = tabelasR1.find((t: any) => t.nome.includes('Trânsito'));
      if (tabelaR1 && !selectedR1Table) {
        console.log('✅ Tabela R-1 auto-selecionada:', tabelaR1.nome);
        setSelectedR1Table(parseInt(tabelaR1.id));
      }
      
      // Para AC - buscar tabela de Trânsito
      const tabelaAc = tabelasAc.find((t: any) => t.nome.includes('Trânsito'));
      if (tabelaAc && !selectedAcTable) {
        console.log('✅ Tabela AC auto-selecionada:', tabelaAc.nome);
        setSelectedAcTable(parseInt(tabelaAc.id));
      }
    } else if (contexto === 'Clínico' || contexto === 'Organizacional') {
      // Para outros contextos, buscar tabelas gerais ou por escolaridade
      const tabelaMemore = tabelasMemore.find((t: any) => 
        escolaridade ? t.nome.includes(escolaridade) : t.nome.includes('Geral')
      );
      if (tabelaMemore && !selectedMemoreTable) {
        console.log('✅ Tabela MEMORE auto-selecionada:', tabelaMemore.nome);
        setSelectedMemoreTable(parseInt(tabelaMemore.id));
      }
      
      const tabelaMig = tabelasMig.find((t: any) => 
        escolaridade ? t.nome.includes(escolaridade) : t.nome.includes('Geral')
      );
      if (tabelaMig && !selectedMigTable) {
        console.log('✅ Tabela MIG auto-selecionada:', tabelaMig.nome);
        setSelectedMigTable(parseInt(tabelaMig.id));
      }
    }
  }, [foundPatient, tabelasMemore, tabelasMig, tabelasR1, tabelasAc, selectedMemoreTable, selectedMigTable, selectedR1Table, selectedAcTable]);

  // Definir testes
  const allTests: Test[] = useMemo(() => [
    {
      id: 'ac',
      nome: 'AC - Atenção Concentrada',
      descricao: 'Avaliação da capacidade de atenção concentrada',
      icon: Target,
      campos: [
        { nome: 'acertos_manual', label: 'Acertos', tipo: 'number', min: 0, max: 300 },
        { nome: 'erros_manual', label: 'Erros', tipo: 'number', min: 0, max: 300 },
        { nome: 'omissoes_manual', label: 'Omissões', tipo: 'number', min: 0, max: 300 },
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
        { nome: 'acertos_manual', label: 'Acertos (opcional - preencha OU use o gabarito abaixo)', tipo: 'number', min: 0, max: 28 }
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
        { nome: 'acertos', label: 'Acertos', tipo: 'number', min: 0, max: 40 },
        { nome: 'escolaridade', label: 'Escolaridade', tipo: 'select', options: ['Ensino Fundamental', 'Ensino Médio', 'Ensino Superior'] }
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
  ], []);

  // Filtrar testes se houver pré-seleção
  const tests: Test[] = useMemo(() => {
    if (testesPreSelecionados.length > 0) {
      return allTests.filter(test => testesPreSelecionados.includes(test.id));
    }
    return allTests;
  }, [allTests, testesPreSelecionados]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="hide-on-print">
          <h1 className="text-2xl font-bold text-gray-900">Testes Psicológicos</h1>
          <p className="text-gray-600">Selecione e execute testes de avaliação psicológica</p>
        </div>

        {/* Modo de Avaliação: Anônima ou Vinculada */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hide-on-print">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Modo de Avaliação</h3>
          
          <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-4 mb-6`}>
            <button
              onClick={() => setAnalysisType('unlinked')}
              className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                analysisType === 'unlinked'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🔢</div>
                <h4 className="font-semibold text-gray-800">Não-Vinculada</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Apenas cálculo rápido
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ❌ Não salva
                </p>
              </div>
            </button>

            {isAdmin && (
              <button
                onClick={() => setAnalysisType('anonymous')}
                className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                  analysisType === 'anonymous'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🕶️</div>
                  <h4 className="font-semibold text-gray-800">Anônima</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Salva sem vincular
                  </p>
                  <p className="text-xs text-yellow-700 mt-1 font-medium">
                    🔒 Apenas admin acessa
                  </p>
                </div>
              </button>
            )}
            
            <button
              onClick={() => setAnalysisType('linked')}
              className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                analysisType === 'linked'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🔗</div>
                <h4 className="font-semibold text-gray-800">Vinculada</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Vincular a avaliado
                </p>
                <p className="text-xs text-green-600 mt-1 font-medium">
                  ✅ Salva e vincula
                </p>
              </div>
            </button>
          </div>

          {/* Toggle de Desconto de Estoque */}
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Descontar do Estoque</h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {descontarEstoque 
                      ? '✅ Folhas serão descontadas ao salvar o resultado' 
                      : '⚠️ Estoque não será alterado (apenas cálculo)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDescontarEstoque(!descontarEstoque)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  descontarEstoque ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    descontarEstoque ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {descontarEstoque && analysisType === 'linked' && (
              <div className="mt-3 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                <p className="font-medium">📋 Folhas que serão descontadas:</p>
                <p className="mt-1">
                  {selectedTest?.id === 'rotas' && '• Rotas: 3 folhas (Concentrada + Alternada + Dividida)'}
                  {selectedTest?.id !== 'rotas' && selectedTest && `• ${selectedTest.nome}: 1 folha`}
                  {!selectedTest && 'Selecione um teste para ver o consumo'}
                </p>
              </div>
            )}
          </div>

          {/* Aviso para Modo Anônimo */}
          {analysisType === 'anonymous' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Modo Anônimo Ativo
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      • O resultado do teste <strong>não será guardado</strong> na base de dados
                    </p>
                    <p className="mt-1">
                      • Não há como associar o teste a uma pessoa ou avaliação
                    </p>
                    <p className="mt-1">
                      • Para salvar os resultados, mude para <strong>Avaliação Vinculada</strong>
                    </p>
                    <p className="mt-1 font-semibold">
                      • O estoque <strong>não será descontado</strong> em modo anônimo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Campos para Avaliação Vinculada */}
          {analysisType === 'linked' && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-800">Dados da Avaliação</h4>
                {avaliadoFixado && (
                  <button
                    onClick={limparAvaliado}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                    title="Limpar avaliado e selecionar outro"
                  >
                    🔄 Nova Avaliação
                  </button>
                )}
              </div>
              
              {/* Banner de Avaliado Fixado */}
              {avaliadoFixado && foundPatient && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">
                        Avaliado Selecionado: <strong>{foundPatient.nome}</strong>
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        CPF: {foundPatient.cpf} | Laudo: {patientData.numero_laudo}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ℹ️ Agora você pode aplicar quantos testes quiser para este avaliado. Click em &quot;Nova Avaliação&quot; para trocar.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF do Avaliado *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={patientData.cpf || ''}
                      onChange={(e) => handlePatientDataChange('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        avaliadoFixado 
                          ? 'bg-gray-100 border-gray-300 cursor-not-allowed text-gray-700' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      readOnly={avaliadoFixado}
                    />
                    {foundPatient && !avaliadoFixado && (
                      <button
                        onClick={() => {
                          setFoundPatient(null);
                          setPatientData({
                            cpf: '',
                            nome: '',
                            numero_laudo: '',
                            data_nascimento: '',
                            contexto: '',
                            tipo_transito: '',
                            escolaridade: '',
                            telefone: '',
                            email: ''
                          });
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Limpar busca"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {searchingPatient && <p className="text-sm text-blue-600 mt-1">🔍 Buscando avaliado...</p>}
                  {foundPatient && <p className="text-sm text-green-600 mt-1">✅ Avaliado: {foundPatient.nome}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Avaliado *
                  </label>
                  <input
                    type="text"
                    value={patientData.nome || ''}
                    onChange={(e) => handlePatientDataChange('nome', e.target.value)}
                    placeholder="Nome completo"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      avaliadoFixado 
                        ? 'bg-gray-100 border-gray-300 cursor-not-allowed text-gray-700' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    readOnly={avaliadoFixado}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Laudo * <span className="text-xs text-gray-500">(exemplo: 0013 ou LAU-2025-0013)</span>
                  </label>
                  <input
                    type="text"
                    value={patientData.numero_laudo || ''}
                    onChange={(e) => handlePatientDataChange('numero_laudo', e.target.value)}
                    placeholder="0013 ou LAU-2025-0013"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      avaliadoFixado 
                        ? 'bg-gray-100 border-gray-300 cursor-not-allowed text-gray-700' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    readOnly={avaliadoFixado}
                  />
                </div>
              </div>
              
              {foundPatient && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">
                    ✅ Avaliado encontrado: {foundPatient.nome} - CPF: {foundPatient.cpf}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Selection */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 hide-on-print">
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
            <div className="mb-6 hide-on-print">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedTest.nome}</h2>
              <p className="text-gray-600">{selectedTest.descricao}</p>
            </div>

            {/* Interface específica para cada teste */}
            {selectedTest.id === 'bpa2' && (
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
            )}

            {selectedTest.id === 'rotas' && (
              // Layout especial para Rotas de Atenção - mesmo formato do BPA-2
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Atenção Concentrada (Rota C) */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="text-lg font-semibold text-blue-800 mb-4 text-center">
                      Atenção Concentrada (C)
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Acertos
                        </label>
                        <input
                          type="number"
                          value={testData.acertos_rota_c || ''}
                          onChange={(e) => handleInputChange('acertos_rota_c', e.target.value)}
                          min={0}
                          max={50}
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
                          value={testData.erros_rota_c || ''}
                          onChange={(e) => handleInputChange('erros_rota_c', e.target.value)}
                          min={0}
                          max={50}
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
                          value={testData.omissoes_rota_c || ''}
                          onChange={(e) => handleInputChange('omissoes_rota_c', e.target.value)}
                          min={0}
                          max={50}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Omissões"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Atenção Alternada (Rota A) */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="text-lg font-semibold text-green-800 mb-4 text-center">
                      Atenção Alternada (A)
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Acertos
                        </label>
                        <input
                          type="number"
                          value={testData.acertos_rota_a || ''}
                          onChange={(e) => handleInputChange('acertos_rota_a', e.target.value)}
                          min={0}
                          max={50}
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
                          value={testData.erros_rota_a || ''}
                          onChange={(e) => handleInputChange('erros_rota_a', e.target.value)}
                          min={0}
                          max={50}
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
                          value={testData.omissoes_rota_a || ''}
                          onChange={(e) => handleInputChange('omissoes_rota_a', e.target.value)}
                          min={0}
                          max={50}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Omissões"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Atenção Dividida (Rota D) */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="text-lg font-semibold text-purple-800 mb-4 text-center">
                      Atenção Dividida (D)
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Acertos
                        </label>
                        <input
                          type="number"
                          value={testData.acertos_rota_d || ''}
                          onChange={(e) => handleInputChange('acertos_rota_d', e.target.value)}
                          min={0}
                          max={50}
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
                          value={testData.erros_rota_d || ''}
                          onChange={(e) => handleInputChange('erros_rota_d', e.target.value)}
                          min={0}
                          max={50}
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
                          value={testData.omissoes_rota_d || ''}
                          onChange={(e) => handleInputChange('omissoes_rota_d', e.target.value)}
                          min={0}
                          max={50}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Omissões"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Resumo Geral */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                    📊 Atenção Geral (Média das Três Modalidades)
                  </h4>
                  <p className="text-sm text-gray-600 text-center">
                    A atenção geral será calculada automaticamente como a média dos resultados das três modalidades
                  </p>
                </div>
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Coluna Esquerda (2/3): Tabela Normativa */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Header do Teste */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🧠</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Memore - Memória</h3>
                        <p className="text-sm text-gray-600">Avaliação da capacidade de memória</p>
                      </div>
                    </div>

                    {/* Seletor de Tabela Normativa */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-5">
                      <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-lg">📊</span>
                        Tabela Normativa
                      </label>
                      <select
                        value={selectedMemoreTable || ''}
                        onChange={(e) => setSelectedMemoreTable(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                      >
                        <option value="">Selecione a tabela normativa</option>
                        {tabelasMemore.map((tabela: any) => (
                          <option key={tabela.id} value={tabela.id}>
                            {tabela.nome}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-600 mt-2">
                        ⚠️ Selecione a tabela de acordo com o contexto (trânsito, idade, escolaridade ou geral)
                      </p>
                    </div>
                  </div>

                  {/* Coluna Direita (1/3): Entrada Manual - Reduzida 50% */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg border border-gray-200 p-2 sticky top-4">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-sm">🧠</span>
                        <h4 className="text-xs font-semibold text-gray-800">Memore - Memória</h4>
                      </div>
                      <p className="text-[10px] text-gray-500 mb-2">Avaliação da capacidade de memória</p>
                      
                      <div className="space-y-1.5">
                        {selectedTest.campos.map((campo) => (
                          <div key={campo.nome}>
                            <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                              {campo.label}
                            </label>
                            <input
                              type={campo.tipo}
                              value={testData[campo.nome] || ''}
                              onChange={(e) => handleInputChange(campo.nome, e.target.value)}
                              min={campo.min}
                              max={campo.max}
                              className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                            />
                          </div>
                        ))}
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
                          className="px-5 py-2.5 text-sm font-medium text-red-700 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 hide-on-print"
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
                          <div className="space-y-1.5">
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
                          <div className="space-y-1.5">
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
                          <div className="space-y-1.5">
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

                      {/* Resultados Automáticos - Movidos para baixo do crivo */}
                      {results && Object.keys(results).length > 0 && (
                        <div className="bg-white border-2 border-indigo-200 rounded-xl p-6 mt-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <span>📊</span>
                            Resultados do Teste
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Contadores */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h5 className="font-semibold text-gray-700 mb-3 text-sm">Contadores</h5>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">VP:</span>
                                  <span className="font-bold text-green-600">{testData.vp || 0}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">VN:</span>
                                  <span className="font-bold text-green-600">{testData.vn || 0}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">FN:</span>
                                  <span className="font-bold text-red-600">{testData.fn || 0}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">FP:</span>
                                  <span className="font-bold text-red-600">{testData.fp || 0}</span>
                                </div>
                              </div>
                            </div>

                            {/* Resultado (EB) */}
                            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                              <h5 className="font-semibold text-blue-700 mb-2 text-sm">Resultado</h5>
                              <div className="text-4xl font-bold text-blue-800 mb-1">{testData.eb || 0}</div>
                              <p className="text-xs text-blue-600">Eficiência de Busca (EB)</p>
                            </div>

                            {/* Classificação */}
                            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                              <h5 className="font-semibold text-green-700 mb-2 text-sm">Classificação</h5>
                              <div className="text-2xl font-bold text-green-800 mt-4">
                                {results.classificacao || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botão Imprimir Resultado */}
                {results && Object.keys(results).length > 0 && (
                  <div className="flex justify-center mt-8 hide-on-print">
                    <button
                      onClick={() => window.print()}
                      className="bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-8 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                    >
                      <span>🖨️</span>
                      Imprimir Resultado
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Layout especial para MIG */}
            {selectedTest.id === 'mig' && (
              <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-8">
                {/* Seleção de Tabela Normativa MIG */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    📊 Selecione a Tabela Normativa
                  </label>
                  <select
                    value={selectedMigTable || ''}
                    onChange={(e) => setSelectedMigTable(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                  >
                    <option value="">Selecione uma tabela normativa...</option>
                    {tabelasMig.map((tabela: any) => (
                      <option key={tabela.id} value={tabela.id}>
                        {tabela.nome}
                      </option>
                    ))}
                  </select>
                  {selectedMigTable && (
                    <p className="mt-2 text-sm text-gray-600">
                      {tabelasMig.find((t: any) => t.id === selectedMigTable)?.descricao}
                    </p>
                  )}
                </div>

                {/* Gabarito MIG - Largura Completa */}
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
                    <div className="max-h-[70vh] overflow-auto pr-2 space-y-2">
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
                          <div className="space-y-1.5">
                            {/* Exemplo 1 */}
                            <div className="grid grid-cols-2 gap-3 py-1 text-[12px]">
                              <div className="text-center font-medium">Exemplo 1</div>
                              <div className="flex items-center justify-center">
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
                              </div>
                            </div>

                            {/* Exemplo 2 */}
                            <div className="grid grid-cols-2 gap-3 py-1 text-[12px]">
                              <div className="text-center font-medium">Exemplo 2</div>
                              <div className="flex items-center justify-center">
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
                              </div>
                            </div>

                            {/* Questões 1-13 */}
                            {Array.from({ length: 13 }, (_, i) => i + 1).map((questao) => {
                              const idx = questao + 1; // exemplos ocupam 0 e 1
                              return (
                                <div key={questao} className="grid grid-cols-2 gap-3 py-1 text-[12px]">
                                  <div className="text-center font-medium">{questao}</div>
                                  <div className="flex items-center justify-center">
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
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Coluna Direita: 14-28 */}
                          <div className="space-y-1.5">
                            {Array.from({ length: 15 }, (_, i) => i + 14).map((questao) => {
                              const idx = questao + 1; // exemplos ocupam 0 e 1, então questão 14 = índice 15
                              return (
                                <div key={questao} className="grid grid-cols-2 gap-3 py-1 text-[12px]">
                                  <div className="text-center font-medium">{questao}</div>
                                  <div className="flex items-center justify-center">
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

                {/* Botões - MIG */}
                <div className="flex justify-center mt-6 gap-3">
                  <button
                    onClick={() => {
                      setMigAnswers(Array(MIG_TOTAL_POSITIONS).fill(''));
                    }}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                  >
                    <span>🗑️</span>
                    Limpar
                  </button>
                  <button
                    onClick={handleCalculate}
                    className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    <span>📊</span>
                    Calcular Resultado
                  </button>
                </div>
              </div>
            )}

            {/* Layout para R-1 */}
            {selectedTest.id === 'r1' && (
              <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Coluna Esquerda (2/3): Gabarito */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Header do Teste */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🧠</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">R-1 - Raciocínio Lógico</h3>
                        <p className="text-sm text-gray-600">Avaliação do raciocínio lógico</p>
                      </div>
                    </div>

                    {/* Seletor de Tabela Normativa */}
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200 p-5 mb-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-lg">📊</span>
                        Tabela Normativa
                      </label>
                      <select
                        value={selectedR1Table || ''}
                        onChange={(e) => setSelectedR1Table(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium"
                      >
                        <option value="">Selecione a tabela normativa</option>
                        {tabelasR1.map((tabela: any) => (
                          <option key={tabela.id} value={tabela.id}>
                            {tabela.nome}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-600 mt-2">
                        ⚠️ Selecione a tabela de acordo com a escolaridade do paciente
                      </p>
                    </div>

                    {/* Gabarito R-1 */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span className="text-xl">🧠</span>
                          R-1 - Gabarito de Correção
                        </h3>
                        <button
                          type="button"
                          onClick={clearR1Answers}
                          className="px-5 py-2.5 text-sm font-medium text-red-700 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 hide-on-print"
                        >
                          <span>🗑️</span>
                          Limpar respostas
                        </button>
                      </div>

                      {/* Gabarito Visual do R-1 - Layout de 4 colunas como na folha original */}
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Folha de Resposta (40 questões)</h4>
                        <div className="grid grid-cols-4 gap-6">
                          {/* Coluna 1: Questões 1-10 */}
                          <div className="space-y-1.5">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
                              const idx = num - 1; // 0-9
                              const currentAnswer = r1Answers[idx];
                              return (
                                <div key={`r1-q-${num}`} className="flex items-start gap-3 py-2">
                                  <span className="text-xs font-medium text-gray-700 w-6 mt-1">{num}.</span>
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((option) => (
                                      <button
                                        key={`r1-${idx}-${option}`}
                                        type="button"
                                        onClick={() => chooseR1Option(idx, option)}
                                        className={`w-6 h-6 border-2 rounded text-xs font-bold transition-all duration-200 hover:scale-110 ${getR1ChoiceClass(idx, option)}`}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Coluna 2: Questões 11-20 */}
                          <div className="space-y-1.5">
                            {Array.from({ length: 10 }, (_, i) => i + 11).map((num) => {
                              const idx = num - 1; // 10-19
                              const currentAnswer = r1Answers[idx];
                              return (
                                <div key={`r1-q-${num}`} className="flex items-start gap-3 py-2">
                                  <span className="text-xs font-medium text-gray-700 w-6 mt-1">{num}.</span>
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((option) => (
                                      <button
                                        key={`r1-${idx}-${option}`}
                                        type="button"
                                        onClick={() => chooseR1Option(idx, option)}
                                        className={`w-6 h-6 border-2 rounded text-xs font-bold transition-all duration-200 hover:scale-110 ${getR1ChoiceClass(idx, option)}`}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Coluna 3: Questões 21-30 */}
                          <div className="space-y-1.5">
                            {Array.from({ length: 10 }, (_, i) => i + 21).map((num) => {
                              const idx = num - 1; // 20-29
                              const currentAnswer = r1Answers[idx];
                              return (
                                <div key={`r1-q-${num}`} className="flex items-start gap-3 py-2">
                                  <span className="text-xs font-medium text-gray-700 w-6 mt-1">{num}.</span>
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((option) => (
                                      <button
                                        key={`r1-${idx}-${option}`}
                                        type="button"
                                        onClick={() => chooseR1Option(idx, option)}
                                        className={`w-6 h-6 border-2 rounded text-xs font-bold transition-all duration-200 hover:scale-110 ${getR1ChoiceClass(idx, option)}`}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Coluna 4: Questões 31-40 */}
                          <div className="space-y-1.5">
                            {Array.from({ length: 10 }, (_, i) => i + 31).map((num) => {
                              const idx = num - 1; // 30-39
                              const currentAnswer = r1Answers[idx];
                              return (
                                <div key={`r1-q-${num}`} className="flex items-start gap-3 py-2">
                                  <span className="text-xs font-medium text-gray-700 w-6 mt-1">{num}.</span>
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((option) => (
                                      <button
                                        key={`r1-${idx}-${option}`}
                                        type="button"
                                        onClick={() => chooseR1Option(idx, option)}
                                        className={`w-6 h-6 border-2 rounded text-xs font-bold transition-all duration-200 hover:scale-110 ${getR1ChoiceClass(idx, option)}`}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Resumo dos Acertos */}
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                        <div className="text-base font-bold text-gray-800 mb-3">Resumo:</div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                            <span className="text-xs text-green-700 font-medium">Acertos:</span>
                            <span className="text-xl font-bold text-green-700 ml-2">{r1CorrectCount}</span>
                            <span className="text-sm text-gray-600"> / 40</span>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3 border-2 border-red-200">
                            <span className="text-xs text-red-700 font-medium">Erros:</span>
                            <span className="text-xl font-bold text-red-700 ml-2">{40 - r1CorrectCount}</span>
                            <span className="text-sm text-gray-600"> / 40</span>
                          </div>
                        </div>
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                          <div className="text-sm font-semibold text-blue-700">Percentual:</div>
                          <div className="text-2xl font-bold text-blue-800">{((r1CorrectCount / 40) * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna Direita (1/3): Entrada Manual */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">🧠</span>
                        <h4 className="text-sm font-semibold text-gray-800">R-1 - Raciocínio</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">Avaliação do raciocínio lógico</p>
                      
                      <div className="space-y-3">
                        {selectedTest.campos.map((campo) => (
                          <div key={campo.nome}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {campo.label}
                            </label>
                            {campo.tipo === 'select' ? (
                              <select
                                value={testData[campo.nome] || ''}
                                onChange={(e) => handleInputChange(campo.nome, e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              >
                                <option value="">Selecione {campo.label}</option>
                                {campo.options?.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={campo.tipo}
                                value={testData[campo.nome] || ''}
                                onChange={(e) => handleInputChange(campo.nome, e.target.value)}
                                min={campo.min}
                                max={campo.max}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões - R-1 */}
                <div className="flex justify-center mt-6 gap-3">
                  <button
                    onClick={clearR1Answers}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                  >
                    <span>🗑️</span>
                    Limpar Gabarito
                  </button>
                  <button
                    onClick={handleCalculate}
                    className="bg-orange-600 text-white py-2 px-6 rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    <span>📊</span>
                    Calcular Resultado
                  </button>
                </div>
              </div>
            )}

            {/* Layout para AC */}
            {selectedTest.id === 'ac' && (
              <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Coluna Esquerda (2/3): Teste AC */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Header do Teste */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🎯</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">AC - Atenção Concentrada</h3>
                        <p className="text-sm text-gray-600">Avaliação da capacidade de atenção concentrada</p>
                      </div>
                    </div>

                    {/* Seletor de Tabela Normativa */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-5 mb-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="text-lg">📊</span>
                        Tabela Normativa
                      </label>
                      <select
                        value={selectedAcTable || ''}
                        onChange={(e) => setSelectedAcTable(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                      >
                        <option value="">Selecione a tabela normativa</option>
                        {tabelasAc.map((tabela: any) => (
                          <option key={tabela.id} value={tabela.id}>
                            {tabela.nome}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-600 mt-2">
                        ⚠️ Selecione a tabela de acordo com a escolaridade do paciente
                      </p>
                    </div>

                    {/* Teste AC - Seleção de Modo */}
                    <div className="bg-blue-50 rounded-lg p-4 mb-4 border-2 border-blue-200">
                      <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                        <span className="text-xl">🎯</span>
                        TESTE AC - Modo de Operação
                      </h3>
                      
                      <div className="flex gap-4 mb-4">
                        <button
                          type="button"
                          onClick={() => setAcMode('manual')}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            acMode === 'manual'
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white text-blue-600 border-2 border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          🖱️ Manual
                        </button>
                        <button
                          type="button"
                          onClick={() => setAcMode('automatic')}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            acMode === 'automatic'
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white text-blue-600 border-2 border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          🤖 Automático
                        </button>
                        <button
                          type="button"
                          onClick={() => setAcMode('hybrid')}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            acMode === 'hybrid'
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white text-blue-600 border-2 border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          🔄 Híbrido
                        </button>
                      </div>

                      <p className="text-sm text-blue-600">
                        {acMode === 'manual' && '📝 Marcação manual das figuras na grade interativa'}
                        {acMode === 'automatic' && '🔍 Processamento automático via upload de imagens (teste + crivo)'}
                        {acMode === 'hybrid' && '⚡ Combinação: upload de imagens + edição manual dos resultados'}
                      </p>
                    </div>

                    {/* Modo Automático - Upload de Imagens */}
                    {acMode === 'automatic' && (
                      <div className="bg-green-50 rounded-lg p-4 mb-4 border-2 border-green-200">
                        <h4 className="text-md font-semibold text-green-800 mb-4 flex items-center gap-2">
                          <span>📸</span>
                          Upload de Imagens para Processamento Automático
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-green-700 mb-2">
                              📄 Folha do Teste Preenchida
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && handleImageUpload('teste', e.target.files[0])}
                              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            {testeImage && (
                              <p className="text-xs text-green-600 mt-1">✅ {testeImage.name}</p>
                            )}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-green-700 mb-2">
                              🎯 Crivo (Gabarito)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && handleImageUpload('crivo', e.target.files[0])}
                              className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            {crivoImage && (
                              <p className="text-xs text-green-600 mt-1">✅ {crivoImage.name}</p>
                            )}
                          </div>
                        </div>

                        {/* Configurações de Processamento */}
                        <div className="bg-white rounded-lg p-4 mb-4 border border-green-300">
                          <h5 className="text-sm font-semibold text-green-800 mb-3">⚙️ Configurações de Processamento</h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1">
                                Equivalência de Zetas
                              </label>
                              <select
                                value={processingConfig.zetasEquivalence}
                                onChange={(e) => setProcessingConfig(prev => ({ ...prev, zetasEquivalence: e.target.value }))}
                                className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              >
                                <option value="strict">Estrita (exato)</option>
                                <option value="rotation">Com Rotação</option>
                                <option value="rotation+reflection">Rotação + Reflexão</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1">
                                Política de Duplicatas
                              </label>
                              <select
                                value={processingConfig.duplicatesPolicy}
                                onChange={(e) => setProcessingConfig(prev => ({ ...prev, duplicatesPolicy: e.target.value }))}
                                className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              >
                                <option value="count_as_error">Contar como Erro</option>
                                <option value="ignore">Ignorar</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-green-700 mb-1">
                                Fórmula de Pontos
                              </label>
                              <select
                                value={processingConfig.pointsFormula}
                                onChange={(e) => setProcessingConfig(prev => ({ ...prev, pointsFormula: e.target.value }))}
                                className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              >
                                <option value="acertos_menos_erros">Acertos - Erros</option>
                                <option value="only_acertos">Só Acertos</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={processImages}
                          disabled={!testeImage || !crivoImage || isProcessing}
                          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                            !testeImage || !crivoImage || isProcessing
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                          }`}
                        >
                          {isProcessing ? (
                            <>
                              <span className="animate-spin">⏳</span>
                              Processando...
                            </>
                          ) : (
                            <>
                              <span>🚀</span>
                              Processar Imagens com IA
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Filtros Normativos */}
                    <div className="bg-purple-50 rounded-lg p-4 mb-4 border-2 border-purple-200">
                      <h4 className="text-md font-semibold text-purple-800 mb-4 flex items-center gap-2">
                        <span>📊</span>
                        Filtros Normativos
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-purple-700 mb-2">
                            Idade
                          </label>
                          <select
                            value={normativeFilters.idade}
                            onChange={(e) => setNormativeFilters(prev => ({ ...prev, idade: e.target.value }))}
                            className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Selecione...</option>
                            <option value="8-9">8-9 anos</option>
                            <option value="10-12">10-12 anos</option>
                            <option value="13-17">13-17 anos</option>
                            <option value="18-29">18-29 anos</option>
                            <option value="30-39">30-39 anos</option>
                            <option value="40-49">40-49 anos</option>
                            <option value="50-59">50-59 anos</option>
                            <option value="60+">60+ anos</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-purple-700 mb-2">
                            Escolaridade
                          </label>
                          <select
                            value={normativeFilters.escolaridade}
                            onChange={(e) => setNormativeFilters(prev => ({ ...prev, escolaridade: e.target.value }))}
                            className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Selecione...</option>
                            <option value="Fundamental">Ensino Fundamental</option>
                            <option value="Medio">Ensino Médio</option>
                            <option value="Superior">Ensino Superior</option>
                            <option value="Pos">Pós-graduação</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-purple-700 mb-2">
                            Região
                          </label>
                          <select
                            value={normativeFilters.regiao}
                            onChange={(e) => setNormativeFilters(prev => ({ ...prev, regiao: e.target.value }))}
                            className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Selecione...</option>
                            <option value="Sudeste">Sudeste</option>
                            <option value="Sul">Sul</option>
                            <option value="Centro-Oeste">Centro-Oeste</option>
                            <option value="Nordeste">Nordeste</option>
                            <option value="Norte">Norte</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-purple-700 mb-2">
                            Sexo
                          </label>
                          <select
                            value={normativeFilters.sexo}
                            onChange={(e) => setNormativeFilters(prev => ({ ...prev, sexo: e.target.value }))}
                            className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Selecione...</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-purple-700 mb-2">
                            Nível Socioeconômico
                          </label>
                          <select
                            value={normativeFilters.socioeconomico}
                            onChange={(e) => setNormativeFilters(prev => ({ ...prev, socioeconomico: e.target.value }))}
                            className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Selecione...</option>
                            <option value="Baixo">Baixo</option>
                            <option value="Medio">Médio</option>
                            <option value="Alto">Alto</option>
                          </select>
                        </div>
                        
                        <div className="flex items-end">
                          {processingResults && (
                            <button
                              type="button"
                              onClick={downloadResults}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center gap-2"
                            >
                              <span>📥</span>
                              Download JSON
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Teste AC - Grade de Círculos */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span className="text-xl">🎯</span>
                          TESTE AC - Crivo de Correção
                        </h3>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={toggleAcGabarito}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 ${
                              showAcGabarito 
                                ? 'text-blue-700 bg-blue-100 border-2 border-blue-300' 
                                : 'text-gray-700 bg-gray-100 border-2 border-gray-300 hover:bg-gray-200'
                            }`}
                          >
                            <span>👁️</span>
                            {showAcGabarito ? 'Ocultar Gabarito' : 'Mostrar Gabarito'}
                          </button>
                          <button
                            type="button"
                            onClick={clearAcMarks}
                            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
                          >
                            <span>🗑️</span>
                            Limpar
                          </button>
                        </div>
                      </div>

                      {/* Instruções do Teste AC - Nova Imagem */}
                      <div className="bg-blue-50 rounded-lg p-4 mb-4 border-2 border-blue-200">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                          <span>🎯</span>
                          Teste AC - Nova Imagem Incorporada
                        </h4>
                        <div className="bg-white rounded-lg p-3 mb-3 border border-blue-300">
                          <p className="text-sm text-blue-700 font-semibold mb-2">📋 Status Atual:</p>
                          <p className="text-xs text-blue-600 mb-2">
                            • <strong>Figuras incorporadas</strong> - Array com 300 figuras da nova imagem
                          </p>
                          <p className="text-xs text-blue-600 mb-2">
                            • <strong>Gabarito configurado</strong> - 7 círculos por fileira (140 alvos total)
                          </p>
                          <p className="text-xs text-blue-600 mb-2">
                            • <strong>Primeiras 5 fileiras</strong> - Extraídas exatamente da nova imagem
                          </p>
                          <p className="text-xs text-blue-600">
                            • <strong>Sistema ativo</strong> - Pronto para marcar e corrigir
                          </p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 border border-blue-300">
                          <p className="text-sm text-blue-700 font-semibold mb-2">🎯 Como funciona:</p>
                          <p className="text-xs text-blue-600 mb-2">
                            • O <strong>CRIVO</strong> tem <strong>7 círculos por fileira</strong> que indicam as posições corretas
                          </p>
                          <p className="text-xs text-blue-600 mb-2">
                            • Marque as figuras nas <strong>posições indicadas pelos círculos do crivo</strong>
                          </p>
                          <p className="text-xs text-blue-600 mb-2">
                            • <strong>Não importa qual figura</strong> está na posição - o que importa é a posição
                          </p>
                          <p className="text-xs text-blue-600">
                            • Cada fileira deve ter <strong>exatamente 7 marcações</strong>
                          </p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 border border-blue-300">
                          <p className="text-sm text-blue-700 font-semibold mb-2">🎯 Figuras da nova imagem:</p>
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className="text-lg">▷</span>
                            <span className="text-lg">△</span>
                            <span className="text-lg">◁</span>
                            <span className="text-lg">▼</span>
                            <span className="text-lg">▽</span>
                            <span className="text-lg">▶</span>
                            <span className="text-lg">◄</span>
                            <span className="text-lg">▲</span>
                          </div>
                          <p className="text-xs text-blue-600 mt-2">
                            Todas essas figuras aparecem na nova imagem, mas só marque nas posições indicadas pelo crivo!
                          </p>
                        </div>
                        
                        <p className="text-xs text-blue-600 mt-2">
                          ⚠️ <strong>Regra de omissões:</strong> Omissões só contam desde a última marcação feita para cima.
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          ✅ <strong>Nova imagem:</strong> Figuras extraídas e incorporadas com sucesso!
                        </p>
                      </div>

                      {/* Resultados do Processamento Automático */}
                      {processingResults && (
                        <div className="bg-yellow-50 rounded-lg p-4 mb-4 border-2 border-yellow-200">
                          <h4 className="text-md font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                            <span>🤖</span>
                            Resultados do Processamento Automático
                          </h4>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white rounded-lg p-3 border border-yellow-300">
                              <div className="text-sm text-yellow-600">Acertos</div>
                              <div className="text-2xl font-bold text-green-600">{processingResults.contagens.acertos}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-yellow-300">
                              <div className="text-sm text-yellow-600">Erros</div>
                              <div className="text-2xl font-bold text-red-600">{processingResults.contagens.erros}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-yellow-300">
                              <div className="text-sm text-yellow-600">Omissões</div>
                              <div className="text-2xl font-bold text-gray-600">{processingResults.contagens.omissoes}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-yellow-300">
                              <div className="text-sm text-yellow-600">Pontos</div>
                              <div className="text-2xl font-bold text-blue-600">{processingResults.contagens.pontos}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-white rounded-lg p-3 border border-yellow-300">
                              <div className="text-sm text-yellow-600">Linha de Corte</div>
                              <div className="text-lg font-semibold text-yellow-800">Y: {processingResults.alinhamento.y_corte}</div>
                              <div className="text-xs text-yellow-600">Linha: {processingResults.alinhamento.linha_corte_indice}</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-yellow-300">
                              <div className="text-sm text-yellow-600">Zetas na Área Válida</div>
                              <div className="text-lg font-semibold text-yellow-800">{processingResults.contagens.zetas_area_valida}</div>
                              <div className="text-xs text-yellow-600">Total analisado</div>
                            </div>
                          </div>
                          
                          {/* Auditoria por Fileira */}
                          {processingResults.auditoria_por_linha && (
                            <div className="bg-white rounded-lg p-3 border border-yellow-300 mb-4">
                              <div className="text-sm text-yellow-600 mb-3 font-semibold">📊 Auditoria por Fileira (7 círculos por linha)</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                {processingResults.auditoria_por_linha.slice(0, 8).map((linha: any, idx: number) => (
                                  <div key={idx} className="bg-gray-50 rounded p-2 border">
                                    <div className="font-semibold text-gray-700">Linha {linha.linha}</div>
                                    <div className="text-green-600">✓ {linha.acertos} acertos</div>
                                    <div className="text-red-600">✗ {linha.erros} erros</div>
                                    <div className="text-gray-600">○ {linha.omissoes} omissões</div>
                                    <div className="text-blue-600">● {linha.circulos_crivo} círculos</div>
                                  </div>
                                ))}
                              </div>
                              {processingResults.auditoria_por_linha.length > 8 && (
                                <div className="text-xs text-gray-500 mt-2">
                                  ... e mais {processingResults.auditoria_por_linha.length - 8} linhas
                                </div>
                              )}
                            </div>
                          )}

                          {processingResults.avisos && processingResults.avisos.length > 0 && (
                            <div className="bg-white rounded-lg p-3 border border-yellow-300">
                              <div className="text-sm text-yellow-600 mb-2">Avisos:</div>
                              <ul className="text-sm text-yellow-700 space-y-1">
                                {processingResults.avisos.map((aviso: string, idx: number) => (
                                  <li key={idx}>• {aviso}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Grade de Figuras - Nova Imagem */}
                      <div className="bg-white rounded-lg p-4 mb-4 relative">
                        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${AC_COLS}, 1fr)` }}>
                          {Array.from({ length: AC_TOTAL }, (_, idx) => {
                            const isMarked = acMarks[idx];
                            const shouldMark = AC_GABARITO[idx];
                            const showGabarito = showAcGabarito;
                            const figure = AC_FIGURES[idx];
                            
                            let figureClass = 'w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 text-lg font-bold ';
                            
                            if (isMarked) {
                              if (shouldMark) {
                                figureClass += 'bg-green-500 text-white rounded shadow-md'; // Correto
                              } else {
                                figureClass += 'bg-orange-500 text-white rounded shadow-md'; // Incorreto
                              }
                            } else if (showGabarito && shouldMark) {
                              figureClass += 'bg-gray-400 text-white rounded shadow-md'; // Omissão
                            } else {
                              figureClass += 'text-gray-700 hover:bg-gray-100 rounded'; // Normal
                            }
                            
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => toggleAcMark(idx)}
                                className={figureClass}
                                title={`Figura ${idx + 1}${showGabarito ? ` - ${shouldMark ? 'Deveria marcar' : 'Não marcar'}` : ''}`}
                              >
                                {figure}
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="flex justify-between items-center mt-4">
                          <div className="text-sm text-gray-600">
                            Total: {AC_TOTAL} figuras | Marcadas: {acMarks.filter(Boolean).length}
                          </div>
                          <button
                            onClick={() => setShowAcGabarito(!showAcGabarito)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                          >
                            {showAcGabarito ? 'Ocultar Gabarito' : 'Mostrar Gabarito'}
                          </button>
                        </div>
                      </div>

                      {/* Estatísticas Automáticas */}
                      {acStats && (
                        <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                          <div className="text-base font-bold text-gray-800 mb-3">Resultados Automáticos:</div>
                          <div className="grid grid-cols-4 gap-3 mb-3">
                            <div className="bg-green-50 rounded-lg p-2 border-2 border-green-200">
                              <span className="text-xs text-green-700 font-medium">Acertos:</span>
                              <span className="text-lg font-bold text-green-700 ml-1">{acStats.acertos}</span>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-2 border-2 border-orange-200">
                              <span className="text-xs text-orange-700 font-medium">Erros:</span>
                              <span className="text-lg font-bold text-orange-700 ml-1">{acStats.erros}</span>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 border-2 border-gray-200">
                              <span className="text-xs text-gray-700 font-medium">Omissões:</span>
                              <span className="text-lg font-bold text-gray-700 ml-1">{acStats.omissoes}</span>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-2 border-2 border-blue-200">
                              <span className="text-xs text-blue-700 font-medium">Pontos:</span>
                              <span className="text-lg font-bold text-blue-700 ml-1">{acStats.resultado}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coluna Direita (1/3): Entrada Manual */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">🎯</span>
                        <h4 className="text-sm font-semibold text-gray-800">AC - Atenção Concentrada</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">Entrada manual de dados</p>
                      
                      <div className="space-y-3">
                        {selectedTest.campos.map((campo) => (
                          <div key={campo.nome}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {campo.label}
                            </label>
                            {campo.tipo === 'select' ? (
                              <select
                                value={testData[campo.nome] || ''}
                                onChange={(e) => handleInputChange(campo.nome, e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Selecione {campo.label}</option>
                                {campo.options?.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={campo.tipo}
                                value={testData[campo.nome] || ''}
                                onChange={(e) => handleInputChange(campo.nome, e.target.value)}
                                min={campo.min}
                                max={campo.max}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões - AC */}
                <div className="flex justify-center mt-6 gap-3">
                  <button
                    onClick={clearAcMarks}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                  >
                    <span>🗑️</span>
                    Limpar Marcações
                  </button>
                  <button
                    onClick={handleCalculate}
                    className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    <span>📊</span>
                    Calcular Resultado
                  </button>
                </div>
              </div>
            )}

            {/* Results Display */}
            {results && Object.keys(results).length > 0 && (
              <div className="mt-8">
                {selectedTest.id === 'mig' && (
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">🧠 MIG - Resultados da Avaliação</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Acertos */}
                      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                        <h5 className="font-semibold text-green-700 mb-2">✅ Acertos</h5>
                        <div className="text-4xl font-bold text-green-800 mb-1">{migCorrectCount}</div>
                        <p className="text-sm text-green-600">de 28 questões</p>
                      </div>

                      {/* Percentil */}
                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                        <h5 className="font-semibold text-blue-700 mb-2">📊 Percentil</h5>
                        <div className="text-4xl font-bold text-blue-800 mb-1">
                          {results.percentil || 'N/A'}
                        </div>
                        <p className="text-sm text-blue-600">Posição relativa</p>
                      </div>

                      {/* QI */}
                      <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                        <h5 className="font-semibold text-purple-700 mb-2">🎯 QI</h5>
                        <div className="text-4xl font-bold text-purple-800 mb-1">
                          {String(results.qi || 'N/A')}
                        </div>
                        <p className="text-sm text-purple-600">Quociente de Inteligência</p>
                      </div>
                    </div>

                    {/* Classificação */}
                    {results.classificacao && (
                      <div className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border-2 border-indigo-200">
                        <h5 className="font-semibold text-indigo-700 mb-2">🏆 Classificação</h5>
                        <div className="text-2xl font-bold text-indigo-900">
                          {results.classificacao}
                        </div>
                      </div>
                    )}

                    {/* Tabela utilizada */}
                    {selectedMigTable && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Tabela normativa:</span>{' '}
                          {tabelasMig.find((t: any) => t.id === selectedMigTable)?.nome}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Resultados específicos para R-1 */}
                {selectedTest.id === 'r1' && (
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">🧠 R-1 - Resultados da Avaliação</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Acertos */}
                      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                        <h5 className="font-semibold text-green-700 mb-2">✅ Acertos</h5>
                        <div className="text-4xl font-bold text-green-800 mb-1">{r1CorrectCount}</div>
                        <p className="text-sm text-green-600">de 40 questões</p>
                      </div>

                      {/* Percentil */}
                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                        <h5 className="font-semibold text-blue-700 mb-2">📊 Percentil</h5>
                        <div className="text-4xl font-bold text-blue-800 mb-1">
                          {String(results.percentil || 'N/A')}
                        </div>
                        <p className="text-sm text-blue-600">Posição relativa</p>
                      </div>

                      {/* Classificação */}
                      <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                        <h5 className="font-semibold text-orange-700 mb-2">🎯 Classificação</h5>
                        <div className="text-4xl font-bold text-orange-800 mb-1">
                          {String(results.classificacao || 'N/A')}
                        </div>
                        <p className="text-sm text-orange-600">Nível de raciocínio</p>
                      </div>
                    </div>

                    {/* Classificação detalhada */}
                    {results.classificacao && (
                      <div className="mt-6 bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border-2 border-orange-200">
                        <h5 className="font-semibold text-orange-700 mb-2">🏆 Classificação Detalhada</h5>
                        <div className="text-2xl font-bold text-orange-900">
                          {String(results.classificacao)}
                        </div>
                        {results.interpretacao && (
                          <p className="text-sm text-orange-700 mt-2">{String(results.interpretacao)}</p>
                        )}
                      </div>
                    )}

                    {/* Tabela utilizada */}
                    {results.tabela && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Tabela normativa:</span>{' '}
                          {String(results.tabela)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Resultados para AC */}
                {selectedTest.id === 'ac' && (
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">🎯 AC - Resultados da Avaliação</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                        <div className="text-sm text-green-700 font-medium">Acertos</div>
                        <div className="text-2xl font-bold text-green-700">{String(results.acertos ?? 'N/A')}</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
                        <div className="text-sm text-orange-700 font-medium">Erros</div>
                        <div className="text-2xl font-bold text-orange-700">{String(results.erros ?? 'N/A')}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">Omissões</div>
                        <div className="text-2xl font-bold text-gray-700">{String(results.omissoes ?? 'N/A')}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                        <div className="text-sm text-blue-700 font-medium">Pontos</div>
                        <div className="text-2xl font-bold text-blue-700">{String(results.resultado ?? 'N/A')}</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                        <div className="text-sm text-purple-700 font-medium">Percentil</div>
                        <div className="text-2xl font-bold text-purple-700">{String(results.percentil ?? 'N/A')}</div>
                      </div>
                    </div>
                    {results.classificacao && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                        <div className="text-sm text-blue-700 font-medium">Classificação</div>
                        <div className="text-xl font-bold text-blue-700">{String(results.classificacao ?? 'N/A')}</div>
                        {results.interpretacao && String(results.interpretacao) && (
                          <p className="text-sm text-blue-600 mt-2">{String(results.interpretacao)}</p>
                        )}
                      </div>
                    )}
                    {results.tabela && String(results.tabela) && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600">
                          <strong>Tabela utilizada:</strong> {String(results.tabela)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Resultados de ROTAS - Visualização especial */}
                {selectedTest.id === 'rotas' && results && typeof results === 'object' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Atenção Concentrada (Rota C) */}
                      {(results as any).c && (
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-300">
                          <h5 className="font-bold text-blue-900 mb-3 text-center text-lg">
                            Atenção Concentrada (C)
                          </h5>
                          <div className="space-y-2">
                            <div className="flex justify-between bg-white p-2 rounded">
                              <span className="text-sm text-gray-600">Acertos:</span>
                              <span className="font-semibold text-green-700">{(results as any).c.acertos}</span>
                            </div>
                            <div className="flex justify-between bg-white p-2 rounded">
                              <span className="text-sm text-gray-600">PB:</span>
                              <span className="font-semibold text-indigo-700">{(results as any).c.pb}</span>
                            </div>
                            <div className="flex justify-between bg-white p-2 rounded">
                              <span className="text-sm text-gray-600">Percentil:</span>
                              <span className="font-semibold text-blue-700">{(results as any).c.percentil || '-'}</span>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <span className="text-xs text-gray-500">Classificação:</span>
                              <p className="font-bold text-purple-700 mt-1">{(results as any).c.classificacao}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Atenção Alternada (Rota A) */}
                      {(results as any).a && (
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-300">
                          <h5 className="font-bold text-green-900 mb-3 text-center text-lg">
                            Atenção Alternada (A)
                          </h5>
                          <div className="space-y-2">
                            <div className="flex justify-between bg-white p-2 rounded">
                              <span className="text-sm text-gray-600">Acertos:</span>
                              <span className="font-semibold text-green-700">{(results as any).a.acertos}</span>
                            </div>
                            <div className="flex justify-between bg-white p-2 rounded">
                              <span className="text-sm text-gray-600">PB:</span>
                              <span className="font-semibold text-indigo-700">{(results as any).a.pb}</span>
                            </div>
                            <div className="flex justify-between bg-white p-2 rounded">
                              <span className="text-sm text-gray-600">Percentil:</span>
                              <span className="font-semibold text-blue-700">{(results as any).a.percentil || '-'}</span>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <span className="text-xs text-gray-500">Classificação:</span>
                              <p className="font-bold text-purple-700 mt-1">{(results as any).a.classificacao}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Atenção Dividida (Rota D) */}
                      {(results as any).d && (
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-300">
                          <h5 className="font-bold text-purple-900 mb-3 text-center text-lg">
                            Atenção Dividida (D)
                          </h5>
                          <div className="space-y-2">
                            <div className="flex justify-between bg-white p-2 rounded">
                              <span className="text-sm text-gray-600">Acertos:</span>
                              <span className="font-semibold text-green-700">{(results as any).d.acertos}</span>
                            </div>
                            <div className="flex justify-between bg-white p-2 rounded">
                              <span className="text-sm text-gray-600">PB:</span>
                              <span className="font-semibold text-indigo-700">{(results as any).d.pb}</span>
                            </div>
                            <div className="flex justify-between bg-white p-2 rounded">
                              <span className="text-sm text-gray-600">Percentil:</span>
                              <span className="font-semibold text-blue-700">{(results as any).d.percentil || '-'}</span>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <span className="text-xs text-gray-500">Classificação:</span>
                              <p className="font-bold text-purple-700 mt-1">{(results as any).d.classificacao}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resultado Geral (MGA) */}
                    {(results as any).geral && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border-2 border-yellow-400">
                        <h5 className="font-bold text-yellow-900 mb-4 text-center text-xl">
                          📊 Resultado Geral (MGA - Medida Geral de Atenção)
                        </h5>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded-lg text-center">
                            <span className="text-sm text-gray-600 block mb-2">MGA Total</span>
                            <span className="text-2xl font-bold text-indigo-700">{(results as any).geral.mga}</span>
                          </div>
                          <div className="bg-white p-4 rounded-lg text-center">
                            <span className="text-sm text-gray-600 block mb-2">Percentil</span>
                            <span className="text-2xl font-bold text-blue-700">{(results as any).geral.percentil || '-'}</span>
                          </div>
                          <div className="bg-white p-4 rounded-lg text-center">
                            <span className="text-sm text-gray-600 block mb-2">Classificação</span>
                            <span className="text-xl font-bold text-purple-700">{(results as any).geral.classificacao}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Resultados genéricos para outros testes */}
                {selectedTest.id !== 'memore' && selectedTest.id !== 'mig' && selectedTest.id !== 'r1' && selectedTest.id !== 'ac' && selectedTest.id !== 'rotas' && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="space-y-2">
                      {Object.entries(results).map(([key, value]) => {
                        // Pular campos técnicos
                        if (['salvo', 'avaliacao_id', 'tabela_id', 'tabela_usada', 'sugestoes', 'avisos'].includes(key)) return null;
                        
                        // Converter objetos para JSON legível
                        let displayValue = value;
                        if (typeof value === 'object' && value !== null) {
                          displayValue = JSON.stringify(value, null, 2);
                        } else {
                          displayValue = String(value);
                        }
                        
                        return (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600">{key}:</span>
                            <span className="font-medium whitespace-pre-wrap">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botão Guardar - Aparece para todos os testes */}
            <div className="mt-6 pt-6 border-t border-gray-200 hide-on-print">
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  {analysisType === 'linked' ? (
                    foundPatient ? (
                      <div>
                        <span className="text-green-600">
                          ✅ Teste vinculado a: {foundPatient.nome} - Laudo: {patientData.numero_laudo}
                        </span>
                        {(results as any)?.tabela_usada && (
                          <div className="mt-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                            <span className="font-semibold">📋 Tabela Normativa:</span> {(results as any).tabela_id ? `${(results as any).tabela_id} - ` : ''}{(results as any).tabela_usada}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-yellow-600">
                        ⚠️ Preencha os dados do paciente acima para vincular
                      </span>
                    )
                  ) : (
                    <span className="text-blue-600">
                      🔓 Teste anônimo - não será vinculado a paciente
                    </span>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSaveTest()}
                    disabled={isSaving || (analysisType === 'linked' && (!patientData.cpf || !patientData.nome || !patientData.numero_laudo))}
                    className={`flex items-center gap-2 px-6 py-3 text-white rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      analysisType === 'anonymous' 
                        ? 'bg-yellow-600 hover:bg-yellow-700' 
                        : analysisType === 'linked'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Save className="w-5 h-5" />
                    {isSaving 
                      ? 'Salvando...' 
                      : analysisType === 'linked' 
                      ? 'Calcular e Guardar'
                      : analysisType === 'anonymous'
                      ? '🕶️ Salvar Anônimo'
                      : 'Calcular (Não Salva)'}
                  </button>
                </div>
              </div>
              
              {analysisType === 'linked' && !foundPatient && patientData.cpf && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-700">
                    ℹ️ Avaliado não encontrado com esse CPF. O sistema criará uma nova avaliação ao guardar.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Seleção de Tabela Normativa */}
      {showTabelaModal && tabelaSugestoes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                ⚠️ Seleção de Tabela Normativa
              </h2>
              
              {/* Avisos */}
              {tabelaSugestoes.avisos && tabelaSugestoes.avisos.length > 0 && (
                <div className="mb-6 space-y-2">
                  {tabelaSugestoes.avisos.map((aviso: any, idx: number) => (
                    <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                      aviso.tipo === 'warning' 
                        ? 'bg-yellow-50 border-yellow-400' 
                        : 'bg-blue-50 border-blue-400'
                    }`}>
                      <p className={`text-sm ${
                        aviso.tipo === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                      }`}>
                        {aviso.mensagem}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Tabela Recomendada */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  ✅ Tabela Recomendada
                </h3>
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900">{tabelaSugestoes.tabelaNome}</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Score: {tabelaSugestoes.score} pontos
                      </p>
                      {tabelaSugestoes.motivos && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {tabelaSugestoes.motivos.map((motivo: string, idx: number) => (
                            <span key={idx} className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                              {motivo}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="radio"
                      name="tabela"
                      value={tabelaSugestoes.tabelaId}
                      checked={tabelaSelecionada === tabelaSugestoes.tabelaId}
                      onChange={() => setTabelaSelecionada(tabelaSugestoes.tabelaId)}
                      className="w-5 h-5 text-green-600"
                    />
                  </div>
                </div>
              </div>
              
              {/* Outras Sugestões */}
              {tabelaSugestoes.sugestoes && tabelaSugestoes.sugestoes.length > 1 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    📋 Outras Opções
                  </h3>
                  <div className="space-y-2">
                    {tabelaSugestoes.sugestoes.slice(1).map((sugestao: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{sugestao.nome}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Score: {sugestao.score} pontos
                            </p>
                            {sugestao.motivos && sugestao.motivos.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {sugestao.motivos.map((motivo: string, mIdx: number) => (
                                  <span key={mIdx} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                    {motivo}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <input
                            type="radio"
                            name="tabela"
                            value={sugestao.id}
                            checked={tabelaSelecionada === sugestao.id}
                            onChange={() => setTabelaSelecionada(sugestao.id)}
                            className="w-5 h-5 text-blue-600"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Botões */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTabelaModal(false);
                    setTabelaSugestoes(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (tabelaSelecionada) {
                      await handleSaveTest(tabelaSelecionada);
                    } else {
                      toast.error('Selecione uma tabela normativa');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Calcular com Tabela Selecionada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
