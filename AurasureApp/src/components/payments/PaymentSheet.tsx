import React, { useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Sheet, SheetOption } from '@/components/sheet/Sheet';
import { Text } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { useSheet } from '@/components/sheet/SheetProvider';
import { spacing } from '@/theme/tokens';
import { money } from '@/lib/format';
import { ApiError } from '@/api/client';
import { confirmPayment, createPaymentIntent, type PayMethod, type PaymentConfirm } from '@/api/payments';
import type { IconName } from '@/lib/icons';

const METHODS: { key: PayMethod; label: string; description: string; icon: IconName; rzp: 'upi' | 'card' | 'netbanking' | 'wallet' }[] = [
  { key: 'upi', label: 'UPI', description: 'GPay, BHIM and any UPI ID', icon: 'upi', rzp: 'upi' },
  { key: 'phonepe', label: 'PhonePe', description: 'UPI on PhonePe', icon: 'phone', rzp: 'upi' },
  { key: 'paytm', label: 'Paytm', description: 'Paytm UPI / wallet', icon: 'wallet', rzp: 'wallet' },
  { key: 'card', label: 'Debit / credit card', description: 'Visa, Mastercard, RuPay', icon: 'creditCard', rzp: 'card' },
  { key: 'netbanking', label: 'Net banking', description: 'All major Indian banks', icon: 'bank', rzp: 'netbanking' },
];

function checkoutHtml(intent: {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  name: string;
  description: string;
  prefill: { name: string; contact: string; email: string };
  method: PayMethod;
}): string {
  const row = METHODS.find((m) => m.key === intent.method);
  const rzpMethod = row?.rzp ?? 'upi';
  const options = {
    key: intent.keyId,
    amount: intent.amountPaise,
    currency: 'INR',
    name: intent.name,
    description: intent.description,
    order_id: intent.razorpayOrderId,
    prefill: { ...intent.prefill, method: rzpMethod },
    theme: { color: '#67014B' },
    method: {
      upi: rzpMethod === 'upi',
      card: rzpMethod === 'card',
      netbanking: rzpMethod === 'netbanking',
      wallet: rzpMethod === 'wallet',
      emi: false,
      paylater: false,
      cardless_emi: false,
    },
    config: {
      display: {
        hide: [{ method: 'emi' }, { method: 'paylater' }],
      },
    },
    modal: { confirm_close: true, animation: true },
  };
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<style>html,body{margin:0;height:100%;background:#67014B}</style></head><body>
<script>
(function(){
  var options = ${JSON.stringify(options)};
  options.handler = function(r){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'success', razorpay_payment_id:r.razorpay_payment_id, razorpay_order_id:r.razorpay_order_id, razorpay_signature:r.razorpay_signature}));
  };
  options.modal = Object.assign(options.modal || {}, { ondismiss: function(){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'dismiss'}));
  }});
  var rzp = new Razorpay(options);
  rzp.on('payment.failed', function(resp){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'failed', reason:(resp && resp.error && resp.error.description) || 'Payment failed'}));
  });
  rzp.open();
})();
</script></body></html>`;
}

export function PaymentSheet({
  visible,
  amount,
  purpose,
  onClose,
  onPaid,
}: {
  visible: boolean;
  amount: number;
  purpose: 'wallet' | 'order';
  onClose: () => void;
  onPaid: (result: PaymentConfirm) => void;
}): React.ReactElement | null {
  const c = useColors();
  const sheet = useSheet();
  const [busy, setBusy] = useState(false);
  const [html, setHtml] = useState<string | null>(null);

  const start = async (method: PayMethod): Promise<void> => {
    setBusy(true);
    try {
      const intent = await createPaymentIntent({ amount, purpose, method });
      setHtml(checkoutHtml({ ...intent, method }));
    } catch (error) {
      sheet.error('Could not start payment', error instanceof ApiError ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const onMessage = async (raw: string): Promise<void> => {
    let payload: { type?: string; razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string; reason?: string } = {};
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      return;
    }
    if (payload.type === 'dismiss' || payload.type === 'failed') {
      setHtml(null);
      if (payload.type === 'failed') sheet.error('Payment failed', payload.reason || 'Try another method.');
      return;
    }
    if (payload.type !== 'success' || !payload.razorpay_order_id || !payload.razorpay_payment_id || !payload.razorpay_signature) return;
    try {
      const result = await confirmPayment({
        razorpayOrderId: payload.razorpay_order_id,
        razorpayPaymentId: payload.razorpay_payment_id,
        razorpaySignature: payload.razorpay_signature,
      });
      setHtml(null);
      onPaid(result);
    } catch (error) {
      setHtml(null);
      sheet.error('Could not confirm payment', error instanceof ApiError ? error.message : 'Contact support if money was deducted.');
    }
  };

  if (!visible && !html) return null;

  return (
    <>
      <Sheet
        visible={visible && !html}
        onClose={onClose}
        title="Pay with Razorpay"
        subtitle={`${money(amount)} · UPI, Paytm, PhonePe, cards or net banking`}
        icon="creditCard"
        dismissLabel="Cancel"
      >
        {METHODS.map((row) => (
          <SheetOption
            key={row.key}
            label={row.label}
            description={row.description}
            icon={row.icon}
            onPress={() => void start(row.key)}
          />
        ))}
        {busy ? (
          <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
            <ActivityIndicator color={c.primary} />
            <Text variant="caption" tone="muted" style={{ marginTop: 8 }}>
              Opening secure checkout…
            </Text>
          </View>
        ) : null}
      </Sheet>

      <Modal visible={Boolean(html)} animationType="slide" onRequestClose={() => setHtml(null)}>
        <View style={[styles.checkout, { backgroundColor: c.primary }]}>
          {html && Platform.OS !== 'web' ? (
            <WebView
              originWhitelist={['*']}
              source={{ html }}
              onMessage={(event) => void onMessage(event.nativeEvent.data)}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
            />
          ) : html ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
              <Text variant="body" color={c.white} center>
                Razorpay checkout needs the iOS or Android app. Use a device or emulator.
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  checkout: { flex: 1 },
});
