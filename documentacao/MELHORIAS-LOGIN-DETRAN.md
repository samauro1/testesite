# Melhorias no Login do DETRAN - Resolução de Erro 500

## 🎯 Problema Resolvido

O erro 500 durante o login no DETRAN estava sendo causado por:
- Seletores quebrados (estrutura HTML mudou)
- Falta de detecção de CAPTCHA
- Ausência de tratamento de iframes
- Erros mapeados incorretamente (tudo retornava 500)

## ✅ Melhorias Implementadas

### 1. **Sistema de Fallback de Seletores**
- Múltiplas estratégias para encontrar campos (label, name, id, placeholder, tipo)
- Função `pickSelector()` que tenta candidatos em ordem até encontrar um válido
- Logs informam qual seletor foi usado (facilita debug)

### 2. **Detecção de CAPTCHA**
- Verifica se há reCAPTCHA antes de tentar fazer login
- Retorna erro 409 (Conflict) quando CAPTCHA é detectado
- Mensagem clara: "CAPTCHA detectado. É necessária intervenção manual."

### 3. **Suporte a Iframes**
- Detecta se formulário de login está em iframe
- Busca campos dentro do iframe automaticamente
- Transparente para o código principal

### 4. **Aceitar Cookies**
- Detecta e clica automaticamente em botões "Aceitar" cookies
- Evita bloqueios iniciais

### 5. **Verificação Robusta de Login Bem-Sucedido**
- Verifica URL (não deve conter 'login', 'entrar', 'auth')
- Busca elementos de área logada ("Sair", "Logout")
- Aguarda SPA carregar (verifica novamente após delay)

### 6. **Captura de Artefatos de Debug**
- Screenshots automáticos em caso de erro
- HTML completo da página salvo
- Informações estruturadas (inputs, buttons, iframes) em JSON
- Arquivos salvos em `codigo/artifacts/`

### 7. **Mapeamento de Erros para Status HTTP**
- **401 Unauthorized**: Credenciais inválidas
- **409 Conflict**: CAPTCHA detectado
- **422 Unprocessable Entity**: Estrutura da página mudou (seletores)
- **504 Gateway Timeout**: Timeout
- **503 Service Unavailable**: Erro de rede
- **500 Internal Server Error**: Erro genérico

### 8. **Detecção de Mensagens de Erro**
- Extrai mensagens de erro do formulário (.error, .alert-danger, etc.)
- Retorna mensagem específica quando credenciais estão erradas

## 📁 Arquivos Criados/Modificados

### Novos Utilitários:
- `codigo/utils/detranArtifacts.js` - Captura screenshots e HTML
- `codigo/utils/detranErrorTypes.js` - Classes de erro tipadas

### Modificados:
- `codigo/services/detranScraper.js` - Login robusto com todas as melhorias
- `codigo/routes/detran.js` - Mapeamento de erros para status HTTP correto

## 🔍 Como Usar

### Debug em Caso de Erro

1. **Verificar Artefatos Gerados**
   ```
   codigo/artifacts/
   ├── login-cpf-not-found-[timestamp].png
   ├── login-cpf-not-found-[timestamp].html
   ├── login-cpf-not-found-[timestamp].json
   └── ...
   ```

2. **Verificar Logs do Backend**
   - Logs mostram qual seletor foi usado
   - Logs mostram se CAPTCHA foi detectado
   - Logs mostram se iframe foi encontrado

3. **Verificar Status HTTP no Frontend**
   - 401 → Credenciais inválidas
   - 409 → CAPTCHA detectado
   - 422 → Estrutura mudou (verificar screenshots)
   - 504 → Timeout (aumentar timeout se necessário)

## 🛠️ Próximos Passos (Se Ainda Houver Problemas)

### Se CAPTCHA Aparecer:
1. Implementar solver (2captcha, anticaptcha)
2. OU criar fluxo manual assistido (usuário resolve no navegador)

### Se Seletores Mudarem:
1. Verificar screenshots em `codigo/artifacts/`
2. Identificar novos seletores
3. Adicionar aos arrays de candidatos em `detranScraper.js`

### Para Aumentar Robustez:
1. Configurar seletores por UF/ambiente (JSON)
2. Healthcheck de seletores antes de sincronizar
3. Notificações quando estrutura mudar

## 📊 Exemplo de Resposta de Erro

**Antes (500 genérico):**
```json
{
  "error": "Erro ao sincronizar agendamentos do DETRAN"
}
```

**Agora (erro tipado):**
```json
{
  "success": false,
  "error": "CAPTCHA detectado no login do DETRAN. É necessária intervenção manual.",
  "tipo": "captcha",
  "detalhes": {
    "message": "...",
    "stack": "...",
    "tipo": "DetranCaptchaError"
  }
}
```

**Frontend pode tratar especificamente:**
```typescript
if (error.response?.status === 409 && error.response?.data?.tipo === 'captcha') {
  toast.warn('CAPTCHA detectado. É necessária intervenção manual.');
} else if (error.response?.status === 422) {
  toast.error('Estrutura do site mudou. Verifique os logs e screenshots.');
} else if (error.response?.status === 401) {
  toast.error('Credenciais inválidas.');
}
```

## ✅ Checklist de Teste

- [ ] Login funciona com estrutura atual
- [ ] Erro 401 quando credenciais inválidas
- [ ] Erro 409 quando CAPTCHA aparece
- [ ] Screenshots gerados em caso de erro
- [ ] Logs informativos sobre seletores usados
- [ ] Iframe detectado se presente
- [ ] Cookies aceitos automaticamente

---

**Última Atualização:** 04/11/2025  
**Versão:** 2.0

