'use strict';

/**
 * One vendor per phone. Module (food | shop) is chosen at signup and never
 * changes. Delivery partners live in a separate collection later so the same
 * phone can become a rider without colliding with this unique index.
 */
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    uri: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    note: { type: String, default: '' },
  },
  { _id: false },
);

const bankSchema = new mongoose.Schema(
  {
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    bankName: { type: String, default: '' },
    upi: { type: String, default: '' },
  },
  { _id: false },
);

const hoursSchema = new mongoose.Schema(
  {
    open: { type: String, default: '10:00' },
    close: { type: String, default: '22:00' },
  },
  { _id: false },
);

const geoSchema = new mongoose.Schema(
  {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  { _id: false },
);

const staffSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['vendor_staff'], default: 'vendor_staff' },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const vendorSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    module: { type: String, enum: ['food', 'shop'], required: true, index: true },
    status: {
      type: String,
      enum: ['onboarding', 'submitted', 'under_review', 'needs_info', 'approved', 'rejected', 'suspended'],
      default: 'onboarding',
      index: true,
    },
    ownerName: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    outletName: { type: String, default: '', trim: true },
    legalName: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    address: { type: String, default: '' },
    landmark: { type: String, default: '' },
    city: { type: String, default: '' },
    pin: { type: String, default: '' },
    gstin: { type: String, default: '' },
    pan: { type: String, default: '' },
    fssai: { type: String, default: '' },
    tradeLicense: { type: String, default: '' },
    cuisines: { type: [String], default: [] },
    categoryIds: { type: [String], default: [] },
    priceForTwo: { type: Number, default: 0 },
    minOrder: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    deliveryMins: { type: Number, default: 30 },
    isVeg: { type: Boolean, default: false },
    bank: { type: bankSchema, default: () => ({}) },
    hours: { type: hoursSchema, default: () => ({}) },
    geo: { type: geoSchema, default: () => ({}) },
    pauseUntil: { type: Date, default: null },
    pauseReason: { type: String, default: '' },
    cover: { type: mongoose.Schema.Types.Mixed, default: null },
    documents: { type: [documentSchema], default: [] },
    reviewNote: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    isOpen: { type: Boolean, default: false },
    acceptingOrders: { type: Boolean, default: false },
    outletId: { type: String, default: null, index: true },
    payoutBalance: { type: Number, default: 0, min: 0 },
    staff: { type: [staffSchema], default: [] },
    pushTokens: {
      type: [{ token: { type: String, required: true }, platform: { type: String, default: 'unknown' }, createdAt: { type: Date, default: Date.now } }],
      default: [],
    },
    issues: {
      type: [
        {
          id: { type: String, required: true },
          title: { type: String, required: true },
          body: { type: String, default: '' },
          status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d, ret) => { delete ret.__v; delete ret._id; return ret; } },
  },
);

vendorSchema.index({ status: 1, module: 1, updatedAt: -1 });

module.exports = mongoose.model('Vendor', vendorSchema);
