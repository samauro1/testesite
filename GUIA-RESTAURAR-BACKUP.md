# Guia de Restauração de Backup - Git

Este guia explica como restaurar o sistema para um ponto específico usando Git.

---

## 📌 Backup Atual Criado

**Tag:** `backup-03-nov-2025-16-30`  
**Mensagem:** "Atualização do sistema - Segunda 03 novembro 2025 16:30 hs"  
**Commit Hash:** `9a1a442`  
**Data:** 03 de novembro de 2025, 16:30 hs

---

## 🔍 Como Ver Todos os Backups Disponíveis

### Ver histórico de commits:
```bash
git log --oneline --all
```

### Ver todas as tags (backups marcados):
```bash
git tag -l
```

### Ver detalhes de um commit específico:
```bash
git show 9a1a442
```

---

## 🔄 Como Voltar ao Ponto Atual (Backup 03/11/2025 16:30)

### Opção 1: Usando a Tag (RECOMENDADO)
```bash
cd E:\sistemas
git checkout backup-03-nov-2025-16-30
```

### Opção 2: Usando o Hash do Commit
```bash
cd E:\sistemas
git checkout 9a1a442
```

### Opção 3: Usando a Mensagem do Commit
```bash
cd E:\sistemas
git log --oneline --all | grep "03 novembro 2025"
# Copie o hash do commit e use:
git checkout <hash>
```

---

## ⚠️ IMPORTANTE - Antes de Restaurar

### 1. Verificar se há mudanças não salvas:
```bash
git status
```

### 2. Se houver mudanças, você tem 3 opções:

**Opção A - Salvar as mudanças antes de restaurar:**
```bash
git add .
git commit -m "Salvando estado antes de restaurar backup"
git checkout backup-03-nov-2025-16-30
```

**Opção B - Descartar as mudanças e restaurar:**
```bash
git reset --hard
git checkout backup-03-nov-2025-16-30
```

**Opção C - Guardar mudanças temporariamente (stash):**
```bash
git stash
git checkout backup-03-nov-2025-16-30
# Para recuperar as mudanças depois:
git stash pop
```

---

## 📋 Como Criar um Novo Backup (Tag)

Para marcar um ponto específico como backup:

```bash
# Criar tag com nome e mensagem
git tag -a "backup-NOME-DESCRITIVO" -m "Descrição do backup"

# Enviar tag para o GitHub
git push --tags
```

### Exemplos de nomes de tags:
- `backup-03-nov-2025-16-30`
- `backup-pre-producao-2025-11-03`
- `backup-versao-estavel-1.0`

---

## 🔄 Restaurar e Continuar Trabalhando

### Se você quer restaurar e continuar trabalhando na branch atual:

```bash
# 1. Criar uma nova branch a partir do backup (RECOMENDADO)
git checkout -b nova-branch-para-trabalhar backup-03-nov-2025-16-30

# 2. Ou restaurar diretamente na branch main (CUIDADO - pode perder mudanças)
git checkout backup-03-nov-2025-16-30
git checkout -b backup-restaurado
```

---

## 📊 Ver Diferenças Entre o Estado Atual e o Backup

```bash
# Ver o que mudou desde o backup
git diff backup-03-nov-2025-16-30

# Ver arquivos que mudaram
git diff --name-only backup-03-nov-2025-16-30
```

---

## 🎯 Cenários de Uso

### Cenário 1: "Quero voltar ao estado do backup"
```bash
cd E:\sistemas
git checkout backup-03-nov-2025-16-30
```

### Cenário 2: "Quero comparar o backup com o estado atual"
```bash
git diff backup-03-nov-2025-16-30 HEAD
```

### Cenário 3: "Quero restaurar apenas um arquivo específico do backup"
```bash
git checkout backup-03-nov-2025-16-30 -- caminho/do/arquivo.js
```

### Cenário 4: "Quero criar um novo branch a partir do backup"
```bash
git checkout -b nova-funcionalidade backup-03-nov-2025-16-30
```

---

## 🔐 Segurança

### O backup está seguro em 3 lugares:

1. **Localmente** - No seu computador (E:\sistemas)
2. **GitHub** - No repositório remoto (https://github.com/samauro1/testesite.git)
3. **Tag** - Marcado com `backup-03-nov-2025-16-30` para fácil identificação

---

## 📝 Comandos Rápidos de Referência

```bash
# Ver commits recentes
git log --oneline -10

# Ver todas as tags
git tag -l

# Voltar ao backup
git checkout backup-03-nov-2025-16-30

# Voltar à branch principal
git checkout main

# Ver status atual
git status

# Ver diferenças
git diff backup-03-nov-2025-16-30
```

---

## ✅ Checklist Antes de Restaurar

- [ ] Verificar se há mudanças não commitadas (`git status`)
- [ ] Decidir se quer salvar ou descartar mudanças
- [ ] Verificar em qual branch está (`git branch`)
- [ ] Criar um backup do estado atual (se necessário)
- [ ] Fazer checkout do backup desejado

---

## 🆘 Se Algo Der Errado

### "Perdi minhas mudanças!"
```bash
# Ver mudanças recentes
git reflog

# Recuperar commit perdido
git checkout <hash-do-commit>
```

### "Voltei ao backup mas quero voltar ao estado atual"
```bash
git checkout main
```

---

**Última atualização:** 03 de novembro de 2025, 16:30 hs

