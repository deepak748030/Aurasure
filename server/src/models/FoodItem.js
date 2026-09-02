'use strict';

const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    restaurantId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    prepTime: { type: Number, default: 0, min: 0 },
    isVeg: { type: Boolean, default: true },
    isBestseller: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isSpecial: { type: Boolean, default: false },
    vibeId: { type: String },
    tags: { type: [String], default: [] },
    image: { type: mongoose.Schema.Types.Mixed, default: null },
    categoryIds: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

foodItemSchema.index({ name: 'text', description: 'text', tags: 'text' });
foodItemSchema.index({ restaurantId: 1, categoryIds: 1 });

module.exports = mongoose.model('FoodItem', foodItemSchema);
