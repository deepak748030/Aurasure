'use strict';

const mongoose = require('mongoose');

/**
 * Stored notification. Two flavours:
 *  - user: `userId` set (public user `id`), e.g. "support replied".
 *  - broadcast: `broadcast: true`, shown to every customer (optionally one
 *    `module`). Order / wallet / loyalty events are *composed* at read time
 *    from the user's real records, so they need no stored docs.
 */
const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: null, index: true },
    broadcast: { type: Boolean, default: false, index: true },
    module: { type: String, enum: ['all', 'food', 'shop'], default: 'all', index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 400 },
    icon: { type: String, default: 'bell', trim: true, maxlength: 40 },
    tone: { type: String, enum: ['primary', 'success', 'warning', 'danger', 'muted'], default: 'primary' },
    kind: { type: String, enum: ['orders', 'money', 'promo', 'support'], default: 'promo', index: true },
    orderId: { type: String, default: null, index: true },
    link: { type: String, default: null },
    readBy: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

notificationSchema.index({ broadcast: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
