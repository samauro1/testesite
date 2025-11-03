import React, { useState, useEffect } from 'react';

interface LaudoInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

const LaudoInput: React.FC<LaudoInputProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  className,
  error 
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Extrair apenas os últimos 4 dígitos do valor atual (ignorar o ano)
    if (value && value.includes('-')) {
      const parts = value.split('-');
      if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1];
        const numbers = lastPart.replace(/[^0-9]/g, '');
        setInputValue(numbers);
      }
    } else {
      const numbers = value.replace(/[^0-9]/g, '');
      setInputValue(numbers);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Permitir apenas números
    const numbers = input.replace(/[^0-9]/g, '');
    
    // Limitar a 4 dígitos
    const limitedNumbers = numbers.substring(0, 4);
    
    setInputValue(limitedNumbers);
    
    // Aplicar máscara e enviar para o componente pai
    const currentYear = new Date().getFullYear();
    const fullLaudo = limitedNumbers.length === 4 ? `LAU-${currentYear}-${limitedNumbers}` : '';
    
    onChange(fullLaudo);
  };

  const handleBlur = () => {
    // Quando sair do campo, completar com zeros à esquerda se necessário
    if (inputValue.length > 0 && inputValue.length < 4) {
      const paddedNumber = inputValue.padStart(4, '0');
      setInputValue(paddedNumber);
      
      const currentYear = new Date().getFullYear();
      const fullLaudo = `LAU-${currentYear}-${paddedNumber}`;
      onChange(fullLaudo);
    }
  };

  const isValid = inputValue.length === 4;

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
          error || (inputValue.length > 0 && !isValid)
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:ring-blue-500'
        } ${className}`}
        placeholder={placeholder || 'Digite 4 números (ex: 1234)'}
        maxLength={4}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {inputValue.length > 0 && !isValid && (
        <p className="text-red-500 text-xs mt-1">
          Digite exatamente 4 números (será completado com zeros automaticamente)
        </p>
      )}
    </div>
  );
};

export default LaudoInput;
