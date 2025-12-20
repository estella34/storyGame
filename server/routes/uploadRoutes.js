const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { uploadFile } = require('../controllers/uploadController');
const { protect, adminOnly } = require('../middleware/auth');

// Sadece Adminler dosya yükleyebilir
// 'media' -> Frontend'den gelen form alanının adı olacak
router.post('/', protect, adminOnly, upload.single('media'), uploadFile);

module.exports = router;