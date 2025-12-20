const pool = require('./config/db');

const createTables = async () => {
  try {
    console.log("⏳ Tablolar oluşturuluyor...");

    // 1. SAHNELER TABLOSU (Scenes)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scenes (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        title VARCHAR(255),
        content TEXT,
        media_url TEXT,
        media_type VARCHAR(50),
        is_starting_scene BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. SEÇİMLER TABLOSU (Choices)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS choices (
        id SERIAL PRIMARY KEY,
        scene_id INTEGER REFERENCES scenes(id) ON DELETE CASCADE,
        target_scene_id INTEGER, -- Hangi sahneye gidecek?
        text VARCHAR(255) NOT NULL,
        required_stat VARCHAR(50), -- Örn: 'cesaret'
        required_value INTEGER DEFAULT 0 -- Örn: 10 (Cesaret 10 lazımsa)
      );
    `);

    console.log("✅ BAŞARILI: 'scenes' ve 'choices' tabloları kuruldu!");
    process.exit();
  } catch (err) {
    console.error("❌ HATA:", err.message);
    process.exit(1);
  }
};

createTables();