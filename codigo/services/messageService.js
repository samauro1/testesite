const { query } = require('../config/database');
const { generateMessage, sendEmail, sendWhatsAppMessage } = require('../utils/messageTemplates');

/**
 * Service para gerenciar envio de mensagens de resultados de avaliação
 */

/**
 * Verifica se já foi enviada uma mensagem para uma avaliação e retorna dados do envio
 * @param {number} avaliacaoId - ID da avaliação
 * @returns {Promise<Object>} { enviado: boolean, data_envio: string, metodo_envio: string }
 */
async function wasMessageSent(avaliacaoId) {
  try {
    // Verificar se existe registro de mensagem enviada na tabela mensagens_enviadas
    const result = await query(
      `SELECT data_envio, metodo_envio, aptidao
       FROM mensagens_enviadas 
       WHERE avaliacao_id = $1
       ORDER BY data_envio DESC
       LIMIT 1`,
      [avaliacaoId]
    );
    
    if (result.rows.length > 0) {
      return {
        enviado: true,
        data_envio: result.rows[0].data_envio,
        metodo_envio: result.rows[0].metodo_envio,
        aptidao: result.rows[0].aptidao
      };
    }
    
    // Fallback: verificar logs antigos se a tabela não tiver registro
    try {
      const logResult = await query(
        `SELECT created_at 
         FROM logs_sistema 
         WHERE tipo = 'mensagem_enviada' 
         AND descricao LIKE $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [`%avaliacao_id:${avaliacaoId}%`]
      );
      
      if (logResult.rows.length > 0) {
        return {
          enviado: true,
          data_envio: logResult.rows[0].created_at,
          metodo_envio: 'whatsapp', // Default para logs antigos
          aptidao: null
        };
      }
    } catch (logError) {
      // Ignorar erro de logs
    }
    
    return {
      enviado: false,
      data_envio: null,
      metodo_envio: null,
      aptidao: null
    };
  } catch (error) {
    console.error('Erro ao verificar mensagem enviada:', error);
    // Se a tabela não existir, retorna false
    return {
      enviado: false,
      data_envio: null,
      metodo_envio: null,
      aptidao: null
    };
  }
}

/**
 * Envia resultado da avaliação por email/WhatsApp
 * @param {number} avaliacaoId - ID da avaliação
 * @param {string} aptidao - Resultado: 'Apto', 'Inapto', 'Inapto Temporário'
 * @param {string} preferencia - Preferência de envio: 'email', 'whatsapp', 'ambos'
 * @returns {Promise<Object>}
 */
async function sendEvaluationResult(avaliacaoId, aptidao, preferencia = 'email') {
  try {
    // Buscar dados da avaliação, paciente e usuário
    const avaliacaoResult = await query(
      `SELECT 
        a.*,
        a.usuario_id,
        p.nome as paciente_nome,
        p.email as paciente_email,
        p.telefone as paciente_telefone,
        u.nome as usuario_nome,
        u.crp,
        u.email as usuario_email
      FROM avaliacoes a
      INNER JOIN pacientes p ON a.paciente_id = p.id
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.id = $1`,
      [avaliacaoId]
    );

    if (avaliacaoResult.rows.length === 0) {
      throw new Error('Avaliação não encontrada');
    }

    const row = avaliacaoResult.rows[0];
    
    const dados = {
      aptidao,
      paciente: {
        nome: row.paciente_nome,
        email: row.paciente_email,
        telefone: row.paciente_telefone
      },
      avaliacao: {
        id: row.id,
        numero_laudo: row.numero_laudo,
        data_aplicacao: row.data_aplicacao
      },
      usuario: {
        id: row.usuario_id,
        nome: row.usuario_nome,
        crp: row.crp,
        email: row.usuario_email
      }
    };

    // Gerar mensagem
    const template = generateMessage(dados);
    
    const results = {
      avaliacao_id: avaliacaoId,
      aptidao,
      preferencia,
      envios: []
    };

    // Enviar por email
    if (preferencia === 'email' || preferencia === 'ambos') {
      if (dados.paciente.email) {
        const emailResult = await sendEmail(
          dados.paciente.email,
          template.subject,
          template.message
        );
        results.envios.push({
          tipo: 'email',
          destino: dados.paciente.email,
          resultado: emailResult
        });
      } else {
        results.envios.push({
          tipo: 'email',
          destino: dados.paciente.email,
          resultado: {
            success: false,
            error: 'Email do paciente não cadastrado'
          }
        });
      }
    }

    // Enviar por WhatsApp
    if (preferencia === 'whatsapp' || preferencia === 'ambos') {
      if (dados.paciente.telefone) {
        const whatsappResult = await sendWhatsAppMessage(
          dados.paciente.telefone,
          template.whatsappMessage
        );
        results.envios.push({
          tipo: 'whatsapp',
          destino: dados.paciente.telefone,
          resultado: whatsappResult
        });
      } else {
        results.envios.push({
          tipo: 'whatsapp',
          destino: dados.paciente.telefone,
          resultado: {
            success: false,
            error: 'Telefone do paciente não cadastrado'
          }
        });
      }
    }

    // Registrar envio na tabela mensagens_enviadas (com upsert para atualizar se já existir)
    try {
      await query(
        `INSERT INTO mensagens_enviadas (avaliacao_id, aptidao, metodo_envio, data_envio)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (avaliacao_id) 
         DO UPDATE SET 
           aptidao = EXCLUDED.aptidao,
           metodo_envio = EXCLUDED.metodo_envio,
           data_envio = CURRENT_TIMESTAMP`,
        [avaliacaoId, aptidao, preferencia]
      );
      console.log('✅ Envio registrado na tabela mensagens_enviadas');
    } catch (dbError) {
      console.warn('⚠️ Erro ao registrar na tabela mensagens_enviadas:', dbError.message);
      // Tentar criar tabela se não existir
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS mensagens_enviadas (
            id SERIAL PRIMARY KEY,
            avaliacao_id INTEGER REFERENCES avaliacoes(id) ON DELETE CASCADE,
            aptidao VARCHAR(50) NOT NULL,
            metodo_envio VARCHAR(20) NOT NULL,
            data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(avaliacao_id)
          )
        `);
        // Tentar inserir novamente
        await query(
          `INSERT INTO mensagens_enviadas (avaliacao_id, aptidao, metodo_envio, data_envio)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (avaliacao_id) 
           DO UPDATE SET 
             aptidao = EXCLUDED.aptidao,
             metodo_envio = EXCLUDED.metodo_envio,
             data_envio = CURRENT_TIMESTAMP`,
          [avaliacaoId, aptidao, preferencia]
        );
        console.log('✅ Tabela criada e envio registrado');
      } catch (createError) {
        console.error('❌ Erro ao criar tabela:', createError);
      }
    }
    
    // Registrar no log também (para histórico)
    try {
      await query(
        `INSERT INTO logs_sistema (tipo, descricao, usuario_id, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          'mensagem_enviada',
          `Mensagem de resultado enviada - avaliacao_id:${avaliacaoId}, aptidao:${aptidao}, preferencia:${preferencia}`,
          dados.usuario.id || null
        ]
      );
    } catch (logError) {
      // Se a tabela não existir, apenas loga no console
      console.warn('Não foi possível registrar no log:', logError.message);
    }

    return {
      success: true,
      results
    };

  } catch (error) {
    console.error('Erro ao enviar resultado da avaliação:', error);
    throw error;
  }
}

module.exports = {
  wasMessageSent,
  sendEvaluationResult
};

