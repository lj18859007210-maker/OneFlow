const express = require('express');
const router = express.Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const config = require('../config');

router.use(authMiddleware);

const UPLOAD_DIR = path.join(__dirname, '..', config.upload.dir);

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 简单实现：使用 multer 解析
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('仅支持图片文件'));
  }
});

router.post('/', upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: '未收到文件' });
  }

  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ success: true, data: urls });
});

module.exports = router;
