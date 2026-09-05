import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  method,
  onClose,
  onPaid,
}: {
  visible: boolean;
  amount: number;
  purpose: 'wallet' | 'order';
  /**
   * Pass this when the caller has already selected the method on its own page.
   * The sheet then opens Razorpay directly instead of asking the user to choose
   * the same method again.
   */
  method?: PayMethod;
  onClose: () => void;
  onPaid: (result: PaymentConfirm) => void;
}): React.ReactElement | null {
  const c = useColors();
  const sheet = useSheet();
  const [busy, setBusy] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const busyRef = useRef(false);
  const autoStartedKey = useRef<string | null>(null);
  const startSeq = useRef(0);

  const selectedMethod = useMemo(() => (method && METHODS.some((row) => row.key === method) ? method : undefined), [method]);
  const selectedRow = useMemo(() => METHODS.find((row) => row.key === selectedMethod), [selectedMethod]);

  const handleSheetClose = useCallback(() => {
    startSeq.current += 1;
    setHtml(null);
    onClose();
  }, [onClose]);

  const start = useCallback(
    async (nextMethod: PayMethod, options: { closeOnError?: boolean } = {}): Promise<void> => {
      if (busyRef.current) return;
      const seq = startSeq.current + 1;
      startSeq.current = seq;
      busyRef.current = true;
      setBusy(true);
      try {
        const intent = await createPaymentIntent({ amount, purpose, method: nextMethod });
        if (startSeq.current !== seq) return;
        setHtml(checkoutHtml({ ...intent, method: nextMethod }));
      } catch (error) {
        if (options.closeOnError) handleSheetClose();
        sheet.error('Could not start payment', error instanceof ApiError ? error.message : 'Try again.');
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [amount, handleSheetClose, purpose, sheet],
  );

  const autoKey = selectedMethod ? `${purpose}:${amount}:${selectedMethod}` : null;
  useEffect(() => {
    if (!visible) {
      autoStartedKey.current = null;
      startSeq.current += 1;
      setHtml(null);
      return;
    }
    if (!selectedMethod || !autoKey || html || busyRef.current || autoStartedKey.current === autoKey) return;
    autoStartedKey.current = autoKey;
    void start(selectedMethod, { closeOnError: true });
  }, [autoKey, html, selectedMethod, start, visible]);

  const closeCheckout = useCallback(() => {
    startSeq.current += 1;
    setHtml(null);
    if (selectedMethod) onClose();
  }, [onClose, selectedMethod]);

  const onMessage = async (raw: string): Promise<void> => {
    let payload: { type?: string; razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string; reason?: string } = {};
    try {
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      return;
    }
    if (payload.type === 'dismiss' || payload.type === 'failed') {
      closeCheckout();
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
      closeCheckout();
      sheet.error('Could not confirm payment', error instanceof ApiError ? error.message : 'Contact support if money was deducted.');
    }
  };

  if (!visible && !html) return null;

  return (
    <>
      <Sheet
        visible={visible && !html && Boolean(selectedMethod)}
        onClose={handleSheetClose}
        title="Opening Razorpay"
        subtitle={`${money(amount)} · ${selectedRow?.label ?? 'Online payment'}`}
        icon={selectedRow?.icon ?? 'creditCard'}
        dismissLabel="Cancel"
      >
        <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
          <Text variant="caption" tone="muted" style={{ marginTop: 8 }}>
            Opening secure checkout…
          </Text>
        </View>
      </Sheet>

      <Sheet
        visible={visible && !html && !selectedMethod}
        onClose={handleSheetClose}
        title="Pay with Razorpay"
        subtitle={`${money(amount)} · UPI, Paytm, PhonePe, cards or net banking`}
        icon="creditCard"
        dismissLabel="Cancel"
      >
        {busy ? (
          <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
            <ActivityIndicator color={c.primary} />
            <Text variant="caption" tone="muted" style={{ marginTop: 8 }}>
              Opening secure checkout…
            </Text>
          </View>
        ) : (
          METHODS.map((row) => (
            <SheetOption
              key={row.key}
              label={row.label}
              description={row.description}
              icon={row.icon}
              onPress={() => void start(row.key)}
            />
          ))
        )}
      </Sheet>

      <Modal visible={Boolean(html)} animationType="slide" onRequestClose={closeCheckout}>
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
