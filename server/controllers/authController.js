const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { registerSchema, loginSchema } = require('../utils/validate');

// Token Üretme Fonksiyonu
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Oturum 30 gün açık kalır
  });
};

// --- KAYIT OL (REGISTER) ---
exports.register = async (req, res, next) => {
  try {
    // 1. Gelen veriyi doğrula
    const { error } = registerSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.status = 400;
      throw err;
    }

    const { username, email, password } = req.body;

    // 2. Kullanıcı zaten var mı? (Email veya Username)
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (userCheck.rows.length > 0) {
      const err = new Error('Bu e-posta veya kullanıcı adı zaten kullanımda.');
      err.status = 409; // Conflict
      throw err;
    }

    // 3. Şifreleme (Hashing)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Veritabanına Kayıt
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role, created_at',
      [username, email, passwordHash]
    );

    // 5. Token oluştur
    const token = generateToken(newUser.rows[0].id, newUser.rows[0].role);

    // 6. Yanıt Döndür
    res.status(201).json({
      success: true,
      message: 'Kayıt başarılı',
      token,
      user: newUser.rows[0]
    });

  } catch (err) {
    next(err); // Hatayı global handler'a gönder
  }
};

// --- GİRİŞ YAP (LOGIN) ---
exports.login = async (req, res, next) => {
  try {
    // 1. Veri doğrulama
    const { error } = loginSchema.validate(req.body);
    if (error) {
      const err = new Error(error.details[0].message);
      err.status = 400;
      throw err;
    }

    const { email, password } = req.body;

    // 2. Kullanıcıyı bul
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (user.rows.length === 0) {
      const err = new Error('Geçersiz e-posta veya şifre'); // Güvenlik için genel hata mesajı
      err.status = 401;
      throw err;
    }

    // 3. Şifre kontrolü
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) {
      const err = new Error('Geçersiz e-posta veya şifre');
      err.status = 401;
      throw err;
    }

    // 4. Token oluştur
    const token = generateToken(user.rows[0].id, user.rows[0].role);

    // 5. Hassas verileri (şifre hash'i) temizle
    const userInfo = { ...user.rows[0] };
    delete userInfo.password_hash;

    res.status(200).json({
      success: true,
      message: 'Giriş başarılı',
      token,
      user: userInfo
    });

  } catch (err) {
    next(err);
  }
};