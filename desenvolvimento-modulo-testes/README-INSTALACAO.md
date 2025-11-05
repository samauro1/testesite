# Guia de Instalação e Configuração - Módulo de Testes

## 📋 Pré-requisitos

- Node.js 16+ instalado
- PostgreSQL instalado e rodando
- Banco de dados criado (ou usar o banco principal)

## 🚀 Instalação

### 1. Instalar Dependências

```bash
cd desenvolvimento-modulo-testes/backend
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME_TESTES=seu_banco
DB_USER=postgres
DB_PASSWORD=sua_senha

# OpenAI (Opcional - para análise de imagens)
OPENAI_API_KEY=sua_chave_aqui

PORT=3002
NODE_ENV=development
```

### 3. Criar Tabelas do Banco de Dados

Execute os scripts SQL na ordem:

```bash
# 1. Tabelas básicas
psql -d seu_banco -f database/schemas/01-create-tables.sql

# 2. Tabelas normativas AC
psql -d seu_banco -f database/schemas/02-create-tabelas-normativas-ac.sql

# 3. Tabelas Palográfico
psql -d seu_banco -f database/schemas/03-palografico-tables.sql

# 4. Tabelas Atenção
psql -d seu_banco -f database/schemas/04-atencao-tables.sql

# 5. Tabelas Memória
psql -d seu_banco -f database/schemas/05-memoria-tables.sql

# 6. Tabelas de Resultados e Imagens
psql -d seu_banco -f database/schemas/06-test-results.sql

# 7. Tabelas de Laudos
psql -d seu_banco -f database/schemas/07-laudos.sql
```

### 4. Popular Tabelas Normativas

Acesse `http://localhost:3002` e clique nos botões para popular:

- 📊 AC
- ✍️ Palográfico
- 🧠 Memória
- 🗄️ Todas (popula todas de uma vez)

Ou via API:

```bash
# Popular AC
curl -X POST http://localhost:3002/api/admin/popular-tabelas-ac

# Popular Palográfico
curl -X POST http://localhost:3002/api/admin/popular-tabelas-palografico

# Popular Memória
curl -X POST http://localhost:3002/api/admin/popular-tabelas-memoria

# Popular todas
curl -X POST http://localhost:3002/api/admin/popular-todas-tabelas
```

## ▶️ Iniciar Servidor

```bash
cd desenvolvimento-modulo-testes/backend
npm start
```

Ou em modo desenvolvimento (com nodemon):

```bash
npm run dev
```

O servidor estará disponível em: `http://localhost:3002`

## 📱 Acessar Interface

- **Página Principal**: `http://localhost:3002`
- **Interface Completa de Testes**: `http://localhost:3002/testes.html`

## 🔧 Funcionalidades Implementadas

### ✅ Análise de Imagens
- OCR com Tesseract.js (português)
- Análise visual com OpenAI Vision (opcional)
- Extração automática de dados
- Preenchimento automático de formulários

### ✅ Geração de Documentos
- PDF com PDFKit (laudos completos)
- Word com docx (laudos completos)
- Templates profissionais (máx 2 páginas)

### ✅ Testes Disponíveis
- **AC (Atenção Concentrada)**: Acertos, Erros, Omissões
- **Palográfico**: Produtividade, NOR, Tamanho, Distância
- **Memória**: Evocação, Retenção, Reconhecimento

### ✅ Tabelas Normativas
- AC: Regiões (Sul, Sudeste, Centro-Oeste, etc.)
- Palográfico: Por região, sexo e escolaridade
- Memória: Por região e escolaridade

## 📚 Endpoints da API

### Testes
- `POST /api/ac/calcular` - Calcular resultado AC
- `POST /api/palografico/calcular` - Calcular Palográfico
- `POST /api/memoria/calcular` - Calcular Memória

### Análise de Imagens
- `POST /api/imagem/analisar` - Upload de imagem (multipart)
- `POST /api/imagem/analisar-base64` - Imagem em base64

### Laudos
- `POST /api/laudos/gerar` - Gerar laudo
- `GET /api/laudos/listar/:paciente_id` - Listar laudos

### Admin
- `POST /api/admin/popular-tabelas-ac` - Popular AC
- `POST /api/admin/popular-tabelas-palografico` - Popular Palográfico
- `POST /api/admin/popular-tabelas-memoria` - Popular Memória
- `POST /api/admin/popular-todas-tabelas` - Popular todas

## 🔑 Configuração OpenAI (Opcional)

Para usar análise de imagens com IA:

1. Obtenha uma chave da API OpenAI em: https://platform.openai.com/api-keys
2. Adicione no arquivo `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```
3. Reinicie o servidor

**Nota**: Sem a chave OpenAI, o sistema funcionará apenas com OCR (Tesseract.js).

## 🐛 Solução de Problemas

### Erro ao conectar no banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no `.env`
- Teste a conexão: `psql -h localhost -U postgres -d seu_banco`

### Erro ao instalar dependências
- Use Node.js 16 ou superior
- Limpe o cache: `npm cache clean --force`
- Tente novamente: `npm install`

### Tesseract não funciona
- Tesseract.js funciona no navegador e Node.js
- Primeira execução pode demorar (baixa modelos de idioma)
- Verifique logs do servidor

## 📞 Suporte

Para problemas ou dúvidas, consulte os logs do servidor:
```bash
# Em desenvolvimento, os logs aparecem no console
# Procure por erros com prefixo ❌
```

