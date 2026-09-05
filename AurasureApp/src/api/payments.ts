import { apiPost } from './client';

export type PayMethod = 'upi' | 'card' | 'netbanking' | 'paytm' | 'phonepe';

export interface PaymentIntent {
  paymentId: string;
  razorpayOrderId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  keyId: string;
  name: string;
  description: string;
  prefill: { name: string; contact: string; email: string };
  method: PayMethod;
}

export interface PaymentConfirm {
  paymentId: string;
  status: 'paid';
  amount: number;
  purpose: 'wallet' | 'order';
  wallet: number;
}

export function createPaymentIntent(input: {
  amount: number;
  purpose: 'wallet' | 'order';
  method: PayMethod;
}): Promise<PaymentIntent> {
  return apiPost<PaymentIntent>('/payments/intents', input, { auth: true });
}

export function confirmPayment(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<PaymentConfirm> {
  return apiPost<PaymentConfirm>('/payments/confirm', input, { auth: true });
}
