const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = req.user?.id?.toString() || 'anonymous';
    const dest = path.join(__dirname, '..', 'uploads', userId);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const sanitized = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const upload = multer({ storage });

module.exports = upload;


