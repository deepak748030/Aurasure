import React from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/lib/icons';
import { Tag } from '@/components/ui/Primitives';
import { useColors } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/tokens';
import type { Nav, Route } from '@/navigation/types';

type Kind = 'cancellation' | 'refund' | 'privacy' | 'terms';

const POLICIES: Record<Kind, { title: string; icon: IconName; updated: string; intro: string; sections: { heading: string; body: string }[] }> = {
  cancellation: {
    title: 'Cancellation policy',
    icon: 'circleX',
    updated: 'Updated 1 Aug 2026',
    intro: 'You can cancel an Aurasure order for free while it is still with us — after that the store may already have started making it.',
    sections: [
      { heading: 'Free until the store confirms', body: 'An order placed but not yet confirmed can be cancelled in one tap from the order screen. Your wallet payment is refunded instantly and the coupon goes back to you.' },
      { heading: 'After confirmation', body: 'Once the kitchen or store confirms, cancellation needs their approval. Ask support from the order screen and they will call the outlet for you.' },
      { heading: 'Prepared food', body: 'Food that has already been cooked cannot be brought back, so a confirmed order that was made is not refundable. We will always tell you what the store decided.' },
      { heading: 'Loyalty points', body: 'Points earned by a cancelled order are removed. If you had already redeemed them, your balance may go down to zero — never below it.' },
    ],
  },
  refund: {
    title: 'Refund policy',
    icon: 'bank',
    updated: 'Updated 1 Aug 2026',
    intro: 'Refunds go back the way they came: wallet to wallet, and cash orders are settled by the store or rider on the spot.',
    sections: [
      { heading: 'Wallet payments', body: 'Refunded to your Aurasure wallet within minutes of the cancellation being accepted. You can see the credit in the wallet history.' },
      { heading: 'Cash on delivery', body: 'Nothing was taken, so nothing is returned. If the rider already collected money, the outlet refunds you directly.' },
      { heading: 'Missing or wrong items', body: 'Report it from the order screen the same day. We re-check the items against the store invoice and credit the difference to your wallet.' },
      { heading: 'Timing', body: 'Wallet credits are instant. Anything routed to a bank — which this build does not do yet — takes 5-7 working days.' },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    icon: 'shieldLock',
    updated: 'Updated 1 Aug 2026',
    intro: 'Aurasure keeps only what an order needs. Here is exactly what is stored and who can see it.',
    sections: [
      { heading: 'What we store', body: 'Your name, mobile number, optional email, delivery addresses, orders, wallet and loyalty ledger. Nothing else.' },
      { heading: 'Location', body: 'The app asks for location only when you tap "Use current location". It is used to sort nearby stores and is not written to your account.' },
      { heading: 'On your phone', body: 'Your sign-in token, cart and recent searches live in this device\'s storage. Clearing the app data or using Settings → Clear local data removes them.' },
      { heading: 'Who sees what', body: 'The store you order from sees the items, the address and your phone number so it can deliver. Nobody else gets your details, and we do not sell them.' },
    ],
  },
  terms: {
    title: 'Terms of use',
    icon: 'terms',
    updated: 'Updated 1 Aug 2026',
    intro: 'The short version of the agreement you accept when you create an Aurasure account.',
    sections: [
      { heading: 'Orders', body: 'Prices, availability and delivery fees come from the store and are confirmed when the order is created. If something changes between your cart and the invoice, the store\'s price is what you pay.' },
      { heading: 'Your account', body: 'Keep your phone number and password to yourself. One account per customer, and orders are tied to the account that placed them.' },
      { heading: 'Coupons & rewards', body: 'One coupon per order. Codes have a minimum order value and an expiry; the server checks both when you pay. Points: 5 per ₹100 spent, redeemed 100 points = ₹10.' },
      { heading: 'This build', body: 'This app talks to the Aurasure demo API. It has no payment gateway, no push notifications and no in-app chat, and the interface says so wherever those would have been.' },
    ],
  },
};

/** Static policy screens (the reference app's `policy_view.dart`). */
export function PolicyScreen({ route }: { navigation: Nav; route: Route<'Policy'> }): React.ReactElement {
  const c = useColors();
  const policy = POLICIES[route.params.kind];

  return (
    <Screen title={policy.title} subtitle={policy.updated} back>
      <View style={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: c.primaryFaint, borderWidth: 1, borderColor: c.border }}>
          <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={policy.icon} size={18} color={c.onPrimary} />
          </View>
          <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>
            {policy.intro}
          </Text>
        </View>

        {policy.sections.map((section, index) => (
          <View key={section.heading} style={{ paddingLeft: spacing.sm, borderLeftWidth: 3, borderLeftColor: index % 2 === 0 ? c.primary : c.secondary, gap: 4 }}>
            <Text variant="subtitle" weight="bold">
              {section.heading}
            </Text>
            <Text variant="bodySm" tone="muted">
              {section.body}
            </Text>
          </View>
        ))}

        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingTop: spacing.xs }}>
          <Tag label="Plain language" icon="info" tone="muted" />
          <Tag label="Matches the server rules" icon="shield" tone="success" />
        </View>
      </View>
    </Screen>
  );
}
