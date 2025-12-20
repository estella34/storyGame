const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = async (req, res, next) => {
  try {
    // 1. Token var mı header'da?
    const jwtToken = req.header('token');

    if (!jwtToken) {
      return res.status(403).json({ success: false, message: 'Yetkisiz erişim. Lütfen giriş yapın.' });
    }

    // 2. Token geçerli mi?
    const payload = jwt.verify(jwtToken, process.env.JWT_SECRET);

    req.user = payload.user;
    next();

  } catch (err) {
    console.error(err.message);
    return res.status(403).json({ success: false, message: 'Oturum süresi dolmuş veya geçersiz token.' });
  }
};
