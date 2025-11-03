'use client';

import axios, { AxiosError, AxiosResponse } from 'axios';

interface AuthInterceptorOptions {
  onAuthRequired: () => void;
  onAuthSuccess: () => void;
}

let authOptions: AuthInterceptorOptions | null = null;

export function setupAuthInterceptor(options: AuthInterceptorOptions) {
  authOptions = options;

  // Interceptor de resposta para capturar erros 401
  axios.interceptors.response.use(
    (response: AxiosResponse) => {
      // Se a resposta foi bem-sucedida, limpar qualquer erro de auth
      if (authOptions) {
        authOptions.onAuthSuccess();
      }
      return response;
    },
    (error: AxiosError) => {
      // Verificar se é erro de autenticação
      if (error.response?.status === 401 || 
          error.response?.status === 403 ||
          (error.response?.data as any)?.error?.includes('Token') ||
          (error.response?.data as any)?.error?.includes('autenticação')) {
        
        console.log('🔐 Erro de autenticação detectado:', error.response?.data);
        
        // Mostrar modal de login
        if (authOptions) {
          authOptions.onAuthRequired();
        }
      }
      
      return Promise.reject(error);
    }
  );
}

export function clearAuthInterceptor() {
  authOptions = null;
  axios.interceptors.response.clear();
}
