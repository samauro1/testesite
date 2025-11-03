// Templates de mensagens para resultados de avaliação psicológica

/**
 * Gera mensagem personalizada baseada no resultado da avaliação
 * @param {Object} dados - Dados da avaliação e paciente
 * @param {string} dados.aptidao - Resultado: 'Apto', 'Inapto', 'Inapto Temporário'
 * @param {Object} dados.paciente - Dados do paciente
 * @param {Object} dados.avaliacao - Dados da avaliação
 * @param {Object} dados.usuario - Dados do psicólogo
 * @returns {Object} - { subject, message, whatsappMessage }
 */
function generateMessage(dados) {
  const { aptidao, paciente, avaliacao, usuario } = dados;
  
  if (!aptidao || !paciente || !avaliacao) {
    throw new Error('Dados insuficientes para gerar mensagem');
  }

  const nomePaciente = paciente.nome;
  const numeroLaudo = avaliacao.numero_laudo;
  const dataAplicacao = new Date(avaliacao.data_aplicacao).toLocaleDateString('pt-BR');
  const nomePsicologo = usuario?.nome || 'Psicólogo';
  const crp = usuario?.crp || '';

  let template;
  
  switch (aptidao) {
    case 'Apto':
      template = generateAptoMessage({
        nomePaciente,
        numeroLaudo,
        dataAplicacao,
        nomePsicologo,
        crp
      });
      break;
      
    case 'Inapto':
      template = generateInaptoMessage({
        nomePaciente,
        numeroLaudo,
        dataAplicacao,
        nomePsicologo,
        crp
      });
      break;
      
    case 'Inapto Temporário':
      template = generateInaptoTemporarioMessage({
        nomePaciente,
        numeroLaudo,
        dataAplicacao,
        nomePsicologo,
        crp
      });
      break;
      
    default:
      throw new Error(`Resultado não reconhecido: ${aptidao}`);
  }

  return template;
}

/**
 * Template para resultado APTO
 */
function generateAptoMessage({ nomePaciente, numeroLaudo, dataAplicacao, nomePsicologo, crp }) {
  const subject = `✅ Resultado da Avaliação Psicológica - APTO`;
  
  const message = `
Prezado(a) ${nomePaciente},

Informamos que sua avaliação psicológica foi concluída com resultado **APTO**.

📋 **Detalhes da Avaliação:**
• Número do Laudo: ${numeroLaudo}
• Data da Aplicação: ${dataAplicacao}
• Resultado: APTO para habilitação

✅ **Próximos Passos:**
Você está apto(a) para prosseguir com o processo de habilitação junto ao DETRAN.

📞 **Contato:**
Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
${nomePsicologo}${crp ? ` - CRP ${crp}` : ''}
  `.trim();

  const whatsappMessage = `✅ *Resultado da Avaliação Psicológica - APTO*

Olá ${nomePaciente}! 

Sua avaliação psicológica foi concluída com resultado *APTO*.

📋 *Detalhes:*
• Laudo: ${numeroLaudo}
• Data: ${dataAplicacao}
• Resultado: APTO

✅ Você está apto(a) para prosseguir com a habilitação no DETRAN.

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
${nomePsicologo}${crp ? ` - CRP ${crp}` : ''}`;

  return { subject, message, whatsappMessage };
}

/**
 * Template para resultado INAPTO
 */
function generateInaptoMessage({ nomePaciente, numeroLaudo, dataAplicacao, nomePsicologo, crp }) {
  const subject = `❌ Resultado da Avaliação Psicológica - INAPTO`;
  
  const message = `
Prezado(a) ${nomePaciente},

Informamos que sua avaliação psicológica foi concluída com resultado **INAPTO**.

📋 **Detalhes da Avaliação:**
• Número do Laudo: ${numeroLaudo}
• Data da Aplicação: ${dataAplicacao}
• Resultado: INAPTO para habilitação

❌ **Orientações:**
Recomendamos que procure um psicólogo para acompanhamento e reavaliação em momento oportuno.

📞 **Contato:**
Para esclarecimentos sobre o resultado, entre em contato conosco.

Atenciosamente,
${nomePsicologo}${crp ? ` - CRP ${crp}` : ''}
  `.trim();

  const whatsappMessage = `❌ *Resultado da Avaliação Psicológica - INAPTO*

Olá ${nomePaciente},

Sua avaliação psicológica foi concluída com resultado *INAPTO*.

📋 *Detalhes:*
• Laudo: ${numeroLaudo}
• Data: ${dataAplicacao}
• Resultado: INAPTO

❌ *Orientações:*
Recomendamos acompanhamento psicológico e reavaliação em momento oportuno.

Para esclarecimentos, entre em contato conosco.

Atenciosamente,
${nomePsicologo}${crp ? ` - CRP ${crp}` : ''}`;

  return { subject, message, whatsappMessage };
}

/**
 * Template para resultado INAPTO TEMPORÁRIO
 */
function generateInaptoTemporarioMessage({ nomePaciente, numeroLaudo, dataAplicacao, nomePsicologo, crp }) {
  const subject = `⏳ Resultado da Avaliação Psicológica - INAPTO TEMPORÁRIO`;
  
  const message = `
Prezado(a) ${nomePaciente},

Informamos que sua avaliação psicológica foi concluída com resultado **INAPTO TEMPORÁRIO**.

📋 **Detalhes da Avaliação:**
• Número do Laudo: ${numeroLaudo}
• Data da Aplicação: ${dataAplicacao}
• Resultado: INAPTO TEMPORÁRIO para habilitação

⏳ **Orientações:**
Recomendamos acompanhamento psicológico e nova avaliação após período de tratamento/desenvolvimento.

📅 **Próximos Passos:**
Entre em contato conosco para agendar nova avaliação após o período recomendado.

📞 **Contato:**
Para esclarecimentos sobre o resultado, entre em contato conosco.

Atenciosamente,
${nomePsicologo}${crp ? ` - CRP ${crp}` : ''}
  `.trim();

  const whatsappMessage = `⏳ *Resultado da Avaliação Psicológica - INAPTO TEMPORÁRIO*

Olá ${nomePaciente},

Sua avaliação psicológica foi concluída com resultado *INAPTO TEMPORÁRIO*.

📋 *Detalhes:*
• Laudo: ${numeroLaudo}
• Data: ${dataAplicacao}
• Resultado: INAPTO TEMPORÁRIO

⏳ *Orientações:*
Recomendamos acompanhamento psicológico e nova avaliação após período de desenvolvimento.

📅 *Próximos Passos:*
Entre em contato para agendar nova avaliação.

Para esclarecimentos, entre em contato conosco.

Atenciosamente,
${nomePsicologo}${crp ? ` - CRP ${crp}` : ''}`;

  return { subject, message, whatsappMessage };
}

/**
 * Envia mensagem via WhatsApp (simulação)
 * @param {string} phone - Número do telefone
 * @param {string} message - Mensagem a ser enviada
 * @returns {Promise<Object>} - Resultado do envio
 */
async function sendWhatsAppMessage(phone, message) {
  try {
    // Aqui você pode integrar com uma API real de WhatsApp
    // Por exemplo: Twilio, WhatsApp Business API, etc.
    
    console.log(`📱 Enviando WhatsApp para ${phone}:`);
    console.log(message);
    
    // Simulação de envio
    return {
      success: true,
      messageId: `wa_${Date.now()}`,
      status: 'sent'
    };
  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Envia email (simulação)
 * @param {string} email - Email do destinatário
 * @param {string} subject - Assunto do email
 * @param {string} message - Conteúdo do email
 * @returns {Promise<Object>} - Resultado do envio
 */
async function sendEmail(email, subject, message) {
  try {
    // Aqui você pode integrar com um serviço de email real
    // Por exemplo: SendGrid, Mailgun, AWS SES, etc.
    
    console.log(`📧 Enviando email para ${email}:`);
    console.log(`Assunto: ${subject}`);
    console.log(message);
    
    // Simulação de envio
    return {
      success: true,
      messageId: `email_${Date.now()}`,
      status: 'sent'
    };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateMessage,
  sendWhatsAppMessage,
  sendEmail
};
