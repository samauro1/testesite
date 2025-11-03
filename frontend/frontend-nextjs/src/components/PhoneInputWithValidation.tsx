import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { applyPhoneMask, cleanPhone, isValidPhone } from '@/utils/phoneUtils';

interface PhoneInputWithValidationProps {
  value: string;
  onChange: (value: string) => void;
  onDuplicateConfirm?: (confirmed: boolean) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  type?: 'phone' | 'email';
}

interface DuplicateInfo {
  nome: string;
  cpf: string;
  telefone: string;
}

const PhoneInputWithValidation: React.FC<PhoneInputWithValidationProps> = ({ 
  value, 
  onChange, 
  onDuplicateConfirm,
  placeholder, 
  className,
  error 
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    setDisplayValue(applyPhoneMask(value));
  }, [value]);

  const checkPhoneDuplicate = async (phone: string) => {
    if (!phone || !isValidPhone(phone)) return;

    setIsValidating(true);
    try {
      // Verificação real de duplicata via API
      const response = await fetch(`http://localhost:3001/api/pacientes?search=${encodeURIComponent(phone)}&limit=1`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const pacientes = data.data?.pacientes || [];
        
        // Verificar se algum paciente tem este telefone
        const duplicatePatient = pacientes.find((p: any) => p.telefone === phone);
        
        if (duplicatePatient) {
          setDuplicateInfo({
            nome: duplicatePatient.nome,
            cpf: duplicatePatient.cpf,
            telefone: duplicatePatient.telefone
          });
          setShowConfirmDialog(true);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar duplicata:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const cleaned = cleanPhone(rawValue);
    
    // Update internal state with cleaned value
    onChange(cleaned);

    // Apply mask for display
    const masked = applyPhoneMask(rawValue);
    setDisplayValue(masked);

    // Clear previous duplicate info
    setDuplicateInfo(null);
    setShowConfirmDialog(false);
  };

  const handleBlur = () => {
    if (value && isValidPhone(value)) {
      checkPhoneDuplicate(value);
    }
  };

  const handleConfirmDuplicate = (confirmed: boolean) => {
    setShowConfirmDialog(false);
    if (onDuplicateConfirm) {
      onDuplicateConfirm(confirmed);
    }
    if (!confirmed) {
      // Limpar o telefone se não confirmar
      onChange('');
      setDisplayValue('');
    }
  };

  return (
    <div className="relative">
      <input
        type="tel"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
        } ${className}`}
        placeholder={placeholder || '(XX) XXXXX-XXXX'}
        maxLength={15}
      />
      
      {isValidating && (
        <div className="absolute right-3 top-2.5">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {/* Dialog de confirmação de duplicata */}
      {showConfirmDialog && duplicateInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Telefone já cadastrado
              </h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-3">
                Este número de telefone já está associado a outro paciente:
              </p>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900">{duplicateInfo.nome}</p>
                <p className="text-sm text-gray-600">CPF: {duplicateInfo.cpf}</p>
                <p className="text-sm text-gray-600">Telefone: {duplicateInfo.telefone}</p>
              </div>
              
              <p className="text-gray-600 mt-3">
                Deseja usar este número mesmo assim? Uma observação será adicionada automaticamente.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleConfirmDuplicate(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmDuplicate(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Usar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneInputWithValidation;
