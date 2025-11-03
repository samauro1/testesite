const { query } = require('../config/database');

async function fixRiscosPsicossociais() {
  try {
    console.log('🔧 Corrigindo dados da tabela Riscos Psicossociais...');
    
    // Find the Riscos Psicossociais table
    const tabelaResult = await query(
      'SELECT id FROM tabelas_normativas WHERE nome LIKE $1',
      ['%Riscos Psicossociais%']
    );
    
    if (tabelaResult.rows.length === 0) {
      console.log('❌ Tabela Riscos Psicossociais não encontrada');
      return;
    }
    
    const tabelaId = tabelaResult.rows[0].id;
    console.log(`📋 Tabela encontrada: ID ${tabelaId}`);
    
    // Clear existing data
    await query('DELETE FROM normas_rotas WHERE tabela_id = $1', [tabelaId]);
    console.log('🗑️ Dados existentes removidos');
    
    // Insert correct data for Riscos Psicossociais
    const normasData = [
      // Rota A (Alternada) - ranges mais restritivos para riscos psicossociais
      { rota_tipo: 'A', pontos_min: 0, pontos_max: 89, percentil: 5, classificacao: 'Inferior' },
      { rota_tipo: 'A', pontos_min: 90, pontos_max: 99, percentil: 10, classificacao: 'Inferior' },
      { rota_tipo: 'A', pontos_min: 100, pontos_max: 109, percentil: 15, classificacao: 'Inferior' },
      { rota_tipo: 'A', pontos_min: 110, pontos_max: 119, percentil: 20, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 120, pontos_max: 129, percentil: 25, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 130, pontos_max: 139, percentil: 30, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 140, pontos_max: 149, percentil: 35, classificacao: 'Médio Inferior' },
      { rota_tipo: 'A', pontos_min: 150, pontos_max: 159, percentil: 40, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 160, pontos_max: 169, percentil: 45, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 170, pontos_max: 179, percentil: 50, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 180, pontos_max: 189, percentil: 55, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 190, pontos_max: 199, percentil: 60, classificacao: 'Médio' },
      { rota_tipo: 'A', pontos_min: 200, pontos_max: 209, percentil: 65, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 210, pontos_max: 219, percentil: 70, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 220, pontos_max: 229, percentil: 75, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 230, pontos_max: 239, percentil: 80, classificacao: 'Médio Superior' },
      { rota_tipo: 'A', pontos_min: 240, pontos_max: 249, percentil: 85, classificacao: 'Superior' },
      { rota_tipo: 'A', pontos_min: 250, pontos_max: 259, percentil: 90, classificacao: 'Superior' },
      { rota_tipo: 'A', pontos_min: 260, pontos_max: 999, percentil: 95, classificacao: 'Superior' },
      
      // Rota D (Dividida) - ranges mais restritivos para riscos psicossociais
      { rota_tipo: 'D', pontos_min: 0, pontos_max: 79, percentil: 5, classificacao: 'Inferior' },
      { rota_tipo: 'D', pontos_min: 80, pontos_max: 89, percentil: 10, classificacao: 'Inferior' },
      { rota_tipo: 'D', pontos_min: 90, pontos_max: 99, percentil: 15, classificacao: 'Inferior' },
      { rota_tipo: 'D', pontos_min: 100, pontos_max: 105, percentil: 20, classificacao: 'Médio Inferior' },
      { rota_tipo: 'D', pontos_min: 106, pontos_max: 111, percentil: 40, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 112, pontos_max: 117, percentil: 45, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 118, pontos_max: 123, percentil: 50, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 124, pontos_max: 129, percentil: 55, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 130, pontos_max: 135, percentil: 60, classificacao: 'Médio' },
      { rota_tipo: 'D', pontos_min: 136, pontos_max: 141, percentil: 65, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 142, pontos_max: 147, percentil: 70, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 148, pontos_max: 153, percentil: 75, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 154, pontos_max: 159, percentil: 80, classificacao: 'Médio Superior' },
      { rota_tipo: 'D', pontos_min: 160, pontos_max: 165, percentil: 85, classificacao: 'Superior' },
      { rota_tipo: 'D', pontos_min: 166, pontos_max: 171, percentil: 90, classificacao: 'Superior' },
      { rota_tipo: 'D', pontos_min: 172, pontos_max: 177, percentil: 95, classificacao: 'Superior' },
      { rota_tipo: 'D', pontos_min: 178, pontos_max: 999, percentil: 95, classificacao: 'Superior' },
      
      // Rota C (Concentrada) - ranges mais restritivos para riscos psicossociais
      { rota_tipo: 'C', pontos_min: 0, pontos_max: 119, percentil: 5, classificacao: 'Inferior' },
      { rota_tipo: 'C', pontos_min: 120, pontos_max: 129, percentil: 10, classificacao: 'Inferior' },
      { rota_tipo: 'C', pontos_min: 130, pontos_max: 139, percentil: 15, classificacao: 'Inferior' },
      { rota_tipo: 'C', pontos_min: 140, pontos_max: 147, percentil: 20, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 148, pontos_max: 155, percentil: 25, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 156, pontos_max: 163, percentil: 30, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 164, pontos_max: 171, percentil: 35, classificacao: 'Médio Inferior' },
      { rota_tipo: 'C', pontos_min: 172, pontos_max: 179, percentil: 40, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 180, pontos_max: 187, percentil: 45, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 188, pontos_max: 195, percentil: 50, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 196, pontos_max: 203, percentil: 55, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 204, pontos_max: 211, percentil: 60, classificacao: 'Médio' },
      { rota_tipo: 'C', pontos_min: 212, pontos_max: 219, percentil: 65, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 220, pontos_max: 227, percentil: 70, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 228, pontos_max: 235, percentil: 75, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 236, pontos_max: 243, percentil: 80, classificacao: 'Médio Superior' },
      { rota_tipo: 'C', pontos_min: 244, pontos_max: 251, percentil: 85, classificacao: 'Superior' },
      { rota_tipo: 'C', pontos_min: 252, pontos_max: 259, percentil: 90, classificacao: 'Superior' },
      { rota_tipo: 'C', pontos_min: 260, pontos_max: 999, percentil: 95, classificacao: 'Superior' }
    ];
    
    // Insert the data
    for (const norma of normasData) {
      await query(
        'INSERT INTO normas_rotas (tabela_id, rota_tipo, pontos_min, pontos_max, percentil, classificacao) VALUES ($1, $2, $3, $4, $5, $6)',
        [tabelaId, norma.rota_tipo, norma.pontos_min, norma.pontos_max, norma.percentil, norma.classificacao]
      );
    }
    
    console.log(`✅ ${normasData.length} normas inseridas para Riscos Psicossociais`);
    
    // Test the specific scores
    console.log('\n🧪 Testando scores específicos:');
    const testScores = [
      { rota: 'A', score: 120, expectedPercentil: 25, expectedClassificacao: 'Médio Inferior' },
      { rota: 'D', score: 106, expectedPercentil: 40, expectedClassificacao: 'Médio' },
      { rota: 'C', score: 148, expectedPercentil: 25, expectedClassificacao: 'Médio Inferior' }
    ];
    
    for (const test of testScores) {
      const result = await query(
        'SELECT percentil, classificacao FROM normas_rotas WHERE tabela_id = $1 AND rota_tipo = $2 AND $3 BETWEEN pontos_min AND pontos_max',
        [tabelaId, test.rota, test.score]
      );
      
      if (result.rows.length > 0) {
        const match = result.rows[0];
        console.log(`✅ Rota ${test.rota} (${test.score}): ${match.percentil}º ${match.classificacao}`);
        
        if (match.percentil === test.expectedPercentil && match.classificacao === test.expectedClassificacao) {
          console.log(`   🎯 CORRETO!`);
        } else {
          console.log(`   ⚠️  Esperado: ${test.expectedPercentil}º ${test.expectedClassificacao}`);
        }
      } else {
        console.log(`❌ Rota ${test.rota} (${test.score}): Nenhuma faixa encontrada`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Run the fix
if (require.main === module) {
  fixRiscosPsicossociais()
    .then(() => {
      console.log('✅ Correção concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na correção:', error);
      process.exit(1);
    });
}

module.exports = { fixRiscosPsicossociais };
