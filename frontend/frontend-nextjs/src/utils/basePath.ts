/**
 * Utilitário para gerenciar o basePath do Next.js
 * Garante que todos os redirecionamentos funcionem corretamente
 * tanto em desenvolvimento quanto em produção
 */

/**
 * Obtém o basePath atual baseado na URL
 */
export function getBasePath(): string {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production' ? '/sistema' : '';
  }
  
  // Se a URL atual contém /sistema, usar /sistema como basePath
  if (window.location.pathname.startsWith('/sistema')) {
    return '/sistema';
  }
  
  // Em desenvolvimento, não usar basePath
  return '';
}

/**
 * Adiciona o basePath a uma rota
 */
export function withBasePath(path: string): string {
  const basePath = getBasePath();
  
  // Se o path já começa com basePath, não adicionar novamente
  if (path.startsWith(basePath)) {
    return path;
  }
  
  // Remover barra inicial se existir
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Adicionar basePath se necessário
  return basePath ? `${basePath}/${cleanPath}` : `/${cleanPath}`;
}

/**
 * Redireciona para uma rota com basePath correto
 */
export function redirectTo(path: string): void {
  window.location.href = withBasePath(path);
}

