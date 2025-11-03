export interface User {
  id: string;
  nome: string;
  email: string;
  perfil?: string;
  foto_url?: string | null;
}

export interface Patient {
  id: string;
  nome: string;
  cpf: string;
  idade?: number;
  data_nascimento?: string;
  numero_laudo?: string;
  contexto?: string;
  tipo_transito?: string;
  escolaridade?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface Avaliacao {
  id: string;
  pacienteId: string;
  dataAvaliacao: string;
  observacoes?: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  createdAt: string;
  updatedAt: string;
}

export interface TestResult {
  acertos?: number;
  percentil?: number;
  classificacao?: string;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
  [key: string]: unknown;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
