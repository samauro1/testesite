# 🌐 Configuração para Deploy em www.samauro.com.ar/sistema

Este guia explica como configurar o sistema para funcionar em `www.samauro.com.ar/sistema` para testes online.

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Opções de Configuração](#opções-de-configuração)
3. [Opção 1: Cloudflare Tunnel (Recomendado)](#opção-1-cloudflare-tunnel-recomendado)
4. [Opção 2: Proxy Reverso com Nginx/Apache](#opção-2-proxy-reverso-com-nginxapache)
5. [Configuração do Sistema](#configuração-do-sistema)
6. [Build e Deploy](#build-e-deploy)
7. [Testes](#testes)
8. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

- ✅ Domínio `samauro.com.ar` configurado no Cloudflare
- ✅ Servidor local rodando o sistema
- ✅ Acesso SSH ao servidor local (se usar proxy reverso)
- ✅ Backend Node.js rodando na porta 3001
- ✅ Frontend Next.js configurado

---

## Opções de Configuração

Você tem duas opções principais para expor o sistema:

### **Opção 1: Cloudflare Tunnel** (Mais fácil, recomendado)
- ✅ Não precisa abrir portas no firewall
- ✅ SSL automático
- ✅ Funciona mesmo com IP dinâmico
- ✅ Configuração simples

### **Opção 2: Proxy Reverso** (Mais controle)
- ✅ Mais controle sobre roteamento
- ✅ Melhor para alta performance
- ⚠️ Precisa de IP estático ou DDNS
- ⚠️ Precisa configurar SSL manualmente

---

## Opção 1: Cloudflare Tunnel (Recomendado)

### Passo 1: Instalar Cloudflare Tunnel

No seu servidor Windows:

```powershell
# Baixar cloudflared
# Acesse: https://github.com/cloudflare/cloudflared/releases
# Baixe: cloudflared-windows-amd64.exe
# Renomeie para: cloudflared.exe
# Coloque em uma pasta (ex: C:\cloudflared\)

# Ou use o Chocolatey (se tiver instalado)
choco install cloudflared -y
```

### Passo 2: Autenticar no Cloudflare

```powershell
cd C:\cloudflared
.\cloudflared.exe tunnel login
```

Isso abrirá o navegador para você fazer login no Cloudflare e autorizar o tunnel.

### Passo 3: Criar o Tunnel

```powershell
# Criar um novo tunnel
.\cloudflared.exe tunnel create sistema-teste
```

Anote o Tunnel ID que será gerado.

### Passo 4: Criar Arquivo de Configuração

Crie o arquivo `C:\cloudflared\config.yml`:

```yaml
tunnel: [TUNNEL_ID_AQUI]
credentials-file: C:\cloudflared\[TUNNEL_ID_AQUI].json

ingress:
  # Rota para o sistema (frontend)
  - hostname: www.samauro.com.ar
    path: /sistema
    service: http://localhost:3000
  
  # Rota para a API do backend
  - hostname: www.samauro.com.ar
    path: /sistema/api
    service: http://localhost:3001/api
  
  # Rota catch-all (deve ser a última)
  - service: http_status:404
```

**⚠️ IMPORTANTE**: Substitua `[TUNNEL_ID_AQUI]` pelo ID do tunnel gerado no passo 3.

### Passo 5: Configurar DNS no Cloudflare

1. Acesse o painel do Cloudflare
2. Vá em **DNS** > **Records**
3. Certifique-se de que existe um registro CNAME ou A para `www.samauro.com.ar` apontando para o IP do servidor (ou já configurado)

### Passo 6: Rodar o Tunnel

#### Como Serviço Windows (Recomendado):

```powershell
# Instalar como serviço
.\cloudflared.exe service install

# Configurar o serviço para usar seu config.yml
# Edite o registro do Windows em:
# HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\cloudflared
# Adicione: ConfigFile = C:\cloudflared\config.yml

# Ou crie um arquivo .bat para iniciar:
```

Crie `C:\cloudflared\start-tunnel.bat`:

```batch
@echo off
cd /d C:\cloudflared
cloudflared.exe tunnel --config config.yml run
```

#### Como Aplicação:

```powershell
# Rodar diretamente (para testes)
.\cloudflared.exe tunnel --config config.yml run
```

### Passo 7: Iniciar o Sistema

Em terminais separados:

```powershell
# Terminal 1 - Backend
cd E:\sistema\codigo
npm start

# Terminal 2 - Frontend (build de produção)
cd E:\sistema\frontend\frontend-nextjs
npm run build
npm start
```

---

## Opção 2: Proxy Reverso com Nginx/Apache

### Se você usa Windows Server com IIS:

#### Instalar URL Rewrite e Application Request Routing

1. Baixe e instale o **IIS URL Rewrite Module 2.1**
2. Baixe e instale o **Application Request Routing (ARR)**

#### Configurar no IIS:

1. Abra o **IIS Manager**
2. Adicione um novo **Application** ou **Virtual Directory**
3. Configure as regras de proxy reverso:

No `web.config` do IIS:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- Frontend Next.js -->
                <rule name="Sistema Frontend" stopProcessing="true">
                    <match url="^sistema(.*)$" />
                    <action type="Rewrite" url="http://localhost:3000/sistema{R:1}" />
                </rule>
                
                <!-- API Backend -->
                <rule name="Sistema API" stopProcessing="true">
                    <match url="^sistema/api/(.*)$" />
                    <action type="Rewrite" url="http://localhost:3001/api/{R:1}" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

### Se você tem acesso a um servidor Linux/Nginx:

Crie o arquivo `/etc/nginx/sites-available/samauro.conf`:

```nginx
server {
    listen 80;
    server_name www.samauro.com.ar samauro.com.ar;

    # Frontend Next.js
    location /sistema {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend
    location /sistema/api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (caso necessário)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

---

## Configuração do Sistema

### 1. Variáveis de Ambiente

Crie um arquivo `.env` no diretório `codigo/`:

```env
# Backend
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://usuario:senha@localhost:5432/banco

# CORS - Permitir domínio
ALLOWED_ORIGINS=https://www.samauro.com.ar,https://samauro.com.ar
```

Crie um arquivo `.env.local` no diretório `frontend/frontend-nextjs/`:

```env
# Frontend
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://www.samauro.com.ar/sistema/api
```

### 2. Build do Frontend

```powershell
cd E:\sistema\frontend\frontend-nextjs
npm run build
```

### 3. Verificar Configurações

Verifique se o `next.config.ts` está configurado corretamente com `basePath: '/sistema'`.

---

## Build e Deploy

### Passo 1: Build do Frontend

```powershell
cd E:\sistema\frontend\frontend-nextjs
npm install
npm run build
```

### Passo 2: Iniciar Backend em Produção

```powershell
cd E:\sistema\codigo
npm install
npm start
```

### Passo 3: Iniciar Frontend em Produção

```powershell
cd E:\sistema\frontend\frontend-nextjs
npm start
```

**Nota**: O Next.js em produção usa a porta 3000 por padrão. Certifique-se de que ela está livre.

### Passo 4: Configurar para Iniciar Automaticamente

#### Windows Task Scheduler

1. Abra o **Agendador de Tarefas**
2. Crie uma nova tarefa para iniciar o backend
3. Crie outra tarefa para iniciar o frontend
4. Configure para iniciar na inicialização do Windows

Ou use um gerenciador de processos como **PM2**:

```powershell
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar backend
cd E:\sistema\codigo
pm2 start server.js --name "backend-sistema"

# Iniciar frontend
cd E:\sistema\frontend\frontend-nextjs
pm2 start npm --name "frontend-sistema" -- start

# Salvar configuração
pm2 save
pm2 startup
```

---

## Testes

### 1. Testar Acesso

Acesse no navegador:
- `https://www.samauro.com.ar/sistema`

### 2. Verificar API

Acesse no navegador:
- `https://www.samauro.com.ar/sistema/api/health`

Deve retornar:
```json
{
  "status": "OK",
  "timestamp": "2024-...",
  "version": "1.0.0"
}
```

### 3. Testar Login

1. Acesse `https://www.samauro.com.ar/sistema/login`
2. Tente fazer login
3. Verifique o console do navegador (F12) para erros

### 4. Verificar CORS

No console do navegador (F12), verifique se não há erros de CORS.

---

## Troubleshooting

### ❌ Erro 404 na rota /sistema

**Causa**: BasePath não configurado ou proxy não roteando corretamente.

**Solução**:
1. Verifique o `next.config.ts` - deve ter `basePath: '/sistema'`
2. Faça rebuild do frontend: `npm run build`
3. Verifique as regras de proxy/reverse proxy

### ❌ Erro CORS

**Causa**: Backend não está permitindo requisições do domínio.

**Solução**:
1. Verifique o arquivo `codigo/server.js`
2. Certifique-se de que `samauro.com.ar` está na lista de origens permitidas
3. Reinicie o backend

### ❌ Erro de Conexão com API

**Causa**: URL da API incorreta ou backend não está rodando.

**Solução**:
1. Verifique se o backend está rodando: `http://localhost:3001/api/health`
2. Verifique o arquivo `.env.local` do frontend
3. Verifique o arquivo `frontend/frontend-nextjs/src/services/api.ts`

### ❌ Página em branco

**Causa**: Assets não estão sendo carregados corretamente devido ao basePath.

**Solução**:
1. Verifique o `next.config.ts` - `basePath` deve estar configurado
2. Faça rebuild completo: `rm -rf .next && npm run build`
3. Verifique se os arquivos estáticos estão sendo servidos corretamente

### ❌ Cloudflare Tunnel não conecta

**Causa**: Configuração incorreta ou credenciais inválidas.

**Solução**:
1. Verifique se fez login: `cloudflared tunnel login`
2. Verifique o arquivo `config.yml`
3. Verifique os logs: `cloudflared tunnel --config config.yml run --loglevel debug`

### ❌ Porta já em uso

**Causa**: Outro processo está usando a porta.

**Solução**:
```powershell
# Verificar qual processo está usando a porta
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Matar o processo (substitua PID pelo número do processo)
taskkill /PID [PID] /F
```

---

## 🔒 Segurança

### Checklist de Segurança

- [ ] SSL/HTTPS configurado no Cloudflare ou servidor
- [ ] Variáveis de ambiente não estão no código
- [ ] Banco de dados com senha forte
- [ ] Rate limiting ativo no backend
- [ ] CORS configurado corretamente (apenas domínios permitidos)
- [ ] Tokens JWT com expiração adequada
- [ ] Logs de acesso configurados

### Recomendações

1. **Use HTTPS sempre**: Configure SSL no Cloudflare (automático) ou no servidor
2. **Firewall**: Configure o firewall para permitir apenas portas necessárias
3. **Backups**: Configure backups automáticos do banco de dados
4. **Monitoramento**: Configure alertas para downtime
5. **Atualizações**: Mantenha dependências atualizadas

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do backend e frontend
2. Verifique os logs do Cloudflare Tunnel (se usando)
3. Verifique o console do navegador (F12)
4. Teste as rotas da API diretamente

---

## ✅ Checklist Final

Antes de considerar tudo configurado:

- [ ] Backend rodando em `http://localhost:3001`
- [ ] Frontend buildado e rodando em `http://localhost:3000`
- [ ] Cloudflare Tunnel rodando OU Proxy Reverso configurado
- [ ] DNS configurado corretamente no Cloudflare
- [ ] `https://www.samauro.com.ar/sistema` acessível
- [ ] `https://www.samauro.com.ar/sistema/api/health` retorna OK
- [ ] Login funcionando
- [ ] Sem erros no console do navegador
- [ ] SSL/HTTPS ativo (cadeado verde no navegador)

---

**🎉 Pronto!** Seu sistema deve estar acessível em `https://www.samauro.com.ar/sistema`

