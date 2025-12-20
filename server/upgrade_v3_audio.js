const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

const upgradeV3 = async () => {
  try {
    console.log("🎵 Audio ve Geçiş Sistemi Yükleniyor...");

    // 1. Klasörleri Oluştur
    const uploadsDir = path.join(__dirname, 'uploads');
    const bgDir = path.join(uploadsDir, 'background_sounds');
    const sfxDir = path.join(uploadsDir, 'emotions');

    if (!fs.existsSync(bgDir)) fs.mkdirSync(bgDir, { recursive: true });
    if (!fs.existsSync(sfxDir)) fs.mkdirSync(sfxDir, { recursive: true });

    // 2. Scene Tablosuna "End Scene" özelliği ekle
    await pool.query(`
      ALTER TABLE scenes 
      ADD COLUMN IF NOT EXISTS is_end_scene BOOLEAN DEFAULT FALSE;
    `);

    // 3. Choices Tablosuna "Sonuç Medyası" (Ara Sahne) ekle
    // Bu, sahne content'i ile aynı yapıda olacak (JSON)
    await pool.query(`
      ALTER TABLE choices 
      ADD COLUMN IF NOT EXISTS result_content JSONB DEFAULT '[]';
    `);

    console.log("✅ BAŞARILI: Ses klasörleri ve V3 veritabanı hazır!");
    process.exit();
  } catch (err) {
    console.error("❌ HATA:", err.message);
    process.exit(1);
  }
};

upgradeV3();