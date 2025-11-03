'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { configuracoesService } from '@/services/api';
import { useAuth } from './AuthContext';

interface ConfiguracoesClinica {
  nome_clinica?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
}

interface ConfiguracoesContextType {
  configuracoes: ConfiguracoesClinica | null;
  recarregarConfiguracoes: () => void;
  loading: boolean;
}

const ConfiguracoesContext = createContext<ConfiguracoesContextType>({
  configuracoes: null,
  recarregarConfiguracoes: () => {},
  loading: true
});

export const useConfiguracoes = () => useContext(ConfiguracoesContext);

export const ConfiguracoesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesClinica | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const carregarConfiguracoes = async () => {
    try {
      const response = await configuracoesService.getClinica();
      if (response.data?.data) {
        setConfiguracoes(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Só carregar configurações se o usuário estiver autenticado
    if (user) {
      carregarConfiguracoes();
    } else {
      setLoading(false);
    }
  }, [user]);

  const recarregarConfiguracoes = () => {
    carregarConfiguracoes();
  };

  return (
    <ConfiguracoesContext.Provider value={{ configuracoes, recarregarConfiguracoes, loading }}>
      {children}
    </ConfiguracoesContext.Provider>
  );
};

