import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';

/**
 * Single icon layer for the whole app. MaterialCommunityIcons ships inside
 * `@expo/vector-icons` (no native module, no font download) and every glyph has
 * a real outline twin, so a tab can be outline when idle and solid when active
 * - exactly how the reference 6amMart app behaves.
 *
 * Screens never import the icon set directly; they use `<Icon name="cart" />`
 * so a glyph can be re-tuned in this one file.
 */

const registry = {
  home: ['home', 'home-outline'],
  search: ['magnify', 'magnify'],
  cart: ['cart', 'cart-outline'],
  orders: ['receipt-text', 'receipt-text-outline'],
  menu: ['menu', 'menu'],
  heart: ['heart', 'heart-outline'],
  bell: ['bell', 'bell-outline'],
  user: ['account', 'account-outline'],
  userRound: ['account-circle', 'account-circle-outline'],
  wallet: ['wallet', 'wallet-outline'],
  loyalty: ['crown', 'crown-outline'],
  coupon: ['ticket-percent', 'ticket-percent-outline'],
  ticket: ['ticket', 'ticket-outline'],
  referral: ['account-multiple-plus', 'account-multiple-plus-outline'],
  gift: ['gift', 'gift-outline'],
  mapPin: ['map-marker', 'map-marker-outline'],
  mapPinned: ['map-marker-radius', 'map-marker-radius-outline'],
  navigation: ['compass', 'compass-outline'],
  crosshairs: ['crosshairs-gps', 'crosshairs-gps'],
  layers: ['layers', 'layers-outline'],
  store: ['store', 'store-outline'],
  storefront: ['storefront', 'storefront-outline'],
  bag: ['bag-personal', 'bag-personal-outline'],
  shirt: ['tshirt-crew', 'tshirt-crew-outline'],
  watch: ['watch', 'watch-variant'],
  phoneAndroid: ['cellphone', 'cellphone'],
  headphones: ['headphones', 'headphones'],
  laptop: ['laptop', 'laptop'],
  camera: ['camera', 'camera-outline'],
  sneaker: ['shoe-sneaker', 'shoe-sneaker'],
  dumbbell: ['dumbbell', 'dumbbell'],
  sofa: ['sofa', 'sofa-outline'],
  glasses: ['sunglasses', 'sunglasses'],
  utensils: ['silverware-fork-knife', 'silverware-fork-knife'],
  pizza: ['pizza', 'pizza'],
  burger: ['hamburger', 'hamburger'],
  coffee: ['coffee', 'coffee-outline'],
  iceCream: ['ice-cream', 'ice-cream-outline'],
  cake: ['cake-variant', 'cake-variant-outline'],
  biryani: ['rice', 'rice'],
  noodles: ['noodles', 'noodles'],
  salad: ['bowl', 'bowl-outline'],
  thali: ['pot-steam', 'pot-steam-outline'],
  kebab: ['skewer', 'skewer'],
  fish: ['fish', 'fish'],
  leaf: ['leaf', 'leaf'],
  star: ['star', 'star-outline'],
  starCheck: ['star-check', 'star-check-outline'],
  flame: ['fire', 'fire'],
  sparkles: ['creation', 'creation-outline'],
  tag: ['tag', 'tag-outline'],
  percent: ['percent', 'percent-outline'],
  zap: ['flash', 'flash-outline'],
  clock: ['clock', 'clock-outline'],
  timer: ['timer', 'timer-outline'],
  truck: ['truck-fast', 'truck-fast-outline'],
  bike: ['motorbike', 'motorbike'],
  package: ['package-variant-closed', 'package-variant-closed'],
  box: ['package', 'package'],
  creditCard: ['credit-card-outline', 'credit-card'],
  cash: ['cash', 'cash-outline'],
  bank: ['bank', 'bank-outline'],
  upi: ['cellphone-check', 'cellphone-check'],
  plus: ['plus', 'plus'],
  minus: ['minus', 'minus'],
  check: ['check-bold', 'check-bold'],
  circleCheck: ['check-circle', 'check-circle-outline'],
  circleX: ['close-circle', 'close-circle-outline'],
  x: ['close', 'close'],
  chevronRight: ['chevron-right', 'chevron-right'],
  chevronLeft: ['chevron-left', 'chevron-left'],
  chevronDown: ['chevron-down', 'chevron-down'],
  chevronUp: ['chevron-up', 'chevron-up'],
  arrowRight: ['arrow-right', 'arrow-right'],
  arrowLeft: ['arrow-left', 'arrow-left'],
  arrowUpRight: ['arrow-top-right', 'arrow-top-right'],
  arrowDown: ['arrow-down', 'arrow-down'],
  filter: ['filter-variant', 'filter-variant'],
  sort: ['sort', 'sort'],
  sliders: ['tune-variant', 'tune-variant'],
  refresh: ['refresh', 'refresh'],
  trash: ['trash-can-outline', 'trash-can'],
  edit: ['pencil-outline', 'pencil'],
  copy: ['content-copy', 'content-copy'],
  share: ['share-variant-outline', 'share-variant'],
  shareNode: ['share-variant', 'share-variant-outline'],
  send: ['send', 'send-outline'],
  shield: ['shield-check', 'shield-check-outline'],
  lock: ['lock', 'lock-outline'],
  eye: ['eye', 'eye-off'],
  eyeOff: ['eye-off', 'eye'],
  phone: ['phone', 'phone-outline'],
  mail: ['email', 'email-outline'],
  chat: ['chat-processing', 'chat-processing-outline'],
  info: ['information-outline', 'information'],
  alert: ['alert-circle-outline', 'alert-circle'],
  help: ['help-circle', 'help-circle-outline'],
  settings: ['cog-outline', 'cog'],
  logout: ['logout-variant', 'logout-variant'],
  login: ['login', 'login'],
  closeBox: ['book-open-page-variant', 'book-open-page-variant-outline'],
  policy: ['file-document-edit-outline', 'file-document-edit'],
  refund: ['keyboard-backspace', 'keyboard-backspace'],
  world: ['web', 'web-off'],
  palette: ['palette-outline', 'palette'],
  moon: ['weather-night', 'white-balance-sunny'],
  sun: ['white-balance-sunny', 'weather-night'],
  wifiOff: ['wifi-off', 'wifi-off'],
  cloudOff: ['cloud-off-outline', 'cloud-off-outline'],
  database: ['database', 'database-outline'],
  server: ['server', 'server-network'],
  image: ['image-outline', 'image'],
  cameraAlt: ['camera-repo', 'camera-repo-outline'],
  note: ['note-text-outline', 'note-text'],
  list: ['format-list-bulleted', 'format-list-bulleted'],
  grid: ['apps', 'apps'],
  rows: ['view-agenda-outline', 'view-agenda'],
  locationCity: ['map-marker-radius-outline', 'map-marker-radius'],
  flag: ['flag', 'flag-outline'],
  lockOpen: ['lock-open-variant', 'lock-open-variant-outline'],
  deleteAlert: ['delete-alert-outline', 'delete-alert'],
  accountCog: ['account-cog-outline', 'account-cog'],
  currency: ['currency-inr', 'currency-inr'],
  history: ['history', 'history'],
  play: ['play', 'play-outline'],
  cameraSwitch: ['camera-control', 'camera-control-outline'],
  broom: ['broom', 'broom'],
  vibrate: ['vibrate', 'vibrate'],
  mapPinOff: ['map-marker-off', 'map-marker-off-outline'],
  briefcase: ['briefcase', 'briefcase-outline'],
  infinity: ['infinity', 'infinity'],
  terms: ['file-document-edit', 'file-document-edit-outline'],
  privacy: ['shield-lock-outline', 'shield-lock'],
  swapVertical: ['swap-vertical', 'swap-vertical'],
  swapHorizontal: ['swap-horizontal', 'swap-horizontal'],
  shieldCheck: ['shield-check', 'shield-check-outline'],
  handRight: ['hand-back-right', 'hand-back-right-outline'],
  lockCheck: ['lock-check', 'lock-check-outline'],
  megaphone: ['bullhorn', 'bullhorn-outline'],
  ruler: ['ruler', 'ruler'],
  receipt: ['receipt', 'receipt-outline'],
  fastFood: ['food', 'food-variant'],
  shieldLock: ['shield-lock', 'shield-lock-outline'],
  phoneMinus: ['phone-minus', 'phone-minus'],
} as const satisfies Record<string, readonly [string, string]>;

export type IconName = keyof typeof registry;

/** Brand constants live next to the glyph so the splash/about share one source. */
export const BRAND = {
  name: 'Aurasure',
  tagline: 'Food, groceries and daily needs — from stores near you',
  icon: 'sparkles' as IconName,
  logo: require('../../assets/images/logo_aurasure_light.png'),
  mark: require('../../assets/images/logo_mark_light.png'),
};

export const ICON_NAMES = Object.keys(registry) as IconName[];

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Icon({ name, size = 22, color, filled = false, style }: IconProps): React.ReactElement {
  const pair = registry[name] ?? registry.info;
  const glyph = (filled ? pair[1] : pair[0]) as React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  return <MaterialCommunityIcons name={glyph} size={size} color={color} style={style} />;
}

/** Maps the server's category `icon` slugs onto this registry. */
export const CATEGORY_ICON: Record<string, IconName> = {
  utensils: 'utensils',
  pizza: 'pizza',
  beef: 'burger',
  fish: 'fish',
  coffee: 'coffee',
  cake: 'cake',
  salad: 'salad',
  soup: 'thali',
  rice: 'biryani',
  noodles: 'noodles',
  skewer: 'kebab',
  bowl: 'salad',
  pot: 'thali',
  leaf: 'leaf',
  shirt: 'shirt',
  glasses: 'glasses',
  watch: 'watch',
  smartphone: 'phoneAndroid',
  headphones: 'headphones',
  laptop: 'laptop',
  dumbbell: 'dumbbell',
  sofa: 'sofa',
  camera: 'camera',
  shoeSneaker: 'sneaker',
  bag: 'bag',
  store: 'storefront',
};

export function categoryIcon(slug: string | undefined, fallback: IconName = 'grid'): IconName {
  if (!slug) return fallback;
  return CATEGORY_ICON[slug] ?? fallback;
}
