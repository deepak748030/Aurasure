'use strict';

const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { newId } = require('../utils/id');
const { walletTx } = require('../utils/ledger');
const { getAppSettings } = require('../utils/settings');
const { credentials, createRazorpayOrder, verifySignature } = require('../utils/razorpay');

const METHODS = ['upi', 'card', 'netbanking', 'paytm', 'phonepe'];
const PURPOSES = ['wallet', 'order'];

function rupeesToPaise(amount) {
  return Math.round(Number(amount) * 100);
}

/** POST /api/v1/payments/intents { amount, purpose, method } */
const createIntent = asyncHandler(async (req, res) => {
  const { keyId } = credentials();
  const settings = await getAppSettings();
  const purpose = PURPOSES.includes(req.body.purpose) ? req.body.purpose : 'order';
  const method = METHODS.includes(req.body.method) ? req.body.method : 'upi';
  const amount = Math.round(Number(req.body.amount));
  const min = purpose === 'wallet' ? settings.wallet.minTopup : 1;
  const max = purpose === 'wallet' ? settings.wallet.maxTopup : 250000;
  if (!Number.isFinite(amount) || amount < min || amount > max) {
    throw ApiError.badRequest(`Amount must be between ₹${min} and ₹${max}`, 'INVALID_AMOUNT');
  }

  const amountPaise = rupeesToPaise(amount);
  const id = newId('pay');
  const rzp = await createRazorpayOrder({
    amountPaise,
    receipt: id.slice(0, 40),
    notes: { purpose, user: String(req.user._id), method, paymentId: id },
  });

  const payment = await Payment.create({
    id,
    user: req.user._id,
    purpose,
    method,
    amount,
    amountPaise,
    razorpayOrderId: rzp.id,
  });

  return created(res, {
    paymentId: payment.id,
    razorpayOrderId: rzp.id,
    amount: payment.amount,
    amountPaise: payment.amountPaise,
    currency: 'INR',
    keyId,
    name: 'Aurasure',
    description: purpose === 'wallet' ? 'Wallet top-up' : 'Order payment',
    prefill: {
      name: req.user.name || '',
      contact: req.user.phone || '',
      email: req.user.email || '',
    },
    method,
  });
});

/** POST /api/v1/payments/confirm { razorpayOrderId, razorpayPaymentId, razorpaySignature } */
const confirmPayment = asyncHandler(async (req, res) => {
  const orderId = String(req.body.razorpayOrderId || '').trim();
  const paymentId = String(req.body.razorpayPaymentId || '').trim();
  const signature = String(req.body.razorpaySignature || '').trim();
  if (!orderId || !paymentId || !signature) {
    throw ApiError.badRequest('Payment confirmation is incomplete', 'PAYMENT_INCOMPLETE');
  }
  if (!verifySignature(orderId, paymentId, signature)) {
    throw ApiError.badRequest('Payment signature did not match', 'PAYMENT_INVALID');
  }

  const payment = await Payment.findOne({ razorpayOrderId: orderId, user: req.user._id });
  if (!payment) throw ApiError.notFound('Payment not found', 'PAYMENT_NOT_FOUND');
  if (payment.status === 'paid') {
    return ok(res, {
      paymentId: payment.id,
      status: 'paid',
      amount: payment.amount,
      purpose: payment.purpose,
      wallet: req.user.wallet,
    });
  }

  payment.status = 'paid';
  payment.razorpayPaymentId = paymentId;
  payment.razorpaySignature = signature;

  let wallet = req.user.wallet;
  if (payment.purpose === 'wallet') {
    req.user.walletTxs = req.user.walletTxs || [];
    const before = req.user.wallet;
    req.user.wallet = Math.round((before + payment.amount) * 100) / 100;
    req.user.walletTxs.push(
      walletTx('credit', {
        title: 'Money added',
        note: `Razorpay · ${payment.method}`,
        amount: payment.amount,
        balanceAfter: req.user.wallet,
      }),
    );
    payment.consumed = true;
    await req.user.save();
    wallet = req.user.wallet;
  }
  await payment.save();

  return ok(res, {
    paymentId: payment.id,
    status: 'paid',
    amount: payment.amount,
    purpose: payment.purpose,
    wallet,
  });
});

module.exports = { createIntent, confirmPayment };
