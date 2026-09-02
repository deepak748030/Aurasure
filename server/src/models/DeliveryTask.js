'use strict';

/**
 * A delivery job. Created when an order reaches `out_for_delivery` and is
 * consumed by the Delivery Partner app through accept / pickup / deliver
 * transitions. The `state` transitions are:
 *
 *   available → accepted → at_pickup → picked_up → at_drop → delivered
 *                       → (failed / cancelled anytime before delivered)
 */

const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    landmark: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    otp: { type: String, default: '' },
  },
  { _id: false },
);

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    qty: { type: Number, default: 1, min: 1 },
    price: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const deliveryTaskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    orderCode: { type: String, default: '', index: true },
    module: { type: String, enum: ['food', 'shop', ''], default: '' },

    vendorId: { type: String, default: '', index: true },
    vendorName: { type: String, default: '' },
    vendorPhone: { type: String, default: '' },
    pickup: { type: stopSchema, default: () => ({}) },
    drop: { type: stopSchema, default: () => ({}) },

    items: { type: [itemSchema], default: [] },
    total: { type: Number, default: 0, min: 0 },
    codAmount: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    riderPayout: { type: Number, default: 0, min: 0 },

    state: {
      type: String,
      enum: ['available', 'accepted', 'at_pickup', 'picked_up', 'at_drop', 'delivered', 'failed', 'cancelled'],
      default: 'available',
      index: true,
    },

    riderId: { type: String, default: '', index: true },
    riderName: { type: String, default: '' },
    riderPhone: { type: String, default: '' },

    distanceKm: { type: Number, default: null },
    podUrl: { type: String, default: '' },
    note: { type: String, default: '' },
    failReason: { type: String, default: '' },
    rejectedBy: { type: [String], default: [] },

    acceptedAt: { type: Date, default: null },
    arrivedPickupAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    arrivedDropAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_d, ret) => {
        delete ret.__v;
        delete ret._id;
        return ret;
      },
    },
  },
);

deliveryTaskSchema.index({ state: 1, createdAt: -1 });
deliveryTaskSchema.index({ riderId: 1, createdAt: -1 });
deliveryTaskSchema.index({ vendorId: 1, state: 1 });

module.exports = mongoose.model('DeliveryTask', deliveryTaskSchema);
