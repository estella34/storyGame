const jwt = require('jsonwebtoken');
require('dotenv').config();

const jwtGenerator = (user_id, role) => {
  const payload = {
    user: {
      id: user_id,
      role: role
    }
  };

  // Token 1 saat geçerli olsun (Güvenlik için)
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

module.exports = jwtGenerator;
