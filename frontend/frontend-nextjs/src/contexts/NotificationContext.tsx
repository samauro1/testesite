import React, { createContext, useContext, useState, useEffect } from 'react';

interface NotificationConfig {
  defaultMethod: 'whatsapp' | 'email';
  whatsappEnabled: boolean;
  emailEnabled: boolean;
}

interface NotificationContextType {
  config: NotificationConfig;
  updateConfig: (config: Partial<NotificationConfig>) => void;
  getDefaultMethod: () => 'whatsapp' | 'email';
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<NotificationConfig>({
    defaultMethod: 'whatsapp',
    whatsappEnabled: true,
    emailEnabled: true
  });

  useEffect(() => {
    // Carregar configuração salva
    const savedConfig = localStorage.getItem('notificationConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Erro ao carregar configuração de notificação:', error);
      }
    }
  }, []);

  const updateConfig = (newConfig: Partial<NotificationConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('notificationConfig', JSON.stringify(updated));
      return updated;
    });
  };

  const getDefaultMethod = () => {
    if (config.defaultMethod === 'whatsapp' && config.whatsappEnabled) {
      return 'whatsapp';
    }
    if (config.defaultMethod === 'email' && config.emailEnabled) {
      return 'email';
    }
    // Fallback
    if (config.whatsappEnabled) return 'whatsapp';
    if (config.emailEnabled) return 'email';
    return 'whatsapp';
  };

  return (
    <NotificationContext.Provider value={{ config, updateConfig, getDefaultMethod }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
  }
  return context;
};
