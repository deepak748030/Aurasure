'use strict';

const mongoose = require('mongoose');

const shopStoreSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String },
    road: { type: String },
    house: { type: String },
    city: { type: String, required: true },
    pin: { type: String },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    deliveryMins: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    promo: { type: String },
    isNiche: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    categoryIds: { type: [String], default: [] },
    cover: { type: mongoose.Schema.Types.Mixed, default: null },
    vendorId: { type: String, default: null, index: true },
    isClosed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

shopStoreSchema.index({ name: 'text', road: 'text', tags: 'text', city: 'text' });

module.exports = mongoose.model('ShopStore', shopStoreSchema);
