# Configuração de Logs do Sistema

## Sistema de Logging

O sistema possui um logger configurável com 4 níveis de log:

- **ERROR** (0): Apenas erros críticos
- **WARN** (1): Erros e avisos
- **INFO** (2): Erros, avisos e informações (padrão)
- **DEBUG** (3): Todos os logs, incluindo detalhes de debug

## Como Configurar

### Opção 1: Variável de Ambiente (Recomendado)

Adicione ao arquivo `.env` na raiz do projeto `codigo/`:

```env
# Níveis: ERROR, WARN, INFO, DEBUG
LOG_LEVEL=DEBUG
```

Para desenvolvimento/teste:
```env
LOG_LEVEL=DEBUG
```

Para produção:
```env
LOG_LEVEL=WARN
```

### Opção 2: Via Código

No início do arquivo `server.js` ou em qualquer arquivo que processe RENACH:

```javascript
const logger = require('./utils/logger');

// Definir nível
logger.setLevel('DEBUG');  // ou 'INFO', 'WARN', 'ERROR'
// ou
logger.setLevel(3);  // 0=ERROR, 1=WARN, 2=INFO, 3=DEBUG

// Verificar nível atual
console.log('Nível de log atual:', logger.getLevel());
```

### Opção 3: Via Terminal (Temporário)

No PowerShell:
```powershell
$env:LOG_LEVEL="DEBUG"
npm start
```

No CMD:
```cmd
set LOG_LEVEL=DEBUG
npm start
```

## Uso nos Arquivos

### Exemplo no renachProcessorUniversal.js:

```javascript
const logger = require('../utils/logger');

// Em vez de console.log, use:
logger.debug('🔍 Extraindo texto do PDF...');
logger.info('✅ Texto extraído com sucesso!');
logger.warn('⚠️ Campo não encontrado');
logger.error('❌ Erro ao processar RENACH:', error);
```

## Níveis Recomendados por Ambiente

- **Desenvolvimento**: `DEBUG` - Ver todos os logs para entender o fluxo
- **Teste**: `INFO` - Ver informações importantes sem poluir muito
- **Produção**: `WARN` ou `ERROR` - Apenas problemas e avisos

## Verificar Configuração Atual

Você pode verificar o nível atual adicionando esta linha no início do `server.js`:

```javascript
const logger = require('./utils/logger');
console.log('📊 Nível de log atual:', logger.getLevel());
```

## Logs do RENACH

Para debugar problemas de extração do RENACH, use `LOG_LEVEL=DEBUG` para ver:
- Texto extraído do PDF
- Cada padrão regex testado
- Valores encontrados vs. não encontrados
- Distâncias calculadas para busca por proximidade
- Confiança e fonte de cada campo extraído

## Exemplo de Saída

Com `LOG_LEVEL=DEBUG`:
```
[2025-10-31T20:30:00.000Z] [DEBUG] 🔍 Extraindo texto do PDF...
[2025-10-31T20:30:01.000Z] [INFO] ✅ Texto extraído com sucesso!
[2025-10-31T20:30:01.500Z] [DEBUG] 📝 Texto extraído, tamanho: 1679
[2025-10-31T20:30:02.000Z] [INFO] ✅ Categoria CNH encontrada: B (padrão: /Categoria\s+Pretendida[\s\S]*?([A-E])/i)
```

Com `LOG_LEVEL=INFO` (padrão):
```
✅ Texto extraído com sucesso!
✅ Categoria CNH encontrada: B
✅ Tipo de processo encontrado: Renovação
```

Com `LOG_LEVEL=WARN`:
```
⚠️ Campo não encontrado
❌ Erro ao processar RENACH
```

