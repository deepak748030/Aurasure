'use strict';

const mongoose = require('mongoose');

/**
 * Single-document customer-app configuration (`key: 'app'`). Everything the
 * app used to hard-code as business rules lives here and is editable from
 * Admin → App configuration: referral + loyalty math, wallet presets,
 * support channels, payment methods, tips, trending searches, delivery ETA
 * bounds and known city centres. All fields are public-safe.
 */
const appSettingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    key: { type: String, required: true, unique: true, index: true },
    referral: {
      walletReward: { type: Number, default: 50, min: 0 },
      pointsReward: { type: Number, default: 250, min: 0 },
      referrerWallet: { type: Number, default: 100, min: 0 },
      terms: { type: [String], default: [] },
    },
    loyalty: {
      earnPer100: { type: Number, default: 5, min: 0 },
      redeemPoints: { type: Number, default: 100, min: 1 },
      redeemValue: { type: Number, default: 10, min: 0 },
      tiers: {
        type: [{ name: String, min: Number, color: String, _id: false }],
        default: [],
      },
    },
    wallet: {
      topupPresets: { type: [Number], default: [100, 250, 500, 1000] },
      minTopup: { type: Number, default: 10, min: 1 },
      maxTopup: { type: Number, default: 25000, min: 1 },
    },
    support: {
      phone: { type: String, default: '+919000000000' },
      displayPhone: { type: String, default: '+91 90000 00000' },
      email: { type: String, default: 'support@aurasure.app' },
      hours: { type: String, default: 'Mon–Sat · 9:00–21:00' },
      slaMinutes: { type: Number, default: 15, min: 0 },
    },
    payments: {
      type: [{ key: String, label: String, sub: String, icon: String, enabled: Boolean, _id: false }],
      default: [],
    },
    checkout: {
      tips: { type: [Number], default: [0, 10, 20, 30, 50] },
    },
    search: {
      food: { type: [String], default: [] },
      shop: { type: [String], default: [] },
    },
    delivery: {
      defaultEta: { type: Number, default: 20, min: 1 },
      minEta: { type: Number, default: 10, min: 1 },
      maxEta: { type: Number, default: 90, min: 1 },
    },
    cityCenters: { type: Map, of: { lat: Number, lng: Number, _id: false }, default: {} },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

module.exports = mongoose.model('AppSetting', appSettingSchema);
