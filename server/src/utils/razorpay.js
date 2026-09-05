'use strict';

const crypto = require('crypto');
const config = require('../config/env');
const ApiError = require('./ApiError');

function credentials() {
  const keyId = config.razorpay.keyId;
  const keySecret = config.razorpay.keySecret;
  if (!keyId || !keySecret) {
    throw ApiError.serviceUnavailable(
      'Online payments are not configured on this server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      'PAYMENTS_UNCONFIGURED',
    );
  }
  return { keyId, keySecret };
}

function authHeader() {
  const { keyId, keySecret } = credentials();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

async function razorpayFetch(path, { method = 'GET', body } = {}) {
  credentials();
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.error?.description || json?.error?.reason || 'Razorpay request failed';
    throw ApiError.serviceUnavailable(message, 'RAZORPAY_ERROR');
  }
  return json;
}

async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  return razorpayFetch('/orders', {
    method: 'POST',
    body: {
      amount: amountPaise,
      currency: 'INR',
      receipt,
      payment_capture: 1,
      notes: notes || {},
    },
  });
}

function verifySignature(orderId, paymentId, signature) {
  const { keySecret } = credentials();
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(signature || ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { credentials, createRazorpayOrder, verifySignature };
