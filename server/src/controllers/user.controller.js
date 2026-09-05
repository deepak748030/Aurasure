'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/response');
const { newId } = require('../utils/id');
const Restaurant = require('../models/Restaurant');
const ShopStore = require('../models/ShopStore');
const { getAppSettings } = require('../utils/settings');

function asCoord(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** GET /api/v1/users/me */
const getMe = asyncHandler(async (req, res) => ok(res, { user: req.user.toJSON() }));

/** PUT /api/v1/users/me */
const updateMe = asyncHandler(async (req, res) => {
  // NOTE: `wallet` is intentionally NOT editable here - money only moves
  // through the wallet ledger endpoints (rewards controller).
  const allowed = ['name', 'email', 'avatar'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) req.user[key] = req.body[key];
  }
  await req.user.save();
  return ok(res, { user: req.user.toJSON() });
});

/** GET /api/v1/users/me/addresses */
const getAddresses = asyncHandler(async (req, res) => ok(res, { addresses: req.user.addresses }));

/** POST /api/v1/users/me/addresses */
const addAddress = asyncHandler(async (req, res) => {
  const { label, line, city, pin, isDefault, lat, lng } = req.body;
  const address = { id: newId('adr'), label, line, city, pin, isDefault: Boolean(isDefault), lat: asCoord(lat), lng: asCoord(lng) };
  if (address.isDefault) req.user.addresses.forEach((a) => (a.isDefault = false));
  req.user.addresses.push(address);
  await req.user.save();
  return created(res, { address }, { message: 'Address added' });
});

/** PUT /api/v1/users/me/addresses/:addressId */
const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const address = req.user.addresses.find((a) => a.id === addressId);
  if (!address) throw ApiError.notFound('Address not found', 'ADDRESS_NOT_FOUND');

  const { label, line, city, pin, isDefault, lat, lng } = req.body;
  if (label !== undefined) address.label = label;
  if (line !== undefined) address.line = line;
  if (city !== undefined) address.city = city;
  if (pin !== undefined) address.pin = pin;
  if (lat !== undefined) address.lat = asCoord(lat);
  if (lng !== undefined) address.lng = asCoord(lng);
  if (isDefault !== undefined) {
    if (isDefault) req.user.addresses.forEach((a) => (a.isDefault = false));
    address.isDefault = Boolean(isDefault);
  }
  await req.user.save();
  return ok(res, { address });
});

/** DELETE /api/v1/users/me/addresses/:addressId */
const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const before = req.user.addresses.length;
  req.user.addresses = req.user.addresses.filter((a) => a.id !== addressId);
  if (req.user.addresses.length === before) throw ApiError.notFound('Address not found', 'ADDRESS_NOT_FOUND');
  await req.user.save();
  return noContent(res);
});

/** POST /api/v1/users/me/partner-application - body { kind, name?, city? } */
const savePartnerApplication = asyncHandler(async (req, res) => {
  const { kind, name, city } = req.body;
  if (kind === 'vendor') {
    throw ApiError.badRequest(
      'Vendors onboard in the Aurasure Vendor app — one phone, one module, full KYC. This customer number cannot become a vendor.',
      'USE_VENDOR_APP',
    );
  }
  const existing = req.user.partnerApplication && req.user.partnerApplication.kind === kind
    ? req.user.partnerApplication
    : null;
  req.user.partnerApplication = {
    kind,
    name: String(name || req.user.name || '').trim(),
    city: String(city || '').trim(),
    appliedAt: existing ? existing.appliedAt : new Date(),
    status: existing ? existing.status : 'submitted',
  };
  await req.user.save();
  return ok(res, { application: req.user.partnerApplication });
});

/** GET /api/v1/users/me/favorites */
const getFavorites = asyncHandler(async (req, res) => ok(res, { favorites: req.user.favorites }));

/** PUT /api/v1/users/me/favorites - body: { module, refId, liked } */
const putFavorite = asyncHandler(async (req, res) => {
  const { module, refId, liked } = req.body;
  const exists = req.user.favorites.some((f) => f.module === module && f.refId === refId);

  if (liked === false || exists) {
    req.user.favorites = req.user.favorites.filter((f) => !(f.module === module && f.refId === refId));
  } else if (!exists) {
    req.user.favorites.push({ module, refId });
  }
  await req.user.save();
  return ok(res, { favorites: req.user.favorites });
});

/** GET /api/v1/users/me/delivery-estimate?module=&city= — honest "when" copy. */
const getDeliveryEstimate = asyncHandler(async (req, res) => {
  const module = req.query.module === 'shop' ? 'shop' : 'food';
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const settings = await getAppSettings();
  const Model = module === 'food' ? Restaurant : ShopStore;
  const query = module === 'food' ? { isClosed: { $ne: true } } : {};
  if (city) query.city = city;
  let outlets = await Model.find(query).sort({ rating: -1 }).limit(5);
  if (!outlets.length && city) {
    outlets = await Model.find(module === 'food' ? { isClosed: { $ne: true } } : {}).sort({ rating: -1 }).limit(5);
  }
  const field = module === 'food' ? 'deliveryTime' : 'deliveryMins';
  const etas = outlets.map((o) => Number(o[field]) || settings.delivery.defaultEta);
  const etaMinutes = etas.length
    ? Math.min(settings.delivery.maxEta, Math.max(settings.delivery.minEta, Math.round(Math.min(...etas))))
    : settings.delivery.defaultEta;
  return ok(res, {
    module,
    city: city || null,
    etaMinutes,
    label: etas.length ? `Delivery in ~${etaMinutes} min` : 'Delivery slots open soon',
    outlets: outlets.map((o) => ({ id: o.id, name: o.name, city: o.city || null })),
  });
});

module.exports = {
  getDeliveryEstimate,
  getMe,
  updateMe,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getFavorites,
  putFavorite,
  savePartnerApplication,
};
