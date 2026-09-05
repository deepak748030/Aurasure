'use strict';

const mongoose = require('mongoose');

const cartLineSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    refId: { type: String, required: true },
    kind: { type: String, enum: ['food', 'shop'], required: true },
    name: { type: String, required: true },
    meta: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    image: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    module: { type: String, enum: ['food', 'shop'], required: true, index: true },
    vendorId: { type: String, default: null, index: true },
    outletId: { type: String, default: null, index: true },
    placedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
      index: true,
    },
    items: { type: [cartLineSchema], required: true },
    itemTotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    // How the order was paid. `wallet` = deducted from the user's balance.
    payBy: { type: String, enum: ['wallet', 'cod', 'upi', 'card'], default: 'cod' },
    // Wallet money actually charged for this order (0 when not wallet-paid).
    walletPaid: { type: Number, default: 0, min: 0 },
    // Loyalty points earned by placing this order.
    loyaltyEarned: { type: Number, default: 0, min: 0 },
    etaMinutes: { type: Number, default: 0, min: 0 },
    address: { type: String, required: true },
    // Coupon that was redeemed on this order (kept for cancellation restores).
    couponId: { type: String, default: null },
    couponCode: { type: String, default: null },
    // Reason the customer gave when cancelling (empty for live/active orders).
    cancelReason: { type: String, default: '' },
    // Customer instruction, e.g. the cart's "if any product is not
    // available → …" preference. Shown to fulfilment in the admin console.
    instructions: { type: String, default: '' },
    payoutCredited: { type: Boolean, default: false },
    // Delivery partner fields - filled once a rider takes / finishes the trip.
    deliveryTaskId: { type: String, default: null, index: true },
    deliveryPartnerId: { type: String, default: null },
    deliveryPartnerName: { type: String, default: '' },
    deliveryPartnerPhone: { type: String, default: '' },
    deliveredAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

orderSchema.index({ user: 1, placedAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
