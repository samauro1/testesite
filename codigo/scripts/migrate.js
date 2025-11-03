const { query } = require('../config/database');

const migrations = [
  // Tabela de usuários
  `CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Tabela de pacientes
  `CREATE TABLE IF NOT EXISTS pacientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    idade INTEGER NOT NULL,
    escolaridade VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Tabela de avaliações
  `CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    numero_laudo VARCHAR(20) UNIQUE NOT NULL,
    data_aplicacao DATE NOT NULL,
    aplicacao VARCHAR(20) NOT NULL,
    tipo_habilitacao VARCHAR(50) NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Tabelas normativas
  `CREATE TABLE IF NOT EXISTS tabelas_normativas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    versao VARCHAR(20) DEFAULT '1.0',
    criterio VARCHAR(50),
    descricao TEXT,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Normas AC
  `CREATE TABLE IF NOT EXISTS normas_ac (
    id SERIAL PRIMARY KEY,
    tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
    classificacao VARCHAR(50) NOT NULL,
    percentil INTEGER NOT NULL,
    fundamental_min INTEGER NOT NULL,
    fundamental_max INTEGER NOT NULL,
    medio_min INTEGER NOT NULL,
    medio_max INTEGER NOT NULL,
    superior_min INTEGER NOT NULL,
    superior_max INTEGER NOT NULL
  )`,

  // Normas BETA-III
  `CREATE TABLE IF NOT EXISTS normas_beta_iii (
    id SERIAL PRIMARY KEY,
    tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
    acertos_min INTEGER NOT NULL,
    acertos_max INTEGER NOT NULL,
    percentil INTEGER NOT NULL,
    classificacao VARCHAR(50) NOT NULL
  )`,

  // Normas BPA-2
  `CREATE TABLE IF NOT EXISTS normas_bpa2 (
    id SERIAL PRIMARY KEY,
    tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
    tipo_atencao VARCHAR(20) NOT NULL,
    criterio VARCHAR(20) NOT NULL,
    valor_criterio VARCHAR(50) NOT NULL,
    pontos_min INTEGER NOT NULL,
    pontos_max INTEGER NOT NULL,
    percentil INTEGER NOT NULL,
    classificacao VARCHAR(50) NOT NULL
  )`,

  // Normas Rotas
  `CREATE TABLE IF NOT EXISTS normas_rotas (
    id SERIAL PRIMARY KEY,
    tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
    rota_tipo VARCHAR(10) NOT NULL,
    pontos_min INTEGER NOT NULL,
    pontos_max INTEGER NOT NULL,
    percentil INTEGER NOT NULL,
    classificacao VARCHAR(50) NOT NULL
  )`,

  // Normas MIG
  `CREATE TABLE IF NOT EXISTS normas_mig (
    id SERIAL PRIMARY KEY,
    tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
    tipo_avaliacao VARCHAR(50) NOT NULL,
    acertos_min INTEGER NOT NULL,
    acertos_max INTEGER NOT NULL,
    percentil INTEGER NOT NULL,
    classificacao VARCHAR(50) NOT NULL
  )`,

  // Normas MVT
  `CREATE TABLE IF NOT EXISTS normas_mvt (
    id SERIAL PRIMARY KEY,
    tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
    tipo_cnh VARCHAR(50) NOT NULL,
    resultado_min DECIMAL(10,2) NOT NULL,
    resultado_max DECIMAL(10,2) NOT NULL,
    percentil INTEGER NOT NULL,
    classificacao VARCHAR(50) NOT NULL
  )`,

  // Normas R-1
  `CREATE TABLE IF NOT EXISTS normas_r1 (
    id SERIAL PRIMARY KEY,
    tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
    escolaridade VARCHAR(50) NOT NULL,
    acertos_min INTEGER NOT NULL,
    acertos_max INTEGER NOT NULL,
    percentil INTEGER NOT NULL,
    classificacao VARCHAR(50) NOT NULL
  )`,

  // Normas Memore
  `CREATE TABLE IF NOT EXISTS normas_memore (
    id SERIAL PRIMARY KEY,
    tabela_id INTEGER REFERENCES tabelas_normativas(id) ON DELETE CASCADE,
    resultado_min INTEGER NOT NULL,
    resultado_max INTEGER NOT NULL,
    percentil INTEGER NOT NULL,
    classificacao VARCHAR(50) NOT NULL
  )`,

  // Tabelas de resultados
  `CREATE TABLE IF NOT EXISTS resultados_palografico (
    id SERIAL PRIMARY KEY,
    avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
    produtividade INTEGER,
    nor DECIMAL(10,2),
    distancia_media DECIMAL(10,2),
    media_tamanho_palos DECIMAL(10,2),
    impulsividade DECIMAL(10,2),
    media_distancia_linhas DECIMAL(10,2),
    media_margem_esquerda DECIMAL(10,2),
    media_margem_direita DECIMAL(10,2),
    media_margem_superior DECIMAL(10,2),
    porcentagem_ganchos DECIMAL(10,2),
    media_inclinacao DECIMAL(10,2),
    media_direcao_linhas DECIMAL(10,2),
    total_emotividade INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS resultados_ac (
    id SERIAL PRIMARY KEY,
    avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
    acertos INTEGER NOT NULL,
    erros INTEGER NOT NULL,
    omissoes INTEGER NOT NULL,
    pb INTEGER NOT NULL,
    percentil INTEGER,
    classificacao VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS resultados_beta_iii (
    id SERIAL PRIMARY KEY,
    avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
    acertos INTEGER NOT NULL,
    erros INTEGER NOT NULL,
    omissao INTEGER NOT NULL,
    resultado_final DECIMAL(10,2) NOT NULL,
    percentil INTEGER,
    classificacao VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS resultados_bpa2 (
    id SERIAL PRIMARY KEY,
    avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
    tipo_atencao VARCHAR(20) NOT NULL,
    acertos INTEGER NOT NULL,
    erros INTEGER NOT NULL,
    omissoes INTEGER NOT NULL,
    pontos INTEGER NOT NULL,
    percentil INTEGER,
    classificacao VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS resultados_rotas (
    id SERIAL PRIMARY KEY,
    avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
    rota_tipo VARCHAR(10) NOT NULL,
    acertos INTEGER NOT NULL,
    erros INTEGER NOT NULL,
    omissoes INTEGER NOT NULL,
    pb INTEGER NOT NULL,
    percentil INTEGER,
    classificacao VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS resultados_mig (
    id SERIAL PRIMARY KEY,
    avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
    tipo_avaliacao VARCHAR(50) NOT NULL,
    acertos INTEGER NOT NULL,
    percentil INTEGER,
    classificacao VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS resultados_mvt (
    id SERIAL PRIMARY KEY,
    avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
    acertos INTEGER NOT NULL,
    erros INTEGER NOT NULL,
    omissao INTEGER NOT NULL,
    resultado_final DECIMAL(10,2) NOT NULL,
    percentil INTEGER,
    classificacao VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS resultados_r1 (
    id SERIAL PRIMARY KEY,
    avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
    acertos INTEGER NOT NULL,
    percentil INTEGER,
    classificacao VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS resultados_memore (
    id SERIAL PRIMARY KEY,
    avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
    vp INTEGER NOT NULL,
    vn INTEGER NOT NULL,
    fn INTEGER NOT NULL,
    fp INTEGER NOT NULL,
    resultado_final INTEGER NOT NULL,
    percentil INTEGER,
    classificacao VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Controle de estoque
  `CREATE TABLE IF NOT EXISTS testes_estoque (
    id SERIAL PRIMARY KEY,
    nome_teste VARCHAR(100) NOT NULL,
    quantidade_atual INTEGER DEFAULT 0,
    quantidade_minima INTEGER DEFAULT 50,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id SERIAL PRIMARY KEY,
    teste_id INTEGER REFERENCES testes_estoque(id) ON DELETE CASCADE,
    tipo_movimentacao VARCHAR(20) NOT NULL,
    quantidade INTEGER NOT NULL,
    observacoes TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Índices para performance
  `CREATE INDEX IF NOT EXISTS idx_avaliacoes_paciente_id ON avaliacoes(paciente_id)`,
  `CREATE INDEX IF NOT EXISTS idx_avaliacoes_usuario_id ON avaliacoes(usuario_id)`,
  `CREATE INDEX IF NOT EXISTS idx_avaliacoes_numero_laudo ON avaliacoes(numero_laudo)`,
  `CREATE INDEX IF NOT EXISTS idx_pacientes_cpf ON pacientes(cpf)`,
  `CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)`,
  `CREATE INDEX IF NOT EXISTS idx_movimentacoes_teste_id ON movimentacoes_estoque(teste_id)`,
  `CREATE INDEX IF NOT EXISTS idx_movimentacoes_usuario_id ON movimentacoes_estoque(usuario_id)`
  ,
  // Tabela de relatórios
  `CREATE TABLE IF NOT EXISTS relatorios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_relatorio VARCHAR(50) NOT NULL,
    dados_relatorio JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Adicionar colunas à tabela tabelas_normativas se não existirem
  `ALTER TABLE tabelas_normativas ADD COLUMN IF NOT EXISTS criterio VARCHAR(50)`,
  `ALTER TABLE tabelas_normativas ADD COLUMN IF NOT EXISTS descricao TEXT`,

  // Remover índice único do tipo para permitir múltiplas tabelas do mesmo tipo
  `DROP INDEX IF EXISTS uq_tabelas_normativas_tipo_idx`,
  
  // Índices únicos para suportar ON CONFLICT no seed (compatível com PG 13)
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_tabelas_normativas_nome_idx ON tabelas_normativas(nome)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_testes_estoque_nome_idx ON testes_estoque(nome_teste)`
];

async function runMigrations() {
  console.log('🔄 Iniciando migrações do banco de dados...');
  
  try {
    for (let i = 0; i < migrations.length; i++) {
      console.log(`Executando migração ${i + 1}/${migrations.length}...`);
      await query(migrations[i]);
    }
    
    console.log('✅ Migrações concluídas com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante as migrações:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations().then(() => {
    console.log('🎉 Banco de dados configurado!');
    process.exit(0);
  });
}

module.exports = { runMigrations };