const pool = require('./config/db');

const setupCinema = async () => {
  try {
    console.log("🎬 Sinema Modu Veritabanı Kuruluyor...");

    // Her şeyi temizle (Cascade sayesinde chapter silinince hepsi gider)
    await pool.query('DROP TABLE IF EXISTS choices CASCADE');
    await pool.query('DROP TABLE IF EXISTS scenes CASCADE');
    await pool.query('DROP TABLE IF EXISTS chapters CASCADE');

    // 1. CHAPTERS (Sort order ile sıralama)
    await pool.query(`
      CREATE TABLE chapters (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    // 2. SCENES (Content artık JSONB, Timeout eklendi)
    await pool.query(`
      CREATE TABLE scenes (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE, -- Chapter silinirse sahne de silinir
        title VARCHAR(255),
        content JSONB DEFAULT '[]', -- Örn: [{"text":"Selam", "duration":3}, {"text":"Kaç!", "duration":2}]
        media_url TEXT,
        media_type VARCHAR(50),
        choice_timeout INTEGER DEFAULT 0, -- 0: Sınırsız, 10: 10 saniye
        is_starting_scene BOOLEAN DEFAULT FALSE
      );
    `);

    // 3. CHOICES (Değişmedi, aynı mantık)
    await pool.query(`
      CREATE TABLE choices (
        id SERIAL PRIMARY KEY,
        scene_id INTEGER REFERENCES scenes(id) ON DELETE CASCADE,
        target_scene_id INTEGER,
        text VARCHAR(255) NOT NULL,
        req_stat_key VARCHAR(50),
        req_stat_val INTEGER DEFAULT 0,
        effect_stat_key VARCHAR(50),
        effect_stat_val INTEGER DEFAULT 0
      );
    `);

    console.log("✅ BAŞARILI: Veritabanı interaktif sinema moduna geçti!");
    process.exit();
  } catch (err) {
    console.error("❌ HATA:", err.message);
    process.exit(1);
  }
};

setupCinema();