const express = require('express');
const router = express.Router();

// TÜM Importları tek bir yerden yapıyoruz (Hata buradaydı, düzelttik) 👇
const { 
  getScenes, 
  createScene, 
  updateScene, 
  deleteScene, 
  createChapter, 
  deleteChapter 
} = require('../controllers/sceneController');

const { protect, adminOnly } = require('../middleware/auth');

// --- ROTALAR ---

// Önce sabit yolları (static routes) tanımlamak daha güvenlidir
router.post('/:gameId/chapters', protect, adminOnly, createChapter); // Yeni Chapter Ekle
router.delete('/chapters/:id', protect, adminOnly, deleteChapter);   // Chapter Sil

// Sonra dinamik yolları tanımla
router.get('/:gameId', protect, adminOnly, getScenes);      // Sahneleri Getir
router.post('/:gameId', protect, adminOnly, createScene);   // Sahne Ekle
router.put('/:id', protect, adminOnly, updateScene);        // Sahne Güncelle
router.delete('/:id', protect, adminOnly, deleteScene);     // Sahne Sil

module.exports = router;