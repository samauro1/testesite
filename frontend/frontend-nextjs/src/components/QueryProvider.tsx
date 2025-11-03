'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 60 * 1000, // 10 minutes - cache mais longo
            gcTime: 15 * 60 * 1000, // 15 minutes - garbage collection
            retry: (failureCount, error: any) => {
              // Não retry em erros 4xx (client errors)
              if (error?.response?.status >= 400 && error?.response?.status < 500) {
                return false;
              }
              return failureCount < 2; // Máximo 2 tentativas
            },
            refetchOnWindowFocus: false,
            refetchOnMount: false, // Evita refetch desnecessário
            refetchOnReconnect: 'always',
          },
          mutations: {
            retry: 1, // Apenas 1 retry para mutations
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

