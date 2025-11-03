import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConfiguracoesProvider } from '@/contexts/ConfiguracoesContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/components/QueryProvider';
import { PageTransition } from '@/components/PageTransition';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistema de Avaliação Psicológica',
  description: 'Sistema moderno para avaliação psicológica com Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Lacuna Web PKI - Para assinatura digital com certificado A3 no navegador */}
        <script src="https://cdn.lacunasoftware.com/libs/web-pki/lacuna-web-pki-2.16.1.min.js" async></script>
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <ConfiguracoesProvider>
                <PageTransition>
                  {children}
                </PageTransition>
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                  }}
                />
              </ConfiguracoesProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}