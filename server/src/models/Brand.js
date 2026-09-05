'use strict';

const mongoose = require('mongoose');

/**
 * Shop brand (the maker tile on home + the Brands screen).
 * Products link by the exact `brand` string; the API counts live products
 * per brand at read time so counts never go stale.
 */
const brandSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, unique: true, trim: true, index: true },
    tagline: { type: String, default: '', trim: true, maxlength: 120 },
    image: { type: mongoose.Schema.Types.Mixed, default: null },
    featured: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

module.exports = mongoose.model('Brand', brandSchema);
