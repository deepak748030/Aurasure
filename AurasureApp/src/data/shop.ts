import type { ImageSourcePropType } from 'react-native';
import type { CartItem, Product, ShopCategory, ShopStore } from '@/types';
import { Images } from '@/assets';

type Ref = { kind: 'asset'; source: ImageSourcePropType } | null;

const A = (source: ImageSourcePropType): Ref => ({ kind: 'asset', source });

// ---------------------------------------------------------------------------
// E-COMMERCE (SHOP) MODULE
// ---------------------------------------------------------------------------

export const shopCategories: ShopCategory[] = [
  {
    id: 'sc_fashion',
    name: 'Fashion',
    icon: 'shirt',
    tagline: 'Shirts, kurtas & more',
    image: A(Images.storeNorthwind),
  },
  {
    id: 'sc_sunglasses',
    name: 'Sunglasses',
    icon: 'glasses',
    tagline: 'Aviators to sports shades',
    image: A(Images.shopSunglassesAviator),
  },
  {
    id: 'sc_watches',
    name: 'Watches',
    icon: 'watch',
    tagline: 'Analog, smart & chrono',
    image: A(Images.shopWatch),
  },
  {
    id: 'sc_phones',
    name: 'Phones',
    icon: 'smartphone',
    tagline: 'Flagships without the price',
    image: A(Images.shopPhone),
  },
  {
    id: 'sc_audio',
    name: 'Audio',
    icon: 'headphones',
    tagline: 'Headphones & earbuds',
    image: A(Images.shopHeadphones),
  },
  {
    id: 'sc_laptops',
    name: 'Laptops',
    icon: 'laptop',
    tagline: 'Work, study & creative',
    image: A(Images.shopLaptop),
  },
  {
    id: 'sc_fitness',
    name: 'Fitness',
    icon: 'dumbbell',
    tagline: 'Gear for every rep',
  },
  {
    id: 'sc_home',
    name: 'Home & Living',
    icon: 'sofa',
    tagline: 'Make home feel like home',
    image: A(Images.shopDiffuser),
  },
  {
    id: 'sc_cameras',
    name: 'Cameras',
    icon: 'camera',
    tagline: 'Photography & vlogging',
    image: A(Images.shopCamera),
  },
  {
    id: 'sc_footwear',
    name: 'Footwear',
    icon: 'shoeSneaker',
    tagline: 'Sneakers, runners & more',
    image: A(Images.shopSneakerRun),
  },
];

export const shopStores: ShopStore[] = [
  {
    id: 's_titanium',
    name: 'Titanium House',
    brand: 'Titanium',
    road: 'GE Road',
    house: 'Plot 14',
    city: 'Raipur',
    pin: '492001',
    rating: 4.7,
    reviews: 2840,
    deliveryMins: 35,
    deliveryFee: 19,
    minOrder: 499,
    promo: 'Flat ₹500 OFF above ₹2,999',
    isNiche: false,
    isPopular: true,
    tags: ['Watches', 'Authorised'],
    categoryIds: ['sc_watches', 'sc_sunglasses'],
    cover: A(Images.storeTitanium),
  },
  {
    id: 's_sonce',
    name: 'Sonce Audio Hub',
    brand: 'Sonce',
    road: 'Telibandha Road',
    house: '2nd Floor, City Centre',
    city: 'Raipur',
    pin: '492001',
    rating: 4.6,
    reviews: 1980,
    deliveryMins: 30,
    deliveryFee: 0,
    minOrder: 299,
    promo: 'Up to 40% OFF audio week',
    isNiche: true,
    isPopular: true,
    tags: ['Headphones', 'Earbuds'],
    categoryIds: ['sc_audio', 'sc_laptops'],
    cover: A(Images.storeSonce),
  },
  {
    id: 's_nova',
    name: 'Nova Electronics',
    brand: 'Nova',
    road: 'Pandri Main Road',
    house: 'Shop 21',
    city: 'Raipur',
    pin: '492001',
    rating: 4.5,
    reviews: 3210,
    deliveryMins: 42,
    deliveryFee: 29,
    minOrder: 199,
    promo: 'No-cost EMI on phones',
    isNiche: false,
    isPopular: true,
    tags: ['Phones', 'Laptops'],
    categoryIds: ['sc_phones', 'sc_laptops'],
    cover: A(Images.storeNova),
  },
  {
    id: 's_pulse',
    name: 'Pulse Fitness Store',
    brand: 'Pulse',
    road: 'Shankar Nagar',
    house: 'Plot 7',
    city: 'Raipur',
    pin: '492007',
    rating: 4.4,
    reviews: 860,
    deliveryMins: 38,
    deliveryFee: 15,
    minOrder: 399,
    promo: 'Extra 10% OFF on combos',
    isNiche: true,
    isPopular: false,
    tags: ['Fitness', 'Smart gear'],
    categoryIds: ['sc_fitness', 'sc_footwear'],
    cover: A(Images.storePulse),
  },
  {
    id: 's_hearth',
    name: 'Hearth Living',
    brand: 'Hearth',
    road: 'Civil Lines',
    house: '402, Aurora Heights',
    city: 'Raipur',
    pin: '492001',
    rating: 4.8,
    reviews: 1240,
    deliveryMins: 50,
    deliveryFee: 0,
    minOrder: 599,
    promo: 'Free delivery + gift wrap',
    isNiche: false,
    isPopular: true,
    tags: ['Home', 'Furnishing'],
    categoryIds: ['sc_home'],
    cover: A(Images.storeHearth),
  },
  {
    id: 's_lumen',
    name: 'Lumen Camera Studio',
    brand: 'Lumen',
    road: 'VIP Road',
    house: '12, Ram Nagar',
    city: 'Raipur',
    pin: '492001',
    rating: 4.6,
    reviews: 540,
    deliveryMins: 45,
    deliveryFee: 25,
    minOrder: 999,
    promo: 'Free SD card with cameras',
    isNiche: true,
    isPopular: false,
    tags: ['Cameras', 'Lenses'],
    categoryIds: ['sc_cameras', 'sc_laptops'],
    cover: A(Images.storeLumen),
  },
  {
    id: 's_northwind',
    name: 'Northwind Fashion House',
    brand: 'Northwind',
    road: 'Devendra Nagar',
    house: '5, First Floor',
    city: 'Raipur',
    pin: '492001',
    rating: 4.5,
    reviews: 1670,
    deliveryMins: 40,
    deliveryFee: 0,
    minOrder: 499,
    promo: 'NEW season · up to 50% OFF',
    isNiche: false,
    isPopular: true,
    tags: ['Clothing', 'Footwear'],
    categoryIds: ['sc_fashion', 'sc_footwear'],
    cover: A(Images.storeNorthwind),
  },
  {
    id: 's_grip',
    name: 'Grip Gadget Store',
    brand: 'Grip',
    road: 'Amapali Square',
    house: 'Shop 9',
    city: 'Raipur',
    pin: '492004',
    rating: 4.3,
    reviews: 720,
    deliveryMins: 28,
    deliveryFee: 12,
    minOrder: 199,
    promo: 'Buy 2 cases, get 1 free',
    isNiche: true,
    isPopular: false,
    tags: ['Accessories', 'Cases'],
    categoryIds: ['sc_phones', 'sc_laptops'],
    cover: A(Images.storeGrip),
  },
  {
    id: 's_solace',
    name: 'Solace Eyewear',
    brand: 'Solace',
    road: 'Sadar Bazar Road',
    house: '8, City Plaza',
    city: 'Raipur',
    pin: '492001',
    rating: 4.7,
    reviews: 920,
    deliveryMins: 32,
    deliveryFee: 0,
    minOrder: 499,
    promo: 'Sunglasses fest · up to 35% OFF',
    isNiche: true,
    isPopular: true,
    tags: ['Sunglasses', 'UV400'],
    categoryIds: ['sc_sunglasses'],
    cover: A(Images.bannerSunglasses),
  },
];

export const shopProducts: Product[] = [
  // ---- Fashion (Northwind) -------------------------------------------------
  {
    id: 'p1', storeId: 's_northwind', name: 'Linen Relaxed Shirt', brand: 'Northwind',
    description: 'Breathable linen, mother-of-pearl buttons, regular fit',
    price: 1299, mrp: 1999, rating: 4.6, reviews: 820, inStock: true, isTrending: false,
    deliveryMins: 40, tags: ['Trending'], colors: ['#6A5EF5', '#0B1020', '#FFFFFF'],
    sizes: ['S', 'M', 'L', 'XL'], image: null, categoryId: 'sc_fashion',
  },
  {
    id: 'p2', storeId: 's_northwind', name: 'Tailored Chinos', brand: 'Northwind',
    description: 'Stretch cotton twill, tapered leg',
    price: 999, mrp: 1499, rating: 4.4, reviews: 410, inStock: true,
    deliveryMins: 40, tags: [], colors: ['#2B3346', '#6B7488'], sizes: ['30', '32', '34', '36'],
    image: null, categoryId: 'sc_fashion',
  },
  {
    id: 'p3', storeId: 's_northwind', name: 'Oversized Hoodie', brand: 'Pulse',
    description: 'Brushed fleece, dropped shoulder',
    price: 1599, mrp: 2299, rating: 4.7, reviews: 560, inStock: true, isNew: true,
    deliveryMins: 40, tags: ['New'], colors: ['#FF6A3D', '#0B1020'], sizes: ['S', 'M', 'L', 'XL'],
    image: null, categoryId: 'sc_fashion',
  },

  // ---- Sunglasses (Solace Eyewear) -----------------------------------------
  {
    id: 'sg1', storeId: 's_solace', name: 'Solar Aviator Gold', brand: 'Solace',
    description: 'Polarised aviator, gradient lenses, UV400',
    price: 1899, mrp: 2799, rating: 4.6, reviews: 640, inStock: true,
    deliveryMins: 32, tags: ['Polarised'], colors: ['#C9A15A', '#0B1020'],
    image: A(Images.shopSunglassesAviator), categoryId: 'sc_sunglasses',
  },
  {
    id: 'sg2', storeId: 's_solace', name: 'Halo Wayfarer Black', brand: 'Solace',
    description: 'Classic wayfarer, smoke lenses, UV400',
    price: 1299, mrp: 1999, rating: 4.7, reviews: 1120, inStock: true, isTrending: true, isSpecialOffer: true,
    deliveryMins: 32, tags: ['Bestseller'], colors: ['#0B1020', '#5B4636'],
    image: A(Images.shopSunglassesWayfarer), categoryId: 'sc_sunglasses',
  },
  {
    id: 'sg3', storeId: 's_solace', name: 'Retro Round Gold', brand: 'Solace',
    description: 'Vintage round frame, gold rim, UV400',
    price: 1599, mrp: 2299, rating: 4.5, reviews: 430, inStock: true,
    deliveryMins: 32, tags: ['Retro'], colors: ['#C9A15A', '#0B1020'],
    image: A(Images.shopSunglassesRetro), categoryId: 'sc_sunglasses',
  },
  {
    id: 'sg4', storeId: 's_solace', name: 'Velocity Sport Wrap', brand: 'Solace',
    description: 'Photochromic wraparound for cycling & running',
    price: 2199, mrp: 2999, rating: 4.8, reviews: 380, inStock: true, isSpecialOffer: true,
    deliveryMins: 32, tags: ['Sport'], colors: ['#0B1020', '#FF4B2E'],
    image: A(Images.shopSunglassesSport), categoryId: 'sc_sunglasses',
  },
  {
    id: 'sg5', storeId: 's_solace', name: 'Skyline Blue Mirror', brand: 'Solace',
    description: 'Blue mirror aviator, slim steel frame',
    price: 1999, mrp: 2799, rating: 4.6, reviews: 290, inStock: true, isNew: true,
    deliveryMins: 32, tags: ['Mirror'], colors: ['#C9D0FF', '#0B1020'],
    image: A(Images.shopSunglassesBlue), categoryId: 'sc_sunglasses',
  },
  {
    id: 'sg6', storeId: 's_solace', name: 'Rose Gradient Aviator', brand: 'Solace',
    description: 'Rose gradient lenses, feather-light metal frame',
    price: 1699, mrp: 2599, rating: 4.5, reviews: 210, inStock: true,
    deliveryMins: 32, tags: ['Gradient'], colors: ['#F8C8D8', '#0B1020'],
    image: A(Images.shopSunglassesRose), categoryId: 'sc_sunglasses',
  },

  // ---- Watches (Titanium House) --------------------------------------------
  {
    id: 'p4', storeId: 's_titanium', name: 'Aura Minimal Watch', brand: 'Aurum',
    description: 'Sapphire glass, genuine leather, 3 ATM',
    price: 3499, mrp: 4999, rating: 4.8, reviews: 320, inStock: true, isTrending: true, isSpecialOffer: true,
    deliveryMins: 35, tags: ['Trending'], colors: ['#5B46E5', '#0B1020'],
    image: A(Images.shopWatch), categoryId: 'sc_watches',
  },
  {
    id: 'p5', storeId: 's_titanium', name: 'Chrono Sport', brand: 'Aurum',
    description: 'Stainless steel, chronograph, 5 ATM',
    price: 5499, mrp: 7999, rating: 4.6, reviews: 210, inStock: true,
    deliveryMins: 35, tags: [], colors: ['#0B1020', '#C9D0FF'],
    image: A(Images.shopWatch), categoryId: 'sc_watches',
  },
  {
    id: 'p6', storeId: 's_titanium', name: 'Smart Band Pro', brand: 'Nova',
    description: 'AMOLED, SpO2, 14-day battery',
    price: 2499, mrp: 3499, rating: 4.5, reviews: 980, inStock: true, isNew: true, isSpecialOffer: true,
    deliveryMins: 35, tags: ['New'], colors: ['#16A34A', '#0B1020'],
    image: A(Images.shopSmartwatch), categoryId: 'sc_watches',
  },

  // ---- Phones & laptops (Nova Electronics) ---------------------------------
  {
    id: 'p7', storeId: 's_nova', name: 'Nova X Pro', brand: 'Nova',
    description: '6.7" AMOLED, 200MP, 5000mAh',
    price: 54999, mrp: 59999, rating: 4.7, reviews: 2100, inStock: true, isTrending: true,
    deliveryMins: 42, tags: ['Trending'], colors: ['#6A5EF5', '#0B1020', '#FFFFFF'],
    image: A(Images.shopPhone), categoryId: 'sc_phones',
  },
  {
    id: 'p8', storeId: 's_nova', name: 'Nova Lite', brand: 'Nova',
    description: '6.5" LCD, 50MP, 6000mAh',
    price: 12999, mrp: 14999, rating: 4.3, reviews: 760, inStock: true,
    deliveryMins: 42, tags: [], colors: ['#0B1020', '#22BBA0'],
    image: A(Images.shopPhone), categoryId: 'sc_phones',
  },
  {
    id: 'p13', storeId: 's_nova', name: 'Aurora Book 14', brand: 'Aurora',
    description: '14" 2.8K OLED, 16GB, 1TB, 18h',
    price: 84999, mrp: 94999, rating: 4.7, reviews: 540, inStock: true, isTrending: true,
    deliveryMins: 42, tags: ['Trending'], colors: ['#0B1020', '#C9D0FF'],
    image: A(Images.shopLaptop), categoryId: 'sc_laptops',
  },
  {
    id: 'p14', storeId: 's_nova', name: 'Aurora Book Air', brand: 'Aurora',
    description: '13" FHD, 8GB, 512GB, 15h',
    price: 62999, mrp: 69999, rating: 4.5, reviews: 310, inStock: true,
    deliveryMins: 42, tags: [], colors: ['#FFFFFF', '#0B1020'],
    image: A(Images.shopLaptop), categoryId: 'sc_laptops',
  },
  {
    id: 'p15', storeId: 's_nova', name: 'USB-C Hub 9-in-1', brand: 'Link',
    description: 'HDMI, PD, SD, 2x USB-A',
    price: 2499, mrp: 3499, rating: 4.4, reviews: 220, inStock: true,
    deliveryMins: 42, tags: [], colors: ['#0B1020'],
    image: null, categoryId: 'sc_laptops',
  },

  // ---- Audio (Sonce Audio Hub) ---------------------------------------------
  {
    id: 'p10', storeId: 's_sonce', name: 'Aura ANC Headphones', brand: 'Sonce',
    description: 'Adaptive noise cancel, 40h battery',
    price: 4999, mrp: 6999, rating: 4.8, reviews: 1420, inStock: true, isBestseller: true, isTrending: true, isSpecialOffer: true,
    deliveryMins: 30, tags: ['Bestseller', 'Trending'], colors: ['#0B1020', '#6A5EF5'],
    image: A(Images.shopHeadphones), categoryId: 'sc_audio',
  },
  {
    id: 'p11', storeId: 's_sonce', name: 'Pocket Buds', brand: 'Sonce',
    description: 'True wireless, ENC mics, 30h',
    price: 1999, mrp: 2999, rating: 4.5, reviews: 980, inStock: true, isSpecialOffer: true,
    deliveryMins: 30, tags: [], colors: ['#FFFFFF', '#0B1020'],
    image: A(Images.shopEarbuds), categoryId: 'sc_audio',
  },
  {
    id: 'p12', storeId: 's_sonce', name: 'Studio Monitor', brand: 'Sonce',
    description: 'Wired over-ear, flat response',
    price: 3499, mrp: 4499, rating: 4.6, reviews: 260, inStock: true,
    deliveryMins: 30, tags: [], colors: ['#2B3346'],
    image: A(Images.shopHeadphonesGray), categoryId: 'sc_audio',
  },

  // ---- Fitness (Pulse Fitness Store) ---------------------------------------
  {
    id: 'p16', storeId: 's_pulse', name: 'Flex Smart Scale', brand: 'Pulse',
    description: 'Body composition, BLE sync',
    price: 1799, mrp: 2499, rating: 4.3, reviews: 180, inStock: true,
    deliveryMins: 38, tags: [], colors: ['#FFFFFF', '#0B1020'],
    image: null, categoryId: 'sc_fitness',
  },
  {
    id: 'p17', storeId: 's_pulse', name: 'Resistance Band Set', brand: 'Pulse',
    description: '5 levels, door anchor, carry bag',
    price: 899, mrp: 1299, rating: 4.6, reviews: 640, inStock: true, isNew: true, isSpecialOffer: true,
    deliveryMins: 38, tags: ['New'], colors: ['#16A34A', '#FF6A3D'],
    image: null, categoryId: 'sc_fitness',
  },
  {
    id: 'p18', storeId: 's_pulse', name: 'Yoga Mat Pro', brand: 'Pulse',
    description: '6mm TPE, non-slip, alignment lines',
    price: 1299, mrp: 1899, rating: 4.7, reviews: 520, inStock: true,
    deliveryMins: 38, tags: [], colors: ['#22BBA0', '#6A5EF5'],
    image: null, categoryId: 'sc_fitness',
  },

  // ---- Home (Hearth Living) ------------------------------------------------
  {
    id: 'p19', storeId: 's_hearth', name: 'Lounge Sofa 3-Seater', brand: 'Hearth',
    description: 'Bouclé fabric, solid wood frame',
    price: 42999, mrp: 54999, rating: 4.6, reviews: 160, inStock: true,
    deliveryMins: 50, tags: [], colors: ['#E1E5FF', '#0B1020'],
    image: null, categoryId: 'sc_home',
  },
  {
    id: 'p20', storeId: 's_hearth', name: 'Aroma Diffuser', brand: 'Hearth',
    description: '200ml, wood grain, 7 lights',
    price: 1499, mrp: 1999, rating: 4.5, reviews: 340, inStock: true, isTrending: true, isSpecialOffer: true,
    deliveryMins: 50, tags: [], colors: ['#FFFFFF', '#22BBA0'],
    image: A(Images.shopDiffuser), categoryId: 'sc_home',
  },
  {
    id: 'p21', storeId: 's_hearth', name: 'Ceramic Mug Set', brand: 'Hearth',
    description: 'Set of 4, 350ml, dishwasher safe',
    price: 799, mrp: 1199, rating: 4.4, reviews: 210, inStock: true, isSpecialOffer: true,
    deliveryMins: 50, tags: [], colors: ['#6A5EF5', '#FF6A3D'],
    image: null, categoryId: 'sc_home',
  },

  // ---- Cameras (Lumen Camera Studio) ---------------------------------------
  {
    id: 'p22', storeId: 's_lumen', name: 'Mirrorless Z30', brand: 'Lumen',
    description: '24MP, 4K30, kit lens',
    price: 64999, mrp: 72999, rating: 4.8, reviews: 280, inStock: true,
    deliveryMins: 45, tags: [], colors: ['#0B1020', '#2B3346'],
    image: A(Images.shopCamera), categoryId: 'sc_cameras',
  },
  {
    id: 'p23', storeId: 's_lumen', name: 'Pocket Vlog Cam', brand: 'Lumen',
    description: '4K60, gimbal, front screen',
    price: 24999, mrp: 29999, rating: 4.5, reviews: 190, inStock: true, isNew: true,
    deliveryMins: 45, tags: ['New'], colors: ['#0B1020', '#FF6A3D'],
    image: A(Images.shopCamera), categoryId: 'sc_cameras',
  },
  {
    id: 'p24', storeId: 's_lumen', name: 'Prime 35mm f1.4', brand: 'Lumen',
    description: 'Full-frame, weather sealed',
    price: 34999, mrp: 39999, rating: 4.7, reviews: 120, inStock: false,
    deliveryMins: 45, tags: [], colors: ['#0B1020'],
    image: null, categoryId: 'sc_cameras',
  },

  // ---- Gadget accessories (Grip Gadget Store) ------------------------------
  {
    id: 'p9', storeId: 's_grip', name: 'Clear Case Armor', brand: 'Grip',
    description: 'Military grade drop protection',
    price: 699, mrp: 999, rating: 4.4, reviews: 430, inStock: true,
    deliveryMins: 28, tags: [], colors: ['#0B1020', '#FF6A3D'],
    image: null, categoryId: 'sc_phones',
  },

  // ---- Footwear (Northwind) -------------------------------------------------
  {
    id: 'fw1', storeId: 's_northwind', name: 'Court Classic Sneakers', brand: 'Northwind',
    description: 'White leather, clean court silhouette',
    price: 2499, mrp: 3499, rating: 4.6, reviews: 760, inStock: true, isSpecialOffer: true,
    deliveryMins: 40, tags: ['Classic'], colors: ['#FFFFFF', '#0B1020'], sizes: ['7', '8', '9', '10', '11'],
    image: A(Images.shopSneakerWhite), categoryId: 'sc_footwear',
  },
  {
    id: 'fw2', storeId: 's_northwind', name: 'Trail Runner X', brand: 'Northwind',
    description: 'Grippy outsole, breathable mesh upper',
    price: 3299, mrp: 3999, rating: 4.7, reviews: 520, inStock: true, isTrending: true,
    deliveryMins: 40, tags: ['Running'], colors: ['#0B1020', '#FFFFFF'], sizes: ['7', '8', '9', '10', '11'],
    image: A(Images.shopSneakerRun), categoryId: 'sc_footwear',
  },
  {
    id: 'fw3', storeId: 's_northwind', name: 'High Court 87', brand: 'Northwind',
    description: 'Retro high-top, padded ankle collar',
    price: 3799, mrp: 4799, rating: 4.5, reviews: 310, inStock: true, isNew: true,
    deliveryMins: 40, tags: ['New'], colors: ['#FFFFFF', '#1D7A4F'], sizes: ['7', '8', '9', '10', '11'],
    image: A(Images.shopSneakerHigh), categoryId: 'sc_footwear',
  },
];

// ---------------------------------------------------------------------------
// SELECTORS / HELPERS
// ---------------------------------------------------------------------------

export const getProductById = (id: string): Product | undefined =>
  shopProducts.find((p) => p.id === id);

export const getStoreById = (id: string): ShopStore | undefined =>
  shopStores.find((s) => s.id === id);

export const getCategoryById = (id: string): ShopCategory | undefined =>
  shopCategories.find((c) => c.id === id);

export const getProductsByStore = (storeId: string): Product[] =>
  shopProducts.filter((p) => p.storeId === storeId);

export const getProductsByCategory = (categoryId: string): Product[] =>
  shopProducts.filter((p) => p.categoryId === categoryId);

export const getPopularProducts = (): Product[] => shopProducts.filter((p) => p.isTrending);

export const getSpecialOfferProducts = (): Product[] => shopProducts.filter((p) => p.isSpecialOffer);

export const getRecommendedStores = (): ShopStore[] =>
  shopStores.filter((s) => s.isPopular !== false);

export const getNicheStores = (): ShopStore[] => shopStores.filter((s) => s.isNiche);

export const searchProducts = (query: string): Product[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return shopProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)),
  );
};

export const cartItemFromProduct = (item: Product, qty: number, meta?: string): CartItem => ({
  id: `${item.id}-${meta ?? 'default'}`,
  refId: item.id,
  kind: 'shop',
  name: item.name,
  meta,
  unitPrice: item.price,
  qty,
  image: item.image,
});
