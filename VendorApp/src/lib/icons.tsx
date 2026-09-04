import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

// Icon layer for Aurasure. MaterialCommunityIcons ships with Expo
// (@expo/vector-icons, 7k+ glyphs, no extra native module, no font download),
// renders crisply at small sizes on Android and reads better than the thin
// lucide strokes this app used to ship.
//
// Each entry is [solid, outline]: the outline twin is drawn by default and the
// solid one when `filled` is set (focused tab, active chip, favourited item...).

export type GlyphName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const registry = {
  search: ['magnify', 'magnify'],
  user: ['account', 'account-outline'],
  userRound: ['account-circle', 'account-circle-outline'],
  heart: ['heart', 'heart-outline'],
  cart: ['cart', 'cart-outline'],
  bell: ['bell', 'bell-outline'],
  chevronRight: ['chevron-right', 'chevron-right'],
  chevronLeft: ['chevron-left', 'chevron-left'],
  chevronDown: ['chevron-down', 'chevron-down'],
  plus: ['plus', 'plus-outline'],
  minus: ['minus', 'minus'],
  check: ['check', 'check-outline'],
  circleCheck: ['check-circle', 'check-circle-outline'],
  x: ['close', 'close-outline'],
  star: ['star', 'star-outline'],
  mapPin: ['map-marker', 'map-marker-outline'],
  mapPinned: ['map-marker-radius', 'map-marker-radius-outline'],
  clock: ['clock', 'clock-outline'],
  timer: ['timer', 'timer-outline'],
  truck: ['truck-fast', 'truck-fast-outline'],
  bike: ['bike', 'bike'],
  filter: ['filter-variant', 'filter-variant'],
  sliders: ['tune', 'tune'],
  arrowRight: ['arrow-right', 'arrow-right'],
  arrowLeft: ['arrow-left', 'arrow-left'],
  arrowUpRight: ['arrow-top-right', 'arrow-top-right'],
  creditCard: ['credit-card', 'credit-card-outline'],
  wallet: ['wallet', 'wallet-outline'],
  tag: ['tag', 'tag-outline'],
  percent: ['percent', 'percent-outline'],
  badgePercent: ['ticket-percent', 'ticket-percent-outline'],
  flame: ['fire', 'fire'],
  package: ['package', 'package'],
  receipt: ['receipt-text', 'receipt-text-outline'],
  // Bottom-tab "Orders" glyph. The plain `receipt`/`receipt-outline` pair draws
  // an almost empty box with a torn edge, which reads as a missing icon at the
  // 22px a tab bar uses; `receipt-text` puts lines inside so it stays legible.
  orders: ['receipt-text', 'receipt-text-outline'],
  settings: ['cog', 'cog-outline'],
  logout: ['logout-variant', 'logout-variant'],
  login: ['login', 'login'],
  phone: ['phone', 'phone-outline'],
  mail: ['email', 'email-outline'],
  navigation: ['compass', 'compass-outline'],
  sparkles: ['creation', 'creation-outline'],
  thumbsUp: ['thumb-up', 'thumb-up-outline'],
  message: ['chat', 'chat-outline'],
  gift: ['gift', 'gift-outline'],
  ticket: ['ticket', 'ticket-outline'],
  store: ['store', 'store-outline'],
  shield: ['shield-check', 'shield-check-outline'],
  zap: ['flash', 'flash-outline'],
  leaf: ['leaf', 'leaf'],
  plusCircle: ['plus-circle', 'plus-circle-outline'],
  more: ['dots-horizontal', 'dots-horizontal'],
  trash: ['trash-can', 'trash-can-outline'],
  edit: ['pencil', 'pencil-outline'],
  refresh: ['refresh', 'refresh'],
  frown: ['emoticon-sad', 'emoticon-sad-outline'],
  bag: ['bag-personal', 'bag-personal-outline'],
  coffee: ['coffee', 'coffee-outline'],
  pizza: ['pizza', 'pizza'],
  salad: ['bowl', 'bowl-outline'],
  soup: ['pot-steam', 'pot-steam-outline'],
  beef: ['food-steak', 'food-steak'],
  fish: ['fish', 'fish'],
  iceCream: ['ice-cream', 'ice-cream'],
  croissant: ['food-croissant', 'food-croissant'],
  cake: ['cake-variant', 'cake-variant-outline'],
  cookie: ['cookie', 'cookie-outline'],
  carrot: ['carrot', 'carrot'],
  sandwich: ['hamburger', 'hamburger'],
  cupSoda: ['cup', 'cup-outline'],
  apple: ['food-apple', 'food-apple-outline'],
  shirt: ['tshirt-crew', 'tshirt-crew-outline'],
  glasses: ['glasses', 'glasses'],
  shoeSneaker: ['shoe-sneaker', 'shoe-sneaker'],
  watch: ['watch', 'watch'],
  smartphone: ['cellphone', 'cellphone'],
  pill: ['pill', 'pill'],
  headphones: ['headphones', 'headphones'],
  laptop: ['laptop', 'laptop'],
  home: ['home', 'home-outline'],
  book: ['book-open-variant', 'book-open-variant-outline'],
  dumbbell: ['dumbbell', 'dumbbell'],
  sofa: ['sofa', 'sofa-outline'],
  gem: ['diamond-stone', 'diamond-stone'],
  gamepad: ['gamepad-variant', 'gamepad-variant-outline'],
  camera: ['camera', 'camera-outline'],
  scan: ['qrcode-scan', 'qrcode-scan'],
  qr: ['qrcode', 'qrcode'],
  calendar: ['calendar-month', 'calendar-month-outline'],
  locate: ['crosshairs-gps', 'crosshairs-gps'],
  rupee: ['currency-inr', 'currency-inr'],
  utensils: ['silverware-fork-knife', 'silverware-fork-knife'],
  chef: ['chef-hat', 'chef-hat'],
  info: ['information', 'information-outline'],
  send: ['send', 'send-outline'],
  repeat: ['repeat', 'repeat'],
  badgeCheck: ['check-decagram', 'check-decagram-outline'],
  gauge: ['speedometer', 'speedometer'],
  trending: ['trending-up', 'trending-up'],
  chart: ['chart-box', 'chart-box-outline'],
  eye: ['eye', 'eye-outline'],
  lock: ['lock', 'lock-outline'],
  cornerDownLeft: ['keyboard-return', 'keyboard-return'],
  image: ['image', 'image-outline'],
  chevronsUpDown: ['unfold-more-horizontal', 'unfold-more-horizontal'],
  arrowUpDown: ['sort-variant', 'sort-variant'],
  circleAlert: ['alert-circle', 'alert-circle-outline'],
  menu: ['menu', 'menu'],
  apps: ['apps', 'apps'],
  grid: ['view-grid', 'view-grid'],
  list: ['format-list-bulleted', 'format-list-bulleted'],
  share: ['share-variant', 'share-variant-outline'],
  wifi: ['wifi', 'wifi'],
  users: ['account-group', 'account-group-outline'],
  helpCircle: ['help-circle', 'help-circle-outline'],
} as const satisfies Record<string, readonly [GlyphName, GlyphName]>;

export type IconName = keyof typeof registry;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Draw the solid glyph instead of the outline one. */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 20, color = '#0B1020', filled, style }: IconProps): React.ReactElement {
  const [solid, outline] = registry[name];
  // Icon fonts render through <Text>, so their style prop is a TextStyle -
  // callers legitimately pass layout styles (margin/padding/flex).
  return (
    <MaterialCommunityIcons name={filled ? solid : outline} size={size} color={color} style={style as StyleProp<TextStyle>} />
  );
}
