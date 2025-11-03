# Documentação Completa - Sistema de Extração RENACH

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Componentes Principais](#componentes-principais)
4. [Fluxo de Processamento](#fluxo-de-processamento)
5. [Padrões de Extração](#padrões-de-extração)
6. [Sistema de Validação](#sistema-de-validação)
7. [Normalização de Dados](#normalização-de-dados)
8. [Tratamento de Erros](#tratamento-de-erros)
9. [Logs e Debugging](#logs-e-debugging)
10. [Exemplos de Uso](#exemplos-de-uso)
11. [Guia de Desenvolvimento](#guia-de-desenvolvimento)
12. [Correções e Melhorias Recentes](#correções-e-melhorias-recentes)

---

## Visão Geral

O sistema de extração RENACH é responsável por processar documentos PDF do Registro Nacional de Habilitação de Condutores (RENACH), extraindo automaticamente informações pessoais, dados de habilitação, endereços e outras informações relevantes para preenchimento automático da ficha cadastral do paciente.

### Objetivos

- **Automação**: Reduzir trabalho manual de digitação de dados do RENACH
- **Precisão**: Extrair dados com alta taxa de acerto usando padrões robustos
- **Resiliência**: Continuar funcionando mesmo com PDFs de layout variado
- **Auditoria**: Manter logs detalhados para rastreabilidade

### Limitações Conhecidas

- Arquivos maiores que 20MB não são processados (limite de memória)
- Layouts muito diferentes do padrão RENACH podem falhar na extração
- Foto extraída pode falhar em alguns PDFs devido a problemas de renderização

---

## Arquitetura do Sistema

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
└────────┬────────┘
         │ PUT /api/pacientes/:id/renach
         ▼
┌─────────────────┐
│   Backend       │
│  (Express.js)   │
│  routes/        │
│  pacientes.js   │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│  RenachProcessorUniversal    │
│  utils/                      │
│  renachProcessorUniversal.js │
└────────┬─────────────────────┘
         │
         ├──────────────────────┬──────────────────────┐
         ▼                      ▼                      ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│  Extração de    │  │  Extração de    │  │  Parse de Dados  │
│  Texto (PDF)    │  │  Imagem (Foto)  │  │  (Regex)        │
└─────────────────┘  └──────────────────┘  └────────┬────────┘
                                                      │
                                                      ▼
                                         ┌───────────────────────┐
                                         │  Normalização         │
                                         │  renachDataNormalizer │
                                         └────────┬──────────────┘
                                                  │
                                                  ▼
                                         ┌───────────────────────┐
                                         │  Banco de Dados       │
                                         │  PostgreSQL           │
                                         └───────────────────────┘
```

---

## Componentes Principais

### 1. `RenachProcessorUniversal` (`codigo/utils/renachProcessorUniversal.js`)

Classe principal responsável por todo o processamento do RENACH.

#### Métodos Principais

**`processRenach(renachArquivo: string): Promise<object>`**
- Recebe arquivo RENACH em base64
- Extrai texto e imagem do PDF
- Processa dados usando `parseRenachDataUniversal`
- Retorna objeto com `{ success, data, foto }`

**`extractText(pdfBuffer: Buffer): Promise<string>`**
- Extrai texto do PDF usando `pdf-parse`
- Timeout de 30 segundos
- Retorna texto completo do documento

**`extractImage(pdfBuffer: Buffer): Promise<string>`**
- Renderiza primeira página do PDF usando `pdfjs-dist`
- Extrai foto do paciente (área específica: 214x464px na posição 1463, 387)
- Converte para base64 JPEG
- Timeout de 60 segundos

**`parseRenachDataUniversal(text: string): object`**
- Processa texto extraído usando múltiplos padrões regex
- Extrai mais de 25 campos diferentes
- Retorna objeto com todos os dados encontrados

### 2. `renachDataNormalizer.js` (`codigo/utils/renachDataNormalizer.js`)

Utilitário para sanitização e normalização dos dados extraídos.

#### Funções Principais

**`sanitizeExtractedData(raw: object): object`**
- Remove valores inválidos ("NÃO ENCONTRADO", null, undefined)
- Normaliza datas (dd/mm/yyyy → yyyy-mm-dd)
- Normaliza categoria CNH (remove "ACC", prioriza "B")
- Converte atividade remunerada ("SIM"/"NÃO" → boolean)
- Mapeia `tipo_processo` → `contexto`

**`shouldUpdateValue(current: any, next: any): boolean`**
- Decide se um campo deve ser atualizado no banco
- Só atualiza se valor novo for diferente e não vazio
- Evita sobrescrever com valores piores

**`normalizeString(val: any): string | undefined`**
- Remove strings inválidas e sentinelas
- Retorna undefined se valor for inválido

**`parseBrazilianDate(val: string): string | undefined`**
- Converte datas brasileiras para formato ISO
- Valida datas antes de retornar

### 3. Rota de Upload (`codigo/routes/pacientes.js`)

Endpoint REST que recebe upload do RENACH e orquestra todo o processo.

#### Endpoint: `PUT /api/pacientes/:id/renach`

**Request Body:**
```json
{
  "renach_arquivo": "data:application/pdf;base64,...",
  "renach_foto": "data:image/jpeg;base64,..." // opcional
}
```

**Response:**
```json
{
  "message": "Arquivo RENACH salvo com sucesso",
  "data": {
    "renach_data_upload": "2025-10-31T22:23:25.000Z",
    "extracted_data": { /* dados extraídos */ },
    "processing_success": true
  }
}
```

---

## Fluxo de Processamento

### 1. Recebimento do Upload

```javascript
// routes/pacientes.js - PUT /:id/renach
```

- Validação de autenticação e permissões
- Validação de tamanho do arquivo (máximo 50MB no body parser)
- Timeout de requisição: 180 segundos
- Extração do base64 do arquivo

### 2. Processamento do PDF

```javascript
// RenachProcessorUniversal.processRenach()
```

1. **Validação de entrada**
   - Verifica se arquivo não é vazio
   - Limite de 20MB (base64 decodificado)

2. **Conversão para Buffer**
   - Decodifica base64 para Buffer
   - Tratamento de erros de conversão

3. **Extração de Texto** (prioridade máxima)
   - Timeout: 30 segundos
   - Usa `pdf-parse` para extrair todo o texto
   - Se falhar, todo o processo falha

4. **Extração de Imagem** (opcional)
   - Timeout: 60 segundos
   - Renderiza PDF usando `pdfjs-dist`
   - Extrai área da foto (1463, 387, 214x464)
   - Converte para JPEG base64
   - Se falhar, continua sem foto

5. **Parse dos Dados**
   - Chama `parseRenachDataUniversal(text)`
   - Extrai todos os campos usando regex
   - Retorna objeto com dados encontrados

### 3. Sanitização e Normalização

```javascript
// renachDataNormalizer.sanitizeExtractedData()
```

- Remove valores inválidos
- Normaliza formatos (datas, categorias)
- Remove sentinelas de erro
- Converte tipos (boolean, datas)

### 4. Comparação com Dados Atuais

```javascript
// routes/pacientes.js - Mapeamento de campos
```

- Busca dados atuais do paciente no banco
- Compara cada campo usando `shouldUpdateValue()`
- Só adiciona à lista de atualização se valor mudou

### 5. Atualização no Banco de Dados

```javascript
// UPDATE pacientes SET ... WHERE id = ?
```

- Monta query SQL dinâmica com campos a atualizar
- Executa UPDATE apenas nos campos modificados
- Salva arquivo RENACH e foto no banco
- Registra timestamp de upload

---

## Padrões de Extração

### Dados Pessoais

#### Nome Completo

```javascript
// Padrão 1: Buscar após rótulo "Nome:"
/Nome[:\s]+([A-ZÁÊÇÕ\s]{10,80})/i

// Padrão 2: Buscar em seção "Dados Pessoais"
/Dados\s+Pessoais[\s\S]*?Nome[:\s]/i
// Então extrair primeira linha não vazia após rótulos
```

**Estrutura esperada no PDF:**
```
Dados Pessoais
Nome:
Pai:
Mãe:
JHORDAN CANDIDO DOS SANTOS SIMEAO  ← Linha 1: Nome do paciente
ADALBERTO DA SILVA SIMEAO          ← Linha 2: Nome do pai
ELISANGELA DOS SANTOS              ← Linha 3: Nome da mãe
```

#### Nome do Pai

```javascript
// Buscar após rótulo "Pai:" e pegar linha 2 (após nome do paciente)
/Dados\s+Pessoais[\s\S]*?Pai[:\s]/i
// Contar linhas após rótulos, linha 2 = nome do pai
```

**Validação:**
- Não pode ser igual ao nome do paciente
- Deve ter entre 5 e 80 caracteres
- Apenas letras maiúsculas e espaços

#### Nome da Mãe

```javascript
// Buscar após rótulo "Mãe:" e pegar linha 3 (após nome do paciente e pai)
/Dados\s+Pessoais[\s\S]*?Mãe[:\s]/i
// Contar linhas após rótulos, linha 3 = nome da mãe
```

**Validação:**
- Não pode ser igual ao nome do paciente
- Deve ter entre 5 e 80 caracteres
- Apenas letras maiúsculas e espaços

### Dados de Habilitação

#### Número RENACH

```javascript
// Padrão 1: Formato padrão SP + números
/SP\s*(\d{8,9})\b/i

// Padrão 2: Qualquer sequência de números após "RENACH"
/RENACH[:\s]*(\d{8,12})/i
```

**Formato esperado:** `SP032908921`

#### CPF

```javascript
// Formato com ou sem máscara
/(\d{3})[\.\-\s]?(\d{3})[\.\-\s]?(\d{3})[\.\-\s]?(\d{2})/
```

**Formato esperado:** `417.039.758-47` ou `41703975847`

#### Categoria CNH ⚠️ **CAMPO CRÍTICO - Atualizado**

Este é o campo mais complexo e problemático. O sistema usa uma abordagem em múltiplas etapas e agora suporta **categorias combinadas** como "AB", "AC", "BC", etc.

**1. Busca Prioritária - "Categoria Pretendida"**

```javascript
// Padrão específico: Buscar "Registro S.A.E." seguido de categoria isolada
// ATUALIZADO: Agora captura categorias combinadas ([A-E]{1,5})
/Registro\s+S\.A\.E\.\s*\n\s*([A-E]{1,5})\s*\n/i

// Fallback 1: Categoria após "Categoria Pretendida"
/Categoria\s+Pretendida(?:Situação\s+Atual)?[\s\S]*?\n\s+([A-E]{1,5})\s*(?:\n|$)/i

// Fallback 2: Categoria isolada em linha própria
/Categoria\s+Pretendida[\s\S]*?\n\s*([A-E]{1,5})\s+(?:\n|$)/i
```

**Validação de Categoria:**
```javascript
// Aceita categorias simples: A, B, C, D, E
// Aceita categorias combinadas: AB, AC, BC, ABC, ABCD, ABCDE
const isValidCategoria = (categoria) => {
  // Validar formato
  if (!/^[A-E]{1,5}$/.test(categoria)) return false;
  
  // Validar que não é parte de "ACC"
  if (contextoCompleto.includes('ACC') && contextoCompleto.includes(categoria + 'CC')) {
    return false;
  }
  
  // Verificar isolamento (rodeado por espaços/quebras de linha)
  // Verificar palavras-chave conhecidas após categoria
  // ...
  return true;
};
```

**Estrutura esperada:**
```
Categoria PretendidaSituação AtualPrimeira HabilitaçãoPreenchimento pela Auto Escola
Registro S.A.E.
 B                                    ← "B" isolado em linha própria
Matrícula da Auto Escola
```

**2. Busca Secundária - "Situação Atual"**

```javascript
// Mesmo padrão, prioridade 2
/Situação\s+Atual[\s\S]*?Registro\s+S\.A\.E\.\s*\n\s*([A-E])\s*\n/i
```

**3. Validação de Categoria**

A função `isValidCategoria()` verifica:

- ❌ **Rejeita** se fizer parte de "ACC" (Acordo de Categoria Concedida)
- ✅ **Aceita** se houver quebra de linha antes da próxima palavra
- ✅ **Aceita** se próxima palavra for palavra-chave conhecida ("Matrícula", "Registro", "Cód")
- ✅ **Aceita** se houver 3+ espaços antes da próxima palavra
- ❌ **Rejeita** se estiver muito próximo (< 2 caracteres) de outra letra

**4. Priorização de Candidatos**

```javascript
const categoriaCandidates = [
  { value: 'B', priority: 1, source: 'Categoria Pretendida' },
  { value: 'B', priority: 2, source: 'Situação Atual' },
  { value: 'B', priority: 3, source: 'Primeira Habilitação' },
  { value: 'B', priority: 4, source: 'Categoria Atual' }
];
// Escolhe candidato com menor priority (menor = melhor)
```

#### Tipo de Processo

```javascript
// Buscar após "Tipo de Processo" e procurar valores conhecidos
/Tipo\s+de\s+Processo[\s\S]{0,300}?(Renovação|Primeira\s+Habilitação|Adição|Mudança|Reabilitação|2ª\s+Via)/i
```

**Valores normalizados:**
- "Renovação"
- "Primeira Habilitação"
- "Adição/Mudança de Categoria"
- "Reabilitação"
- "2ª Via"

### Datas

#### Data de Nascimento

```javascript
// Múltiplos padrões flexíveis
/Data\s+do\s+Nascimento[\s\S]*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
/Nascimento[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
```

**Formato esperado:** `24/08/1993`

#### Data da Primeira Habilitação

```javascript
// Buscar após "Primeira Habilitação"
/Primeira\s+Habilitação[\s\S]*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
```

**Validação de ano:** 1970-2024

#### Data do Exame

```javascript
// Prioridade: Buscar na seção "Exame Psicotécnico" → "Validade"
/Exame\s*Psicotécnico[\s\S]*?Validade[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i

// Fallback: Buscar qualquer data após "Data do Exame"
/Data\s+do\s+Exame[\s\S]*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
```

### Endereço

#### Logradouro

```javascript
/Logradouro[^Número]*?([A-ZÁÊÇÕ\s]{5,80}?)(?=\d|\n|Número|Complemento)/i
```

#### Número do Endereço

```javascript
// Buscar após "Número" e antes de "Complemento"
/Número[\s\S]*?(\d{1,10})\s*(?:Complemento|$)/i
```

**Validação:** Remove números de complemento (ex: "AP 33" → número não é "33")

#### Complemento

```javascript
/Complemento[:\s]*([A-ZÁÊÇÕ0-9\s]{0,50})/i
```

#### Bairro

```javascript
/(?:Bairro|Distrito)[:\s]*([A-ZÁÊÇÕ\s]{3,50})/i
```

#### CEP

```javascript
// Formato com ou sem máscara
/(\d{5})[\s\-]?(\d{3})/
```

**Formato esperado:** `03367-030` ou `03367030`

#### Município e Código

```javascript
// Código do Município
/Cód\.\s*Município[\s\S]*?(\d{5,7})/i

// Município
/Município[:\s]*([A-ZÁÊÇÕ\s]{3,50})/i
```

### Documentos

#### RG

```javascript
/Número\s+do\s+Documento[\s\S]*?(\d{6,12})/i
```

#### Órgão Expedidor e UF

```javascript
// Órgão Expedidor
/Expedido\s+Por[:\s]*([A-ZÁÊÇÕ\s]{3,50})/i

// UF (padrão flexível)
/UF[\s\S]*?([A-Z]{2})\b/i

// Validação contra lista de UFs válidas
const ufsValidas = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
```

### Outros Campos

#### Número do Laudo RENACH ⚠️ **CRÍTICO**

**Problema:** Pode confundir "N° do Laudo" com "N° do Credenciado"

**Solução:**

```javascript
// 1. Identificar número do Credenciado primeiro
/N°\s*do\s*Credenciado[\s\S]*?(\d{3,4})/

// 2. Buscar número do Laudo, mas verificar que não é o credenciado
/N°\s*do\s*Laudo[\s\S]*?(\d{3,4})/

// 3. Validar que não é o credenciado
if (numeroEncontrado !== numeroCredenciado) {
  return numeroEncontrado;
}
```

**Prioridade:** Buscar próximo à palavra "Laudo" e validar distância

#### Telefone

```javascript
// Padrão brasileiro: (XX) XXXX-XXXX ou (XX) 9XXXX-XXXX
/(\(\d{2}\)\s?\d{4,5}[\-]?\d{4})/

// Também aceita números sem formatação
/(\d{10,11})/
```

**Formato esperado:** `11829424417` ou `(11) 8294-24417`

#### Atividade Remunerada

```javascript
// Buscar "SIM" ou "NÃO" após rótulo
/Pretende\s+exercer\s+atividade\s+remunerada[\s\S]*?(SIM|NÃO|NÃO)/i
```

**Conversão:** "SIM" → `true`, "NÃO" → `false`

#### Resultado do Exame ⚠️ **CRÍTICO - Atualizado**

**Importante:** O sistema agora captura "Inapto Temporário" completo, não apenas "Inapto".

```javascript
// Padrões priorizados (ordem importa!):
// 1. Buscar "Inapto Temporário" completo (prioridade máxima)
/Resultado[:\s]*Inapto\s+Tempor[áa]rio/i
/Resultado\s+do\s+Exame[:\s]*Inapto\s+Tempor[áa]rio/i
/Inapto\s+Tempor[áa]rio(?=\s*N°|\s*do\s*Credenciado|\s*do\s*Laudo|$)/i

// 2. Buscar apenas se não encontrar "Temporário" (usando negative lookahead)
/Resultado[:\s]*(Apto|Inapto|Dispensado)(?!\s+Tempor)/i
/Resultado\s+do\s+Exame[:\s]*(Apto|Inapto|Dispensado)(?!\s+Tempor)/i
```

**Valores possíveis:**
- "Apto"
- "Inapto"
- "Inapto Temporário" (com ou sem acentuação)
- "Dispensado"

**Lógica de extração:**
1. Prioriza captura de "Inapto Temporário" completo
2. Se não encontrar, verifica texto após captura para detectar "Temporário"
3. Normaliza acentuação: "Temporario" → "Temporário"
4. Preserva o texto completo na normalização

---

## Sistema de Validação

### Validação de Categoria CNH

A função `isValidCategoria()` é crítica para evitar falsos positivos:

```javascript
const isValidCategoria = (categoria, contextoAntes, contextoDepois) => {
  // 1. Rejeitar se parte de "ACC"
  if (contextoCompleto.includes('ACC') && contextoCompleto.includes(categoria + 'CC')) {
    return false;
  }
  
  // 2. Aceitar se houver quebra de linha
  if (contextoDepois.match(/^\s*[\n\r]/)) {
    return true;
  }
  
  // 3. Aceitar se próxima palavra for conhecida
  if (/Matrícula|Cód|Registro|Preenchimento/.test(contextoDepois)) {
    return true;
  }
  
  // 4. Aceitar se houver muitos espaços (>= 3)
  if (contextoDepois.match(/^(\s{3,})/)) {
    return true;
  }
  
  // 5. Rejeitar se muito próximo (< 2 caracteres)
  if (contextoDepois.search(/[A-Z]/) < 2) {
    return false;
  }
  
  return true;
};
```

### Validação de Nomes

```javascript
// Nome do Pai/Mãe não pode ser igual ao nome do paciente
if (nomePai && nomePaciente && 
    nomePai.toUpperCase().startsWith(nomePaciente.split(' ')[0].toUpperCase())) {
  // Rejeitar
}
```

### Validação de Datas

```javascript
// Verificar se data é válida
const date = new Date(isoDate + 'T00:00:00Z');
if (Number.isNaN(date.getTime())) {
  // Rejeitar
}
```

---

## Normalização de Dados

### Processo de Sanitização

```javascript
// 1. Remove sentinelas de erro
normalizeString("NÃO ENCONTRADO") → undefined

// 2. Normaliza datas
parseBrazilianDate("24/08/1993") → "1993-08-24"

// 3. Normaliza categoria CNH
normalizeCategoriaCNH("ACC") → undefined (remove ACC)
normalizeCategoriaCNH("B, A") → "B" (prioriza B)

// 4. Normaliza tipo de processo
sanitizeExtractedData({ tipo_processo: "renovacao" }) 
  → { contexto: "Renovação" }

// 5. Converte atividade remunerada
sanitizeExtractedData({ atividade_remunerada: "SIM" })
  → { atividade_remunerada: true }
```

### Política de Atualização

```javascript
shouldUpdateValue(currentValue, newValue)
```

**Regras:**
- Se `newValue` é `null/undefined` → não atualiza
- Se `currentValue` é `null/undefined` → atualiza
- Se `newValue` é string vazia → não atualiza
- Se valores são iguais → não atualiza
- Se valores são diferentes → atualiza

**Objetivo:** Evitar atualizações desnecessárias e preservar dados válidos existentes.

---

## Tratamento de Erros

### Erros de Timeout

```javascript
// Timeout no texto: 30 segundos
// Timeout na imagem: 60 segundos
// Timeout na requisição: 180 segundos

if (error.message.includes('timeout')) {
  return res.status(504).json({
    error: 'Timeout ao processar RENACH. O arquivo pode ser muito grande.'
  });
}
```

### Erros de Memória

```javascript
if (error.message.includes('memory') || error.message.includes('heap')) {
  return res.status(500).json({
    error: 'Erro de memória ao processar RENACH. Tente um arquivo menor.'
  });
}
```

### Erros de Processamento

```javascript
// Se extração de texto falhar → falha total
// Se extração de imagem falhar → continua sem foto
// Se parse falhar → continua com dados parciais
```

### Estrutura de Retorno de Erro

```javascript
{
  error: "Mensagem de erro amigável",
  message: "Mensagem técnica detalhada",
  details: "Stack trace (apenas em desenvolvimento)"
}
```

---

## Logs e Debugging

### Níveis de Log

O sistema usa `console.log` com emojis para facilitar identificação:

- 🔄 **Processamento iniciado**
- ✅ **Sucesso**
- ❌ **Erro**
- ⚠️ **Aviso**
- 📋 **Dados/Informação**
- 🔍 **Busca/Análise**
- 💾 **Operação de banco**

### Logs Principais

**Durante Extração:**
```
🔄 Iniciando processamento universal do RENACH...
📄 PDF convertido para buffer, tamanho: 0.07MB
🔍 Extraindo texto do PDF...
✅ Texto extraído com sucesso!
📝 Texto extraído, tamanho: 1679
🖼️ Tentando extrair foto do RENACH...
✅ Foto extraída com sucesso!
⚙️ Processando dados extraídos...
```

**Durante Parse:**
```
🔍 Iniciando análise universal do texto RENACH...
✅ Número RENACH encontrado: SP032908921
✅ CPF encontrado: 417.039.758-47
✅ Nome completo encontrado: "JHORDAN CANDIDO DOS SANTOS SIMEAO"
🔍 ===== INICIANDO BUSCA DE CATEGORIA CNH =====
🔍 Buscando "Categoria Pretendida": ENCONTRADO na posição 609
   📌 Categoria extraída: "B"
   📍 Contexto antes: "la Auto Escola\n"
   📍 Contexto depois: "Matrícula da Au"
  ✅ Categoria "B" aceita: seguida de palavra-chave conhecida
  ✅ Candidato encontrado: "B" de "Categoria Pretendida" (prioridade 1)
```

**Durante Atualização:**
```
🔄 INICIANDO ATUALIZAÇÃO DOS DADOS DO PACIENTE...
📊 DADOS ATUAIS DO PACIENTE (para comparação):
🔍 MAPEANDO CAMPOS PARA ATUALIZAÇÃO (com validação shouldUpdateValue):
  ✅ categoria_cnh -> categoria_cnh: "A" -> "B"
  ⏭️  nome_pai -> nome_pai: IGNORADO (valor já é igual)
💾 EXECUTANDO ATUALIZAÇÃO NO BANCO:
  ✅ Atualização executada: 1 linha(s) afetada(s)
```

### Como Usar Logs para Debug

1. **Problema: Campo não extraído**
   - Verificar se regex encontrou padrão no log
   - Verificar se validação rejeitou valor
   - Verificar se sanitização removeu valor

2. **Problema: Valor incorreto**
   - Verificar contexto antes/depois no log
   - Verificar se regex capturou texto errado
   - Verificar se normalização alterou valor incorretamente

3. **Problema: Campo não atualizado**
   - Verificar se `shouldUpdateValue` retornou `false`
   - Verificar se valor novo é igual ao atual
   - Verificar se campo está no `fieldMapping`

---

## Exemplos de Uso

### Exemplo 1: Upload Básico

```javascript
// Frontend (React/Next.js)
const handleUploadRenach = async (file) => {
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(',')[1];
    const response = await api.uploadRenach(patientId, {
      renach_arquivo: reader.result
    });
    console.log('RENACH processado:', response.data);
  };
  reader.readAsDataURL(file);
};
```

### Exemplo 2: Verificar Dados Extraídos

```javascript
// Backend (Node.js)
const result = await RenachProcessor.processRenach(base64String);

if (result.success) {
  console.log('Dados extraídos:', result.data);
  console.log('Foto extraída:', result.foto ? 'Sim' : 'Não');
  
  // Sanitizar dados
  const cleaned = sanitizeExtractedData(result.data);
  
  // Atualizar paciente
  await updatePatient(patientId, cleaned);
}
```

### Exemplo 3: Teste Manual de Extração

```javascript
// Script de teste
const fs = require('fs');
const RenachProcessor = require('./utils/renachProcessorUniversal');

async function testExtraction() {
  const pdfBuffer = fs.readFileSync('teste-renach.pdf');
  const base64 = pdfBuffer.toString('base64');
  
  try {
    const result = await RenachProcessor.processRenach(base64);
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testExtraction();
```

---

## Código Completo - Principais Arquivos

### 1. `renachProcessorUniversal.js` - Extração Principal

O arquivo completo possui aproximadamente 1487 linhas e contém:

- Classe `RenachProcessorUniversal`
- Método `processRenach()` - Orquestração principal
- Método `extractText()` - Extração de texto
- Método `extractImage()` - Extração de foto
- Método `parseRenachDataUniversal()` - Parse completo com todos os campos
- Métodos auxiliares para cada tipo de dado (pessoais, endereço, exames, etc.)

### 2. `renachDataNormalizer.js` - Normalização

Arquivo de 152 linhas com funções utilitárias:
- `sanitizeExtractedData()` - Limpeza completa
- `shouldUpdateValue()` - Política de atualização
- `normalizeString()` - Limpeza de strings
- `parseBrazilianDate()` - Conversão de datas
- `normalizeCategoriaCNH()` - Normalização de categoria

### 3. `routes/pacientes.js` - Endpoint REST

Endpoint `PUT /:id/renach` (linhas 620-940):
- Recebe upload do RENACH
- Chama `RenachProcessor.processRenach()`
- Sanitiza dados com `sanitizeExtractedData()`
- Compara com dados atuais usando `shouldUpdateValue()`
- Executa UPDATE no banco de dados
- Salva arquivo RENACH e foto
- Retorna resultado ao frontend

---

## Troubleshooting Comum

### Problema: Categoria CNH sempre "A" ou não encontrada

**Causa:** Validação `isValidCategoria` rejeitando categoria válida.

**Solução:**
1. Verificar logs do contexto antes/depois
2. Ajustar regex para capturar categoria isolada
3. Ajustar validação para aceitar categoria antes de "Matrícula"

### Problema: Nome do Pai/Mãe incorreto

**Causa:** Regex capturando nome do paciente em vez do pai/mãe.

**Solução:**
1. Verificar estrutura do PDF (rótulos e valores em linhas separadas)
2. Ajustar contador de linhas após rótulos
3. Adicionar validação para rejeitar se igual ao nome do paciente

### Problema: Número do Laudo incorreto (pegando Credenciado)

**Causa:** Regex pegando "N° do Credenciado" em vez de "N° do Laudo".

**Solução:**
1. Identificar número do Credenciado primeiro
2. Buscar número do Laudo e verificar que não é o Credenciado
3. Priorizar padrão próximo à palavra "Laudo"

### Problema: Timeout no processamento

**Causa:** PDF muito grande ou complexo.

**Solução:**
1. Verificar tamanho do arquivo (< 20MB)
2. Aumentar timeout se necessário
3. Processar apenas primeira página se PDF tiver muitas páginas

### Problema: Foto não extraída

**Causa:** PDF não renderizável ou área da foto diferente.

**Solução:**
1. Foto é opcional - processo continua sem ela
2. Verificar coordenadas da foto (1463, 387, 214x464)
3. Verificar se PDF usa fontes padrão (pode falhar com fontes customizadas)

---

## Melhorias Futuras

1. **OCR para PDFs Escaneados**
   - Atualmente só funciona com PDFs com texto selecionável
   - Implementar OCR para PDFs de imagem

2. **Machine Learning para Extração**
   - Treinar modelo para identificar campos mesmo com layout diferente
   - Reduzir dependência de regex fixos

3. **Validação de Dados com API Externa**
   - Validar CPF contra Receita Federal
   - Validar CEP contra Correios

4. **Cache de Processamento**
   - Evitar reprocessar mesmo arquivo
   - Armazenar hash do PDF para detecção de duplicatas

5. **Suporte a Múltiplos Formatos**
   - PDFs de diferentes estados podem ter layouts diferentes
   - Criar parsers específicos por estado

---

## Conclusão

O sistema de extração RENACH é um componente complexo e robusto que utiliza múltiplas estratégias para extrair dados de documentos PDF com alta precisão. A arquitetura modular permite fácil manutenção e extensão, e o sistema de logs detalhados facilita o debugging e auditoria.

**Pontos Fortes:**
- ✅ Extração automática de mais de 25 campos
- ✅ Validação robusta para evitar falsos positivos
- ✅ Normalização automática de dados
- ✅ Tratamento de erros resiliente
- ✅ Logs detalhados para debugging

**Áreas de Melhoria:**
- 🔄 Suporte a layouts variados
- 🔄 OCR para PDFs escaneados
- 🔄 Validação com APIs externas
- 🔄 Processamento mais rápido para PDFs grandes

---

---

## Guia de Desenvolvimento

### Como Adicionar um Novo Campo de Extração

**1. Identificar o Padrão no PDF:**

Primeiro, faça upload de um PDF RENACH e analise o texto extraído:
```javascript
// No método parseRenachDataUniversal(), adicione:
console.log('📝 TEXTO EXTRAÍDO COMPLETO:', text);
```

**2. Criar Padrões Regex:**

Analise a estrutura e crie padrões flexíveis:
```javascript
// Exemplo: Adicionar campo "Profissão"
const profissaoPatterns = [
  // Padrão específico (mais restritivo)
  /Profissão[:\s]*([A-ZÁÊÇÕ\s]{3,50}?)(?=\s*Endereço|\s*Telefone|$)/i,
  // Padrão genérico (fallback)
  /Prof[:\s]*([A-ZÁÊÇÕ\s]{3,50})/i
];

for (const pattern of profissaoPatterns) {
  const match = text.match(pattern);
  if (match && match[1]) {
    let value = match[1].trim();
    // Validação básica
    if (value.length > 3 && value.length < 50) {
      data.profissao = value;
      console.log(`✅ Profissão encontrada: ${data.profissao}`);
      break;
    }
  }
}
```

**3. Adicionar ao Sanitizador:**

No arquivo `renachDataNormalizer.js`:
```javascript
function sanitizeExtractedData(raw = {}) {
  const cleaned = {};
  
  // ... campos existentes ...
  
  // Novo campo
  cleaned.profissao = normalizeString(raw.profissao);
  
  return cleaned;
}
```

**4. Adicionar ao Mapeamento de Campos:**

No arquivo `routes/pacientes.js`:
```javascript
const fieldMapping = {
  // ... campos existentes ...
  profissao: 'profissao'  // Novo campo
};
```

**5. Criar Migration para Nova Coluna:**

```sql
ALTER TABLE pacientes ADD COLUMN profissao VARCHAR(100);
```

**6. Atualizar Frontend:**

No arquivo `frontend/frontend-nextjs/src/app/pacientes/page.tsx`:
```typescript
interface Patient {
  // ... campos existentes ...
  profissao?: string;
}

// Adicionar exibição na ficha:
{selectedPatient.profissao && (
  <div>
    <label className="block text-sm font-medium text-gray-700">Profissão</label>
    <p className="mt-1 text-sm text-gray-900">{selectedPatient.profissao}</p>
    <p className="text-xs text-green-600 mt-1">✓ Extraído do RENACH</p>
  </div>
)}
```

**7. Testar e Validar:**

1. Faça upload de um RENACH conhecido
2. Verifique os logs do backend
3. Confirme que o campo foi extraído
4. Verifique se foi salvo no banco
5. Confirme exibição no frontend

### Padrões de Boas Práticas

**1. Regex Patterns:**
- Sempre use múltiplos padrões (específico → genérico)
- Use `[\s\S]*?` para flexibilidade com quebras de linha
- Evite padrões muito genéricos que possam capturar texto errado
- Adicione validação após captura

**2. Validação:**
- Valide tamanho mínimo e máximo de strings
- Valide formato de datas e números
- Rejeite valores que sejam iguais a outros campos conhecidos
- Use `normalizeString()` para limpar valores

**3. Logs:**
- Adicione logs informativos com emojis para facilitar debugging
- Log valores extraídos e contexto
- Log quando valores são rejeitados e motivo

**4. Normalização:**
- Sempre normalize antes de salvar no banco
- Preserve informações importantes (ex: "Inapto Temporário" vs "Inapto")
- Converta formatos (datas, booleanos) quando necessário

### Estrutura de Testes

**Criar script de teste:**

```javascript
// scripts/test-extract-field.js
const RenachProcessor = require('../codigo/utils/renachProcessorUniversal');
const fs = require('fs');

async function testFieldExtraction() {
  // Carregar PDF de teste
  const pdfBuffer = fs.readFileSync('teste-renach.pdf');
  const base64 = pdfBuffer.toString('base64');
  
  // Processar
  const result = await RenachProcessor.processRenach(base64);
  
  // Verificar campo específico
  console.log('Campo extraído:', result.data.nome_do_campo);
  console.log('Campo sanitizado:', sanitizeExtractedData(result.data).nome_do_campo);
}

testFieldExtraction();
```

---

## Correções e Melhorias Recentes (31/10/2025)

### 1. Resultado do Exame - "Inapto Temporário" ✅

**Problema Identificado:**
O regex estava capturando apenas "Inapto", ignorando "Temporário" quando presente.

**Solução Implementada:**

**Antes:**
```javascript
/Resultado[:\s]*(Apto|Inapto|Dispensado)/i
// Capturava apenas "Inapto"
```

**Depois:**
```javascript
// Prioridade 1-3: Buscar "Inapto Temporário" completo
/Resultado[:\s]*Inapto\s+Tempor[áa]rio/i
/Resultado\s+do\s+Exame[:\s]*Inapto\s+Tempor[áa]rio/i
/Inapto\s+Tempor[áa]rio(?=\s*N°|\s*do\s*Credenciado|\s*do\s*Laudo|$)/i

// Prioridade 4-7: Buscar apenas se não encontrar "Temporário"
/Resultado[:\s]*(Apto|Inapto|Dispensado)(?!\s+Tempor)/i
```

**Lógica Adicional:**
- Após capturar match, verifica se há "Temporário" nos próximos 20 caracteres
- Se encontrar, atualiza resultado para "Inapto Temporário"
- Normalização preserva o texto completo

**Normalização:**
```javascript
// renachDataNormalizer.js
if (/inapto\s+tempor[áa]rio/i.test(resultado)) {
  resultado = 'Inapto Temporário';
}
```

### 2. Categoria CNH - Categorias Combinadas ✅

**Problema Identificado:**
O sistema capturava apenas uma letra (`[A-E]`), não reconhecendo categorias combinadas como "AB", "AC", etc.

**Solução Implementada:**

**Antes:**
```javascript
/Registro\s+S\.A\.E\.\s*\n\s*([A-E])\s*\n/i
// Capturava apenas "A" ou "B", não "AB"
```

**Depois:**
```javascript
// Todos os padrões atualizados para [A-E]{1,5}
/Registro\s+S\.A\.E\.\s*\n\s*([A-E]{1,5})\s*\n/i
// Agora captura "A", "B", "AB", "AC", "ABC", etc.
```

**Validação Atualizada:**
```javascript
// Aceita categorias simples e combinadas
const categoriaValida = /^[A-E]{1,5}$/.test(categoria);
// Exemplos válidos: "A", "B", "AB", "AC", "BC", "ABC", "ABCDE"
```

**Normalização:**
```javascript
// renachDataNormalizer.js
// Verificar se é categoria combinada válida
const categoriaCombinada = found.match(/^([A-E]{2,5})$/);
if (categoriaCombinada) {
  const cat = categoriaCombinada[1];
  const catOrdenada = cat.split('').sort().join('');
  // Validar que está em ordem alfabética e sem repetição
  if (cat === catOrdenada && cat.length <= 5) {
    return cat; // Retorna "AB", "AC", etc.
  }
}
```

### 3. Telefones - Duplicados e Incorporação ✅

**Problema Identificado:**
- Telefone extraído do RENACH não era processado para `telefone_fixo`/`telefone_celular`
- Frontend não exibia os dois telefones separadamente

**Solução Implementada:**

**Backend:**
```javascript
// routes/pacientes.js
// 1. Processar telefone do RENACH (se houver)
if (extractedData.telefone) {
  const telefonesRenach = processarTelefones(extractedData.telefone);
  telefoneRenachFixo = telefonesRenach.telefone_fixo;
  telefoneRenachCelular = telefonesRenach.telefone_celular;
}

// 2. Buscar telefones do agendamento (se paciente não tem)
if (!telefoneFixo && !telefoneCelular) {
  // Buscar do agendamento...
}

// 3. Prioridade: RENACH > Agendamento > Existente
const telefoneFixoFinal = telefoneRenachFixo || telefoneFixo;
const telefoneCelularFinal = telefoneRenachCelular || telefoneCelular;

// 4. Atualizar usando shouldUpdateValue
if (telefoneFixoFinal && shouldUpdateValue(currentPatient.rows[0]?.telefone_fixo, telefoneFixoFinal)) {
  updateFields.push(`telefone_fixo = $${paramCount++}`);
  updateValues.push(telefoneFixoFinal);
}
```

**Frontend:**
```typescript
// Atualizado para exibir ambos os telefones
{selectedPatient.telefone_fixo && (
  <div>
    <span className="text-gray-600 text-xs">Fixo: </span>
    <span className="text-gray-900">{formatPhoneDisplay(selectedPatient.telefone_fixo)}</span>
  </div>
)}
{selectedPatient.telefone_celular && (
  <div>
    <span className="text-gray-600 text-xs">WhatsApp: </span>
    <a href={generateWhatsAppLink(selectedPatient.telefone_celular)}>
      {formatPhoneDisplay(selectedPatient.telefone_celular)}
    </a>
  </div>
)}
```

**Endpoint GET atualizado:**
```sql
SELECT telefone, telefone_fixo, telefone_celular, ...
FROM pacientes WHERE id = $1
```

### 4. Validação de Categoria CNH - Melhorada ✅

**Problema:**
Categoria "B" era rejeitada por estar próxima da palavra "Matrícula" (letra "M").

**Solução:**
Função `isValidCategoria()` atualizada para aceitar categorias quando:
1. Há quebra de linha antes da próxima palavra
2. Próxima palavra é palavra-chave conhecida ("Matrícula", "Registro", etc.)
3. Há 3+ espaços antes da próxima palavra
4. Rejeita apenas se muito próximo (< 2 caracteres) de outra letra

### Checklist para Novos Desenvolvedores

Ao trabalhar no módulo de extração RENACH, siga este checklist:

**Antes de Modificar:**
- [ ] Ler esta documentação completa
- [ ] Analisar logs de um upload real para entender estrutura do texto
- [ ] Verificar como o campo aparece no PDF (formato, localização, variações)

**Ao Modificar:**
- [ ] Criar múltiplos padrões regex (específico → genérico)
- [ ] Adicionar validação após captura
- [ ] Adicionar logs detalhados com contexto
- [ ] Testar com diferentes PDFs se possível
- [ ] Atualizar normalização se necessário

**Depois de Modificar:**
- [ ] Verificar se campo aparece no banco de dados
- [ ] Verificar se campo aparece no frontend
- [ ] Testar com PDF que não tinha o campo (não deve quebrar)
- [ ] Atualizar esta documentação com as mudanças

### Arquivos Chave para Modificação

**Extração de Novos Campos:**
- `codigo/utils/renachProcessorUniversal.js`
  - Método `parseRenachDataUniversal()` - Adicionar novo método de extração
  - Ou adicionar padrões em método existente (pessoais, endereço, exames)

**Normalização:**
- `codigo/utils/renachDataNormalizer.js`
  - Função `sanitizeExtractedData()` - Adicionar novo campo

**Persistência:**
- `codigo/routes/pacientes.js`
  - Rota `PUT /:id/renach` - Adicionar ao `fieldMapping`
  - Rota `GET /:id` - Incluir campo na query SELECT

**Exibição:**
- `frontend/frontend-nextjs/src/app/pacientes/page.tsx`
  - Interface `Patient` - Adicionar tipo
  - Ficha do paciente - Adicionar exibição

**Banco de Dados:**
- Criar migration para nova coluna (se necessário)

### Exemplo Completo: Adicionar Campo "Naturalidade"

**Passo 1: Analisar PDF**
```
Naturalidade07057SANTO ANDRE
```

**Passo 2: Extrair em `renachProcessorUniversal.js`**
```javascript
// Já existe em extractPersonalData(), mas como exemplo:
const naturalidadePatterns = [
  /Naturalidade[:\s]*(\d{5})?\s*([A-ZÁÊÇÕ\s]+?)(?=\s*Endereço|Tipo|Logradouro|$)/i
];

for (const pattern of naturalidadePatterns) {
  const match = text.match(pattern);
  if (match && match[2]) {
    let value = match[2].trim();
    value = value.replace(/\d+/g, '').trim(); // Remove código IBGE
    if (value.length > 3 && !['Masculino', 'Feminino', 'Brasileiro'].includes(value)) {
      data.naturalidade = value;
      console.log(`✅ Naturalidade encontrada: ${data.naturalidade}`);
      break;
    }
  }
}
```

**Passo 3: Normalizar em `renachDataNormalizer.js`**
```javascript
cleaned.naturalidade = normalizeString(raw.naturalidade);
```

**Passo 4: Mapear em `routes/pacientes.js`**
```javascript
const fieldMapping = {
  // ...
  naturalidade: 'naturalidade'
};
```

**Passo 5: Exibir no Frontend**
```typescript
{selectedPatient.naturalidade && (
  <div>
    <label>Naturalidade</label>
    <p>{selectedPatient.naturalidade}</p>
    <p className="text-xs text-green-600">✓ Extraído do RENACH</p>
  </div>
)}
```

---

**Última atualização:** 31/10/2025  
**Versão:** 2.0  
**Autor:** Sistema de Avaliação Psicológica

**Changelog:**
- ✅ v2.0 (31/10/2025): Suporte a "Inapto Temporário", categorias combinadas (AB), telefones duplicados
- ✅ v1.0 (31/10/2025): Versão inicial completa

