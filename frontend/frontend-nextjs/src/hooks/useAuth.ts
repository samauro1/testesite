'use client';

import { useState, useEffect, useCallback } from 'react';

interface AuthCredentials {
  username: string;
  password: string;
  remember: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  credentials: AuthCredentials | null;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    credentials: null,
    error: null
  });

  // Verificar se há credenciais salvas
  useEffect(() => {
    const savedUsername = localStorage.getItem('saved_username');
    const savedRemember = localStorage.getItem('remember_credentials') === 'true';
    
    if (savedUsername && savedRemember) {
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        credentials: {
          username: savedUsername,
          password: '', // Senha não é salva por segurança
          remember: true
        }
      }));
    }
  }, []);

  const login = useCallback(async (credentials: AuthCredentials) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Simular autenticação
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Salvar credenciais se solicitado
      if (credentials.remember) {
        localStorage.setItem('saved_username', credentials.username);
        localStorage.setItem('remember_credentials', 'true');
      } else {
        localStorage.removeItem('saved_username');
        localStorage.removeItem('remember_credentials');
      }

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        credentials,
        error: null
      });

      return true;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erro na autenticação. Verifique suas credenciais.'
      }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('saved_username');
    localStorage.removeItem('remember_credentials');
    
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      credentials: null,
      error: null
    });
  }, []);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...authState,
    login,
    logout,
    clearError
  };
}
