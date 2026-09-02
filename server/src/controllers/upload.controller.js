'use strict';

/**
 * Upload endpoints for the admin panel.
 *
 * Images are written to disk by `middlewares/upload.js` (multer) and served
 * straight back from this server at `/uploads/...`. Responses carry the same
 * `ImageRef` shape the mobile app already understands:
 *   { kind: 'uri', uri: 'http://host/uploads/2026-09/burger-xyz.jpg' }
 */

const fs = require('fs/promises');
const path = require('path');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');

/** Absolute, publicly reachable base URL for links we hand back. */
function baseUrl(req) {
  if (config.uploads.publicBaseUrl) return config.uploads.publicBaseUrl;
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

/** Turn a multer file into the API's public payload. */
function describe(req, file) {
  const relative = path
    .relative(config.uploads.dir, file.path)
    .split(path.sep)
    .join('/');
  const urlPath = `${config.uploads.publicPath}/${relative}`;
  return {
    // What you store on a record's `image` / `cover` field.
    image: { kind: 'uri', uri: `${baseUrl(req)}${urlPath}` },
    url: `${baseUrl(req)}${urlPath}`,
    // Same-origin path - handy for the panel, which proxies /uploads.
    path: urlPath,
    file: relative,
    name: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  };
}

/** POST /api/v1/admin/uploads  (multipart field: `image`) */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image received - send a file in the `image` field', 'NO_FILE');
  return ok(res, describe(req, req.file), undefined, 201);
});

/** POST /api/v1/admin/uploads/bulk  (multipart field: `images`) */
const uploadImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw ApiError.badRequest('No images received', 'NO_FILE');
  return ok(res, { uploads: files.map((file) => describe(req, file)) }, undefined, 201);
});

/**
 * DELETE /api/v1/admin/uploads/:bucket/:file
 * Removes a file we previously stored. The path is resolved and checked so a
 * crafted `..` can never escape the uploads directory.
 */
const deleteUpload = asyncHandler(async (req, res) => {
  const relative = path.join(req.params.bucket || '', req.params.file || '');
  const target = path.resolve(config.uploads.dir, relative);
  const root = path.resolve(config.uploads.dir);

  if (!target.startsWith(root + path.sep)) {
    throw ApiError.badRequest('Invalid file path', 'INVALID_PATH');
  }

  try {
    await fs.unlink(target);
  } catch (err) {
    if (err.code === 'ENOENT') throw ApiError.notFound('File not found', 'FILE_NOT_FOUND');
    throw err;
  }

  return ok(res, { deleted: relative.split(path.sep).join('/') });
});

module.exports = { uploadImage, uploadImages, deleteUpload };
