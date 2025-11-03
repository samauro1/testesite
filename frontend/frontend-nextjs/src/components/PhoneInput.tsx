import React, { useState, useEffect } from 'react';
import { Phone, Smartphone, Home } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = "Telefone fixo / Celular",
  className = "",
  error,
  disabled = false
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [showIcons, setShowIcons] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Efeito para formatar valor inicial quando componente monta
  useEffect(() => {
    if (!isFocused) {
      if (value) {
        // Se contém "/", é múltiplos números
        if (value.includes('/')) {
          const parts = value.split('/').map(part => part.trim());
          const formattedParts = parts.map(part => {
            const clean = part.replace(/\D/g, '');
            if (clean.length === 11) {
              return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
            } else if (clean.length === 10) {
              return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
            } else if (clean.length === 8) {
              return `${clean.slice(0, 4)}-${clean.slice(4)}`;
            }
            return part;
          });
          setDisplayValue(formattedParts.join(' / '));
        } else {
          // Número único
          const clean = value.replace(/\D/g, '');
          if (clean.length === 11) {
            setDisplayValue(`(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`);
          } else if (clean.length === 10) {
            setDisplayValue(`(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`);
          } else if (clean.length === 8) {
            setDisplayValue(`${clean.slice(0, 4)}-${clean.slice(4)}`);
          } else {
            setDisplayValue(value);
          }
        }
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Permitir apenas números, espaços, parênteses, hífens e barras
    const allowedChars = /^[\d\s\(\)\-\/]*$/;
    if (!allowedChars.test(inputValue)) {
      return;
    }

    // Atualizar displayValue imediatamente para permitir digitação livre
    setDisplayValue(inputValue);
    
    // Processar entrada para enviar ao onChange (apenas números)
    const parts = inputValue.split('/').map(part => part.trim());
    const cleanedParts = parts.map(part => part.replace(/\D/g, ''));
    
    // Enviar apenas números (sem validação restritiva aqui - valida no onBlur)
    const combinedValue = cleanedParts.filter(part => part.length > 0).join('/');
    onChange(combinedValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowIcons(true);
    // Quando focar, mostrar valor atual formatado ou limpar se vazio
    if (!value) {
      setDisplayValue('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setShowIcons(false);
    
    // Validar e formatar ao sair do campo
    if (value) {
      const parts = value.split('/').map(part => part.trim());
      const cleanedParts = parts.map(part => part.replace(/\D/g, ''));
      
      // Filtrar apenas partes válidas (8, 10 ou 11 dígitos)
      const validParts = cleanedParts.filter(part => 
        part.length === 8 || part.length === 10 || part.length === 11
      );
      
      // Se houver partes inválidas removidas, atualizar o valor
      if (validParts.length !== cleanedParts.length) {
        const combinedValue = validParts.join('/');
        onChange(combinedValue);
        // O useEffect vai reformatar o displayValue automaticamente
      }
    }
  };

  const getPhoneIcons = () => {
    if (!value) return null;

    const parts = value.split('/');
    const icons = [];

    parts.forEach((part, index) => {
      const clean = part.replace(/\D/g, '');
      if (clean.length === 11) {
        icons.push(
          <Smartphone key={`mobile-${index}`} className="h-4 w-4 text-green-600" />
        );
      } else if (clean.length === 8 || clean.length === 10) {
        icons.push(
          <Home key={`fixed-${index}`} className="h-4 w-4 text-blue-600" />
        );
      }
    });

    return icons;
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="tel"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 ${
            error 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:ring-blue-500'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {showIcons && getPhoneIcons()}
          {!showIcons && <Phone className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}

      {/* Dica de formato */}
      <div className="text-xs text-gray-500 mt-1">
        <p>Formato: Telefone fixo (8 dígitos) / Celular (11 dígitos)</p>
        <p>Exemplo: 2478-5827 / (11) 98386-3866</p>
      </div>
    </div>
  );
};

export default PhoneInput;