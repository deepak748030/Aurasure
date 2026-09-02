'use strict';

/**
 * Immutable admin audit trail. Every mutating admin action writes a row here
 * so the Activity Log is a real server-side record (not per-browser local
 * storage).
 */

const mongoose = require('mongoose');

const adminAuditSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    actorId: { type: String, default: '', index: true },
    actorName: { type: String, default: '' },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: '', index: true },
    targetId: { type: String, default: '', index: true },
    targetCode: { type: String, default: '' },
    detail: { type: String, default: '' },
    ip: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_d, ret) => {
        delete ret.__v;
        delete ret._id;
        return ret;
      },
    },
  },
);

adminAuditSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAudit', adminAuditSchema);
