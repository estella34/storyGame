const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const gameRoutes = require('./routes/gameRoutes');

const pool = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const path = require('path');
const uploadRoutes = require('./routes/uploadRoutes');


// Rota Dosyalarını Çağır
const authRoutes = require('./routes/authRoutes');
const sceneRoutes = require('./routes/sceneRoutes'); // Import et

const app = express();

// --- GÜVENLİK KATMANLARI ---
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5173', // Frontend adresine izin ver
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path, stat) => {
    // Tarayıcıya "Bu dosyayı farklı porttan (React) gelenler de görebilir" diyoruz
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// --- TEST ROTASI ---
app.get('/', (req, res) => {
  res.json({ 
    message: 'Game Platform API Çalışıyor', 
    status: 'online', 
    timestamp: new Date() 
  });
});

// --- VERİTABANI TESTİ ---
app.get('/api/db-test', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      success: true, 
      message: 'Veritabanı bağlantısı başarılı', 
      db_time: result.rows[0].now 
    });
  } catch (err) {
    next(err);
  }
});

// --- ROTALAR ---
app.use('/api/auth', authRoutes); // Auth rotasını aktif ettik
app.use('/api/games', gameRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/scenes', sceneRoutes); // Rotayı tanımla

// --- HATA YÖNETİMİ ---
app.use((req, res, next) => {
  const error = new Error('Aradığınız kaynak bulunamadı');
  error.status = 404;
  next(error);
});

app.use(errorHandler);

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`
  🚀 Sunucu Canlı!
  ---------------------------
  URL: http://localhost:${PORT}
  MOD: ${process.env.NODE_ENV}
  ---------------------------
  `);
});