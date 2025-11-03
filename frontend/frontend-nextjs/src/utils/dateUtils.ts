// Utilitários para formatação de datas no timezone de São Paulo (UTC-3)

export const formatDateToBrazilian = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Configurar timezone para São Paulo
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  
  return dateObj.toLocaleDateString('pt-BR', options);
};

export const formatDateTimeToBrazilian = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Configurar timezone para São Paulo
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return dateObj.toLocaleString('pt-BR', options);
};

export const getCurrentBrazilianDate = (): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  
  return now.toLocaleDateString('pt-BR', options);
};

export const getCurrentBrazilianDateTime = (): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };
  
  return now.toLocaleString('pt-BR', options);
};

export const calculateAge = (dataNascimento: string): number => {
  const today = new Date();
  const birthDate = new Date(dataNascimento);
  
  // Ajustar para timezone de São Paulo
  const todaySP = new Date(today.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const birthDateSP = new Date(birthDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  
  let age = todaySP.getFullYear() - birthDateSP.getFullYear();
  const monthDiff = todaySP.getMonth() - birthDateSP.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && todaySP.getDate() < birthDateSP.getDate())) {
    age--;
  }
  
  return age;
};
