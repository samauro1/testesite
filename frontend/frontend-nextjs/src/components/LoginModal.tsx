'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { modalBackdrop, modalContent, slideUp } from '@/lib/animations';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (credentials: { username: string; password: string; remember: boolean }) => void;
  title?: string;
  message?: string;
}

export default function LoginModal({ 
  isOpen, 
  onClose, 
  onLogin, 
  title = "Autenticação Necessária",
  message = "Para acessar esta funcionalidade, faça login com suas credenciais:"
}: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar credenciais salvas ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      const savedUsername = localStorage.getItem('saved_username');
      const savedRemember = localStorage.getItem('remember_credentials') === 'true';
      
      if (savedUsername && savedRemember) {
        setUsername(savedUsername);
        setRemember(true);
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simular delay de autenticação
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Salvar credenciais se solicitado
      if (remember) {
        localStorage.setItem('saved_username', username);
        localStorage.setItem('remember_credentials', 'true');
      } else {
        localStorage.removeItem('saved_username');
        localStorage.removeItem('remember_credentials');
      }

      onLogin({ username, password, remember });
    } catch (error) {
      console.error('Erro no login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            {...modalBackdrop}
            onClick={onClose}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              {...modalContent}
              onClick={(e) => e.stopPropagation()}
            >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{message}</p>
            </div>
          </div>
          <motion.button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuário
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite seu usuário"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite sua senha"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Lembrar credenciais
              </div>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <motion.button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              Cancelar
            </motion.button>
            <motion.button
              type="submit"
              disabled={isLoading || !username || !password}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              whileHover={{ scale: isLoading || !username || !password ? 1 : 1.02 }}
              whileTap={{ scale: isLoading || !username || !password ? 1 : 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Entrando...
                </div>
              ) : (
                'Entrar'
              )}
            </motion.button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-500 text-center">
            🔒 Suas credenciais são armazenadas localmente e de forma segura
          </p>
        </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
