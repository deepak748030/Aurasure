'use strict';

const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: 'Home' },
    line: { type: String, required: true },
    city: { type: String, required: true },
    pin: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const favoriteSchema = new mongoose.Schema(
  {
    module: { type: String, enum: ['food', 'shop'], required: true },
    refId: { type: String, required: true },
  },
  { _id: false },
);

// Wallet ledger entry (money in/out).
const walletTxSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    title: { type: String, required: true },
    note: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// Loyalty ledger entry (points earned/redeemed).
const loyaltyTxSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['earned', 'redeemed'], required: true },
    title: { type: String, required: true },
    note: { type: String, default: '' },
    points: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const couponSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    code: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    minOrder: { type: Number, default: 0 },
    offType: { type: String, enum: ['flat', 'percent'], default: 'flat' },
    offValue: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    // Public id used by the mobile app (same shape as mock data).
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: mongoose.Schema.Types.Mixed, default: null },
    // Wallet (Rupee balance) + ledger.
    wallet: { type: Number, default: 0, min: 0 },
    walletTxs: { type: [walletTxSchema], default: [] },
    // Loyalty points + ledger + tier helpers.
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    loyaltyTxs: { type: [loyaltyTxSchema], default: [] },
    // Coupons owned by this user.
    coupons: { type: [couponSchema], default: [] },
    // Referral programme.
    referralCode: { type: String, sparse: true, unique: true, trim: true, uppercase: true },
    referredBy: { type: String, trim: true, uppercase: true, default: null },
    // Delivery/manufacturer partnership application snapshot.
    partnerApplication: { type: mongoose.Schema.Types.Mixed, default: null },
    addresses: { type: [addressSchema], default: [] },
    favorites: { type: [favoriteSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        delete ret._id;
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('User', userSchema);
