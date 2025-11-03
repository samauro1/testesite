require('dotenv').config();
const { query } = require('../config/database');

async function verificarECorrigir() {
  try {
    console.log('🔍 Verificando colunas da tabela pacientes...\n');
    
    // Listar colunas existentes
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pacientes' 
      ORDER BY column_name
    `);
    
    const colunasExistentes = result.rows.map(r => r.column_name);
    console.log('📋 Colunas existentes:');
    colunasExistentes.forEach(c => console.log(`  - ${c}`));
    
    // Colunas necessárias para converter agendamento
    const colunasNecessarias = [
      { nome: 'endereco', tipo: 'VARCHAR(500)' },
      { nome: 'escolaridade', tipo: 'VARCHAR(50)' },
      { nome: 'data_nascimento', tipo: 'DATE' },
      { nome: 'contexto', tipo: 'VARCHAR(50)' },
      { nome: 'tipo_transito', tipo: 'VARCHAR(50)' },
      { nome: 'categoria_cnh', tipo: 'VARCHAR(10)' },
      { nome: 'telefone', tipo: 'VARCHAR(20)' },
      { nome: 'email', tipo: 'VARCHAR(255)' },
      { nome: 'observacoes', tipo: 'TEXT' },
      { nome: 'usuario_id', tipo: 'INTEGER REFERENCES usuarios(id)' }
    ];
    
    console.log('\n🔧 Verificando colunas necessárias...\n');
    
    for (const coluna of colunasNecessarias) {
      if (!colunasExistentes.includes(coluna.nome)) {
        console.log(`⚠️  Coluna '${coluna.nome}' não encontrada - adicionando...`);
        try {
          await query(`
            ALTER TABLE pacientes 
            ADD COLUMN ${coluna.nome} ${coluna.tipo}
          `);
          console.log(`  ✅ Coluna '${coluna.nome}' adicionada!`);
        } catch (error) {
          console.error(`  ❌ Erro ao adicionar '${coluna.nome}':`, error.message);
        }
      } else {
        console.log(`  ✅ Coluna '${coluna.nome}' existe`);
      }
    }
    
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

verificarECorrigir();

