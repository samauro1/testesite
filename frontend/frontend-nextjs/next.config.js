/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    TZ: 'America/Sao_Paulo',
  },
  // Otimizações de performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query', 'react-hook-form', 'date-fns'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Cache otimizado
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Webpack otimizado
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
          // Separar bibliotecas pesadas
          heavy: {
            test: /[\\/]node_modules[\\/](jspdf|html2canvas|xlsx|recharts)[\\/]/,
            name: 'heavy-libs',
            chunks: 'all',
            priority: 15,
          },
        },
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig
