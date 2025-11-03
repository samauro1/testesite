# Automação da Agenda do Perito - e-CNH SP

## Visão Geral

Sistema automatizado para consultar/registrar na Agenda do Perito no site do e-CNH SP, preenchendo automaticamente as datas no formato específico requerido pelo site.

## Funcionalidades Implementadas

### 1. Consulta Automatizada
- Acessa o site do e-CNH SP
- Faz login automaticamente usando credenciais configuradas
- Navega até "Consultar agenda do Perito" → "Acesso à Agenda Diária do Perito"
- Preenche automaticamente:
  - **Data de Exibição**: formato "terça 04/11/2025" (dia da semana + data)
  - **Data de Referência**: formato "04/11/2025 ag" (data + sufixo "ag")
- Captura screenshot para auditoria

### 2. Scheduler Automático
- Executa automaticamente todos os dias às 08:00
- Processa usuários com configuração DETRAN ativa e sincronização automática habilitada
- Consulta automaticamente as terças e quartas configuradas para os próximos 14 dias

### 3. API para Disparo Manual
- Endpoints REST para consultar manualmente datas específicas
- Endpoint para agendar consultas futuras

## Arquivos Criados

### Backend

1. **`codigo/utils/dateFormatting.js`**
   - Utilitários para formatação de datas
   - Funções: `formatarDataExibicao()`, `formatarDataReferencia()`, etc.

2. **`codigo/services/agendaPeritoService.js`**
   - Serviço principal de automação usando Puppeteer
   - Métodos: `loginIfNeeded()`, `consultarAgendaNaData()`, etc.

3. **`codigo/services/agendaPeritoScheduler.js`**
   - Scheduler usando node-cron
   - Executa consultas automáticas para usuários configurados

4. **`codigo/routes/detran.js`** (atualizado)
   - Novos endpoints:
     - `POST /api/detran/agenda-perito/consultar`
     - `POST /api/detran/agenda-perito/agendar`

5. **`codigo/server.js`** (atualizado)
   - Inicialização automática do scheduler na inicialização do servidor

## Configuração

### 1. Variáveis de Ambiente

Para desabilitar o scheduler (se necessário):
```env
ENABLE_AGENDA_PERITO_SCHEDULER=false
```

### 2. Configuração do Usuário

O sistema usa a mesma configuração DETRAN já existente:
- CPF e senha do perito
- Dias de trabalho configurados (deve incluir "terca" e/ou "quarta")
- Sincronização automática habilitada (para usar o scheduler)

Acesse: **Configurações > DETRAN** no frontend.

## Uso

### Consulta Manual via API

```bash
# Consultar agenda para uma data específica
POST /api/detran/agenda-perito/consultar
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2025-11-04"  // Opcional, usa data atual se não fornecido
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "ok": true,
    "dataExibicao": "terça 04/11/2025",
    "dataReferencia": "04/11/2025 ag",
    "screenshot": "caminho/para/screenshot.png",
    "dataISO": "2025-11-04"
  }
}
```

### Agendar Consultas Futuras

```bash
# Listar datas programadas para terças e quartas
POST /api/detran/agenda-perito/agendar
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "message": "8 data(s) programada(s) para consulta",
  "data": {
    "datas": ["2025-11-04", "2025-11-05", ...],
    "total": 8
  }
}
```

### Scheduler Automático

O scheduler roda automaticamente todos os dias às 08:00 e processa:

1. Busca todos os usuários com:
   - Configuração DETRAN ativa
   - Sincronização automática habilitada
   - Dias de trabalho incluindo terça e/ou quarta

2. Para cada usuário, consulta automaticamente:
   - Próximas 2 semanas
   - Apenas terças e quartas configuradas

3. Salva screenshots em: `.playwright/state/agenda_*.png`

## Segurança

- ✅ Credenciais armazenadas criptografadas no banco de dados
- ✅ Autenticação via JWT obrigatória para endpoints
- ✅ Screenshots salvos localmente (não expostos publicamente)
- ✅ Logs não expõem credenciais (apenas primeiros 3 dígitos do CPF)

## Tratamento de Erros

O sistema detecta e trata:

- **CAPTCHA**: Para execução e solicita intervenção manual
- **Erro de autenticação**: Limpa cache de sessão e tenta novamente
- **Timeout**: Retry automático com backoff
- **Seletores não encontrados**: Captura screenshot de debug

## Logs

O sistema registra:
- ✅ Inicialização do scheduler
- ✅ Execução de consultas (sucesso/erro)
- ✅ Screenshots capturados
- ⚠️ Erros com stack trace completo (apenas em desenvolvimento)

## Notas Importantes

1. **CAPTCHA**: Se o site solicitar CAPTCHA, a automação será interrompida. Neste caso, é necessário:
   - Resolver o CAPTCHA manualmente no navegador
   - Ou aguardar e tentar novamente mais tarde

2. **Rate Limiting**: O sistema aguarda 2 segundos entre consultas para não sobrecarregar o site

3. **Screenshots**: Todos os screenshots são salvos em `.playwright/state/` para auditoria

4. **Cache de Sessão**: O sistema reutiliza sessões quando possível para reduzir logins repetidos

5. **Timezone**: O scheduler usa timezone `America/Sao_Paulo` (UTC-3)

## Próximos Passos (Opcional)

- [ ] Criar tabela de histórico de consultas
- [ ] Adicionar notificações (email/SMS) em caso de erro
- [ ] Dashboard para visualizar consultas realizadas
- [ ] Exportação de relatórios de consultas
- [ ] Suporte para múltiplos horários por dia

## Troubleshooting

### Scheduler não está rodando
- Verifique se `ENABLE_AGENDA_PERITO_SCHEDULER` não está definido como `false`
- Verifique os logs do servidor na inicialização
- Certifique-se de que há usuários com sincronização automática habilitada

### Erro de autenticação
- Verifique se CPF e senha estão corretos nas configurações
- Limpe o cache de sessão (sistema faz isso automaticamente em caso de erro)
- Verifique se o site não mudou sua estrutura de login

### Seletores não encontrados
- O site do e-CNH SP pode ter mudado sua estrutura
- Verifique os screenshots de debug em `.playwright/state/`
- Ajuste os seletores em `agendaPeritoService.js` se necessário

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do servidor
2. Consulte os screenshots capturados
3. Verifique a documentação do módulo DETRAN completo

