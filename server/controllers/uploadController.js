const path = require('path'); // BU SATIR EKSİK OLABİLİR!

exports.uploadFile = (req, res, next) => {
  try {
    console.log("📂 Yükleme İsteği Geldi!"); // Terminalde bunu görmeliyiz

    if (!req.file) {
      console.log("❌ HATA: Multer dosyayı yakalayamadı.");
      return res.status(400).json({ success: false, message: 'Lütfen bir dosya seçin.' });
    }

    console.log("✅ Dosya başarıyla kaydedildi:", req.file.path);

    // Dosya yolunu oluştur
    // Windows ve Mac uyumlu hale getiriyoruz
    // '/uploads/images/dosyaadi.jpg' formatına çevir
    let normalizedPath = req.file.path.replace(/\\/g, '/');
    
    // Eğer path tam yol (absolute) geliyorsa sadece 'uploads' sonrasını al
    if (normalizedPath.includes('uploads/')) {
        normalizedPath = '/uploads/' + normalizedPath.split('uploads/')[1];
    }

    res.status(200).json({
      success: true,
      message: 'Dosya yüklendi',
      url: normalizedPath,
      type: req.file.mimetype.startsWith('image') ? 'image' : 'video'
    });

  } catch (err) {
    console.error("🔥 PATLADI: Upload Controller Hatası:", err);
    res.status(500).json({ success: false, message: 'Sunucu hatası: ' + err.message });
  }
};