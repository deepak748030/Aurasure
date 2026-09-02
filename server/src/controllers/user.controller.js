'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/response');
const { newId } = require('../utils/id');

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
  const { label, line, city, pin, isDefault } = req.body;
  const address = { id: newId('adr'), label, line, city, pin, isDefault: Boolean(isDefault) };
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

  const { label, line, city, pin, isDefault } = req.body;
  if (label !== undefined) address.label = label;
  if (line !== undefined) address.line = line;
  if (city !== undefined) address.city = city;
  if (pin !== undefined) address.pin = pin;
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

module.exports = {
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
