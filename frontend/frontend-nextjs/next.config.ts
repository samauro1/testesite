import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // basePath será configurado apenas quando necessário para produção
  // Por enquanto, mantemos sem basePath para desenvolvimento local
  
  experimental: {
    serverComponentsExternalPackages: ['puppeteer']
  },
  
  // Permitir acesso externo
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  
  // Rewrites para API em desenvolvimento
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
