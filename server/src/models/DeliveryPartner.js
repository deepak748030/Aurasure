'use strict';

/**
 * Placeholder for the upcoming Delivery Partner app.
 * Kept as its own collection + unique phone so vendor KYC never collides
 * with rider onboarding (a phone can later be a rider without being a vendor).
 */
const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    status: {
      type: String,
      enum: ['onboarding', 'submitted', 'under_review', 'needs_info', 'approved', 'rejected', 'suspended'],
      default: 'onboarding',
      index: true,
    },
    name: { type: String, default: '' },
    city: { type: String, default: '' },
    vehicleType: { type: String, enum: ['bike', 'scooter', 'cycle', 'ev', ''], default: '' },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
