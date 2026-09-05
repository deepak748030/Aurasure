'use strict';

/**
 * Customer-app configuration loader. Reads the single `AppSetting` document
 * (`key: 'app'`, editable from Admin → App configuration) and deep-merges it
 * over compiled-in defaults, so a missing doc or a missing section can never
 * break the API. Cached for 60s; `bustSettingsCache()` is called after every
 * admin write.
 */

const DEFAULTS = {
  referral: {
    walletReward: 50,
    pointsReward: 250,
    referrerWallet: 100,
    terms: ['₹50 for your friend on their first order', '₹100 in your wallet after their first order', '250 bonus points for both of you', 'No limit on invites'],
  },
  loyalty: {
    earnPer100: 5,
    redeemPoints: 100,
    redeemValue: 10,
    tiers: [
      { name: 'Bronze', min: 0, color: '#C2703D' },
      { name: 'Silver', min: 1000, color: '#94A3B8' },
      { name: 'Gold', min: 2500, color: '#E5A710' },
      { name: 'Platinum', min: 5000, color: '#64748B' },
    ],
  },
  wallet: {
    topupPresets: [100, 250, 500, 1000],
    minTopup: 10,
    maxTopup: 25000,
  },
  support: {
    phone: '+919000000000',
    displayPhone: '+91 90000 00000',
    email: 'support@aurasure.app',
    hours: 'Mon–Sat · 9:00–21:00',
    slaMinutes: 15,
  },
  payments: [
    { key: 'cod', label: 'Cash on delivery', sub: 'Pay the rider when it arrives', icon: 'cash', enabled: true },
    { key: 'wallet', label: 'Aurasure wallet', sub: 'Deducted instantly, refunded on cancellation', icon: 'wallet', enabled: true },
    { key: 'upi', label: 'UPI / card', sub: 'Not enabled on this server build', icon: 'upi', enabled: false },
  ],
  checkout: {
    tips: [0, 10, 20, 30, 50],
  },
  search: {
    food: ['Biryani', 'Pizza', 'Dosa', 'Burger', 'Cake', 'Coffee', 'Thali', 'Rolls'],
    shop: ['Milk', 'Bread', 'Eggs', 'Shampoo', 'T-shirt', 'Earphones', 'Vitamins', 'Detergent'],
  },
  delivery: {
    defaultEta: 20,
    minEta: 10,
    maxEta: 90,
  },
  cityCenters: {
    Raipur: { lat: 21.2514, lng: 81.6296 },
    Bhilai: { lat: 21.2099, lng: 81.4285 },
    Durg: { lat: 21.19, lng: 81.2849 },
  },
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

/** Deep-merge `over` onto `base`; arrays and scalars from `over` win. */
function merge(base, over) {
  if (Array.isArray(over)) return over;
  if (!isPlainObject(base) || !isPlainObject(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [key, value] of Object.entries(over)) {
    out[key] = key in out ? merge(out[key], value) : value;
  }
  return out;
}

let cache = null;
let cachedAt = 0;
const TTL_MS = 60_000;

function bustSettingsCache() {
  cache = null;
  cachedAt = 0;
}

/** Effective settings: DB doc merged over defaults (never throws). */
async function getAppSettings() {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  try {
    // Lazy require avoids a cycle at boot time.
    const AppSetting = require('../models/AppSetting');
    const doc = await AppSetting.findOne({ key: 'app' }).lean();
    cache = merge(DEFAULTS, doc || {});
  } catch {
    cache = { ...DEFAULTS };
  }
  cachedAt = Date.now();
  return cache;
}

module.exports = { DEFAULTS, getAppSettings, bustSettingsCache };
