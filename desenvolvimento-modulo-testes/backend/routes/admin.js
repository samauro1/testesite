/**
 * Rotas administrativas para o módulo de testes
 * 
 * Funcionalidades:
 * - Popular tabelas normativas
 * - Gerenciar dados do sistema
 */

const express = require('express');
const { query } = require('../config/database');
// Importar as funções de popular tabelas e passar a query como parâmetro
const popularTabelasACModule = require('../../database/scripts/03-popular-tabelas-ac');
const popularTabelasPalograficoModule = require('../../database/scripts/04-popular-tabelas-palografico');
const popularTabelasMemoriaModule = require('../../database/scripts/05-popular-tabelas-memoria');

const router = express.Router();

/**
 * POST /api/admin/popular-tabelas-ac
 * Popula as tabelas normativas do AC no banco de dados
 */
router.post('/popular-tabelas-ac', async (req, res) => {
  try {
    console.log('📥 Iniciando população de tabelas AC...');
    
    // Passar a função query do servidor para o script
    await popularTabelasACModule.popularTabelasAC(query);
    
    res.json({
      success: true,
      message: 'Tabelas normativas do AC populadas com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao popular tabelas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao popular tabelas normativas',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/popular-tabelas-palografico
 * Popula as tabelas normativas do Palográfico no banco de dados
 */
router.post('/popular-tabelas-palografico', async (req, res) => {
  try {
    console.log('📥 Iniciando população de tabelas Palográfico...');
    
    await popularTabelasPalograficoModule.popularTabelasPalografico(query);
    
    res.json({
      success: true,
      message: 'Tabelas normativas do Palográfico populadas com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao popular tabelas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao popular tabelas normativas',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/popular-tabelas-memoria
 * Popula as tabelas normativas de Memória no banco de dados
 */
router.post('/popular-tabelas-memoria', async (req, res) => {
  try {
    console.log('📥 Iniciando população de tabelas Memória...');
    
    await popularTabelasMemoriaModule.popularTabelasMemoria(query);
    
    res.json({
      success: true,
      message: 'Tabelas normativas de Memória populadas com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao popular tabelas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao popular tabelas normativas',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/popular-todas-tabelas
 * Popula todas as tabelas normativas de uma vez
 */
router.post('/popular-todas-tabelas', async (req, res) => {
  try {
    console.log('📥 Iniciando população de TODAS as tabelas normativas...');
    
    const resultados = {
      ac: false,
      palografico: false,
      memoria: false
    };
    
    try {
      await popularTabelasACModule.popularTabelasAC(query);
      resultados.ac = true;
      console.log('✅ AC populado');
    } catch (error) {
      console.error('❌ Erro ao popular AC:', error.message);
    }
    
    try {
      await popularTabelasPalograficoModule.popularTabelasPalografico(query);
      resultados.palografico = true;
      console.log('✅ Palográfico populado');
    } catch (error) {
      console.error('❌ Erro ao popular Palográfico:', error.message);
    }
    
    try {
      await popularTabelasMemoriaModule.popularTabelasMemoria(query);
      resultados.memoria = true;
      console.log('✅ Memória populada');
    } catch (error) {
      console.error('❌ Erro ao popular Memória:', error.message);
    }
    
    res.json({
      success: true,
      message: 'População de tabelas concluída',
      resultados
    });
  } catch (error) {
    console.error('❌ Erro ao popular todas as tabelas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao popular tabelas normativas',
      message: error.message
    });
  }
});

module.exports = router;

