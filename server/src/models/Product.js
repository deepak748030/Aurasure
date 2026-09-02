'use strict';

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    storeId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: '' },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    inStock: { type: Boolean, default: true },
    isNew: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isSpecialOffer: { type: Boolean, default: false },
    deliveryMins: { type: Number, default: 0, min: 0 },
    tags: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    sizes: { type: [String] },
    image: { type: mongoose.Schema.Types.Mixed, default: null },
    categoryId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
    // `isNew` mirrors the mobile app's field name; document-level `isNew`
    // getter is unused, so suppressing the reserved-key warning is safe.
    suppressReservedKeysWarning: true,
  },
);

productSchema.index({ name: 'text', brand: 'text', description: 'text', tags: 'text' });
productSchema.index({ storeId: 1, categoryId: 1 });

module.exports = mongoose.model('Product', productSchema);
