'use strict';

const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: 'Home' },
    line: { type: String, required: true },
    city: { type: String, required: true },
    pin: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const favoriteSchema = new mongoose.Schema(
  {
    module: { type: String, enum: ['food', 'shop'], required: true },
    refId: { type: String, required: true },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    // Public id used by the mobile app (same shape as mock data).
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: mongoose.Schema.Types.Mixed, default: null },
    wallet: { type: Number, default: 0, min: 0 },
    addresses: { type: [addressSchema], default: [] },
    favorites: { type: [favoriteSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        delete ret._id;
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('User', userSchema);
