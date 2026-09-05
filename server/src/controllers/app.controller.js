'use strict';

const Content = require('../models/Content');
const Restaurant = require('../models/Restaurant');
const ShopStore = require('../models/ShopStore');
const AppSetting = require('../models/AppSetting');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const { getAppSettings, bustSettingsCache } = require('../utils/settings');
const { writeAudit } = require('../utils/audit');

/** GET /api/v1/app/settings — public customer-app configuration. */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  return ok(res, { settings });
});

/** GET /api/v1/app/content/:key — faqs / policies / partner-perks. */
const getContent = asyncHandler(async (req, res) => {
  const doc = await Content.findOne({ key: req.params.key });
  if (!doc) throw ApiError.notFound('Content not found', 'CONTENT_NOT_FOUND');
  return ok(res, { content: doc.toJSON() });
});

/**
 * GET /api/v1/app/cities — serviceable cities derived from live outlets
 * (distinct outlet cities + outlet counts + known map centres).
 */
const listCities = asyncHandler(async (req, res) => {
  const [stores, restaurants, settings] = await Promise.all([
    ShopStore.aggregate([{ $group: { _id: '$city', outlets: { $sum: 1 } } }]),
    Restaurant.aggregate([{ $group: { _id: '$city', outlets: { $sum: 1 } } }]),
    getAppSettings(),
  ]);
  const counts = new Map();
  for (const row of [...stores, ...restaurants]) {
    const name = (row._id || '').trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + row.outlets);
  }
  const centers = settings.cityCenters || {};
  const cities = [...counts.entries()]
    .map(([name, outlets]) => ({
      name,
      outlets,
      lat: centers[name]?.lat ?? null,
      lng: centers[name]?.lng ?? null,
    }))
    .sort((a, b) => b.outlets - a.outlets || a.name.localeCompare(b.name));
  return ok(res, { cities });
});

/* ------------------------------ admin ------------------------------ */

/** GET /api/v1/admin/app-settings — raw doc (unmerged) for the panel form. */
const adminGetSettings = asyncHandler(async (req, res) => {
  const doc = await AppSetting.findOne({ key: 'app' });
  return ok(res, { settings: doc ? doc.toJSON() : null });
});

const SETTING_SECTIONS = ['referral', 'loyalty', 'wallet', 'support', 'payments', 'checkout', 'search', 'delivery', 'cityCenters'];

/** PUT /api/v1/admin/app-settings — upsert whitelisted sections. */
const adminUpdateSettings = asyncHandler(async (req, res) => {
  const patch = {};
  for (const section of SETTING_SECTIONS) {
    if (req.body[section] !== undefined) patch[section] = req.body[section];
  }
  if (!Object.keys(patch).length) throw ApiError.badRequest('Nothing to update', 'EMPTY_PATCH');
  const doc = await AppSetting.findOneAndUpdate(
    { key: 'app' },
    { $set: patch, $setOnInsert: { id: 'appsettings_app', key: 'app' } },
    { new: true, upsert: true, runValidators: true },
  );
  bustSettingsCache();
  await writeAudit({ actor: req.user, action: 'app-settings.update', targetType: 'app-setting', targetId: 'app', detail: Object.keys(patch).join(','), req });
  return ok(res, { settings: doc.toJSON() });
});

/** GET /api/v1/admin/content — all editorial docs. */
const adminListContent = asyncHandler(async (req, res) => {
  const docs = await Content.find({}).sort({ key: 1 });
  return ok(res, { contents: docs.map((d) => d.toJSON()) });
});

/** PUT /api/v1/admin/content/:key — replace title/data of one doc. */
const adminUpdateContent = asyncHandler(async (req, res) => {
  const doc = await Content.findOne({ key: req.params.key });
  if (!doc) throw ApiError.notFound('Content not found', 'CONTENT_NOT_FOUND');
  if (typeof req.body.title === 'string' && req.body.title.trim()) doc.title = req.body.title.trim().slice(0, 120);
  if (req.body.data !== undefined) doc.data = req.body.data;
  await doc.save();
  await writeAudit({ actor: req.user, action: 'content.update', targetType: 'content', targetId: doc.key, detail: doc.title, req });
  return ok(res, { content: doc.toJSON() });
});

module.exports = {
  getSettings,
  getContent,
  listCities,
  adminGetSettings,
  adminUpdateSettings,
  adminListContent,
  adminUpdateContent,
};
