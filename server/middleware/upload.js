const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');

const ensureDir = (dir) => { if (!fs.existsSync(dir)){ fs.mkdirSync(dir, { recursive: true }); }};
ensureDir(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'others';
    if (file.mimetype.startsWith('image')) folder = 'images';
    else if (file.mimetype.startsWith('video')) folder = 'videos';
    else if (file.mimetype.startsWith('audio')) {
        // Frontend'den gelen 'uploadType' verisine göre klasör seçimi
        // Header veya body ile gönderilmesi gerekebilir ama basitlik için mimetype yetmezse
        // varsayılan olarak background'a atalım, ayrımı controllerda yapabiliriz.
        // Şimdilik sesleri genel 'audio' klasörüne değil, isteğe göre ayıracağız.
        // Ancak Multer destination'da req.body bazen dolu gelmeyebilir.
        // En garantisi: Dosya isminden veya genel audio klasöründen gitmek.
        // Biz burada basitçe 'sounds' diyelim, alt klasör ayrımını manuel yapalım.
        folder = req.body.folderType === 'emotion' ? 'emotions' : 'background_sounds';
    }
    
    const finalPath = path.join(uploadDir, folder);
    ensureDir(finalPath);
    cb(null, finalPath);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const uniqueName = `${uuidv4()}-${sanitizedName}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image') || file.mimetype.startsWith('video') || file.mimetype.startsWith('audio')) {
    cb(null, true);
  } else {
    cb(new Error('Desteklenmeyen dosya formatı!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

module.exports = upload;