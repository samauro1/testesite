const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Obter configurações da clínica
router.get('/clinica', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM configuracoes_clinica LIMIT 1
    `);

    if (result.rows.length === 0) {
      // Criar registro padrão se não existir
      const newConfig = await query(`
        INSERT INTO configuracoes_clinica (nome_clinica)
        VALUES ('Clínica de Avaliação Psicológica')
        RETURNING *
      `);
      return res.json({
        success: true,
        data: newConfig.rows[0]
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Atualizar configurações da clínica
router.put('/clinica', authenticateToken, async (req, res) => {
  try {
    const {
      nome_clinica,
      cnpj,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      email,
      logo_url
    } = req.body;

    // Verificar se já existe configuração
    const existing = await query('SELECT id FROM configuracoes_clinica LIMIT 1');
    
    let result;
    if (existing.rows.length === 0) {
      // Criar nova
      result = await query(`
        INSERT INTO configuracoes_clinica 
        (nome_clinica, cnpj, endereco, cidade, estado, cep, telefone, email, logo_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [nome_clinica, cnpj, endereco, cidade, estado, cep, telefone, email, logo_url]);
    } else {
      // Atualizar existente
      result = await query(`
        UPDATE configuracoes_clinica
        SET nome_clinica = $1, cnpj = $2, endereco = $3, cidade = $4, 
            estado = $5, cep = $6, telefone = $7, email = $8, logo_url = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *
      `, [nome_clinica, cnpj, endereco, cidade, estado, cep, telefone, email, logo_url, existing.rows[0].id]);
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Configurações atualizadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// Fazer backup do banco de dados
router.post('/backup', authenticateToken, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    // Criar diretório de backups se não existir
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Gerar nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    // Buscar todos os dados do banco
    const tables = [
      'pacientes',
      'avaliacoes', 
      'resultados_testes',
      'estoque_testes',
      'movimentacoes_estoque',
      'usuarios',
      'configuracoes_clinica',
      'logs_sistema'
    ];

    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data: {}
    };

    // Fazer backup de cada tabela
    for (const table of tables) {
      try {
        const result = await query(`SELECT * FROM ${table}`);
        backupData.data[table] = result.rows;
      } catch (err) {
        console.warn(`Aviso: Não foi possível fazer backup da tabela ${table}:`, err.message);
        backupData.data[table] = [];
      }
    }

    // Salvar backup em arquivo JSON
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    
    // Registrar backup no banco de dados
    try {
      await query(`
        INSERT INTO logs_sistema (tipo, descricao, usuario_id)
        VALUES ('backup', 'Backup realizado com sucesso: ${path.basename(backupFile)}', $1)
      `, [req.user.id]);
    } catch (logError) {
      console.warn('Não foi possível registrar log:', logError.message);
    }

    // Obter informações do arquivo
    const stats = fs.statSync(backupFile);

    res.json({
      success: true,
      message: 'Backup realizado com sucesso!',
      arquivo: path.basename(backupFile),
      tamanho: stats.size,
      data: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao fazer backup:', error);
    res.status(500).json({ 
      error: 'Erro ao fazer backup',
      details: error.message 
    });
  }
});

// Restaurar backup
router.post('/backup/restaurar', authenticateToken, async (req, res) => {
  try {
    const { arquivo } = req.body;
    
    if (!arquivo) {
      return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
    }

    const fs = require('fs');
    const path = require('path');

    const backupDir = path.join(__dirname, '..', 'backups');
    const backupFile = path.join(backupDir, arquivo);

    // Verificar se o arquivo existe
    if (!fs.existsSync(backupFile)) {
      return res.status(404).json({ error: 'Arquivo de backup não encontrado' });
    }

    // Ler o arquivo de backup
    const backupContent = fs.readFileSync(backupFile, 'utf8');
    const backupData = JSON.parse(backupContent);

    if (!backupData.data) {
      return res.status(400).json({ error: 'Formato de backup inválido' });
    }

    // Desabilitar triggers e constraints temporariamente
    await query('SET session_replication_role = replica;');

    let restoredTables = 0;
    let errors = [];

    // Restaurar cada tabela
    for (const [tableName, rows] of Object.entries(backupData.data)) {
      try {
        if (rows.length === 0) continue;

        // Limpar tabela atual (exceto se for logs_sistema)
        if (tableName !== 'logs_sistema') {
          await query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE;`);
        }

        // Inserir dados
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          
          await query(
            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
        }

        restoredTables++;
      } catch (err) {
        console.error(`Erro ao restaurar tabela ${tableName}:`, err.message);
        errors.push({ table: tableName, error: err.message });
      }
    }

    // Reabilitar triggers e constraints
    await query('SET session_replication_role = DEFAULT;');
    
    // Registrar restauração no banco de dados
    try {
      await query(`
        INSERT INTO logs_sistema (tipo, descricao, usuario_id)
        VALUES ('restauracao', 'Backup restaurado: ${arquivo} (${restoredTables} tabelas)', $1)
      `, [req.user.id]);
    } catch (logError) {
      console.warn('Não foi possível registrar log:', logError.message);
    }

    res.json({
      success: true,
      message: `Backup restaurado com sucesso! ${restoredTables} tabelas restauradas.`,
      arquivo: arquivo,
      tabelasRestauradas: restoredTables,
      erros: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    res.status(500).json({ 
      error: 'Erro ao restaurar backup',
      details: error.message
    });
  }
});

// Listar backups disponíveis
router.get('/backups', authenticateToken, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    const backupDir = path.join(__dirname, '..', 'backups');
    
    // Criar diretório se não existir
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      return res.json({ success: true, data: [] });
    }

    // Listar arquivos de backup
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.json') || file.endsWith('.sql'))
      .map(file => {
        const stats = fs.statSync(path.join(backupDir, file));
        return {
          nome: file,
          tamanho: stats.size,
          data: stats.mtime
        };
      })
      .sort((a, b) => b.data - a.data); // Ordenar do mais recente para o mais antigo

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Erro ao listar backups:', error);
    res.status(500).json({ error: 'Erro ao listar backups' });
  }
});

// Obter logs de acesso
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const { tipo, limite = 50, offset = 0 } = req.query;

    let queryText = `
      SELECT 
        l.*,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM logs_sistema l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
    `;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (tipo) {
      conditions.push(`l.tipo = $${paramCount++}`);
      params.push(tipo);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ` ORDER BY l.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limite, offset);

    const result = await query(queryText, params);

    // Contar total
    let countQuery = 'SELECT COUNT(*) as total FROM logs_sistema l';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await query(countQuery, params.slice(0, -2));

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limite: parseInt(limite),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de acesso' });
  }
});

// Registrar log de acesso (chamado no login)
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const { tipo, descricao } = req.body;

    await query(`
      INSERT INTO logs_sistema (tipo, descricao, usuario_id, ip_address)
      VALUES ($1, $2, $3, $4)
    `, [tipo, descricao, req.user.id, req.ip]);

    res.json({
      success: true,
      message: 'Log registrado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao registrar log:', error);
    res.status(500).json({ error: 'Erro ao registrar log' });
  }
});

// Obter configurações de notificações do usuário
router.get('/notificacoes', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        notificacao_metodo,
        notificacao_texto_apto,
        notificacao_texto_inapto_temporario,
        notificacao_texto_inapto,
        nome
      FROM usuarios
      WHERE id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar configurações de notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Atualizar configurações de notificações do usuário
router.put('/notificacoes', authenticateToken, async (req, res) => {
  try {
    const {
      notificacao_metodo,
      notificacao_texto_apto,
      notificacao_texto_inapto_temporario,
      notificacao_texto_inapto
    } = req.body;

    await query(`
      UPDATE usuarios
      SET 
        notificacao_metodo = $1,
        notificacao_texto_apto = $2,
        notificacao_texto_inapto_temporario = $3,
        notificacao_texto_inapto = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [
      notificacao_metodo,
      notificacao_texto_apto,
      notificacao_texto_inapto_temporario,
      notificacao_texto_inapto,
      req.user.id
    ]);

    res.json({
      success: true,
      message: 'Configurações de notificações atualizadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações de notificações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// Obter configurações de e-mail do usuário
router.get('/email', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        smtp_host,
        smtp_port,
        smtp_secure,
        smtp_usuario,
        smtp_senha,
        email_remetente,
        nome_remetente,
        email_copia,
        ativo
      FROM configuracoes_email
      WHERE usuario_id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar configurações de e-mail:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Atualizar ou criar configurações de e-mail do usuário
router.put('/email', authenticateToken, async (req, res) => {
  try {
    const {
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_usuario,
      smtp_senha,
      email_remetente,
      nome_remetente,
      email_copia,
      ativo
    } = req.body;

    // Verificar se já existe configuração
    const existing = await query(`
      SELECT id FROM configuracoes_email WHERE usuario_id = $1
    `, [req.user.id]);

    if (existing.rows.length > 0) {
      // Atualizar
      await query(`
        UPDATE configuracoes_email
        SET 
          smtp_host = $1,
          smtp_port = $2,
          smtp_secure = $3,
          smtp_usuario = $4,
          smtp_senha = $5,
          email_remetente = $6,
          nome_remetente = $7,
          email_copia = $8,
          ativo = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE usuario_id = $10
      `, [
        smtp_host,
        smtp_port || 587,
        smtp_secure || false,
        smtp_usuario,
        smtp_senha,
        email_remetente,
        nome_remetente,
        email_copia,
        ativo !== undefined ? ativo : true,
        req.user.id
      ]);
    } else {
      // Criar
      await query(`
        INSERT INTO configuracoes_email (
          usuario_id, smtp_host, smtp_port, smtp_secure,
          smtp_usuario, smtp_senha, email_remetente,
          nome_remetente, email_copia, ativo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        req.user.id,
        smtp_host,
        smtp_port || 587,
        smtp_secure || false,
        smtp_usuario,
        smtp_senha,
        email_remetente,
        nome_remetente,
        email_copia,
        ativo !== undefined ? ativo : true
      ]);
    }

    res.json({
      success: true,
      message: 'Configurações de e-mail salvas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar configurações de e-mail:', error);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

// Testar conexão SMTP
router.post('/email/test', authenticateToken, async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_usuario, smtp_senha, email_remetente } = req.body;
    
    const nodemailer = require('nodemailer');
    
    // Criar transporter
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port || 587,
      secure: smtp_port == 465,
      auth: {
        user: smtp_usuario,
        pass: smtp_senha
      }
    });

    // Verificar conexão
    await transporter.verify();

    // Enviar e-mail de teste
    await transporter.sendMail({
      from: `"Sistema Palográfico" <${email_remetente}>`,
      to: email_remetente,
      subject: 'Teste de Configuração SMTP',
      text: 'Parabéns! Sua configuração de e-mail está funcionando corretamente.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f0f9ff; border-radius: 10px;">
          <h2 style="color: #1e40af;">✅ Teste de Configuração SMTP</h2>
          <p style="color: #374151; font-size: 16px;">
            Parabéns! Sua configuração de e-mail está funcionando corretamente.
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Sistema Palográfico - Avaliação Psicológica
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'E-mail de teste enviado com sucesso! Verifique sua caixa de entrada.'
    });
  } catch (error) {
    console.error('Erro ao testar e-mail:', error);
    res.status(500).json({ 
      error: 'Erro ao testar configuração',
      details: error.message
    });
  }
});

module.exports = router;

