'use strict';

const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    module: { type: String, enum: ['food', 'shop'], required: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    badge: { type: String },
    image: { type: mongoose.Schema.Types.Mixed, default: null },
    // { kind: 'search' } | { kind:'product', productId } | { kind:'category', categoryId } | { kind:'store', storeId }
    target: { type: mongoose.Schema.Types.Mixed, default: null },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

module.exports = mongoose.model('Banner', bannerSchema);
