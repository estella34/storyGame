const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');

// HATA BURADAYDI: İki ayrı import yerine hepsini tek satırda çekiyoruz 👇
const { 
  createGame, 
  getGames, 
  getGameBySlug, 
  updateGame, 
  getGameForPlay, // Yeni eklediğimiz fonksiyon
  deleteGame
} = require('../controllers/gameController');

// --- ROTALAR ---

// 1. OYUNU OYNATMA ROTASI (Özel rota olduğu için üste koymak iyidir)
// Kullanıcı "Oyna" dediğinde buraya istek atacak
router.get('/play/:id', protect, getGameForPlay);

// 2. GENEL ROTALAR (Public)
router.get('/', getGames);          // Tüm oyunları listele
router.get('/:slug', getGameBySlug); // URL adına göre oyun detayını getir

// 3. ADMİN ROTALARI (Korumalı)
router.post('/', protect, adminOnly, createGame);    // Oyun oluştur
router.put('/:id', protect, adminOnly, updateGame);  // Oyun güncelle
// SİLME ROTASI (YENİ) 👇
router.delete('/:id', protect, adminOnly, deleteGame);

module.exports = router;