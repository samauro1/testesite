require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sistema_avaliacao_psicologica',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function documentarBanco() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Documentando estrutura do banco de dados...\n');
    
    // Data atual
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaFormatada = dataAtual.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    
    // Criar pasta de backup se não existir
    const backupDir = path.join('E:', 'backup', dataFormatada);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Nome do arquivo
    const nomeArquivo = `estrutura-banco-dados_${dataFormatada}_${horaFormatada}.md`;
    const caminhoArquivo = path.join(backupDir, nomeArquivo);
    
    let documentacao = `# Estrutura do Banco de Dados - Sistema de Avaliação Psicológica\n\n`;
    documentacao += `**Data da Documentação:** ${dataAtual.toLocaleString('pt-BR')}\n`;
    documentacao += `**Banco de Dados:** ${process.env.DB_NAME || 'sistema_avaliacao_psicologica'}\n`;
    documentacao += `**Host:** ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}\n\n`;
    documentacao += `---\n\n`;
    
    // 1. Listar todas as tabelas
    console.log('📋 Listando tabelas...');
    const tabelasResult = await client.query(`
      SELECT 
        schemaname,
        tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const tabelas = tabelasResult.rows;
    documentacao += `## Tabelas do Sistema (${tabelas.length} tabelas)\n\n`;
    
    // 2. Para cada tabela, obter estrutura completa
    for (const tabela of tabelas) {
      const nomeTabela = tabela.tablename;
      console.log(`  📄 Documentando tabela: ${nomeTabela}...`);
      
      documentacao += `### ${nomeTabela}\n\n`;
      
      // Obter colunas
      const colunasResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position
      `, [nomeTabela]);
      
      documentacao += `#### Colunas\n\n`;
      documentacao += `| Nome | Tipo | Tamanho | Nullable | Default |\n`;
      documentacao += `|------|------|---------|----------|----------|\n`;
      
      for (const coluna of colunasResult.rows) {
        let tipo = coluna.data_type.toUpperCase();
        
        // Ajustar tipo para mostrar tamanho/precisão
        if (coluna.character_maximum_length) {
          tipo += `(${coluna.character_maximum_length})`;
        } else if (coluna.numeric_precision && coluna.numeric_scale) {
          tipo += `(${coluna.numeric_precision},${coluna.numeric_scale})`;
        } else if (coluna.numeric_precision) {
          tipo += `(${coluna.numeric_precision})`;
        }
        
        const nullable = coluna.is_nullable === 'YES' ? 'Sim' : 'Não';
        const defaultVal = coluna.column_default ? coluna.column_default : '-';
        
        documentacao += `| ${coluna.column_name} | ${tipo} | ${coluna.character_maximum_length || '-'} | ${nullable} | ${defaultVal} |\n`;
      }
      
      documentacao += `\n`;
      
      // Obter Primary Keys
      const pkResult = await client.query(`
        SELECT 
          a.attname AS column_name
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass
          AND i.indisprimary
      `, [`"${nomeTabela}"`]);
      
      if (pkResult.rows.length > 0) {
        documentacao += `#### Primary Keys\n\n`;
        documentacao += `- ${pkResult.rows.map(r => r.column_name).join(', ')}\n\n`;
      }
      
      // Obter Foreign Keys
      const fkResult = await client.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule,
          rc.update_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
      `, [nomeTabela]);
      
      if (fkResult.rows.length > 0) {
        documentacao += `#### Foreign Keys\n\n`;
        documentacao += `| Coluna | Tabela Referenciada | Coluna Referenciada | On Delete | On Update |\n`;
        documentacao += `|--------|---------------------|---------------------|-----------|-----------|\n`;
        
        for (const fk of fkResult.rows) {
          documentacao += `| ${fk.column_name} | ${fk.foreign_table_name} | ${fk.foreign_column_name} | ${fk.delete_rule} | ${fk.update_rule} |\n`;
        }
        
        documentacao += `\n`;
      }
      
      // Obter Índices (exceto Primary Keys)
      const indexResult = await client.query(`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = $1
          AND indexname NOT LIKE '%_pkey'
        ORDER BY indexname
      `, [nomeTabela]);
      
      if (indexResult.rows.length > 0) {
        documentacao += `#### Índices\n\n`;
        for (const idx of indexResult.rows) {
          documentacao += `- **${idx.indexname}**: \`${idx.indexdef}\`\n`;
        }
        documentacao += `\n`;
      }
      
      // Obter Constraints (Unique, Check, etc)
      const constraintsResult = await client.query(`
        SELECT
          constraint_name,
          constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = $1
          AND constraint_type IN ('UNIQUE', 'CHECK')
        ORDER BY constraint_type, constraint_name
      `, [nomeTabela]);
      
      if (constraintsResult.rows.length > 0) {
        documentacao += `#### Constraints Adicionais\n\n`;
        for (const constraint of constraintsResult.rows) {
          documentacao += `- **${constraint.constraint_name}** (${constraint.constraint_type})\n`;
        }
        documentacao += `\n`;
      }
      
      // Contar registros
      const countResult = await client.query(`SELECT COUNT(*) as total FROM ${nomeTabela}`);
      documentacao += `#### Estatísticas\n\n`;
      documentacao += `- **Total de registros:** ${parseInt(countResult.rows[0].total)}\n\n`;
      
      documentacao += `---\n\n`;
    }
    
    // 3. Listar Sequences
    console.log('\n📈 Documentando sequences...');
    const sequencesResult = await client.query(`
      SELECT 
        sequence_name,
        data_type,
        numeric_precision,
        start_value,
        minimum_value,
        maximum_value,
        increment
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `);
    
    if (sequencesResult.rows.length > 0) {
      documentacao += `## Sequences\n\n`;
      documentacao += `| Nome | Tipo | Valor Inicial | Min | Max | Incremento |\n`;
      documentacao += `|------|------|---------------|-----|-----|------------|\n`;
      
      for (const seq of sequencesResult.rows) {
        documentacao += `| ${seq.sequence_name} | ${seq.data_type} | ${seq.start_value} | ${seq.minimum_value} | ${seq.maximum_value} | ${seq.increment} |\n`;
      }
      
      documentacao += `\n---\n\n`;
    }
    
    // 4. Listar Views
    console.log('👁️  Documentando views...');
    const viewsResult = await client.query(`
      SELECT 
        table_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (viewsResult.rows.length > 0) {
      documentacao += `## Views\n\n`;
      for (const view of viewsResult.rows) {
        documentacao += `### ${view.table_name}\n\n`;
        documentacao += `\`\`\`sql\n${view.view_definition}\n\`\`\`\n\n`;
        documentacao += `---\n\n`;
      }
    }
    
    // 5. Informações gerais do banco
    console.log('📊 Obtendo informações gerais...');
    const dbSizeResult = await client.query(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as tamanho
    `);
    
    const dbInfoResult = await client.query(`
      SELECT 
        version()
    `);
    
    documentacao += `## Informações Gerais do Banco\n\n`;
    documentacao += `- **Tamanho do banco:** ${dbSizeResult.rows[0].tamanho}\n`;
    documentacao += `- **Versão PostgreSQL:** ${dbInfoResult.rows[0].version}\n`;
    documentacao += `- **Total de tabelas:** ${tabelas.length}\n`;
    documentacao += `- **Total de sequences:** ${sequencesResult.rows.length}\n`;
    documentacao += `- **Total de views:** ${viewsResult.rows.length}\n\n`;
    
    // Salvar arquivo
    fs.writeFileSync(caminhoArquivo, documentacao, 'utf8');
    
    console.log(`\n✅ Documentação salva em: ${caminhoArquivo}`);
    console.log(`\n📄 Resumo:`);
    console.log(`   - Tabelas documentadas: ${tabelas.length}`);
    console.log(`   - Sequences documentadas: ${sequencesResult.rows.length}`);
    console.log(`   - Views documentadas: ${viewsResult.rows.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao documentar banco:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
if (require.main === module) {
  documentarBanco()
    .then(() => {
      console.log('\n🎉 Documentação concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro:', error);
      process.exit(1);
    });
}

module.exports = { documentarBanco };

