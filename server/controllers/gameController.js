const pool = require('../config/db');

// --- YENİ OYUN OLUŞTUR (Sadece Admin) ---
exports.createGame = async (req, res, next) => {
  try {
    const { title, description, slug, stat_definitions, game_config, initial_stats } = req.body;

    // Slug (URL ismi) daha önce kullanılmış mı?
    const slugCheck = await pool.query('SELECT * FROM games WHERE slug = $1', [slug]);
    if (slugCheck.rows.length > 0) {
      const err = new Error('Bu URL ismi (slug) zaten kullanılıyor. Başka bir tane seçin.');
      err.status = 400;
      throw err;
    }

    const newGame = await pool.query(
      `INSERT INTO games 
      (title, description, slug, stat_definitions, game_config, initial_stats, is_published) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`,
      [
        title, 
        description, 
        slug, 
        JSON.stringify(stat_definitions || []), 
        JSON.stringify(game_config || {}), 
        JSON.stringify(initial_stats || {}),
        false // Varsayılan olarak yayında değil
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Oyun taslağı oluşturuldu.',
      game: newGame.rows[0]
    });

  } catch (err) {
    next(err);
  }
};

// --- OYUNLARI LİSTELE (Admin hepsini görür, User sadece yayındakileri) ---
exports.getGames = async (req, res, next) => {
  try {
    let query = 'SELECT * FROM games';
    
    // Eğer admin değilse sadece yayında olanları göster
    // Not: req.user middleware'den geliyor.
    /* Burada basitlik olsun diye herkese her şeyi gösterip 
       frontend'de filtreleyebiliriz ama güvenli olan budur: */
       
    // Şimdilik Admin panelini yaptığımız için tüm oyunları çekelim:
    query += ' ORDER BY created_at DESC';

    const games = await pool.query(query);

    res.status(200).json({
      success: true,
      count: games.rows.length,
      data: games.rows
    });
  } catch (err) {
    next(err);
  }
};

// --- TEK BİR OYUN DETAYI ---
exports.getGameBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const game = await pool.query('SELECT * FROM games WHERE slug = $1', [slug]);

    if (game.rows.length === 0) {
      const err = new Error('Oyun bulunamadı');
      err.status = 404;
      throw err;
    }

    res.status(200).json({
      success: true,
      data: game.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
// ... (Önceki kodların altına ekle)

// --- OYUN GÜNCELLE ---
exports.updateGame = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Frontend'den gelen güncel veriler
    const { title, description, cover_image, is_published, stat_definitions, initial_stats, game_config, design_theme, default_char_name, default_char_image, character_setup_audio } = req.body;
    const updatedGame = await pool.query(
      `UPDATE games SET 
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       cover_image = COALESCE($3, cover_image),
       is_published = COALESCE($4, is_published),
       stat_definitions = COALESCE($5, stat_definitions),
       initial_stats = COALESCE($6, initial_stats),
       game_config = COALESCE($7, game_config),
       design_theme = COALESCE($8, design_theme),
       default_char_name = COALESCE($9, default_char_name),
       default_char_image = COALESCE($10, default_char_image),
       character_setup_audio = COALESCE($11, character_setup_audio),
       updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [
        title, 
        description, 
        cover_image, 
        is_published, 
        stat_definitions ? JSON.stringify(stat_definitions) : null,
        initial_stats ? JSON.stringify(initial_stats) : null,
        game_config ? JSON.stringify(game_config) : null,
        design_theme || 'default',
        default_char_name || 'Gezgin',
        default_char_image || null,
        character_setup_audio || null,
        id
      ]
    );

    if (updatedGame.rows.length === 0) {
      const err = new Error('Oyun bulunamadı veya güncelleme yetkiniz yok.');
      err.status = 404;
      throw err;
    }

    res.status(200).json({
      success: true,
      message: 'Oyun güncellendi.',
      data: updatedGame.rows[0]
    });

  } catch (err) {
    next(err);
  }
};

// ...

// --- OYUNCU İÇİN TÜM VERİYİ GETİR (Load Game) ---
// --- OYUNU OYNAMAK İÇİN GETİR (Public) ---
exports.getGameForPlay = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Oyunu Çek
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Oyun bulunamadı.' });

    // 2. Bölümleri Çek
    const chaptersResult = await pool.query(
      'SELECT * FROM chapters WHERE game_id = $1 ORDER BY sort_order ASC', 
      [id]
    );

    // 3. Sahneleri ve Seçenekleri Çek (DÜZELTİLDİ: c.* kullanarak her şeyi alıyoruz)
    const scenesResult = await pool.query(`
      SELECT 
        s.*,
        (
          SELECT json_agg(c.*) 
          FROM choices c 
          WHERE c.scene_id = s.id
        ) as choices
      FROM scenes s
      WHERE s.game_id = $1
      ORDER BY s.id ASC
    `, [id]);

    res.status(200).json({
      success: true,
      data: {
        game: gameResult.rows[0],
        chapters: chaptersResult.rows,
        scenes: scenesResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
};
// --- OYUN SİL ---
exports.deleteGame = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Oyunu sil (Bağlı olan her şey CASCADE ile silinecek)
    const result = await pool.query('DELETE FROM games WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Oyun bulunamadı.' });
    }

    res.status(200).json({ success: true, message: 'Oyun ve tüm içeriği başarıyla silindi.' });
  } catch (err) {
    next(err);
  }
};

