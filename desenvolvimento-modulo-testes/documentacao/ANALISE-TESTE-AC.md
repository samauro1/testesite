# 🔍 ANÁLISE PROFUNDA - TESTE AC (Atenção Concentrada)

**Data:** 03 de Novembro de 2025  
**Objetivo:** Desenvolver sistema de correção automatizada a partir de fotos

---

## 📋 COMPREENSÃO DO TESTE AC

### Objetivo
Avaliar a capacidade do sujeito de manter a atenção concentrada durante um período determinado de tempo (5 minutos).

### Público-Alvo
Indivíduos com idades entre 18 e 64 anos.

### Materiais
- Livro de Instruções
- Livro de Aplicação (folha de respostas)
- **Crivo de Correção** (chave de correção com círculos indicando respostas corretas)
- Lápis ou caneta
- Cronômetro

---

## 🎯 MECÂNICA DO TESTE

### Estrutura da Folha de Respostas

1. **Retângulo de Referência (Topo):**
   - Contém 3 tipos de setas/triângulos que são os **alvos** a serem encontrados
   - Exemplo: ➡️ (direita), ⬇️ (baixo), ⬅️ (esquerda)

2. **Linha de Exemplo:**
   - 21 símbolos para treino
   - 7 alvos devem ser marcados (posições 1, 3, 6, 10, 14, 17, 20)

3. **Grid Principal:**
   - 20 linhas (fileiras) de símbolos
   - Cada linha contém aproximadamente 15 símbolos (varia)
   - Total aproximado: ~300 símbolos

### Instruções para o Examinando

1. **Marcação de Alvos:**
   - Procurar símbolos iguais aos do retângulo de referência
   - Marcar com um **risco vertical ou levemente inclinado**
   - Trabalhar da esquerda para direita, sequencialmente

2. **Cancelamento de Erros:**
   - Se marcar um símbolo errado, fazer um **círculo ao redor** da marca
   - O círculo anula o erro (não conta como erro)

3. **Regras:**
   - Trabalhar com rapidez e atenção
   - Não pular nenhum alvo
   - Omissões e erros são descontados dos acertos

---

## 📊 CORREÇÃO MANUAL (Processo Atual)

### Passo 1: Aplicar o Crivo
- O crivo é uma folha transparente com **círculos pretos** indicando as posições corretas
- Ajusta-se o crivo sobre a folha de respostas
- Os círculos do crivo mostram onde o examinando **deveria ter marcado**

### Passo 2: Contagem de Acertos (A)
- Contar símbolos que estão:
  - ✅ **Marcados** pelo examinando (linha vertical/inclinada)
  - ✅ **Dentro dos círculos** do crivo (posição correta)
  - ✅ **SEM círculo** ao redor da marca (não foi cancelado)

### Passo 3: Contagem de Erros (E)
- Contar símbolos que estão:
  - ❌ **Marcados** pelo examinando (linha vertical/inclinada)
  - ❌ **FORA dos círculos** do crivo (não é alvo)
  - ❌ **SEM círculo** ao redor da marca (não foi cancelado)
- **EXCEÇÃO:** Segundo a imagem fornecida, marcas circuladas podem contar como erro se o usuário especificar

### Passo 4: Contagem de Omissões (O)
- Contar símbolos que estão:
  - ⚠️ **Dentro dos círculos** do crivo (deveria ter marcado)
  - ⚠️ **NÃO marcados** pelo examinando (sem linha)
  - ⚠️ Considerar apenas até a **última marca** do examinando
  - Não contar omissões após a última marca

### Passo 5: Cálculo de Pontos (P)
**Fórmula:** `P = A - (E + O)`

- Primeiro: somar erros e omissões: `E + O`
- Depois: subtrair do total de acertos: `A - (E + O)`
- Cada erro ou omissão desconta 1 ponto do total

### Passo 6: Obtenção do Percentil
- Consultar tabela normativa apropriada
- Critérios de seleção:
  1. Região (Sul, Sudeste, Centro-Oeste, Nordeste, Norte, ou Geral)
  2. Escolaridade (Fundamental, Médio, Superior, ou Total)
  3. Idade (18-64 anos)
- Se a pontuação estiver entre dois percentis, usar o **percentil mais baixo**

### Passo 7: Classificação
Baseada no percentil:
- **Inferior:** P1-P10
- **Médio Inferior:** P20-P40
- **Médio:** P50-P75
- **Médio Superior:** P80-P90
- **Superior:** P95
- **Muito Superior:** P99

---

## 🖼️ ANÁLISE DAS IMAGENS FORNECIDAS

### Imagem 1: Crivo de Correção (Chave)
- Fundo claro com **círculos pretos** em posições específicas
- Cada círculo indica um símbolo alvo
- Círculos podem estar agrupados ou isolados
- Padrão denso e irregular
- Total aproximado: ~140 círculos (7 por fileira × 20 fileiras)

### Imagem 2: Teste Preenchido (Sem Crivo)
- Grid de símbolos (triângulos/setas em 4 direções)
- **Marcas azuis:** linhas verticais/inclinadas sobre símbolos
- **1 erro identificado:** símbolo marcado e depois circulado
- Contagem manual: 147 acertos, 1 erro, 0 omissões
- Pontos: 147 - (1 + 0) = 146

### Imagem 3: Teste Preenchido com Crivo Sobreposto
- Combinação do teste preenchido + crivo transparente
- **Círculos pretos do crivo** sobrepostos às marcas azuis
- Permite visualizar:
  - Acertos: marcas azuis dentro de círculos pretos
  - Erros: marcas azuis fora de círculos pretos
  - Omissões: círculos pretos sem marcas azuis

---

## 🤖 DESAFIOS PARA AUTOMAÇÃO

### 1. Detecção de Símbolos
**Desafio:** Identificar cada símbolo no grid e sua orientação
- Símbolos podem ser: ▲ (cima), ▼ (baixo), ◀ (esquerda), ▶ (direita)
- Tamanho pequeno (~0.5-1cm)
- Densidade alta (~300 símbolos)
- Orientação variada

**Solução Proposta:**
- Usar detecção de objetos (OpenCV, YOLO, ou similar)
- Classificação por orientação (CNN)
- Mapeamento de coordenadas (x, y) de cada símbolo

### 2. Detecção do Crivo (Chave de Correção)
**Desafio:** Identificar círculos pretos do crivo
- Círculos podem estar sobrepostos ao teste
- Precisão na localização (deve coincidir com símbolos)
- Distinguir círculos do crivo de círculos de cancelamento

**Solução Proposta:**
- Detecção de círculos (HoughCircles do OpenCV)
- Mapeamento de coordenadas dos círculos
- Comparação com posições dos símbolos

### 3. Detecção de Marcas do Examinando
**Desafio:** Identificar linhas verticais/inclinadas
- Cor da marca (azul na imagem, mas pode variar)
- Formato: linha vertical ou levemente inclinada
- Pode estar sobreposta ao símbolo

**Solução Proposta:**
- Detecção de linhas (HoughLines do OpenCV)
- Filtro por cor (se possível) ou por contraste
- Associação de linhas com símbolos (proximidade)

### 4. Detecção de Círculos de Cancelamento
**Desafio:** Distinguir círculos de cancelamento dos círculos do crivo
- Círculos de cancelamento são **ao redor de marcas**
- Círculos do crivo são **sobre símbolos corretos**
- Pode haver sobreposição

**Solução Proposta:**
- Detectar círculos menores (cancelamento)
- Verificar se há marca dentro do círculo
- Se sim, é cancelamento (não conta como erro)

### 5. Contagem de Acertos
**Lógica:**
```
Para cada símbolo:
  Se (marca presente E símbolo está dentro de círculo do crivo E sem círculo de cancelamento):
    acertos++
```

### 6. Contagem de Erros
**Lógica:**
```
Para cada símbolo:
  Se (marca presente E símbolo NÃO está dentro de círculo do crivo E sem círculo de cancelamento):
    erros++
  OU (se configuração permitir):
  Se (marca presente E círculo de cancelamento presente):
    erros++ (caso especial mencionado na imagem)
```

### 7. Contagem de Omissões
**Lógica:**
```
Encontrar última marca do examinando (última linha vertical)
Para cada símbolo até a última marca:
  Se (símbolo está dentro de círculo do crivo E marca ausente):
    omissoes++
```

### 8. Integração com Tabelas Normativas
**Desafio:** Selecionar tabela correta e calcular percentil
- Múltiplas tabelas (6 regiões × 4 níveis de escolaridade)
- Interpolação se necessário
- Classificação baseada em percentil

**Solução Proposta:**
- Criar estrutura de dados com todas as tabelas
- Seleção automática baseada em região/escolaridade
- Busca binária ou interpolação linear para percentil

---

## 💻 ARQUITETURA PROPOSTA

### 1. Entrada de Dados Manual
```
Interface:
- Campo: Acertos (A)
- Campo: Erros (E)
- Campo: Omissões (O)
- Botão: Calcular

Cálculo:
- P = A - (E + O)
- Buscar percentil na tabela selecionada
- Exibir classificação
```

### 2. Processamento de Imagem
```
Fluxo:
1. Upload de imagem do teste preenchido
2. Upload de imagem do crivo (opcional, pode ser pré-carregado)
3. Pré-processamento:
   - Correção de perspectiva
   - Ajuste de brilho/contraste
   - Binarização
4. Detecção:
   - Símbolos (posições e orientações)
   - Círculos do crivo
   - Marcas do examinando
   - Círculos de cancelamento
5. Análise:
   - Comparação de posições
   - Contagem (A, E, O)
6. Cálculo:
   - P = A - (E + O)
   - Percentil e classificação
7. Exibição:
   - Resultados
   - Imagem anotada com acertos/erros/omissões destacados
```

### 3. Estrutura de Dados

```javascript
// Resultado do processamento
{
  acertos: 147,
  erros: 1,
  omissoes: 0,
  pontos: 146,
  percentil: 95,
  classificacao: "Superior",
  tabela_utilizada: "Sudeste - Ensino Superior",
  detalhes: {
    acertos_posicoes: [[linha, coluna], ...],
    erros_posicoes: [[linha, coluna], ...],
    omissoes_posicoes: [[linha, coluna], ...]
  }
}
```

---

## 📚 TABELAS NORMATIVAS

### Estrutura
- 6 tabelas por região (Sul, Sudeste, Centro-Oeste, Nordeste, Norte, Geral)
- Cada tabela tem 4 colunas (Fundamental, Médio, Superior, Total)
- Percentis: 1, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 99

### Armazenamento
- Banco de dados: `tabelas_normativas` e `normas_ac`
- Ou estrutura JSON para facilitar busca

---

## 🎯 PRÓXIMOS PASSOS

1. **Implementar entrada manual** (prioridade alta)
2. **Criar estrutura de processamento de imagem** (prioridade média)
3. **Implementar detecção básica** (OpenCV)
4. **Integrar com tabelas normativas**
5. **Testar com imagens reais**
6. **Refinar algoritmos de detecção**

---

**Última atualização:** 03 de Novembro de 2025

