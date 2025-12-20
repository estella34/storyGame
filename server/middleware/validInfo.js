const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const validInfo = (req, res, next) => {
  const schema = req.path === '/register' ? registerSchema : loginSchema;
  
  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ 
      success: false, 
      message: error.details[0].message 
    });
  }

  next();
};

module.exports = validInfo;
