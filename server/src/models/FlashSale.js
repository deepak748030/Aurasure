'use strict';

const mongoose = require('mongoose');

/**
 * Flash sale event. One module per event; the app counts down to `endsAt`
 * and renders `itemIds` in the given order (food item ids for the food
 * module, product ids for shop). A sale is live when `active` is true and
 * now falls inside [startsAt, endsAt].
 */
const flashSaleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    module: { type: String, enum: ['food', 'shop'], required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    subtitle: { type: String, default: '', trim: true, maxlength: 120 },
    badge: { type: String, default: '', trim: true, maxlength: 20 },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    itemIds: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

module.exports = mongoose.model('FlashSale', flashSaleSchema);
