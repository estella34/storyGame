const pool = require('../config/db');

// --- SAHNELERİ VE CHAPTERLARI GETİR ---
exports.getScenes = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    
    // 1. Önce Chapterları Çek
    const chaptersResult = await pool.query(
      'SELECT * FROM chapters WHERE game_id = $1 ORDER BY sort_order ASC', 
      [gameId]
    );

    // 2. Sahneleri ve Seçimleri Çek
    const scenesResult = await pool.query(`
      SELECT 
        s.*, 
        (SELECT json_agg(c.*) FROM choices c WHERE c.scene_id = s.id) as choices 
      FROM scenes s 
      WHERE s.game_id = $1 
      ORDER BY s.id ASC
    `, [gameId]);

    res.status(200).json({ 
      success: true, 
      data: {
        chapters: chaptersResult.rows,
        scenes: scenesResult.rows
      }
    });
  } catch (err) {
    next(err);
  }
};

// --- YENİ CHAPTER OLUŞTUR ---
exports.createChapter = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { title } = req.body;
    const result = await pool.query(
      'INSERT INTO chapters (game_id, title) VALUES ($1, $2) RETURNING *',
      [gameId, title]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// --- YENİ SAHNE OLUŞTUR ---
exports.createScene = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { title, chapter_id } = req.body; // Artık chapter_id de alıyoruz

    // ... createScene içinde ...
    const result = await pool.query(
    'INSERT INTO scenes (game_id, chapter_id, title, content) VALUES ($1, $2, $3, $4) RETURNING *',
    [gameId, chapter_id, title || 'Yeni Sahne', JSON.stringify([])] // Boş JSON listesi
  );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// --- SAHNE GÜNCELLE ---
exports.updateScene = async (req, res, next) => {
  try {
    const { id } = req.params;
    // req.body'den gelen verileri alıyoruz. is_end_scene ve is_final burada önemli!
    const { title, content, media_url, media_type, is_starting_scene, is_end_scene, is_final, choices } = req.body;

    // Eğer bu sahne başlangıç sahnesi yapılıyorsa, aynı oyundaki diğer tüm sahnelerin başlangıç işaretini kaldır
    if (is_starting_scene === true) {
      // Önce bu sahnenin game_id'sini bul
      const currentScene = await pool.query('SELECT game_id FROM scenes WHERE id = $1', [id]);
      if (currentScene.rows.length > 0) {
        const gameId = currentScene.rows[0].game_id;
        // Aynı oyundaki tüm sahnelerin is_starting_scene değerini false yap
        await pool.query(
          'UPDATE scenes SET is_starting_scene = false WHERE game_id = $1 AND id != $2',
          [gameId, id]
        );
      }
    }

    const sceneResult = await pool.query(
      `UPDATE scenes SET 
       title = COALESCE($1, title),
       content = COALESCE($2, content),
       media_url = COALESCE($3, media_url),
       media_type = COALESCE($4, media_type),
       is_starting_scene = COALESCE($5, is_starting_scene),
       choice_timeout = COALESCE($6, choice_timeout), 
       is_end_scene = COALESCE($7, is_end_scene),
       is_final = COALESCE($8, is_final)
       WHERE id = $9 RETURNING *`,              
      [
        title, 
        JSON.stringify(content), 
        media_url, 
        media_type, 
        is_starting_scene, 
        choices?.timeout || req.body.choice_timeout, 
        is_end_scene,
        is_final, // 👈 is_final eklendi
        id            // 👈 ID SON SIRADA
      ]
    );

    // Seçimleri Güncelle (Logic V2 + V3)
    if (choices) {
      await pool.query('DELETE FROM choices WHERE scene_id = $1', [id]);
      
      for (const choice of choices) {
        await pool.query(
          `INSERT INTO choices 
           (scene_id, target_scene_id, text, requirements, effects, dynamic_routes, result_content) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id, 
            choice.target_scene_id || null, 
            choice.text,
            JSON.stringify(choice.requirements || []),
            JSON.stringify(choice.effects || []),
            JSON.stringify(choice.dynamic_routes || []),
            JSON.stringify(choice.result_content || [])
          ]
        );
      }
    }

    res.status(200).json({ success: true, data: sceneResult.rows[0] });
  } catch (err) {
    next(err);
  }
};

// --- SAHNE SİL ---
exports.deleteScene = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM scenes WHERE id = $1', [id]);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.deleteChapter = async (req, res, next) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM chapters WHERE id = $1', [id]);
      res.status(200).json({ success: true, message: 'Chapter ve içindekiler silindi.' });
    } catch (err) {
      next(err);
    }
  };