'use strict';

/**
 * Delivery partner (rider) profile.
 *
 * One phone → one role. A delivery partner is a `User` with
 * `role: 'delivery'`, and this collection keeps all rider-specific KYC,
 * duty, location, COD and payout state out of the shared `User` document.
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

const issueSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const incidentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, default: 'sos' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    note: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const depositSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['upi', 'hub', 'bank'], default: 'upi' },
    refId: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
    note: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

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
    name: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    city: { type: String, default: '', trim: true },
    pincode: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },

    // KYC / identity
    vehicleType: { type: String, enum: ['bike', 'scooter', 'cycle', 'ev', ''], default: '' },
    vehicleNumber: { type: String, default: '', trim: true },
    pan: { type: String, default: '', trim: true },
    aadhaar: { type: String, default: '', trim: true },
    drivingLicense: { type: String, default: '', trim: true },
    rcNumber: { type: String, default: '', trim: true },
    trainingCompleted: { type: Boolean, default: false },
    quizCompleted: { type: Boolean, default: false },

    bank: { type: bankSchema, default: () => ({}) },
    documents: { type: [documentSchema], default: [] },
    reviewNote: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: '' },
    submittedAt: { type: Date, default: null },

    // Duty & location
    dutyState: {
      type: String,
      enum: ['offline', 'online', 'on_task', 'break'],
      default: 'offline',
      index: true,
    },
    lastLat: { type: Number, default: null },
    lastLng: { type: Number, default: null },
    lastPingAt: { type: Date, default: null },

    // Money
    codInHand: { type: Number, default: 0, min: 0 },
    maxCodLimit: { type: Number, default: 3000, min: 0 },
    payoutBalance: { type: Number, default: 0, min: 0 },
    totalTrips: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0, min: 0 },
    currentDayTrips: { type: Number, default: 0, min: 0 },
    currentDayEarnings: { type: Number, default: 0, min: 0 },
    currentDayDate: { type: String, default: '', index: true },

    // Performance
    rating: { type: Number, default: 5, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    offerCount: { type: Number, default: 0, min: 0 },
    acceptanceCount: { type: Number, default: 0, min: 0 },

    issues: { type: [issueSchema], default: [] },
    incidents: { type: [incidentSchema], default: [] },
    codDeposits: { type: [depositSchema], default: [] },
    pushToken: { type: String, default: '' },
    referralCode: { type: String, default: '', trim: true, uppercase: true },
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

deliveryPartnerSchema.index({ status: 1, dutyState: 1, updatedAt: -1 });

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
