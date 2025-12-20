const pool = require('./config/db');

const upgradeRPG = async () => {
  try {
    console.log("⚔️  RPG Modu Yükleniyor...");

    // 1. Temizlik (Her şeyi sıfırla)
    await pool.query('DROP TABLE IF EXISTS choices CASCADE');
    await pool.query('DROP TABLE IF EXISTS scenes CASCADE');
    await pool.query('DROP TABLE IF EXISTS chapters CASCADE');

    // 2. CHAPTER TABLOSU (Yeni!)
    await pool.query(`
      CREATE TABLE chapters (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    // 3. SAHNELER (Artık Chapter'a bağlı)
    await pool.query(`
      CREATE TABLE scenes (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL, -- Yeni Bağlantı
        title VARCHAR(255),
        content TEXT,
        media_url TEXT,
        media_type VARCHAR(50),
        is_starting_scene BOOLEAN DEFAULT FALSE
      );
    `);

    // 4. SEÇİMLER (Gereksinimler ve Etkiler Eklendi)
    await pool.query(`
      CREATE TABLE choices (
        id SERIAL PRIMARY KEY,
        scene_id INTEGER REFERENCES scenes(id) ON DELETE CASCADE,
        target_scene_id INTEGER,
        text VARCHAR(255) NOT NULL,
        
        -- GEREKSİNİM (Örn: Sadece 'Güç' > 10 ise görün)
        req_stat_key VARCHAR(50),
        req_stat_val INTEGER,
        
        -- ETKİ / SONUÇ (Örn: Basınca 'Para' +50 artar)
        effect_stat_key VARCHAR(50),
        effect_stat_val INTEGER
      );
    `);

    console.log("✅ BAŞARILI: Veritabanı Chapter ve RPG sistemine yükseltildi!");
    process.exit();
  } catch (err) {
    console.error("❌ HATA:", err.message);
    process.exit(1);
  }
};

upgradeRPG();