const pool = require('./config/db');

const upgradeLogic = async () => {
  try {
    console.log("🧠 Logic V2 Yükleniyor...");

    // Choices tablosunu tamamen yeniliyoruz (Daha esnek yapı için)
    await pool.query('DROP TABLE IF EXISTS choices CASCADE');

    await pool.query(`
      CREATE TABLE choices (
        id SERIAL PRIMARY KEY,
        scene_id INTEGER REFERENCES scenes(id) ON DELETE CASCADE,
        text VARCHAR(255) NOT NULL,
        
        -- Varsayılan Hedef (Hiçbir koşul tutmazsa buraya gider)
        target_scene_id INTEGER, 
        
        -- ÇOKLU KOŞULLAR (AND Mantığı)
        -- Örn: [{"key": "str", "val": 10}, {"key": "int", "val": 5}]
        requirements JSONB DEFAULT '[]',
        
        -- ÇOKLU ETKİLER
        -- Örn: [{"key": "hp", "val": -10}, {"key": "exp", "val": 20}]
        effects JSONB DEFAULT '[]',
        
        -- DİNAMİK ROTALAR
        -- Örn: [{"target": 5, "key": "hp", "operator": ">", "val": 50}]
        dynamic_routes JSONB DEFAULT '[]'
      );
    `);

    console.log("✅ BAŞARILI: Veritabanı Çoklu Mantık ve Dinamik Rota sistemine geçti!");
    process.exit();
  } catch (err) {
    console.error("❌ HATA:", err.message);
    process.exit(1);
  }
};

upgradeLogic();