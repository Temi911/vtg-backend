const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { AppError } = require('../utils/AppError');

// Express serves the backend workspace root (the parent of src) as static files.
// Keep verification evidence outside that entire tree, not merely outside src.
const STATIC_ROOT = path.resolve(__dirname, '..', '..');
if (process.env.NODE_ENV === 'production' && !process.env.UPLOAD_DIR) {
  throw new Error('UPLOAD_DIR must point to a mounted persistent volume in production');
}
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.resolve(__dirname, '..', '..', '..', 'private-uploads'));
if (UPLOAD_DIR === STATIC_ROOT || UPLOAD_DIR.startsWith(STATIC_ROOT + path.sep)) {
  throw new Error('UPLOAD_DIR must be outside the public static web root');
}
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIME_EXTENSIONS = new Map([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    // Never use user-supplied filenames for on-disk paths.
    cb(null, crypto.randomUUID() + (MIME_EXTENSIONS.get(file.mimetype) || '.bin'));
  },
});

function fileFilter(req, file, cb) {
  if (!MIME_EXTENSIONS.has(file.mimetype)) {
    return cb(new AppError('Unsupported file type. Upload a PDF, JPEG, PNG, or WEBP file.', 400, 'UNSUPPORTED_FILE_TYPE'));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

function hasValidSignature(mimeType, bytes) {
  if (mimeType === 'application/pdf') return bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (mimeType === 'image/webp') return bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

function validateUploadedFile(req, res, next) {
  if (!req.file) return next();
  fs.promises.readFile(req.file.path)
    .then((bytes) => {
      if (!hasValidSignature(req.file.mimetype, bytes)) {
        return fs.promises.unlink(req.file.path).catch(() => {}).then(() => {
          next(new AppError('The file contents do not match the declared file type.', 400, 'FILE_SIGNATURE_MISMATCH'));
        });
      }
      next();
    })
    .catch((err) => {
      fs.promises.unlink(req.file.path).catch(() => {});
      next(new AppError('The uploaded file could not be validated.', 400, 'FILE_VALIDATION_FAILED'));
    });
}

module.exports = { upload, UPLOAD_DIR, validateUploadedFile, hasValidSignature };
