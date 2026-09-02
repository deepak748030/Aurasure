'use strict';

/**
 * Image uploads - multer, disk storage, on our own server.
 *
 * Files land in `server/uploads/<yyyy-mm>/` and are served back as static
 * files from `/uploads/...` (see app.js). No third-party storage, no CDN, no
 * external API: the bytes never leave this machine.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');

/** Extensions we accept, mapped from the MIME type the browser reports. */
const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/pjpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
  ['image/svg+xml', '.svg'],
]);

/** `uploads/2026-09` - keeps the folder from turning into one huge directory. */
function currentBucket() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      cb(null, ensureDir(path.join(config.uploads.dir, currentBucket())));
    } catch (err) {
      cb(err);
    }
  },
  filename(req, file, cb) {
    // Never trust the client's filename - keep only a readable slug of it.
    const base = path
      .parse(file.originalname || 'image')
      .name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'image';
    const ext = ALLOWED.get(file.mimetype) || '.jpg';
    cb(null, `${base}-${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED.has(file.mimetype)) {
    cb(ApiError.badRequest(`Unsupported image type: ${file.mimetype}`, 'UNSUPPORTED_FILE_TYPE'));
    return;
  }
  cb(null, true);
}

const uploader = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.uploads.maxFileSizeMb * 1024 * 1024,
    files: config.uploads.maxFiles,
  },
});

/**
 * Wraps a multer middleware so its own errors come back in the API's standard
 * envelope (`LIMIT_FILE_SIZE` → a readable 400 instead of a raw multer throw).
 */
function handle(middleware) {
  return (req, res, next) =>
    middleware(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            ApiError.badRequest(
              `Image is larger than ${config.uploads.maxFileSizeMb} MB`,
              'FILE_TOO_LARGE',
            ),
          );
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(
            ApiError.badRequest(`Upload at most ${config.uploads.maxFiles} images at a time`, 'TOO_MANY_FILES'),
          );
        }
        return next(ApiError.badRequest(err.message, 'UPLOAD_FAILED'));
      }
      return next(err);
    });
}

/** `POST` with a single `image` field. */
const singleImage = handle(uploader.single('image'));

/** `POST` with up to `config.uploads.maxFiles` files in an `images` field. */
const manyImages = handle(uploader.array('images', config.uploads.maxFiles));

module.exports = { singleImage, manyImages, ALLOWED, ensureDir, currentBucket };
