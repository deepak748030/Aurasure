'use strict';

const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    cuisines: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    deliveryTime: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    distanceKm: { type: Number, default: 0, min: 0 },
    priceForTwo: { type: Number, default: 0, min: 0 },
    promo: { type: String },
    isVeg: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },
    isNewlyJoined: { type: Boolean, default: false },
    isClosed: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    offer: { type: String },
    line: { type: String },
    cover: { type: mongoose.Schema.Types.Mixed, default: null },
    tags: { type: [String], default: [] },
    categoryIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
    // `isNew` mirrors the mobile app's field name; we never rely on the
    // document-level `doc.isNew` getter, so the reserved-key warning is safe
    // to suppress.
    suppressReservedKeysWarning: true,
  },
);

restaurantSchema.index({ name: 'text', cuisines: 'text', tags: 'text' });

module.exports = mongoose.model('Restaurant', restaurantSchema);
