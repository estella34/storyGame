const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Kullanıcı Giriş Kontrolü
exports.protect = async (req, res, next) => {
  let token;

  // 1. Header'da Token var mı diye bak
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // "Bearer eyJhbGci..." -> Sadece kodu al
      token = req.headers.authorization.split(' ')[1];

      // Debug için terminale yazdıralım (Sorunu bulmak için)
      console.log("🟢 Token Algılandı:", token.substring(0, 10) + "...");

      // 2. Token'ı çöz
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 3. Kullanıcıyı veritabanında bul
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
      
      if (result.rows.length === 0) {
        console.log("🔴 Token geçerli ama kullanıcı bulunamadı.");
        return res.status(401).json({ success: false, message: 'Bu tokena ait kullanıcı yok.' });
      }

      // Kullanıcıyı isteğe ekle
      req.user = result.rows[0];
      next();

    } catch (error) {
      console.log("🔴 Token Doğrulama Hatası:", error.message);
      return res.status(401).json({ success: false, message: 'Token geçersiz, lütfen tekrar giriş yapın.' });
    }
  }

  if (!token) {
    console.log("🔴 İstekte Token bulunamadı!");
    return res.status(401).json({ success: false, message: 'Giriş yapılmamış (Token yok).' });
  }
};

// Admin Yetki Kontrolü
exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    console.log("🔴 Kullanıcı Admin değil:", req.user?.role);
    return res.status(403).json({ success: false, message: 'Bu işlem için Admin yetkisi gerekiyor.' });
  }
};