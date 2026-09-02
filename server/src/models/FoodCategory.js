'use strict';

const mongoose = require('mongoose');

const foodCategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, required: true },
    image: { type: mongoose.Schema.Types.Mixed, default: null },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

module.exports = mongoose.model('FoodCategory', foodCategorySchema);
