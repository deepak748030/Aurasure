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
    etaMinutes: { type: Number, default: 0, min: 0 },
    address: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

orderSchema.index({ user: 1, placedAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
