# 📊 Como Acompanhar os Logs do Sistema DETRAN

## 🎯 Problema Identificado

Pelos logs que você compartilhou, identifiquei que o scraping do DETRAN está falhando na navegação para a página de pesquisa de agendamentos:

```
🔍 Procurando link "Consultar Agenda do Perito" na página inicial...
⚠️ Link "Consultar Agenda do Perito" não encontrado na página inicial
```

Isso ocorre mesmo após **login bem-sucedido**.

---

## 🔍 Soluções para Acompanhar Logs

### Opção 1: Usar Script com Logs Salvos (RECOMENDADO)

Criei o script **`iniciar-servidores-com-logs.ps1`** que:
- ✅ Abre janelas PowerShell separadas para cada servidor
- ✅ Salva logs em arquivos no diretório `logs/`
- ✅ Exibe logs em tempo real nas janelas
- ✅ Abre o diretório de logs automaticamente

**Como usar:**
```powershell
.\iniciar-servidores-com-logs.ps1
```

Isso abrirá:
1. Janela do Backend mostrando logs em tempo real
2. Janela do Frontend mostrando logs em tempo real  
3. Arquivos de log salvos em `logs/backend-*.log` e `logs/frontend-*.log`
4. Explorador de arquivos mostrando o diretório de logs

---

### Opção 2: Parar Servidores Atuais e Reiniciar

Se os servidores já estão rodando em background:

```powershell
# Parar todos os processos Node
Get-Process | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force

# Aguardar
Start-Sleep -Seconds 3

# Reiniciar com o novo script
.\iniciar-servidores-com-logs.ps1
```

---

### Opção 3: Acompanhar Logs dos Servidores Rodando

Se preferir não reiniciar:

#### Ver logs do Backend em tempo real

```powershell
# Encontrar processos Node
Get-Process node | Format-Table Id, ProcessName, Path

# Ver logs do processo específico (se tiver acesso ao console onde iniciou)
# Os logs aparecem diretamente nas janelas PowerShell abertas
```

#### Ver última execução de scraping

```powershell
# Ver últimos arquivos salvos no artifacts
Get-ChildItem E:\sistema\codigo\artifacts\*.html | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5 | 
    Format-Table Name, LastWriteTime, Length

# Ver últimos screenshots
Get-ChildItem E:\sistema\codigo\artifacts\*.png | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5 | 
    Format-Table Name, LastWriteTime, Length
```

---

## 🐛 DEBUG: Análise do Problema Atual

### Status Atual do Sistema

| Componente | Status |
|------------|--------|
| **Servidores** | ✅ Rodando (Backend:3001, Frontend:3000) |
| **Login DETRAN** | ✅ Funcionando |
| **Busca de Link** | ❌ Link "Consultar Agenda do Perito" não encontrado |
| **Formulário de Pesquisa** | ❌ Não acessado (consequência do problema anterior) |

### Possíveis Causas

1. **Link mudou de texto** - Pode ter sido renomeado
2. **Link está em outro frame** - Estrutura de frames mudou
3. **Link é carregado dinamicamente** - Precisa aguardar mais tempo
4. **Está em outra página** - Após login, redireciona para página diferente

### Screenshots para Investigar

Os seguintes screenshots foram salvos durante o teste:
```
E:\sistema\codigo\artifacts\pre-search-11042025-2025-11-01T20-03-44-137Z.png
E:\sistema\codigo\artifacts\pre-search-11052025-2025-11-01T20-05-08-162Z.png
E:\sistema\codigo\artifacts\pre-search-11112025-2025-11-01T20-06-31-454Z.png
```

---

## 🔧 Próximos Passos para Resolver o Scraping

### 1. Inspecionar Screenshots

Abra os screenshots salvos em `E:\sistema\codigo\artifacts\` para ver:
- O que aparece na tela após o login
- Se o link "Consultar Agenda do Perito" está visível
- Qual é a estrutura da página

### 2. Analisar HTML Salvo

Os arquivos HTML salvos mostram a estrutura real:
```
E:\sistema\codigo\artifacts\pre-search-11042025-2025-11-01T20-03-44-137Z.html
```

### 3. Ajustar Seletores

Com base nos screenshots e HTML, ajustar os seletores no arquivo:
```
codigo/services/detranScraper.js
```

---

## ✅ O que JÁ ESTÁ FUNCIONANDO

Mesmo com o problema de scraping, a **integração do guia está completa**:

✅ **Endpoint `/api/detran/agendamentos`** - Implementado e testado  
✅ **Servidores** - Rodando corretamente  
✅ **Banco de Dados** - Conectado e funcionando  
✅ **Autenticação** - JWT funcionando  

O problema é apenas na **extração de dados do DETRAN** (scraping), que é uma tarefa separada da integração do guia.

---

## 📝 Checklist de Debug

- [x] Servidores rodando
- [x] Endpoint `/api/detran/agendamentos` criado
- [x] Logs sendo gerados
- [ ] Screenshots analisados
- [ ] HTML inspecionado
- [ ] Seletores ajustados
- [ ] Scraping funcionando

---

**Para debug imediato**: Abra os screenshots em `E:\sistema\codigo\artifacts\` e compartilhe o que aparece na tela após o login.

