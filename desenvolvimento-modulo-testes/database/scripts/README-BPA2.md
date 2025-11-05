# Scripts de População das Tabelas Normativas do BPA-2

## Estrutura

Este diretório contém scripts para popular as tabelas normativas do BPA-2 conforme manual fornecido.

## Arquivos

- `06-popular-tabelas-bpa2.js` - Script base com estrutura e funções auxiliares
- `06-popular-tabelas-bpa2-completo.js` - Script completo com exemplos das tabelas 41 e 42

## Tabelas do Manual a serem Populadas

### Brasil
- **Tabela 41**: AA por Idade/Faixa Etária ✅ (exemplo completo)
- **Tabela 42**: AA por Escolaridade ✅ (exemplo completo)
- **Tabela 43**: AC por Idade/Faixa Etária ⏳
- **Tabela 44**: AC por Escolaridade ⏳
- **Tabela 45**: AD por Idade/Faixa Etária ⏳
- **Tabela 46**: AD por Escolaridade ⏳
- **Tabela 47**: Atenção Geral por Idade/Faixa Etária ⏳
- **Tabela 48**: Atenção Geral por Escolaridade ⏳

### Região Sudeste
- **Tabela 73**: AA por Idade/Faixa Etária ⏳
- **Tabela 74**: AA por Escolaridade ⏳
- **Tabela 75**: AC por Idade/Faixa Etária ⏳
- **Tabela 76**: AC por Escolaridade ⏳
- **Tabela 77**: AD por Idade/Faixa Etária ⏳
- **Tabela 78**: AD por Escolaridade ⏳
- **Tabela 79**: Atenção Geral por Idade/Faixa Etária ⏳
- **Tabela 80**: Atenção Geral por Escolaridade ⏳

### Estado de São Paulo
- **Tabela 281**: AA por Idade/Faixa Etária ⏳
- **Tabela 282**: AA por Escolaridade ⏳
- **Tabela 283**: AC por Idade/Faixa Etária ⏳
- **Tabela 284**: AC por Escolaridade ⏳
- **Tabela 285**: AD por Idade/Faixa Etária ⏳
- **Tabela 286**: AD por Escolaridade ⏳
- **Tabela 287**: Atenção Geral por Idade/Faixa Etária ⏳
- **Tabela 288**: Atenção Geral por Escolaridade ⏳

## Como Usar

### Executar o script completo:

```bash
cd database/scripts
node 06-popular-tabelas-bpa2-completo.js
```

### Estrutura de Dados

Cada tabela deve seguir este formato:

```javascript
const dadosTabela = [
  {
    classificacao: 'Muito inferior',
    percentil: 1,
    valores: {
      '6 anos': -20,
      '7 anos': -16,
      // ... outras idades
      'Amostra Total': 9
    }
  },
  // ... mais linhas
];
```

Para tabelas por escolaridade:

```javascript
const dadosTabela = [
  {
    classificacao: 'Muito inferior',
    percentil: 1,
    valores: {
      'Não alfabetizado': -25,
      'Ensino Fundamental': -1,
      'Ensino Médio/Técnico/Profissionalizante': 18,
      'Ensino Superior e/ou Pós-Graduação': 21
    }
  },
  // ... mais linhas
];
```

## Como Expandir

Para adicionar mais tabelas, siga o padrão das tabelas 41 e 42:

1. Criar a tabela normativa com `criarTabelaNormativa()`
2. Definir os dados no formato mostrado acima
3. Chamar `processarTabelaCompleta()` para tabelas por idade
4. Chamar `processarTabelaPorEscolaridade()` para tabelas por escolaridade

## Estrutura do Banco de Dados

As normas são armazenadas na tabela `normas_bpa2` com:
- `tabela_id`: ID da tabela normativa
- `tipo_atencao`: 'Alternada', 'Concentrada', 'Dividida', ou 'Geral'
- `pontos_min`: Pontuação mínima da faixa
- `pontos_max`: Pontuação máxima da faixa
- `percentil`: Percentil correspondente
- `classificacao`: Classificação normativa

## Notas

- As faixas de pontos são criadas automaticamente baseadas nos percentis consecutivos
- Valores negativos são permitidos (representam desempenho muito baixo)
- O script usa `ON CONFLICT` para evitar duplicatas


