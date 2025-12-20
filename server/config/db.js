const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // Production ayarları (Bağlantı havuzu yönetimi)
  max: 20, // Maksimum eşzamanlı bağlantı sayısı
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Veritabanına başarıyla bağlanıldı.');
});

pool.on('error', (err) => {
  console.error('❌ Beklenmedik veritabanı hatası:', err);
  process.exit(-1);
});

module.exports = pool;
