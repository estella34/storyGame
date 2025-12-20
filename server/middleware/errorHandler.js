// Global Hata Yakalayıcı (Sunucu çökmesini engeller)
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Sunucu Hatası',
    // Canlı moddaysak hata detayını gizle, geliştirme modundaysak göster
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;
