const pool = require('./config/db');

const resetTables = async () => {
  try {
    console.log("⏳ Tablolar sıfırlanıyor (Zorla Silme Modu)...");

    // 1. CASCADE ekleyerek zorla siliyoruz
    // Bu komut, bu tablolara bağlı olan her şeyi de uçurur.
    await pool.query('DROP TABLE IF EXISTS choices CASCADE');
    await pool.query('DROP TABLE IF EXISTS scenes CASCADE');
    
    console.log("🗑️  Eski tablolar ve bağlantıları temizlendi.");

    // 2. SAHNELER TABLOSU (Doğru Sütunlarla)
    await pool.query(`
      CREATE TABLE scenes (
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

    // 3. SEÇİMLER TABLOSU
    await pool.query(`
      CREATE TABLE choices (
        id SERIAL PRIMARY KEY,
        scene_id INTEGER REFERENCES scenes(id) ON DELETE CASCADE,
        target_scene_id INTEGER,
        text VARCHAR(255) NOT NULL,
        required_stat VARCHAR(50),
        required_value INTEGER DEFAULT 0
      );
    `);

    console.log("✅ BAŞARILI: Tablolar tertemiz bir şekilde yeniden kuruldu!");
    process.exit();
  } catch (err) {
    console.error("❌ HATA:", err.message);
    process.exit(1);
  }
};

resetTables();