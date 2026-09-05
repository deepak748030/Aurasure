'use strict';

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: ['wallet', 'order'], required: true },
    method: { type: String, enum: ['upi', 'card', 'netbanking', 'paytm', 'phonepe'], default: 'upi' },
    amount: { type: Number, required: true, min: 1 },
    amountPaise: { type: Number, required: true, min: 100 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
    consumed: { type: Boolean, default: false, index: true },
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
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

module.exports = mongoose.model('Payment', paymentSchema);
