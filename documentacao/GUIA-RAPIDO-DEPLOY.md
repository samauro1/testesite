# 🚀 Guia Rápido - Deploy em samauro.com.ar/sistema

## ⚡ Configuração Rápida (5 minutos)

### Passo 1: Preparar o Ambiente

```powershell
# 1. Ir para o diretório do backend
cd E:\sistema\codigo

# 2. Criar arquivo .env se não existir
# Adicione:
# NODE_ENV=production
# PORT=3001
```

### Passo 2: Build do Frontend

```powershell
# Ir para o frontend
cd E:\sistema\frontend\frontend-nextjs

# Instalar dependências (se necessário)
npm install

# Fazer build
npm run build
```

### Passo 3: Iniciar os Servidores

Abra **2 terminais PowerShell**:

#### Terminal 1 - Backend:
```powershell
cd E:\sistema\codigo
npm start
```

#### Terminal 2 - Frontend:
```powershell
cd E:\sistema\frontend\frontend-nextjs
npm start
```

### Passo 4: Configurar Cloudflare Tunnel (Recomendado)

#### 4.1. Instalar Cloudflare Tunnel

1. Baixe de: https://github.com/cloudflare/cloudflared/releases
2. Extraia `cloudflared.exe` em `C:\cloudflared\`

#### 4.2. Autenticar

```powershell
cd C:\cloudflared
.\cloudflared.exe tunnel login
```

#### 4.3. Criar Tunnel

```powershell
.\cloudflared.exe tunnel create sistema-teste
```

Anote o **Tunnel ID** gerado.

#### 4.4. Criar Arquivo de Configuração

Crie `C:\cloudflared\config.yml`:

```yaml
tunnel: [COLE_O_TUNNEL_ID_AQUI]
credentials-file: C:\cloudflared\[COLE_O_TUNNEL_ID_AQUI].json

ingress:
  # Frontend Next.js
  - hostname: www.samauro.com.ar
    path: /sistema
    service: http://localhost:3000
  
  # API Backend
  - hostname: www.samauro.com.ar
    path: /sistema/api
    service: http://localhost:3001/api
  
  # Catch-all
  - service: http_status:404
```

**⚠️ IMPORTANTE**: Substitua `[COLE_O_TUNNEL_ID_AQUI]` pelo ID do tunnel.

#### 4.5. Iniciar o Tunnel

```powershell
.\cloudflared.exe tunnel --config config.yml run
```

### Passo 5: Configurar DNS no Cloudflare

1. Acesse o painel do Cloudflare
2. Vá em **Zero Trust** > **Networks** > **Tunnels**
3. Encontre o tunnel criado
4. Configure o **Public Hostname**:
   - Subdomain: (deixe em branco ou `www`)
   - Domain: `samauro.com.ar`
   - Path: `/sistema`
   - Service: `http://localhost:3000`

E outro para a API:
   - Subdomain: (deixe em branco ou `www`)
   - Domain: `samauro.com.ar`
   - Path: `/sistema/api/*`
   - Service: `http://localhost:3001/api`

### Passo 6: Testar

Acesse:
- ✅ `https://www.samauro.com.ar/sistema`
- ✅ `https://www.samauro.com.ar/sistema/api/health`

---

## 🔄 Scripts Automatizados

### Criar Script de Inicialização Automática

Crie `E:\sistema\iniciar-sistema.bat`:

```batch
@echo off
echo Iniciando Sistema de Avaliacao Psicologica...

echo.
echo Iniciando Backend...
start "Backend" cmd /k "cd /d E:\sistema\codigo && npm start"

timeout /t 3

echo.
echo Iniciando Frontend...
start "Frontend" cmd /k "cd /d E:\sistema\frontend\frontend-nextjs && npm start"

timeout /t 3

echo.
echo Iniciando Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "cd /d C:\cloudflared && cloudflared.exe tunnel --config config.yml run"

echo.
echo Sistema iniciado! Verifique as janelas abertas.
pause
```

### Parar Sistema

Crie `E:\sistema\parar-sistema.bat`:

```batch
@echo off
echo Parando Sistema...

taskkill /F /FI "WINDOWTITLE eq Backend*"
taskkill /F /FI "WINDOWTITLE eq Frontend*"
taskkill /F /IM cloudflared.exe

echo Sistema parado!
pause
```

---

## ✅ Checklist de Verificação

Antes de testar, verifique:

- [ ] Backend rodando em `http://localhost:3001`
- [ ] Frontend buildado e rodando em `http://localhost:3000`
- [ ] Cloudflare Tunnel rodando
- [ ] Arquivo `config.yml` configurado corretamente
- [ ] DNS configurado no Cloudflare
- [ ] CORS atualizado no `server.js` para aceitar `samauro.com.ar`

---

## 🐛 Problemas Comuns

### ❌ "Connection refused" no tunnel

**Solução**: Verifique se o backend e frontend estão rodando nas portas corretas.

### ❌ Página em branco

**Solução**: 
1. Verifique se fez `npm run build` no frontend
2. Verifique o console do navegador (F12)
3. Verifique se o basePath está configurado no `next.config.ts`

### ❌ Erro CORS

**Solução**: 
1. Verifique o arquivo `codigo/server.js`
2. Certifique-se de que `samauro.com.ar` está na lista de origens permitidas
3. Reinicie o backend

### ❌ API não responde

**Solução**:
1. Teste diretamente: `http://localhost:3001/api/health`
2. Verifique as rotas no `config.yml` do tunnel
3. Verifique se o path está correto: `/sistema/api`

---

## 📝 Notas Importantes

1. **BasePath**: O Next.js está configurado para usar `/sistema` como basePath em produção
2. **API**: A API detecta automaticamente o domínio e usa `/sistema/api`
3. **Portas**: 
   - Backend: 3001
   - Frontend: 3000
   - Certifique-se de que estão livres

4. **SSL**: O Cloudflare Tunnel fornece SSL automaticamente
5. **Firewall**: Não precisa abrir portas no firewall ao usar Cloudflare Tunnel

---

**🎉 Pronto!** Seu sistema deve estar acessível em `https://www.samauro.com.ar/sistema`

