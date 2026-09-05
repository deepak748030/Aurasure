'use strict';

const mongoose = require('mongoose');

/**
 * "Write to us" ticket from the customer app's Help centre. `response` is
 * the admin's reply, visible to the customer; setting it notifies them.
 */
const supportTicketSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userPublicId: { type: String, default: '', index: true },
    name: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    orderCode: { type: String, default: null, trim: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open', index: true },
    response: { type: String, default: '', trim: true, maxlength: 1000 },
    resolvedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

supportTicketSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
