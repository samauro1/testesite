# Guia de Atualização de Versões no Git

## Fluxo Básico de Atualização

### 1. Verificar Status
```bash
git status
```
Verifica quais arquivos foram modificados, adicionados ou removidos.

### 2. Ver Diferenças
```bash
# Ver mudanças em arquivos específicos
git diff

# Ver mudanças já adicionadas ao stage
git diff --staged
```

### 3. Adicionar Arquivos ao Stage
```bash
# Adicionar todos os arquivos modificados
git add .

# Adicionar arquivo específico
git add caminho/do/arquivo.js

# Adicionar todos os arquivos de um tipo
git add *.js

# Adicionar arquivos de um diretório
git add frontend/
```

### 4. Fazer Commit
```bash
# Commit simples
git commit -m "Descrição clara das alterações"

# Commit com descrição detalhada
git commit -m "Título do commit

Descrição mais detalhada das mudanças:
- Adicionado novo recurso X
- Corrigido bug Y
- Melhorada performance Z"
```

### 5. Enviar para o GitHub
```bash
# Push simples (se o tracking já estiver configurado)
git push

# Push com configuração de tracking
git push -u origin main
```

## Convenções de Mensagens de Commit

Use mensagens claras e descritivas:

**Bom:**
- `feat: Adiciona autenticação de usuário`
- `fix: Corrige erro de validação de CPF`
- `refactor: Melhora estrutura do componente Layout`
- `docs: Atualiza README com instruções de instalação`

**Evite:**
- `mudanças`
- `fix`
- `update`

## Padrão de Versionamento (Semantic Versioning)

Para projetos maiores, considere usar tags de versão:

```bash
# Criar uma tag de versão
git tag -a v1.0.0 -m "Versão 1.0.0 - Release inicial"

# Enviar tags para o GitHub
git push origin v1.0.0

# Enviar todas as tags
git push --tags
```

**Formato:** `MAJOR.MINOR.PATCH`
- **MAJOR:** Mudanças incompatíveis com versões anteriores
- **MINOR:** Novas funcionalidades compatíveis
- **PATCH:** Correções de bugs compatíveis

## Comandos Adicionais Úteis

### Ver Histórico de Commits
```bash
git log
git log --oneline  # Versão resumida
git log --graph --oneline --all  # Visualização com gráfico
```

### Atualizar do Repositório Remoto
```bash
# Buscar mudanças do GitHub sem aplicar
git fetch

# Buscar e mesclar mudanças
git pull

# Ou fazer separadamente
git fetch origin
git merge origin/main
```

### Desfazer Mudanças
```bash
# Desfazer mudanças em arquivos não commitados
git restore arquivo.js

# Remover arquivos do stage
git restore --staged arquivo.js

# Desfazer último commit (mantendo mudanças)
git reset --soft HEAD~1

# Ver mudanças antes de desfazer
git diff HEAD
```

### Criar Branch para Nova Funcionalidade
```bash
# Criar e mudar para nova branch
git checkout -b feature/nova-funcionalidade

# Ou usando o novo comando
git switch -c feature/nova-funcionalidade

# Fazer commits normalmente
git add .
git commit -m "feat: Implementa nova funcionalidade"

# Enviar branch para GitHub
git push -u origin feature/nova-funcionalidade
```

## Workflow Recomendado

1. **Antes de começar a trabalhar:**
   ```bash
   git pull  # Atualizar do GitHub
   ```

2. **Fazer suas alterações no código**

3. **Verificar o que mudou:**
   ```bash
   git status
   git diff
   ```

4. **Adicionar arquivos:**
   ```bash
   git add .
   ```

5. **Fazer commit:**
   ```bash
   git commit -m "Descrição clara"
   ```

6. **Enviar para GitHub:**
   ```bash
   git push
   ```

## Resolução de Conflitos

Se houver conflitos ao fazer `git pull`:

1. Git irá marcar os conflitos no arquivo
2. Edite o arquivo manualmente, removendo os marcadores de conflito
3. Depois resolva:
   ```bash
   git add arquivo-com-conflito.js
   git commit -m "resolve: Resolve conflitos de merge"
   git push
   ```

## Exemplos Práticos

### Atualização Simples
```bash
git add .
git commit -m "fix: Corrige problema no login"
git push
```

### Atualização com Múltiplos Commits
```bash
# Alterar arquivo 1
git add arquivo1.js
git commit -m "feat: Adiciona validação de email"

# Alterar arquivo 2
git add arquivo2.js
git commit -m "refactor: Melhora performance da busca"

# Enviar todos os commits
git push
```

### Atualização Após Receber Mudanças do GitHub
```bash
git pull  # Atualizar do GitHub
# Fazer suas alterações
git add .
git commit -m "feat: Adiciona novo módulo"
git push
```

