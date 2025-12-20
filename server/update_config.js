const pool = require('./config/db');

const updateConfig = async () => {
  try {
    console.log("⚙️  Oyun Ayarları Güncelleniyor...");

    // game_config sütunu ekle (Varsayılan ayarlarıyla)
    await pool.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS game_config JSONB DEFAULT '{
        "stat_visibility": "always", 
        "relation_visibility": "always",
        "stat_distribution": "admin",
        "relation_distribution": "admin"
      }'
    `);

    console.log("✅ BAŞARILI: Oyun konfigürasyon altyapısı hazır!");
    process.exit();
  } catch (err) {
    console.error("❌ HATA:", err.message);
    process.exit(1);
  }
};

updateConfig();