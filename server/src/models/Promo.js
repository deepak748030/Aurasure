'use strict';

const mongoose = require('mongoose');

/**
 * Promo code (coupon campaign).
 *
 * This is the *catalogue* of codes the admin panel creates. A code becomes
 * spendable when it lands in a user's `coupons[]` array - either because an
 * admin issued it (`POST /admin/promos/:id/issue`) or because the customer
 * claimed it with the code (`POST /users/me/coupons/claim`). Checkout keeps
 * reading `user.coupons`, so the order flow is untouched.
 */
const promoSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    subtitle: { type: String, default: '', trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 400 },

    // Which side of the super-app the code belongs to.
    module: { type: String, enum: ['all', 'food', 'shop'], default: 'all', index: true },

    // Discount rule. `maxDiscount` only applies to percentage codes.
    offType: { type: String, enum: ['flat', 'percent'], default: 'flat' },
    offValue: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },

    // Validity window (both optional - null = no bound).
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    // 0 = unlimited. `perUserLimit` counts copies a single customer may hold.
    usageLimit: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 1 },

    // Counters maintained when the code is issued / claimed.
    issuedCount: { type: Number, default: 0, min: 0 },
    redeemedCount: { type: Number, default: 0, min: 0 },

    // Customers can enter the code themselves in the app.
    selfClaim: { type: Boolean, default: true },
    active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        delete ret._id;
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('Promo', promoSchema);
