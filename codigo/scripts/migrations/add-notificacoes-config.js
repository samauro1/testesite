const { query } = require('../../config/database');

async function up() {
  console.log('Adicionando configurações de notificações...');
  
  // Adicionar colunas na tabela usuarios para configurações de notificação
  await query(`
    ALTER TABLE usuarios 
    ADD COLUMN IF NOT EXISTS notificacao_metodo VARCHAR(20) DEFAULT 'whatsapp',
    ADD COLUMN IF NOT EXISTS notificacao_texto_apto TEXT,
    ADD COLUMN IF NOT EXISTS notificacao_texto_inapto_temporario TEXT,
    ADD COLUMN IF NOT EXISTS notificacao_texto_inapto TEXT
  `);
  
  console.log('✅ Colunas de notificação adicionadas com sucesso!');
  
  // Definir textos padrão para usuários existentes
  const textoAptoPadrao = `Prezado(a) {nome}, aqui Psicólogo {psicologo}, e escrevo para informar sobre o resultado de sua avaliação.

Tenho o prazer de comunicar que seu resultado foi APTO, e o mesmo já foi devidamente cadastrado no sistema do DETRAN.

Parabéns pela aprovação!

Estou à disposição para quaisquer dúvidas adicionais.

Atenciosamente,
{psicologo}`;

  const textoInaptoTemporarioPadrao = `Prezado(a) {nome}, aqui Psicólogo {psicologo}, e escrevo para informar sobre o resultado de sua avaliação.

Após a análise dos testes realizados, seu resultado foi INAPTO TEMPORÁRIO.

Será necessário reavaliar alguns aspectos. Conforme regulamentação, você deverá aguardar um período de 30 dias antes de realizar uma nova avaliação (a partir de {data_reavaliacao}).

Após essa data, entre em contato para agendarmos uma nova avaliação.

Caso não concorde com este resultado, você pode solicitar uma Junta Administrativa junto ao DETRAN. Se optar por este caminho, por gentileza, comunique-me para que possamos reter seu prontuário.

Estou à disposição para quaisquer dúvidas adicionais.

Atenciosamente,
{psicologo}`;

  const textoInaptoPadrao = `Prezado(a) {nome}, aqui Psicólogo {psicologo}, e escrevo para informar sobre o resultado de sua avaliação.

Após a análise dos testes realizados, seu resultado foi INAPTO.

Conforme regulamentação, caso você não concorde com esta decisão, é possível solicitar uma Junta Administrativa junto ao DETRAN/Poupatempo. O prazo limite para essa solicitação é de 30 dias a partir da data de emissão do resultado (data final: {data_limite}).

Se decidir prosseguir com a Junta, por gentileza, comunique-me para que possamos reter seu prontuário.

Estou à disposição para quaisquer dúvidas adicionais.

Atenciosamente,
{psicologo}`;

  await query(`
    UPDATE usuarios 
    SET 
      notificacao_texto_apto = $1,
      notificacao_texto_inapto_temporario = $2,
      notificacao_texto_inapto = $3
    WHERE notificacao_texto_apto IS NULL
  `, [textoAptoPadrao, textoInaptoTemporarioPadrao, textoInaptoPadrao]);
  
  console.log('✅ Textos padrão configurados para usuários existentes!');
}

async function down() {
  console.log('Removendo configurações de notificações...');
  
  await query(`
    ALTER TABLE usuarios 
    DROP COLUMN IF EXISTS notificacao_metodo,
    DROP COLUMN IF EXISTS notificacao_texto_apto,
    DROP COLUMN IF EXISTS notificacao_texto_inapto_temporario,
    DROP COLUMN IF EXISTS notificacao_texto_inapto
  `);
  
  console.log('✅ Colunas de notificação removidas!');
}

module.exports = { up, down };

// Executar se chamado diretamente
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migração concluída!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Erro na migração:', err);
      process.exit(1);
    });
}

