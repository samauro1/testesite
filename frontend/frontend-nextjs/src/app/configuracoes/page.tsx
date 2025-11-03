'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  User,
  Building2,
  Mail,
  FileText,
  Palette,
  Bell,
  Shield,
  Package,
  Save,
  Eye,
  EyeOff,
  Upload,
  Download,
  Lock,
  Key,
  Briefcase,
  Users,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '@/components/Layout';
import { usuariosService, configuracoesService, authService, pacientesService, avaliacoesService, nfsEService, detranService } from '@/services/api';
import { useConfiguracoes } from '@/contexts/ConfiguracoesContext';
import { useAuth } from '@/contexts/AuthContext';

type TabType = 'perfil' | 'clinica' | 'estoque' | 'email' | 'laudos' | 'aparencia' | 'notificacoes' | 'seguranca' | 'usuarios' | 'nfs-e' | 'detran';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('perfil');
  const { user: currentUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();
  const { recarregarConfiguracoes } = useConfiguracoes();
  
  // Estados para NFS-e
  const [nfsEConfig, setNfsEConfig] = useState({
    api_url: 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx',
    usuario_api: '',
    senha_api: '',
    cnpj: '',
    inscricao_municipal: '',
    codigo_servico: '05118',
    discriminacao_servico: 'Avaliação Psicológica para Habilitação de Veículos',
    valor_padrao: 150.00,
    ambiente: 'producao',
    ativo: false
  });
  const [testandoConexao, setTestandoConexao] = useState(false);

  // Estados para os formulários
  const [perfilData, setPerfilData] = useState({
    nome: 'Dr. João Silva',
    email: 'joao@clinica.com',
    crp: 'CRP 06/123456',
    especialidade: 'Psicologia do Trânsito',
    perfil: 'psicologo',
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: ''
  });

  const [clinicaData, setClinicaData] = useState({
    nome_clinica: 'Clínica de Avaliação Psicológica',
    cnpj: '12.345.678/0001-90',
    endereco: 'Rua das Flores, 123',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234-567',
    telefone: '(11) 98765-4321',
    email: 'contato@clinica.com'
  });

  const [estoqueConfig, setEstoqueConfig] = useState({
    desconto_automatico: true,
    alerta_estoque_baixo: true,
    percentual_alerta: 30,
    email_alertas: 'estoque@clinica.com'
  });

  const [emailConfig, setEmailConfig] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_usuario: '',
    smtp_senha: '',
    email_padrao_copia: ''
  });

  const [laudoConfig, setLaudoConfig] = useState({
    formato_numeracao: 'LAU-YYYY-NNNN',
    texto_rodape: 'Este documento é válido por 6 meses a partir da data de emissão.',
    incluir_logo: true,
    incluir_assinatura: true
  });

  const [buscaLaudo, setBuscaLaudo] = useState('');
  const [laudoEncontrado, setLaudoEncontrado] = useState<any>(null);
  const [buscandoLaudo, setBuscandoLaudo] = useState(false);

  // Estados para configuração DETRAN
  const [detranConfig, setDetranConfig] = useState({
    cpf: '',
    senha: '',
    dias_trabalho: [] as string[],
    sincronizacao_automatica: false,
    ativo: true
  });
  const [showDetranPassword, setShowDetranPassword] = useState(false);
  const [sincronizandoDetran, setSincronizandoDetran] = useState(false);

  const [aparenciaConfig, setAparenciaConfig] = useState({
    modo: 'light',
    cor_primaria: '#3b82f6',
    tamanho_fonte: 'medium'
  });

  const [notificacoesConfig, setNotificacoesConfig] = useState({
    notif_estoque: true,
    notif_avaliacoes_pendentes: true,
    notif_email: true,
    notif_sistema: true,
    metodo_envio: 'whatsapp',
    texto_apto: '',
    texto_inapto_temporario: '',
    texto_inapto: ''
  });

  // Estado para gestão de usuários
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    perfil: 'psicologo'
  });

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'clinica', label: 'Clínica', icon: Building2 },
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'email', label: 'E-mail', icon: Mail },
    { id: 'nfs-e', label: 'NFS-e', icon: FileText },
    { id: 'detran', label: 'DETRAN', icon: Calendar },
    { id: 'laudos', label: 'Laudos', icon: FileText },
    { id: 'aparencia', label: 'Aparência', icon: Palette },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
    { id: 'seguranca', label: 'Segurança', icon: Shield }
  ];

  const handleSavePerfil = async () => {
    try {
      if (perfilData.nova_senha && perfilData.nova_senha !== perfilData.confirmar_senha) {
        toast.error('As senhas não coincidem!');
        return;
      }

      const dataToSave: any = {
        nome: perfilData.nome,
        email: perfilData.email,
        crp: perfilData.crp,
        especialidade: perfilData.especialidade,
        perfil: perfilData.perfil
      };

      // Incluir foto se foi carregada
      if (fotoPreview) {
        dataToSave.foto_url = fotoPreview;
      }

      // Incluir senha se foi alterada
      if (perfilData.nova_senha) {
        dataToSave.senha = perfilData.nova_senha;
      }

      await usuariosService.updatePerfil(dataToSave);
      
      // Recarregar dados do usuário
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await authService.verify();
      
      toast.success('Perfil atualizado com sucesso!');
      
      // Limpar apenas campos de senha, mantendo os outros dados
      setPerfilData(prev => ({
        ...prev,
        senha_atual: '',
        nova_senha: '',
        confirmar_senha: ''
      }));
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast.error(error.response?.data?.error || 'Erro ao atualizar perfil');
    }
  };

  const handleSaveClinica = () => {
    const dataToSave = {
      ...clinicaData,
      logo_url: logoPreview || null
    };
    updateClinicaMutation.mutate(dataToSave);
  };

  const handleSaveEstoque = () => {
    toast.success('Configurações de estoque atualizadas!');
    // TODO: Implementar chamada à API
  };

  const handleSaveEmail = async () => {
    try {
      // Obter email_remetente do smtp_usuario se não fornecido
      const emailRemetente = emailConfig.smtp_usuario;
      
      await configuracoesService.updateEmail({
        smtp_host: emailConfig.smtp_host,
        smtp_port: parseInt(emailConfig.smtp_port) || 587,
        smtp_secure: parseInt(emailConfig.smtp_port) === 465,
        smtp_usuario: emailConfig.smtp_usuario,
        smtp_senha: emailConfig.smtp_senha,
        email_remetente: emailRemetente,
        nome_remetente: (currentUser as any)?.nome || 'Sistema Palográfico',
        email_copia: emailConfig.email_padrao_copia,
        ativo: true
      });
      
      toast.success('Configurações de e-mail salvas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['configuracoes-email'] });
    } catch (error: any) {
      console.error('Erro ao salvar e-mail:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar configurações');
    }
  };

  const handleTestEmail = async () => {
    try {
      if (!emailConfig.smtp_host || !emailConfig.smtp_usuario || !emailConfig.smtp_senha) {
        toast.error('Preencha todos os campos obrigatórios antes de testar');
        return;
      }

      toast.loading('Testando conexão SMTP...');
      
      await configuracoesService.testEmail({
        smtp_host: emailConfig.smtp_host,
        smtp_port: parseInt(emailConfig.smtp_port) || 587,
        smtp_usuario: emailConfig.smtp_usuario,
        smtp_senha: emailConfig.smtp_senha,
        email_remetente: emailConfig.smtp_usuario
      });
      
      toast.dismiss();
      toast.success('E-mail de teste enviado com sucesso! Verifique sua caixa de entrada.');
    } catch (error: any) {
      console.error('Erro ao testar e-mail:', error);
      toast.dismiss();
      toast.error(error.response?.data?.details || error.response?.data?.error || 'Erro ao testar conexão');
    }
  };

  // Funções para NFS-e
  const handleSaveNfsE = async () => {
    try {
      // Converter o valor antes de salvar
      let valorConvertido = nfsEConfig.valor_padrao;
      
      if (typeof valorConvertido === 'string' && valorConvertido !== '') {
        // Substituir vírgula por ponto para conversão
        valorConvertido = parseFloat(valorConvertido.replace(',', '.'));
      }
      
      const configParaSalvar = {
        ...nfsEConfig,
        valor_padrao: valorConvertido
      };
      
      await nfsEService.updateConfiguracoes(configParaSalvar);
      toast.success('Configurações NFS-e salvas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['nfs-e-configuracoes'] });
    } catch (error: any) {
      console.error('Erro ao salvar NFS-e:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar configurações NFS-e');
    }
  };

         const handleTestNfsE = async () => {
           try {
             if (!nfsEConfig.api_url || !nfsEConfig.usuario_api || !nfsEConfig.senha_api || !nfsEConfig.cnpj || !nfsEConfig.inscricao_municipal) {
               toast.error('Preencha todos os campos obrigatórios antes de testar');
               return;
             }

             setTestandoConexao(true);
             toast.loading('Testando conexão com API NFS-e SP...');
             
             const response = await nfsEService.testarConexao({
               api_url: nfsEConfig.api_url,
               usuario_api: nfsEConfig.usuario_api,
               senha_api: nfsEConfig.senha_api,
               cnpj: nfsEConfig.cnpj,
               inscricao_municipal: nfsEConfig.inscricao_municipal
             });
             
             toast.dismiss();
             if (response.data.success) {
               toast.success('Conexão com API NFS-e SP estabelecida com sucesso!');
             } else {
               toast.error(response.data.message || 'Falha na conexão');
             }
           } catch (error: any) {
             console.error('Erro ao testar NFS-e:', error);
             toast.dismiss();
             toast.error(error.response?.data?.error || 'Erro ao testar conexão NFS-e');
           } finally {
             setTestandoConexao(false);
           }
         };

  const handleSaveLaudo = () => {
    toast.success('Configurações de laudos atualizadas!');
    // TODO: Implementar chamada à API
  };

  const handleBuscarLaudo = async () => {
    if (!buscaLaudo.trim()) {
      toast.error('Digite um número de laudo, CPF ou nome para buscar');
      return;
    }

    setBuscandoLaudo(true);
    try {
      // Buscar paciente por laudo, CPF ou nome
      const response = await pacientesService.list({ 
        search: buscaLaudo,
        limit: 100 
      });
      
      const pacientes = (response as any)?.data?.data?.pacientes || [];
      
      if (pacientes.length === 0) {
        toast.error('Nenhum paciente encontrado com estes dados');
        setLaudoEncontrado(null);
        return;
      }

      // Se encontrou múltiplos, pegar o primeiro que tem laudo
      const pacienteComLaudo = pacientes.find((p: any) => p.numero_laudo) || pacientes[0];
      
      if (!pacienteComLaudo.numero_laudo) {
        toast.error('Este paciente não possui número de laudo definido');
        setLaudoEncontrado(null);
        return;
      }

      // Buscar avaliações do paciente
      const avaliacoesResponse = await avaliacoesService.list({ 
        paciente_id: pacienteComLaudo.id,
        limit: 100
      });
      
      const avaliacoes = (avaliacoesResponse as any)?.data?.data?.avaliacoes || [];
      const avaliacoesDoLaudo = avaliacoes.filter((av: any) => av.numero_laudo === pacienteComLaudo.numero_laudo);
      
      // Buscar testes de cada avaliação
      const testesPromises = avaliacoesDoLaudo.map(async (av: any) => {
        try {
          const testesResponse = await avaliacoesService.getTestes(av.id);
          return (testesResponse as any)?.data?.data?.testes || [];
        } catch (error) {
          console.error('Erro ao buscar testes da avaliação:', av.id, error);
          return [];
        }
      });
      
      const testesArrays = await Promise.all(testesPromises);
      const todosTestes = testesArrays.flat();
      
      setLaudoEncontrado({
        paciente: pacienteComLaudo,
        avaliacoes: avaliacoesDoLaudo,
        testes: todosTestes,
        aptidao: avaliacoesDoLaudo.find((av: any) => av.aptidao)?.aptidao || null,
        psicologo: currentUser
      });
      
      toast.success(`Laudo ${pacienteComLaudo.numero_laudo} carregado com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao buscar laudo:', error);
      toast.error('Erro ao buscar laudo');
      setLaudoEncontrado(null);
    } finally {
      setBuscandoLaudo(false);
    }
  };

  const handleSaveAparencia = () => {
    toast.success('Configurações de aparência atualizadas!');
    // TODO: Implementar chamada à API
  };

  const handleSaveNotificacoes = async () => {
    try {
      await configuracoesService.updateNotificacoes({
        notificacao_metodo: notificacoesConfig.metodo_envio,
        notificacao_texto_apto: notificacoesConfig.texto_apto,
        notificacao_texto_inapto_temporario: notificacoesConfig.texto_inapto_temporario,
        notificacao_texto_inapto: notificacoesConfig.texto_inapto
      });
      
      toast.success('Configurações de notificações atualizadas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['configuracoes-notificacoes'] });
    } catch (error: any) {
      console.error('Erro ao salvar notificações:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar configurações');
    }
  };

  const handleExportarDados = () => {
    toast.success('Exportação iniciada! Você receberá um e-mail quando estiver pronta.');
    // TODO: Implementar exportação
  };

  const [backupLoading, setBackupLoading] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupsDisponiveis, setBackupsDisponiveis] = useState<any[]>([]);

  const handleBackup = async () => {
    try {
      setBackupLoading(true);
      const response = await configuracoesService.fazerBackup();
      toast.success(response.data.message || 'Backup realizado com sucesso!');
      // Recarregar lista de backups
      await carregarBackups();
    } catch (error: any) {
      console.error('Erro ao fazer backup:', error);
      toast.error(error.response?.data?.error || 'Erro ao fazer backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const carregarBackups = async () => {
    try {
      const response = await configuracoesService.listarBackups();
      setBackupsDisponiveis(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar backups:', error);
    }
  };

  const handleRestaurarBackup = async (arquivo: string) => {
    if (!confirm('Tem certeza que deseja restaurar este backup? Todos os dados atuais serão substituídos!')) {
      return;
    }
    
    try {
      const response = await configuracoesService.restaurarBackup(arquivo);
      toast.success(response.data.message || 'Backup restaurado com sucesso!');
      setShowRestoreModal(false);
    } catch (error: any) {
      console.error('Erro ao restaurar backup:', error);
      toast.error(error.response?.data?.error || 'Erro ao restaurar backup');
    }
  };

  // Query para carregar dados do usuário logado
  const { data: userDataDB } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await authService.verify();
      return response.data;
    },
    enabled: activeTab === 'perfil'
  });

  // Atualizar estado local quando carregar dados do usuário
  React.useEffect(() => {
    if (userDataDB?.data) {
      const user = userDataDB.data;
      setPerfilData({
        nome: user.nome || '',
        email: user.email || '',
        crp: user.crp || '',
        especialidade: user.especialidade || '',
        perfil: user.perfil || 'psicologo',
        senha_atual: '',
        nova_senha: '',
        confirmar_senha: ''
      });
      if (user.foto_url) {
        setFotoPreview(user.foto_url);
      }
    }
  }, [userDataDB]);

  // Query para carregar configurações da clínica
  const { data: clinicaDataDB } = useQuery({
    queryKey: ['configuracoes-clinica'],
    queryFn: async () => {
      const response = await configuracoesService.getClinica();
      return response.data;
    },
    enabled: activeTab === 'clinica'
  });

  // Atualizar estado local quando carregar do banco
  React.useEffect(() => {
    if (clinicaDataDB?.data) {
      const config = clinicaDataDB.data;
      setClinicaData({
        nome_clinica: config.nome_clinica || '',
        cnpj: config.cnpj || '',
        endereco: config.endereco || '',
        cidade: config.cidade || '',
        estado: config.estado || '',
        cep: config.cep || '',
        telefone: config.telefone || '',
        email: config.email || ''
      });
      if (config.logo_url) {
        setLogoPreview(config.logo_url);
      }
    }
  }, [clinicaDataDB]);

  // Query para carregar configurações de notificações
  const { data: notificacoesDataDB } = useQuery({
    queryKey: ['configuracoes-notificacoes'],
    queryFn: async () => {
      const response = await configuracoesService.getNotificacoes();
      return response.data;
    },
    enabled: activeTab === 'notificacoes'
  });

  // Atualizar estado local quando carregar configurações de notificações
  React.useEffect(() => {
    if (notificacoesDataDB?.data) {
      const config = notificacoesDataDB.data;
      setNotificacoesConfig(prev => ({
        ...prev,
        metodo_envio: config.notificacao_metodo || 'whatsapp',
        texto_apto: config.notificacao_texto_apto || '',
        texto_inapto_temporario: config.notificacao_texto_inapto_temporario || '',
        texto_inapto: config.notificacao_texto_inapto || ''
      }));
    }
  }, [notificacoesDataDB]);

  // Query para carregar configurações de e-mail
  const { data: emailDataDB } = useQuery({
    queryKey: ['configuracoes-email'],
    queryFn: async () => {
      const response = await configuracoesService.getEmail();
      return response.data;
    },
    enabled: activeTab === 'email'
  });

  // Atualizar estado local quando carregar configurações de e-mail
  React.useEffect(() => {
    if (emailDataDB?.data) {
      const config = emailDataDB.data;
      setEmailConfig({
        smtp_host: config.smtp_host || '',
        smtp_port: config.smtp_port?.toString() || '587',
        smtp_usuario: config.smtp_usuario || '',
        smtp_senha: config.smtp_senha || '',
        email_padrao_copia: config.email_copia || ''
      });
    }
  }, [emailDataDB]);

  // Query para configurações NFS-e
  const { data: nfsEDataDB } = useQuery({
    queryKey: ['nfs-e-configuracoes'],
    queryFn: async () => {
      const response = await nfsEService.getConfiguracoes();
      return response.data;
    },
    enabled: activeTab === 'nfs-e'
  });

         // Atualizar estado local quando carregar configurações NFS-e
         React.useEffect(() => {
           if (nfsEDataDB?.data) {
             const config = nfsEDataDB.data;
             setNfsEConfig({
               api_url: config.api_url || 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx',
               usuario_api: config.usuario_api || '',
               senha_api: config.senha_api || '',
               cnpj: config.cnpj || '',
               inscricao_municipal: config.inscricao_municipal || '',
               codigo_servico: config.codigo_servico || '05118',
               discriminacao_servico: config.discriminacao_servico || 'Avaliação Psicológica para Habilitação de Veículos',
               valor_padrao: config.valor_padrao || 150.00,
               ambiente: config.ambiente || 'producao',
               ativo: config.ativo || false
             });
           }
         }, [nfsEDataDB]);

  // Query para configurações DETRAN
  const { data: detranDataDB } = useQuery({
    queryKey: ['detran-config'],
    queryFn: async () => {
      const response = await detranService.getConfiguracao();
      return response.data;
    },
    enabled: activeTab === 'detran'
  });

  // Atualizar estado local quando carregar configurações DETRAN
  React.useEffect(() => {
    if (detranDataDB?.success && detranDataDB?.data) {
      setDetranConfig({
        cpf: detranDataDB.data.cpf || '',
        senha: '',
        dias_trabalho: detranDataDB.data.dias_trabalho || [],
        sincronizacao_automatica: detranDataDB.data.sincronizacao_automatica || false,
        ativo: detranDataDB.data.ativo !== false
      });
    }
  }, [detranDataDB]);

  // Mutation para salvar configurações da clínica
  const updateClinicaMutation = useMutation({
    mutationFn: configuracoesService.updateClinica,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes-clinica'] });
      recarregarConfiguracoes(); // Recarrega contexto global para atualizar o logo no menu
      toast.success('Configurações da clínica atualizadas com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar configurações');
    }
  });

  // Queries e Mutations para Usuários
  const { data: usuariosData } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const response = await usuariosService.list();
      return response.data;
    },
    enabled: activeTab === 'usuarios'
  });

  const { data: perfisData } = useQuery({
    queryKey: ['perfis'],
    queryFn: async () => {
      const response = await usuariosService.getPerfis();
      return response.data;
    },
    enabled: activeTab === 'usuarios'
  });

  const createUserMutation = useMutation({
    mutationFn: usuariosService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário criado com sucesso!');
      setShowUserModal(false);
      resetUserForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar usuário');
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usuariosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário atualizado com sucesso!');
      setShowUserModal(false);
      resetUserForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar usuário');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: usuariosService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário desativado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao desativar usuário');
    }
  });

  const desativarUserMutation = useMutation({
    mutationFn: usuariosService.desativar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário desativado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao desativar usuário');
    }
  });

  const ativarUserMutation = useMutation({
    mutationFn: usuariosService.ativar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário ativado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao ativar usuário');
    }
  });

  const deletePermanenteUserMutation = useMutation({
    mutationFn: usuariosService.deletePermanente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário excluído permanentemente!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao excluir usuário');
    }
  });

  const resetUserForm = () => {
    setUserFormData({
      nome: '',
      email: '',
      senha: '',
      perfil: 'psicologo'
    });
    setEditingUser(null);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserFormData({
      nome: user.nome,
      email: user.email,
      senha: '',
      perfil: user.perfil
    });
    setShowUserModal(true);
  };

  const handleSaveUser = () => {
    if (!userFormData.nome || !userFormData.email) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }

    if (!editingUser && !userFormData.senha) {
      toast.error('Senha é obrigatória para novos usuários');
      return;
    }

    if (editingUser) {
      const dataToUpdate: any = {
        nome: userFormData.nome,
        email: userFormData.email,
        perfil: userFormData.perfil
      };
      if (userFormData.senha) {
        dataToUpdate.senha = userFormData.senha;
      }
      updateUserMutation.mutate({ id: editingUser.id, data: dataToUpdate });
    } else {
      createUserMutation.mutate(userFormData);
    }
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Tem certeza que deseja desativar este usuário?')) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleDesativarUser = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja desativar o usuário "${nome}"?`)) {
      desativarUserMutation.mutate(id);
    }
  };

  const handleAtivarUser = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja ativar o usuário "${nome}"?`)) {
      ativarUserMutation.mutate(id);
    }
  };

  const handleDeletePermanenteUser = (id: string, nome: string) => {
    if (confirm(`⚠️ ATENÇÃO: Tem certeza que deseja EXCLUIR PERMANENTEMENTE o usuário "${nome}"?\n\nEsta ação não pode ser desfeita!`)) {
      if (confirm('Esta é sua última chance. Confirma a exclusão permanente?')) {
        deletePermanenteUserMutation.mutate(id);
      }
    }
  };

  // Verificar se o usuário atual é administrador
  const isAdmin = currentUser?.perfil === 'administrador';

  const getPerfilBadgeColor = (perfil: string) => {
    const colors: Record<string, string> = {
      'administrador': 'bg-red-100 text-red-800 border-red-200',
      'psicologo': 'bg-blue-100 text-blue-800 border-blue-200',
      'psicologo_externo': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'recepcionista': 'bg-green-100 text-green-800 border-green-200',
      'estagiario': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[perfil] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Função para formatar CNPJ
  const formatCNPJ = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 14);
    
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 5) {
      return `${limited.slice(0, 2)}.${limited.slice(2)}`;
    } else if (limited.length <= 8) {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
    } else if (limited.length <= 12) {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
    } else {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`;
    }
  };

  // Handler para CNPJ
  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setClinicaData({ ...clinicaData, cnpj: formatted });
  };

  // Função para formatar telefone
  const formatTelefone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);
    
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else if (limited.length <= 10) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  // Handler para telefone
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefone(e.target.value);
    setClinicaData({ ...clinicaData, telefone: formatted });
  };

  // Estado para logo
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Estado para foto do usuário
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  // Handler para upload de logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        toast.success('Logo carregado! Clique em "Salvar Alterações" para confirmar.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler para upload de foto do usuário
  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
        toast.success('Foto carregada! Clique em "Salvar Alterações" para confirmar.');
      };
      reader.readAsDataURL(file);
    }
  };

  const usuarios = usuariosData?.data || [];
  const perfis = perfisData?.data || [];

  // Query para logs
  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ['logs'],
    queryFn: async () => {
      const response = await configuracoesService.getLogs({ limite: 100 });
      return response.data;
    },
    enabled: showLogsModal
  });

  const logs = logsData?.data || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            Configurações
          </h1>
          <p className="text-gray-600 mt-1">Gerencie as configurações do sistema</p>
        </div>
        
        <div className="flex gap-6">
          {/* Sidebar de Tabs */}
          <div className="w-64 bg-white rounded-xl shadow-sm p-4 h-fit sticky top-6">
            <nav className="space-y-1">
              {tabs
                .filter(tab => {
                  // Ocultar Estoque e Segurança para não-admin
                  if (!isAdmin && (tab.id === 'estoque' || tab.id === 'seguranca')) {
                    return false;
                  }
                  return true;
                })
                .map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Conteúdo */}
          <div className="flex-1">
            {/* TAB: PERFIL */}
            {activeTab === 'perfil' && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">👤 Meu Perfil</h2>
                  <p className="text-sm text-gray-600">Gerencie suas informações pessoais e credenciais</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    ℹ️ <strong>Sobre esta seção:</strong> Aqui você edita <strong>seus próprios dados</strong>. Para gerenciar outros usuários do sistema, acesse a aba "Usuários".
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                    <input
                      type="text"
                      value={perfilData.nome}
                      onChange={(e) => setPerfilData({ ...perfilData, nome: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                    <input
                      type="email"
                      value={perfilData.email}
                      onChange={(e) => setPerfilData({ ...perfilData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Usuário</label>
                    {isAdmin ? (
                      <select
                        value={perfilData.perfil}
                        onChange={(e) => setPerfilData({ ...perfilData, perfil: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="administrador">👑 Administrador</option>
                        <option value="psicologo">🧠 Psicólogo</option>
                        <option value="psicologo_externo">🌐 Psicólogo Externo</option>
                        <option value="recepcionista">📋 Recepcionista</option>
                        <option value="estagiario">📚 Estagiário</option>
                      </select>
                    ) : (
                      <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50">
                        <span className="text-gray-700">
                          {perfilData.perfil === 'administrador' && '👑 Administrador'}
                          {perfilData.perfil === 'psicologo' && '🧠 Psicólogo'}
                          {perfilData.perfil === 'psicologo_externo' && '🌐 Psicólogo Externo'}
                          {perfilData.perfil === 'recepcionista' && '📋 Recepcionista'}
                          {perfilData.perfil === 'estagiario' && '📚 Estagiário'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">Apenas administradores podem alterar o tipo de usuário</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CRP</label>
                    <input
                      type="text"
                      value={perfilData.crp}
                      onChange={(e) => setPerfilData({ ...perfilData, crp: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="CRP 06/123456"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Especialidade</label>
                    <input
                      type="text"
                      value={perfilData.especialidade}
                      onChange={(e) => setPerfilData({ ...perfilData, especialidade: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Upload de Foto do Usuário */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Foto do Perfil
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full border-2 border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center">
                        {fotoPreview ? (
                          <img src={fotoPreview} alt="Foto Preview" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <label htmlFor="foto-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-200">
                        <Upload className="w-4 h-4" />
                        Escolher Foto
                      </label>
                      <input
                        id="foto-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFotoUpload}
                        className="hidden"
                      />
                      <p className="text-sm text-gray-500 mt-2">JPG, PNG ou GIF. Máximo 2MB.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    Alterar Senha
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Senha Atual</label>
                      <input
                        type="password"
                        value={perfilData.senha_atual}
                        onChange={(e) => setPerfilData({ ...perfilData, senha_atual: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nova Senha</label>
                      <input
                        type="password"
                        value={perfilData.nova_senha}
                        onChange={(e) => setPerfilData({ ...perfilData, nova_senha: e.target.value })}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          perfilData.nova_senha && perfilData.confirmar_senha && perfilData.nova_senha !== perfilData.confirmar_senha
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Nova Senha</label>
                      <input
                        type="password"
                        value={perfilData.confirmar_senha}
                        onChange={(e) => setPerfilData({ ...perfilData, confirmar_senha: e.target.value })}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          perfilData.nova_senha && perfilData.confirmar_senha && perfilData.nova_senha !== perfilData.confirmar_senha
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      {perfilData.nova_senha && perfilData.confirmar_senha && perfilData.nova_senha !== perfilData.confirmar_senha && (
                        <p className="mt-2 text-sm text-red-600 font-medium">
                          As senhas não coincidem!
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleSavePerfil}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                  >
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}

            {/* TAB: CLÍNICA */}
            {activeTab === 'clinica' && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">🏢 Dados da Clínica</h2>
                  <p className="text-sm text-gray-600">Informações da sua empresa ou consultório</p>
                  {!isAdmin && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        🔒 <strong>Modo somente leitura</strong> - Apenas administradores podem editar estas informações
                      </p>
                    </div>
                  )}
                </div>

                <fieldset disabled={!isAdmin}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Clínica</label>
                      <input
                        type="text"
                        value={clinicaData.nome_clinica}
                        onChange={(e) => setClinicaData({ ...clinicaData, nome_clinica: e.target.value })}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isAdmin ? 'bg-gray-50' : ''}`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ/CPF</label>
                      <input
                        type="text"
                        value={clinicaData.cnpj}
                        onChange={handleCNPJChange}
                        placeholder="00.000.000/0000-00"
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isAdmin ? 'bg-gray-50' : ''}`}
                      />
                    </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                    <input
                      type="text"
                      value={clinicaData.telefone}
                      onChange={handleTelefoneChange}
                      placeholder="(11) 99999-9999"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                    <input
                      type="text"
                      value={clinicaData.endereco}
                      onChange={(e) => setClinicaData({ ...clinicaData, endereco: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                    <input
                      type="text"
                      value={clinicaData.cidade}
                      onChange={(e) => setClinicaData({ ...clinicaData, cidade: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                      <input
                        type="text"
                        value={clinicaData.estado}
                        onChange={(e) => setClinicaData({ ...clinicaData, estado: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        maxLength={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                      <input
                        type="text"
                        value={clinicaData.cep}
                        onChange={(e) => setClinicaData({ ...clinicaData, cep: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                    <input
                      type="email"
                      value={clinicaData.email}
                      onChange={(e) => setClinicaData({ ...clinicaData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Logo da Clínica</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-gray-400 text-sm">Logo</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all cursor-pointer">
                        <Upload className="w-4 h-4" />
                        Fazer Upload
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {logoPreview && (
                        <button
                          onClick={() => {
                            setLogoPreview(null);
                            toast.success('Logo removido');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover Logo
                        </button>
                      )}
                      <p className="text-xs text-gray-500">
                        Formatos aceitos: JPG, PNG, GIF (máx. 2MB)
                      </p>
                    </div>
                  </div>
                </div>
                </fieldset>

                {isAdmin && (
                  <div className="flex justify-end pt-4 border-t">
                    <button
                      onClick={handleSaveClinica}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                    >
                      <Save className="w-5 h-5" />
                      Salvar Alterações
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ESTOQUE */}
            {activeTab === 'estoque' && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">📦 Configurações de Estoque</h2>
                  <p className="text-sm text-gray-600">Gerencie como o estoque funciona no sistema</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">Desconto Automático de Estoque</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Descontar automaticamente folhas quando um teste é aplicado
                      </p>
                    </div>
                    <button
                      onClick={() => setEstoqueConfig({ ...estoqueConfig, desconto_automatico: !estoqueConfig.desconto_automatico })}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        estoqueConfig.desconto_automatico ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          estoqueConfig.desconto_automatico ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">Alertas de Estoque Baixo</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Receber notificações quando o estoque estiver baixo
                      </p>
                    </div>
                    <button
                      onClick={() => setEstoqueConfig({ ...estoqueConfig, alerta_estoque_baixo: !estoqueConfig.alerta_estoque_baixo })}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        estoqueConfig.alerta_estoque_baixo ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          estoqueConfig.alerta_estoque_baixo ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Percentual de Alerta (%)
                      </label>
                      <input
                        type="number"
                        value={estoqueConfig.percentual_alerta}
                        onChange={(e) => setEstoqueConfig({ ...estoqueConfig, percentual_alerta: parseInt(e.target.value) })}
                        min="0"
                        max="100"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Alertar quando estoque estiver abaixo deste percentual do mínimo
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-mail para Alertas
                      </label>
                      <input
                        type="email"
                        value={estoqueConfig.email_alertas}
                        onChange={(e) => setEstoqueConfig({ ...estoqueConfig, email_alertas: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleSaveEstoque}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                  >
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}

            {/* TAB: EMAIL */}
            {activeTab === 'email' && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">📧 Configurações de E-mail</h2>
                  <p className="text-sm text-gray-600">Configure o envio automático de e-mails e laudos</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-semibold mb-2">
                    ℹ️ Configuração de Servidor SMTP
                  </p>
                  <p className="text-xs text-blue-700">
                    Configure seu servidor SMTP para enviar laudos e resultados por e-mail automaticamente.
                    Use Gmail, Outlook, ou outro provedor de sua preferência.
                  </p>
                </div>

                {/* Exemplos de Configuração */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">📋 Exemplos de Configuração:</h3>
                  <div className="space-y-2 text-xs text-gray-700">
                    <div>
                      <strong>Gmail:</strong> smtp.gmail.com | Porta: 587 | Ative "Acesso de apps menos seguros" ou use "Senha de app"
                    </div>
                    <div>
                      <strong>Outlook/Hotmail:</strong> smtp-mail.outlook.com | Porta: 587
                    </div>
                    <div>
                      <strong>Yahoo:</strong> smtp.mail.yahoo.com | Porta: 587
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Servidor SMTP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={emailConfig.smtp_host}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Porta SMTP <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={emailConfig.smtp_port}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="587">587 (TLS - Recomendado)</option>
                      <option value="465">465 (SSL)</option>
                      <option value="25">25 (Padrão)</option>
                      <option value="2525">2525 (Alternativa)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      587 para TLS, 465 para SSL
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-mail (Usuário SMTP) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={emailConfig.smtp_usuario}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_usuario: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="seu@email.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Este será o e-mail remetente
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha SMTP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={emailConfig.smtp_senha}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_senha: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use "Senha de app" para Gmail
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-mail Padrão para Cópia (CC) <span className="text-gray-400">(Opcional)</span>
                    </label>
                    <input
                      type="email"
                      value={emailConfig.email_padrao_copia}
                      onChange={(e) => setEmailConfig({ ...emailConfig, email_padrao_copia: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="copia@clinica.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Este e-mail receberá uma cópia de todos os laudos e resultados enviados
                    </p>
                  </div>
                </div>

                {/* Alertas importantes */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 font-semibold mb-2">
                    ⚠️ Importante para Gmail:
                  </p>
                  <ol className="text-xs text-yellow-700 space-y-1 ml-4 list-decimal">
                    <li>Ative a verificação em duas etapas na sua conta Google</li>
                    <li>Acesse: <a href="https://myaccount.google.com/apppasswords" target="_blank" className="underline">myaccount.google.com/apppasswords</a></li>
                    <li>Crie uma "Senha de app" para "Email"</li>
                    <li>Use essa senha de 16 caracteres no campo "Senha SMTP"</li>
                  </ol>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button 
                    onClick={handleTestEmail}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                  >
                    <Mail className="w-4 h-4" />
                    Testar Conexão
                  </button>
                  <button
                    onClick={handleSaveEmail}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md ml-auto"
                  >
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}

            {/* TAB: NFS-E */}
            {activeTab === 'nfs-e' && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">🧾 Configurações de NFS-e</h2>
                  <p className="text-sm text-gray-600">Configure a emissão automática de Nota Fiscal de Serviços Eletrônica</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-semibold mb-2">
                    ℹ️ Emissão Automática de NFS-e
                  </p>
                  <p className="text-xs text-green-700">
                    Configure sua API de NFS-e para emitir notas fiscais automaticamente após cada avaliação.
                    Os dados do paciente serão preenchidos automaticamente.
                  </p>
                </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   URL da API <span className="text-red-500">*</span>
                 </label>
                 <input
                   type="url"
                   value={nfsEConfig.api_url}
                   onChange={(e) => setNfsEConfig({ ...nfsEConfig, api_url: e.target.value })}
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                   placeholder="https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx"
                 />
                 <p className="text-xs text-gray-500 mt-1">
                   URL oficial da Prefeitura de São Paulo (Produção)
                 </p>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   CNPJ <span className="text-red-500">*</span>
                 </label>
                 <input
                   type="text"
                   value={nfsEConfig.cnpj}
                   onChange={(e) => setNfsEConfig({ ...nfsEConfig, cnpj: e.target.value })}
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                   placeholder="00.000.000/0000-00"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Inscrição Municipal <span className="text-red-500">*</span>
                 </label>
                 <input
                   type="text"
                   value={nfsEConfig.inscricao_municipal}
                   onChange={(e) => setNfsEConfig({ ...nfsEConfig, inscricao_municipal: e.target.value })}
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                   placeholder="12345678"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Usuário da API <span className="text-red-500">*</span>
                 </label>
                 <input
                   type="text"
                   value={nfsEConfig.usuario_api}
                   onChange={(e) => setNfsEConfig({ ...nfsEConfig, usuario_api: e.target.value })}
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                   placeholder="seu_usuario"
                 />
               </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha da API <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={nfsEConfig.senha_api}
                        onChange={(e) => setNfsEConfig({ ...nfsEConfig, senha_api: e.target.value })}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código do Serviço
                    </label>
                    <input
                      type="text"
                      value={nfsEConfig.codigo_servico}
                      onChange={(e) => setNfsEConfig({ ...nfsEConfig, codigo_servico: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="05118"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Código padrão: 05118 (Avaliação Psicológica)
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discriminação do Serviço
                    </label>
                    <textarea
                      value={nfsEConfig.discriminacao_servico}
                      onChange={(e) => setNfsEConfig({ ...nfsEConfig, discriminacao_servico: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={3}
                      placeholder="Avaliação Psicológica para Habilitação de Veículos"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor Padrão (R$)
                    </label>
                    <input
                      type="text"
                      value={nfsEConfig.valor_padrao || ''}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setNfsEConfig({ ...nfsEConfig, valor_padrao: inputValue });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="142,53"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Digite o valor com vírgula (ex: 142,53)
                    </p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="nfs-e-ativo"
                      checked={nfsEConfig.ativo}
                      onChange={(e) => setNfsEConfig({ ...nfsEConfig, ativo: e.target.checked })}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="nfs-e-ativo" className="ml-2 block text-sm text-gray-700">
                      Ativar emissão automática de NFS-e
                    </label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleSaveNfsE}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </button>

                  <button
                    onClick={handleTestNfsE}
                    disabled={testandoConexao || !nfsEConfig.api_url || !nfsEConfig.usuario_api || !nfsEConfig.senha_api}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testandoConexao ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Testar Conexão
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: DETRAN */}
            {activeTab === 'detran' && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">🚗 Sincronização DETRAN SP</h2>
                  <p className="text-sm text-gray-600">Configure a sincronização automática de agendamentos do site e-cnhsp.sp.gov.br</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-semibold mb-2">
                    ℹ️ Sincronização Automática
                  </p>
                  <p className="text-xs text-blue-700">
                    Configure seus dados de acesso ao site do DETRAN SP e selecione os dias da semana que você trabalha.
                    O sistema sincronizará automaticamente os agendamentos das datas configuradas.
                  </p>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CPF do Perito <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={detranConfig.cpf}
                      onChange={(e) => setDetranConfig({ ...detranConfig, cpf: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha do Site DETRAN <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showDetranPassword ? 'text' : 'password'}
                        value={detranConfig.senha}
                        onChange={(e) => setDetranConfig({ ...detranConfig, senha: e.target.value })}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDetranPassword(!showDetranPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showDetranPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Dias da Semana que Trabalha para o DETRAN <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { value: 'segunda', label: 'Segunda-feira' },
                        { value: 'terca', label: 'Terça-feira' },
                        { value: 'quarta', label: 'Quarta-feira' },
                        { value: 'quinta', label: 'Quinta-feira' },
                        { value: 'sexta', label: 'Sexta-feira' },
                        { value: 'sabado', label: 'Sábado' },
                        { value: 'domingo', label: 'Domingo' }
                      ].map((dia) => (
                        <label key={dia.value} className="flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50" style={{
                          borderColor: detranConfig.dias_trabalho.includes(dia.value) ? '#3b82f6' : '#e5e7eb',
                          backgroundColor: detranConfig.dias_trabalho.includes(dia.value) ? '#eff6ff' : 'white'
                        }}>
                          <input
                            type="checkbox"
                            checked={detranConfig.dias_trabalho.includes(dia.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDetranConfig({
                                  ...detranConfig,
                                  dias_trabalho: [...detranConfig.dias_trabalho, dia.value]
                                });
                              } else {
                                setDetranConfig({
                                  ...detranConfig,
                                  dias_trabalho: detranConfig.dias_trabalho.filter(d => d !== dia.value)
                                });
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">{dia.label}</span>
                        </label>
                      ))}
                    </div>
                    {detranConfig.dias_trabalho.length === 0 && (
                      <p className="text-xs text-red-500 mt-2">Selecione pelo menos um dia da semana</p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="detran-sincronizacao-automatica"
                      checked={detranConfig.sincronizacao_automatica}
                      onChange={(e) => setDetranConfig({ ...detranConfig, sincronizacao_automatica: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="detran-sincronizacao-automatica" className="ml-2 block text-sm text-gray-700">
                      Ativar sincronização automática (executar diariamente)
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="detran-ativo"
                      checked={detranConfig.ativo}
                      onChange={(e) => setDetranConfig({ ...detranConfig, ativo: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="detran-ativo" className="ml-2 block text-sm text-gray-700">
                      Configuração ativa
                    </label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={async () => {
                      try {
                        console.log('💾 Tentando salvar configuração DETRAN:', {
                          cpf: detranConfig.cpf,
                          senha: detranConfig.senha ? '***' : 'vazia',
                          dias_trabalho: detranConfig.dias_trabalho,
                          sincronizacao_automatica: detranConfig.sincronizacao_automatica,
                          ativo: detranConfig.ativo
                        });

                        if (!detranConfig.cpf || !detranConfig.cpf.trim()) {
                          toast.error('CPF é obrigatório');
                          return;
                        }

                        if (!detranConfig.senha || !detranConfig.senha.trim()) {
                          toast.error('Senha é obrigatória');
                          return;
                        }

                        if (!detranConfig.dias_trabalho || detranConfig.dias_trabalho.length === 0) {
                          toast.error('Selecione pelo menos um dia de trabalho');
                          return;
                        }

                        const response = await detranService.updateConfiguracao({
                          cpf: detranConfig.cpf.trim(),
                          senha: detranConfig.senha.trim(),
                          dias_trabalho: detranConfig.dias_trabalho,
                          sincronizacao_automatica: detranConfig.sincronizacao_automatica,
                          ativo: detranConfig.ativo
                        });

                        console.log('✅ Resposta do servidor:', response.data);

                        if (response.data?.success) {
                          toast.success('Configuração DETRAN salva com sucesso!');
                          // Manter os dados salvos, apenas limpar a senha para segurança
                          setDetranConfig({ 
                            ...detranConfig, 
                            senha: '',
                            cpf: response.data?.data?.cpf || detranConfig.cpf
                          });
                          queryClient.invalidateQueries({ queryKey: ['detran-config'] });
                        } else {
                          toast.error(response.data?.error || 'Erro ao salvar configuração');
                        }
                      } catch (error: any) {
                        console.error('❌ Erro ao salvar configuração:', error);
                        console.error('Erro completo:', error.response?.data);
                        toast.error(error.response?.data?.error || error.message || 'Erro ao salvar configuração');
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Configuração
                  </button>

                  <button
                    onClick={async () => {
                      // Buscar configuração atualizada antes de sincronizar
                      try {
                        const configResponse = await detranService.getConfiguracao();
                        
                        if (!configResponse.data?.success || !configResponse.data?.data?.id) {
                          toast.error('Configure e salve CPF e senha antes de sincronizar');
                          return;
                        }

                        if (!configResponse.data.data.cpf) {
                          toast.error('CPF não configurado. Configure e salve antes de sincronizar');
                          return;
                        }

                        setSincronizandoDetran(true);
                        console.log('🔄 Iniciando sincronização DETRAN...');
                        
                        // Mostrar loading durante a sincronização
                        const loadingToast = toast.loading('Sincronização iniciada. Isso pode levar alguns minutos...');
                        
                        try {
                          const response = await detranService.sincronizar({});
                          toast.dismiss(loadingToast);
                          console.log('✅ Resposta da sincronização:', response.data);
                          
                          if (response.data?.success) {
                            const importados = response.data.data?.importados || 0;
                            const erros = response.data.data?.erros?.length || 0;
                            
                            let mensagem = `Sincronização concluída: ${importados} agendamento(s) importado(s)`;
                            if (erros > 0) {
                              mensagem += `. ${erros} erro(s) encontrado(s).`;
                            }
                            
                            toast.success(mensagem);
                            // Recarregar agenda e configuração
                            queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
                            queryClient.invalidateQueries({ queryKey: ['detran-config'] });
                          } else {
                            toast.error(response.data?.error || 'Erro ao sincronizar');
                          }
                        } catch (syncError: any) {
                          toast.dismiss(loadingToast);
                          console.error('❌ Erro ao sincronizar:', syncError);
                          console.error('Detalhes completos do erro:', {
                            message: syncError.message,
                            code: syncError.code,
                            response: syncError.response?.data,
                            status: syncError.response?.status
                          });
                          
                          // Mensagens de erro mais específicas
                          if (syncError.code === 'ECONNABORTED' || syncError.message?.includes('timeout')) {
                            toast.error('Tempo limite excedido. A sincronização pode estar demorando mais que o esperado. Verifique os logs do servidor.');
                          } else if (syncError.response?.status === 422) {
                            const errorData = syncError.response?.data;
                            let errorMessage = errorData?.error || 'Não foi possível encontrar os campos de login na página do DETRAN. A estrutura pode ter mudado.';
                            if (errorData?.detalhes?.tipo === 'DetranSelectorError') {
                              errorMessage += ' Verifique os artifacts salvos no backend.';
                            }
                            toast.error(errorMessage, { duration: 8000 });
                          } else if (syncError.response?.status === 401) {
                            toast.error(syncError.response?.data?.error || 'Credenciais inválidas. Verifique CPF e senha.', { duration: 8000 });
                          } else if (syncError.response?.status === 409) {
                            toast.error(syncError.response?.data?.error || 'CAPTCHA detectado. É necessária intervenção manual.', { duration: 8000 });
                          } else if (syncError.response?.status === 504) {
                            toast.error(syncError.response?.data?.error || 'Timeout ao aguardar resposta do DETRAN. Tente novamente.', { duration: 8000 });
                          } else if (syncError.response?.status === 400 && syncError.response?.data?.error) {
                            toast.error(syncError.response.data.error);
                          } else if (syncError.response?.status === 500) {
                            const errorMsg = syncError.response?.data?.error || 'Erro interno no servidor';
                            const detalhes = syncError.response?.data?.detalhes;
                            
                            let mensagem = errorMsg;
                            if (detalhes?.message && process.env.NODE_ENV === 'development') {
                              mensagem += `: ${detalhes.message}`;
                            }
                            
                            toast.error(mensagem, {
                              duration: 6000,
                            });
                            console.error('Detalhes técnicos do erro 500:', detalhes);
                          } else {
                            toast.error(syncError.response?.data?.error || syncError.message || 'Erro ao sincronizar agendamentos');
                          }
                        } finally {
                          setSincronizandoDetran(false);
                        }
                      } catch (error: any) {
                        console.error('❌ Erro ao verificar configuração ou sincronizar:', error);
                        console.error('Detalhes do erro:', error.response?.data);
                        
                        // Mensagens de erro mais específicas
                        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                          toast.error('Tempo limite excedido. Verifique os logs do servidor.');
                        } else if (error.response?.status === 400 && error.response?.data?.error) {
                          toast.error(error.response.data.error);
                        } else if (error.response?.status === 500) {
                          toast.error('Erro interno no servidor. Verifique os logs do backend.');
                        } else {
                          toast.error(error.response?.data?.error || error.message || 'Erro ao sincronizar agendamentos');
                        }
                        setSincronizandoDetran(false);
                      }
                    }}
                    disabled={sincronizandoDetran}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sincronizandoDetran ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Sincronizar Agora
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Importante:</strong> A primeira sincronização pode levar alguns minutos. 
                    O sistema irá buscar agendamentos para os próximos 14 dias baseados nos dias configurados.
                    Agendamentos duplicados (mesmo CPF, data e hora) serão ignorados.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: LAUDOS */}
            {activeTab === 'laudos' && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">📄 Configurações de Laudos</h2>
                  <p className="text-sm text-gray-600">Personalize a aparência e conteúdo dos laudos</p>
                </div>

                {/* Seção de Busca e Geração de Laudo */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Buscar e Gerar Laudo</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Digite o número do laudo, CPF ou nome do paciente para carregar os dados e gerar o laudo
                  </p>
                  
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={buscaLaudo}
                      onChange={(e) => setBuscaLaudo(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleBuscarLaudo()}
                      placeholder="Número do laudo, CPF ou nome do paciente..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleBuscarLaudo}
                      disabled={buscandoLaudo}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      {buscandoLaudo ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Buscando...
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5" />
                          Buscar e Gerar
                        </>
                      )}
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-3">
                    💡 Você pode buscar por número completo (LAU-2025-0001), apenas os 4 dígitos (0001), CPF ou nome do paciente
                  </p>

                  {/* Exibir Laudo Completo */}
                  {laudoEncontrado && (
                    <div className="mt-4 bg-white border-2 border-blue-300 rounded-lg p-8 laudo-impressao">
                      {/* Cabeçalho com Botão de Impressão */}
                      <div className="flex justify-between items-start mb-6 no-print">
                        <h3 className="text-2xl font-bold text-gray-900">📋 Laudo Psicológico</h3>
                        <button
                          onClick={() => window.print()}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Imprimir Laudo
                        </button>
                      </div>

                      {/* Conteúdo do Laudo */}
                      <div className="space-y-6 text-gray-800">
                        {/* 1. Identificação */}
                        <section>
                          <h4 className="font-bold text-lg mb-3 border-b-2 border-gray-300 pb-2">1. IDENTIFICAÇÃO</h4>
                          <div className="space-y-2 ml-4">
                            <p><strong>Nome do avaliado:</strong> {laudoEncontrado.paciente.nome}</p>
                            <p><strong>Documento (CPF):</strong> {laudoEncontrado.paciente.cpf}</p>
                            <p>
                              <strong>Data de nascimento:</strong> {laudoEncontrado.paciente.data_nascimento || '-'} | 
                              <strong> Idade:</strong> {laudoEncontrado.paciente.idade ? `${laudoEncontrado.paciente.idade} anos` : '-'}
                            </p>
                            <p><strong>Número do processo/registro:</strong> {laudoEncontrado.paciente.numero_laudo}</p>
                            <p><strong>Data(s) da avaliação:</strong> {laudoEncontrado.avaliacoes.map((av: any) => 
                              new Date(av.data_aplicacao).toLocaleDateString('pt-BR')).join(', ')}</p>
                            <p><strong>Local da avaliação:</strong> [Clínica/Consultório - a ser configurado]</p>
                          </div>
                        </section>

                        {/* 2. Demanda e Objetivo */}
                        <section>
                          <h4 className="font-bold text-lg mb-3 border-b-2 border-gray-300 pb-2">2. DEMANDA E OBJETIVO</h4>
                          <div className="space-y-2 ml-4">
                            <p><strong>Demanda:</strong> Avaliação psicológica para fins de {laudoEncontrado.paciente.tipo_transito?.toLowerCase() || 'obtenção/renovação'} da Carteira Nacional de Habilitação (CNH) no Estado de São Paulo.</p>
                            <p><strong>Objetivo:</strong> Investigar condições psicológicas relevantes para direção veicular, com foco em memória, atenção, raciocínio lógico, personalidade e entrevista psicológica, conforme normas aplicáveis ao contexto do trânsito.</p>
                          </div>
                        </section>

                        {/* 4. Procedimentos e Instrumentos */}
                        <section>
                          <h4 className="font-bold text-lg mb-3 border-b-2 border-gray-300 pb-2">4. PROCEDIMENTOS, INSTRUMENTOS E CONDIÇÕES DE AVALIAÇÃO</h4>
                          <div className="space-y-3 ml-4">
                            <div>
                              <p className="font-semibold mb-2">Procedimentos:</p>
                              <ul className="list-disc ml-6 space-y-1">
                                <li>Entrevista psicológica estruturada/semi estruturada</li>
                                <li>Aplicação de testes psicológicos padronizados e validados para a população-alvo</li>
                                <li>Observação comportamental durante a avaliação</li>
                              </ul>
                            </div>
                            
                            <div>
                              <p className="font-semibold mb-2">Instrumentos utilizados (todos com parecer favorável no SATEPSI):</p>
                              <ul className="list-disc ml-6 space-y-1">
                                {laudoEncontrado.testes.map((teste: any, idx: number) => (
                                  <li key={idx}>
                                    <strong>{teste.nome}</strong> - Classificação: {teste.resultado?.classificacao || 'N/A'}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </section>

                        {/* 7. Análise Integrada */}
                        <section>
                          <h4 className="font-bold text-lg mb-3 border-b-2 border-gray-300 pb-2">7. ANÁLISE INTEGRADA</h4>
                          <div className="space-y-3 ml-4">
                            <p><strong>Convergências:</strong> [A ser preenchido pelo psicólogo]</p>
                            <p><strong>Divergências:</strong> [A ser preenchido pelo psicólogo]</p>
                            <div>
                              <p className="font-semibold mb-2">Implicações para a direção veicular:</p>
                              <ul className="list-disc ml-6 space-y-1">
                                <li>Vigilância e monitoramento do ambiente: [compatível ou com ressalvas]</li>
                                <li>Tomada de decisão sob pressão: [compatível ou com ressalvas]</li>
                                <li>Gerenciamento emocional em situações de trânsito: [compatível ou com ressalvas]</li>
                                <li>Probabilidade de lapsos/erros por desatenção: [baixa/moderada/alta]</li>
                              </ul>
                            </div>
                          </div>
                        </section>

                        {/* 8. Conclusão Técnica */}
                        <section>
                          <h4 className="font-bold text-lg mb-3 border-b-2 border-gray-300 pb-2">8. CONCLUSÃO TÉCNICA</h4>
                          <div className="space-y-3 ml-4">
                            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                              <p className="font-bold text-lg">
                                Parecer: {' '}
                                {laudoEncontrado.aptidao === 'Apto' && '✅ APTO psicologicamente para condução veicular'}
                                {laudoEncontrado.aptidao === 'Inapto Temporário' && '⚠️ INAPTO TEMPORÁRIO'}
                                {laudoEncontrado.aptidao === 'Inapto' && '❌ INAPTO psicologicamente para condução veicular'}
                                {!laudoEncontrado.aptidao && '⏳ Avaliação inconclusiva – necessário retorno/reavaliação'}
                              </p>
                            </div>
                            <p><strong>Validade:</strong> 6 meses a contar da data de emissão.</p>
                            <p><strong>Escopo:</strong> Uso exclusivo no contexto do trânsito. Este laudo não é válido para outras áreas ou finalidades.</p>
                            <div className="mt-6 pt-6 border-t-2 border-gray-300">
                              <p><strong>Nome do(a) psicólogo(a):</strong> {laudoEncontrado.psicologo?.nome || currentUser?.nome}</p>
                              <p><strong>CRP:</strong> {laudoEncontrado.psicologo?.crp || currentUser?.crp || '[CRP não informado]'}</p>
                              <p className="mt-4"><strong>Assinatura e carimbo:</strong> __________________________</p>
                              <p className="mt-2"><strong>Local e data:</strong> São Paulo/SP, {new Date().toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                        </section>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">⚙️ Configurações de Personalização</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Formato de Numeração</label>
                    <input
                      type="text"
                      value={laudoConfig.formato_numeracao}
                      onChange={(e) => setLaudoConfig({ ...laudoConfig, formato_numeracao: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="LAU-YYYY-NNNN"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      YYYY = ano, MM = mês, DD = dia, NNNN = número sequencial
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Texto de Rodapé</label>
                    <textarea
                      value={laudoConfig.texto_rodape}
                      onChange={(e) => setLaudoConfig({ ...laudoConfig, texto_rodape: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">Incluir Logo no Laudo</h3>
                        <p className="text-sm text-gray-600 mt-1">Adicionar logo da clínica no cabeçalho</p>
                      </div>
                      <button
                        onClick={() => setLaudoConfig({ ...laudoConfig, incluir_logo: !laudoConfig.incluir_logo })}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          laudoConfig.incluir_logo ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            laudoConfig.incluir_logo ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">Incluir Assinatura Digital</h3>
                        <p className="text-sm text-gray-600 mt-1">Adicionar assinatura do profissional</p>
                      </div>
                      <button
                        onClick={() => setLaudoConfig({ ...laudoConfig, incluir_assinatura: !laudoConfig.incluir_assinatura })}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          laudoConfig.incluir_assinatura ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            laudoConfig.incluir_assinatura ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleSaveLaudo}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                  >
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}

            {/* TAB: APARÊNCIA */}
            {activeTab === 'aparencia' && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">🎨 Aparência do Sistema</h2>
                  <p className="text-sm text-gray-600">Personalize a interface do sistema</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Modo de Exibição</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setAparenciaConfig({ ...aparenciaConfig, modo: 'light' })}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          aparenciaConfig.modo === 'light'
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-3xl mb-2">☀️</div>
                          <p className="font-semibold">Modo Claro</p>
                        </div>
                      </button>

                      <button
                        onClick={() => setAparenciaConfig({ ...aparenciaConfig, modo: 'dark' })}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          aparenciaConfig.modo === 'dark'
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-3xl mb-2">🌙</div>
                          <p className="font-semibold">Modo Escuro</p>
                          <p className="text-xs text-gray-500 mt-1">(Em breve)</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Cor Primária</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={aparenciaConfig.cor_primaria}
                        onChange={(e) => setAparenciaConfig({ ...aparenciaConfig, cor_primaria: e.target.value })}
                        className="w-20 h-12 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={aparenciaConfig.cor_primaria}
                        onChange={(e) => setAparenciaConfig({ ...aparenciaConfig, cor_primaria: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Tamanho da Fonte</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['small', 'medium', 'large'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setAparenciaConfig({ ...aparenciaConfig, tamanho_fonte: size })}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            aparenciaConfig.tamanho_fonte === size
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <p className="font-semibold capitalize">{size === 'small' ? 'Pequeno' : size === 'medium' ? 'Médio' : 'Grande'}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleSaveAparencia}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                  >
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}

            {/* TAB: NOTIFICAÇÕES */}
            {activeTab === 'notificacoes' && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">🔔 Notificações</h2>
                  <p className="text-sm text-gray-600">Configure mensagens automáticas de resultado</p>
                </div>

                {/* Método de Envio */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Método de Envio</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setNotificacoesConfig({ ...notificacoesConfig, metodo_envio: 'whatsapp' })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        notificacoesConfig.metodo_envio === 'whatsapp'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl ${notificacoesConfig.metodo_envio === 'whatsapp' ? '' : 'opacity-50'}`}>📱</div>
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-900">WhatsApp</h4>
                          <p className="text-sm text-gray-600">Enviar via WhatsApp</p>
                        </div>
                        {notificacoesConfig.metodo_envio === 'whatsapp' && (
                          <CheckCircle className="w-6 h-6 text-green-500 ml-auto" />
                        )}
                      </div>
                    </button>

                    <button
                      onClick={() => setNotificacoesConfig({ ...notificacoesConfig, metodo_envio: 'email' })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        notificacoesConfig.metodo_envio === 'email'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl ${notificacoesConfig.metodo_envio === 'email' ? '' : 'opacity-50'}`}>📧</div>
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-900">E-mail</h4>
                          <p className="text-sm text-gray-600">Enviar via E-mail</p>
                        </div>
                        {notificacoesConfig.metodo_envio === 'email' && (
                          <CheckCircle className="w-6 h-6 text-blue-500 ml-auto" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Texto para Resultado APTO */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-gray-800">Mensagem para APTO</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Variáveis disponíveis: <code className="bg-gray-100 px-2 py-1 rounded">{'{nome}'}</code> <code className="bg-gray-100 px-2 py-1 rounded">{'{psicologo}'}</code>
                  </p>
                  <textarea
                    value={notificacoesConfig.texto_apto}
                    onChange={(e) => setNotificacoesConfig({ ...notificacoesConfig, texto_apto: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder="Ex: {nome}, aqui {psicologo}, tudo bom?&#10;&#10;Sua avaliação deu como resultado APTO..."
                  />
                </div>

                {/* Texto para Resultado INAPTO TEMPORÁRIO */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-gray-800">Mensagem para INAPTO TEMPORÁRIO</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Variáveis disponíveis: <code className="bg-gray-100 px-2 py-1 rounded">{'{nome}'}</code> <code className="bg-gray-100 px-2 py-1 rounded">{'{psicologo}'}</code> <code className="bg-gray-100 px-2 py-1 rounded">{'{testes}'}</code> <code className="bg-gray-100 px-2 py-1 rounded">{'{data_reavaliacao}'}</code>
                  </p>
                  <textarea
                    value={notificacoesConfig.texto_inapto_temporario}
                    onChange={(e) => setNotificacoesConfig({ ...notificacoesConfig, texto_inapto_temporario: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                    placeholder="Ex: {nome}, tudo bom? Aqui {psicologo}.&#10;&#10;Precisamos refazer sua avaliação..."
                  />
                </div>

                {/* Texto para Resultado INAPTO */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-gray-800">Mensagem para INAPTO</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Variáveis disponíveis: <code className="bg-gray-100 px-2 py-1 rounded">{'{nome}'}</code> <code className="bg-gray-100 px-2 py-1 rounded">{'{psicologo}'}</code> <code className="bg-gray-100 px-2 py-1 rounded">{'{testes}'}</code> <code className="bg-gray-100 px-2 py-1 rounded">{'{data_limite}'}</code>
                  </p>
                  <textarea
                    value={notificacoesConfig.texto_inapto}
                    onChange={(e) => setNotificacoesConfig({ ...notificacoesConfig, texto_inapto: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="Ex: {nome}, tudo bom? Aqui {psicologo}.&#10;&#10;Infelizmente você não passou..."
                  />
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleSaveNotificacoes}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                  >
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                  </button>
                </div>
              </div>
            )}

            {/* TAB: SEGURANÇA */}
            {activeTab === 'seguranca' && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">🔒 Segurança e Privacidade</h2>
                  <p className="text-sm text-gray-600">Gerencie backups, exportações e segurança dos dados</p>
                </div>

                <div className="space-y-6">
                  {/* Backup */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <Download className="w-5 h-5 text-blue-600" />
                          Backup de Dados
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Faça backup de todos os dados do sistema
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleBackup}
                        disabled={backupLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {backupLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processando...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Fazer Backup Agora
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          carregarBackups();
                          setShowRestoreModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        Restaurar Backup
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      {backupsDisponiveis.length > 0 ? (
                        <>Último backup: {new Date(backupsDisponiveis[0]?.data).toLocaleString('pt-BR')}</>
                      ) : (
                        'Nenhum backup realizado'
                      )}
                    </p>
                  </div>

                  {/* Exportar Dados (LGPD) */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-green-600" />
                          Exportar Dados (LGPD)
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Exporte todos os dados em formato legível
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleExportarDados}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Exportar Todos os Dados
                    </button>
                  </div>

                  {/* Sessões Ativas */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <Key className="w-5 h-5 text-purple-600" />
                          Sessões Ativas
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Dispositivos com acesso à sua conta
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-800">Windows - Chrome</p>
                          <p className="text-xs text-gray-500">São Paulo, Brasil • Ativo agora</p>
                        </div>
                        <span className="text-xs text-green-600 font-semibold">Atual</span>
                      </div>
                    </div>
                  </div>

                  {/* Logs de Acesso */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-red-600" />
                          Logs de Acesso
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Histórico de acessos ao sistema
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowLogsModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Logs de Acesso
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: USUÁRIOS */}
            {activeTab === 'usuarios' && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">👥 Gestão de Usuários</h2>
                    <p className="text-sm text-gray-600">Gerencie os usuários e suas permissões no sistema</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        resetUserForm();
                        setShowUserModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                    >
                      <Plus className="w-5 h-5" />
                      Novo Usuário
                    </button>
                  )}
                </div>

                {/* Lista de Usuários */}
                <div className="grid grid-cols-1 gap-4">
                  {usuarios.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum usuário cadastrado</p>
                    </div>
                  ) : (
                    usuarios.map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {user.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-800">{user.nome}</h3>
                              <span className={`text-xs px-2 py-1 rounded-full border ${getPerfilBadgeColor(user.perfil)}`}>
                                {user.perfil === 'administrador' && '👑 Administrador'}
                                {user.perfil === 'psicologo' && '🧠 Psicólogo'}
                                {user.perfil === 'psicologo_externo' && '🌐 Psicólogo Externo'}
                                {user.perfil === 'recepcionista' && '📋 Recepcionista'}
                                {user.perfil === 'estagiario' && '📚 Estagiário'}
                              </span>
                              {user.ativo ? (
                                <CheckCircle className="w-4 h-4 text-green-600" title="Ativo" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" title="Inativo" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Criado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {/* Botões apenas para administradores */}
                          {isAdmin && (
                            <>
                              {user.ativo ? (
                                <button
                                  onClick={() => handleDesativarUser(user.id, user.nome)}
                                  className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-all"
                                  title="Desativar Usuário"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAtivarUser(user.id, user.nome)}
                                  className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all"
                                  title="Ativar Usuário"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleDeletePermanenteUser(user.id, user.nome)}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                                title="Excluir Permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          {/* Botão de desativar para não-administradores (mantém compatibilidade) */}
                          {!isAdmin && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                              title="Desativar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Informações sobre Permissões */}
                {isAdmin && (
                  <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Permissões de Administrador
                    </h3>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p>✅ <strong>Desativar/Ativar:</strong> Altera o status do usuário (pode ser revertido)</p>
                      <p>⚠️ <strong>Excluir Permanentemente:</strong> Remove o usuário do sistema (não pode ser revertido)</p>
                      <p>🔒 <strong>Proteção:</strong> Você não pode desativar ou excluir seu próprio usuário</p>
                    </div>
                  </div>
                )}

                {/* Informações sobre Perfis */}
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">📊 Perfis e Permissões</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {perfis.map((perfil: any) => (
                      <div key={perfil.id} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${getPerfilBadgeColor(perfil.id)}`}>
                            {perfil.nome}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{perfil.descricao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Usuário */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                  <input
                    type="text"
                    value={userFormData.nome}
                    onChange={(e) => setUserFormData({ ...userFormData, nome: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="José Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-mail *</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="jose@clinica.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Perfil *</label>
                  <select
                    value={userFormData.perfil}
                    onChange={(e) => setUserFormData({ ...userFormData, perfil: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {perfis.map((perfil: any) => (
                      <option key={perfil.id} value={perfil.id}>
                        {perfil.nome} - {perfil.descricao}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha {editingUser ? '(deixe em branco para manter)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={userFormData.senha}
                    onChange={(e) => setUserFormData({ ...userFormData, senha: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    resetUserForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Restaurar Backup */}
        {showRestoreModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-6 h-6 text-blue-600" />
                Restaurar Backup
              </h3>

              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Atenção:</strong> Restaurar um backup substituirá todos os dados atuais do sistema. Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="space-y-3">
                {backupsDisponiveis.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Download className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Nenhum backup disponível</p>
                  </div>
                ) : (
                  backupsDisponiveis.map((backup) => (
                    <div key={backup.nome} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all">
                      <div>
                        <p className="font-semibold text-gray-800">{backup.nome}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(backup.data).toLocaleString('pt-BR')} • {(backup.tamanho / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestaurarBackup(backup.nome)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        Restaurar
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowRestoreModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Logs de Acesso */}
        {showLogsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-red-600" />
                  Logs de Acesso ao Sistema
                </h3>
                <button
                  onClick={() => refetchLogs()}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  Atualizar
                </button>
              </div>

              <div className="space-y-2">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum log registrado</p>
                  </div>
                ) : (
                  logs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                      <div className="flex-shrink-0">
                        {log.tipo === 'login' && <Key className="w-5 h-5 text-green-600" />}
                        {log.tipo === 'logout' && <Key className="w-5 h-5 text-gray-600" />}
                        {log.tipo === 'backup' && <Download className="w-5 h-5 text-blue-600" />}
                        {log.tipo === 'restauracao' && <Upload className="w-5 h-5 text-purple-600" />}
                        {log.tipo === 'erro' && <XCircle className="w-5 h-5 text-red-600" />}
                        {!['login', 'logout', 'backup', 'restauracao', 'erro'].includes(log.tipo) && (
                          <Shield className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            log.tipo === 'login' ? 'bg-green-100 text-green-800' :
                            log.tipo === 'logout' ? 'bg-gray-100 text-gray-800' :
                            log.tipo === 'backup' ? 'bg-blue-100 text-blue-800' :
                            log.tipo === 'restauracao' ? 'bg-purple-100 text-purple-800' :
                            log.tipo === 'erro' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.tipo.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-600">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-gray-800 mt-1">{log.descricao}</p>
                        {log.usuario_nome && (
                          <p className="text-sm text-gray-600 mt-1">
                            👤 {log.usuario_nome} ({log.usuario_email})
                          </p>
                        )}
                        {log.ip_address && (
                          <p className="text-xs text-gray-500 mt-1">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
