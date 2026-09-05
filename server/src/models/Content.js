'use strict';

const mongoose = require('mongoose');

/**
 * Keyed editorial document for the customer app. Known keys:
 *   faqs, policy-cancellation, policy-refund, policy-privacy, policy-terms,
 *   partner-perks
 * `data` is free-form per key (see `seed/data.js` for the shapes). The admin
 * panel edits these through friendly per-key forms, not raw JSON.
 */
const contentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    key: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

module.exports = mongoose.model('Content', contentSchema);
