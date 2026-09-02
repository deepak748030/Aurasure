'use strict';

const mongoose = require('mongoose');

const foodVibeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, default: '' },
    image: { type: mongoose.Schema.Types.Mixed, default: null },
    from: { type: String, default: '#6A5EF5' },
    to: { type: String, default: '#8B5CF6' },
    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

module.exports = mongoose.model('FoodVibe', foodVibeSchema);
