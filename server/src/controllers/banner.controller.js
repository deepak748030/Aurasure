'use strict';

const Banner = require('../models/Banner');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const { toAppImage } = require('../utils/imageRef');

/** GET /api/v1/banners?module=food|shop (default: all active) */
const listBanners = asyncHandler(async (req, res) => {
  const { module } = req.query;
  const query = { active: true };
  if (module === 'food' || module === 'shop') query.module = module;

  const items = await Banner.find(query).sort({ sortOrder: 1 });
  return ok(res, { banners: items.map((b) => ({ ...b.toJSON(), image: toAppImage(b.image) })) });
});

module.exports = { listBanners };
