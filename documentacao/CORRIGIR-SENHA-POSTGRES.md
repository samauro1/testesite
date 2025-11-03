# 🔧 Como Corrigir a Senha do PostgreSQL

## Problema
Erro: `autenticação do tipo senha falhou para o usuário "postgres"`

## Soluções

### Opção 1: Descobrir/Alterar a Senha (Recomendado)

#### No Windows, abra o Prompt de Comando ou PowerShell como Administrador:

1. **Parar o serviço PostgreSQL** (se necessário):
```cmd
net stop postgresql-x64-17
```

2. **Iniciar o PostgreSQL em modo de recuperação**:
```cmd
cd "C:\Program Files\PostgreSQL\17\bin"
pg_ctl.exe -D "C:\Program Files\PostgreSQL\17\data" -o "-p 5432" start
```

3. **Conectar sem senha e alterar a senha**:
```cmd
psql.exe -U postgres
```

Dentro do psql, execute:
```sql
ALTER USER postgres PASSWORD 'diogo';
\q
```

4. **Reiniciar o serviço normalmente**:
```cmd
net start postgresql-x64-17
```

### Opção 2: Editar o arquivo .env com a senha correta

1. Abra o arquivo: `E:\sistema\codigo\.env`

2. Localize a linha:
```
DB_PASSWORD=diogo
```

3. Altere para a senha correta do seu PostgreSQL:
```
DB_PASSWORD=SUA_SENHA_AQUI
```

4. Salve o arquivo

5. **Reinicie o backend** para aplicar as mudanças

### Opção 3: Criar um novo usuário no PostgreSQL

Se você não souber a senha do postgres, pode criar um novo usuário:

1. Conecte ao PostgreSQL (como administrador do sistema):
```cmd
psql.exe -U postgres
```

2. Crie um novo usuário:
```sql
CREATE USER sistema_user WITH PASSWORD 'nova_senha_segura';
ALTER USER sistema_user CREATEDB;
\q
```

3. Atualize o `.env`:
```
DB_USER=sistema_user
DB_PASSWORD=nova_senha_segura
```

### Opção 4: Verificar a senha atual

Se você esqueceu a senha, tente:

1. Verificar no arquivo de configuração do PostgreSQL:
   - Localização: `C:\Program Files\PostgreSQL\17\data\pg_hba.conf`
   - Procure por configurações de autenticação

2. Ou use o pgAdmin (se estiver instalado) para alterar a senha pela interface gráfica

## Testar a Correção

Depois de corrigir, execute:

```powershell
cd E:\sistema\codigo
node scripts/test-db-connection-simple.js
```

Se aparecer "✅ CONEXÃO COM BANCO DE DADOS OK!", está funcionando!

## Reiniciar o Backend

Após corrigir a senha, reinicie o backend:

```powershell
cd E:\sistema\codigo
npm start
```

---

**💡 Dica**: Se você não souber a senha, a forma mais fácil é usar a Opção 1 para resetar a senha do usuário postgres.

