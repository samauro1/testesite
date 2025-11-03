# 📊 Como Acompanhar os Logs do Servidor

## 🔍 Problema Identificado nos Logs

Pelos logs, identifiquei que o scraping do DETRAN está falhando porque **não encontra o link "Consultar Agenda do Perito"** na página inicial após o login.

**Log revelador:**
```
🔍 Procurando link "Consultar Agenda do Perito" na página inicial...
⚠️ Link "Consultar Agenda do Perito" não encontrado na página inicial
```

---

## 📋 Formas de Acompanhar os Logs

### Opção 1: Acompanhar via Terminal/PowerShell

#### Windows PowerShell

**Passo 1: Ver processos Node rodando**
```powershell
Get-Process node
```

**Passo 2: Abrir logs do processo específico**
```powershell
# Listar processos com detalhes
Get-Process node | Format-Table Id, ProcessName, Path, StartTime

# Ver logs em tempo real (se você tem acesso ao console onde iniciou)
# Os logs aparecem diretamente nas janelas PowerShell abertas
```

### Opção 2: Logs Salvos em Arquivo

Por padrão, os logs aparecem apenas no console. Podemos configurar para salvar em arquivo.

### Opção 3: Usar Desenvolvimento com Nodemon

O Nodemon mostra logs coloridos e mais fáceis de acompanhar.

---

## 🔧 Solução: Criar Script Melhorado para Acompanhar Logs

Vou criar um script PowerShell que:
1. Inicia os servidores de forma mais organizada
2. Salva logs em arquivos separados
3. Facilita o acompanhamento

---

## 🐛 DEBUG: O Problema Real

Pelos logs que você mostrou, o problema é:

1. ✅ **Login funciona** - Consegue fazer login no DETRAN
2. ❌ **Navegação falha** - Não encontra o link "Consultar Agenda do Perito"
3. ❌ **Formulário não acessado** - Por isso não encontra os campos de pesquisa

**URL após login:**
```
https://www.e-cnhsp.sp.gov.br/gefor/index.jsp
```

Isso sugere que após o login, estamos sendo redirecionados para uma página diferente da esperada, ou a estrutura HTML mudou.

---

## 🔍 Próximos Passos para Resolver

### 1. Ver Screenshots Salvos

O sistema já salvou screenshots para debug:
```
E:\sistema\codigo\artifacts\pre-search-11042025-2025-11-01T20-03-44-137Z.png
E:\sistema\codigo\artifacts\pre-search-11042025-2025-11-01T20-03-44-137Z.html
```

### 2. Inspecionar HTML Salvo

Vamos ver o HTML da página para entender por que o link não está sendo encontrado.

### 3. Ajustar Seletores

Depois de ver o HTML real, podemos ajustar os seletores do scraper.

---

## 🚀 Script Melhorado de Inicialização

Quer que eu crie um script PowerShell melhorado que:
- Mostre logs de forma mais clara
- Salve logs em arquivos
- Facilite o acompanhamento em tempo real?

