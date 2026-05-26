const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const BASE_UPLOAD_DIR = path.resolve(__dirname, '..', config.upload.dir);

function getScopeDirectory(scope) {
  return path.join(BASE_UPLOAD_DIR, 'attachments', scope);
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureAttachmentDirectories() {
  ensureDirectory(BASE_UPLOAD_DIR);
  ['formal', 'comment'].forEach(scope => ensureDirectory(getScopeDirectory(scope)));
}

function createStorage(scope) {
  ensureAttachmentDirectories();
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, getScopeDirectory(scope)),
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname || ''))
  });
}

function createUploader(scope) {
  return multer({
    storage: createStorage(scope),
    limits: { fileSize: config.upload.maxFileSize }
  });
}

function buildRelativeStoragePath(scope, filename) {
  return path.posix.join('attachments', scope, filename);
}

function resolveStoragePath(relativePath) {
  return path.join(BASE_UPLOAD_DIR, relativePath);
}

function toStoredFileInfo(scope, file) {
  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size,
    storagePath: buildRelativeStoragePath(scope, file.filename)
  };
}

function buildAttachmentFileRoute(kind, id, mode = 'download') {
  return `/api/attachments/files/${kind}/${id}?mode=${mode}`;
}

module.exports = {
  ensureAttachmentDirectories,
  createUploader,
  resolveStoragePath,
  toStoredFileInfo,
  buildAttachmentFileRoute
};
