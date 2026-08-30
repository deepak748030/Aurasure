import type { ImageSourcePropType } from 'react-native';
import type {
  Address,
  Banner,
  CartItem,
  FoodCategory,
  FoodItem,
  Order,
  Product,
  Restaurant,
  ShopCategory,
  UserProfile,
} from '@/types';
import { Images } from '@/assets';

type Ref = { kind: 'asset'; source: ImageSourcePropType } | null;

const A = (source: ImageSourcePropType): Ref => ({ kind: 'asset', source });

// ---------------------------------------------------------------------------
// FOOD MODULE
// ---------------------------------------------------------------------------

export const foodCategories: FoodCategory[] = [
  { id: 'cat_pizza', name: 'Pizza', icon: 'pizza' },
  { id: 'cat_burgers', name: 'Burgers', icon: 'beef' },
  { id: 'cat_indian', name: 'Indian', icon: 'utensils' },
  { id: 'cat_healthy', name: 'Healthy', icon: 'salad' },
  { id: 'cat_asian', name: 'Asian', icon: 'fish' },
  { id: 'cat_desserts', name: 'Desserts', icon: 'iceCream' },
  { id: 'cat_beverages', name: 'Beverages', icon: 'cupSoda' },
  { id: 'cat_breakfast', name: 'Breakfast', icon: 'croissant' },
];

export const restaurants: Restaurant[] = [
  {
    id: 'r_aurora',
    name: 'Aurora Bistro',
    cuisines: ['Continental', 'Italian', 'Grill'],
    rating: 4.7,
    reviews: 2840,
    deliveryTime: 24,
    deliveryFee: 19,
    minOrder: 149,
    distanceKm: 1.2,
    priceForTwo: 650,
    promo: '50% OFF up to ₹120',
    isVeg: false,
    offer: 'Free delivery',
    cover: A(Images.foodBurger),
    tags: ['Bestseller', 'Pure Veg Options'],
    categoryIds: ['cat_pizza', 'cat_burgers', 'cat_breakfast'],
  },
  {
    id: 'r_tandoor',
    name: 'Tandoor Nights',
    cuisines: ['North Indian', 'Mughlai'],
    rating: 4.6,
    reviews: 5120,
    deliveryTime: 31,
    deliveryFee: 29,
    minOrder: 199,
    distanceKm: 2.4,
    priceForTwo: 720,
    promo: '₹125 OFF above ₹349',
    isVeg: false,
    offer: 'BOGO on Naan',
    cover: A(Images.foodPizza),
    tags: ['Spicy', 'Family'],
    categoryIds: ['cat_indian', 'cat_burgers'],
  },
  {
    id: 'r_sushi',
    name: 'Sushi & Co.',
    cuisines: ['Japanese', 'Thai'],
    rating: 4.8,
    reviews: 1980,
    deliveryTime: 38,
    deliveryFee: 39,
    minOrder: 299,
    distanceKm: 3.1,
    priceForTwo: 1100,
    promo: '20% OFF',
    isVeg: false,
    offer: 'Complimentary Miso',
    cover: null,
    tags: ['Premium', 'Healthy'],
    categoryIds: ['cat_asian', 'cat_healthy'],
  },
  {
    id: 'r_greenbowl',
    name: 'Green Bowl',
    cuisines: ['Salads', 'Smoothies'],
    rating: 4.5,
    reviews: 1340,
    deliveryTime: 21,
    deliveryFee: 15,
    minOrder: 129,
    distanceKm: 0.9,
    priceForTwo: 480,
    promo: 'Buy 1 Get 1',
    isVeg: true,
    offer: 'Detox free',
    cover: A(Images.foodSalad),
    tags: ['Vegan', 'Low Cal'],
    categoryIds: ['cat_healthy', 'cat_beverages', 'cat_breakfast'],
  },
  {
    id: 'r_pizzarep',
    name: 'Pizza Republic',
    cuisines: ['Italian', 'Wood-fired'],
    rating: 4.4,
    reviews: 3620,
    deliveryTime: 27,
    deliveryFee: 25,
    minOrder: 249,
    distanceKm: 1.8,
    priceForTwo: 690,
    promo: '40% OFF up to ₹80',
    isVeg: false,
    offer: 'Garlic bread free',
    cover: A(Images.foodPizza),
    tags: ['Cheesy', 'Crowd Favourite'],
    categoryIds: ['cat_pizza', 'cat_beverages'],
  },
  {
    id: 'r_crumbs',
    name: 'Sweet Crumbs',
    cuisines: ['Bakery', 'Desserts'],
    rating: 4.9,
    reviews: 2210,
    deliveryTime: 19,
    deliveryFee: 12,
    minOrder: 99,
    distanceKm: 0.6,
    priceForTwo: 320,
    promo: '15% OFF',
    isVeg: true,
    offer: 'Cookie free',
    cover: A(Images.foodDessert),
    tags: ['Freshly Baked', 'Eggless'],
    categoryIds: ['cat_desserts', 'cat_breakfast', 'cat_beverages'],
  },
];

export const foodItems: FoodItem[] = [
  // Aurora Bistro
  { id: 'f1', restaurantId: 'r_aurora', name: 'Aurora Classic Burger', description: 'Sesame bun, aged cheddar, smoked patty, house sauce', price: 249, mrp: 320, rating: 4.7, reviews: 820, prepTime: 18, isVeg: false, isBestseller: true, tags: ['Bestseller'], image: A(Images.foodBurger), categoryIds: ['cat_burgers'] },
  { id: 'f2', restaurantId: 'r_aurora', name: 'Truffle Margherita', description: 'Wood-fired base, fresh mozzarella, basil, truffle oil', price: 329, mrp: 399, rating: 4.6, reviews: 540, prepTime: 22, isVeg: true, tags: ['Wood-fired'], image: A(Images.foodPizza), categoryIds: ['cat_pizza'] },
  { id: 'f3', restaurantId: 'r_aurora', name: 'Butter Croissant', description: 'Flaky, all-butter, baked every morning', price: 119, rating: 4.8, reviews: 410, prepTime: 10, isVeg: true, tags: ['Fresh'], image: A(Images.foodDessert), categoryIds: ['cat_breakfast', 'cat_desserts'] },
  { id: 'f4', restaurantId: 'r_aurora', name: 'Iced Caramel Latte', description: 'Cold brew, caramel, oat milk option', price: 189, rating: 4.5, reviews: 320, prepTime: 8, isVeg: true, tags: ['Cold'], image: null, categoryIds: ['cat_beverages'] },

  // Tandoor Nights
  { id: 'f5', restaurantId: 'r_tandoor', name: 'Butter Chicken', description: 'Tomato cashew gravy, tandoor chicken, cream', price: 349, mrp: 420, rating: 4.7, reviews: 1620, prepTime: 26, isVeg: false, isBestseller: true, tags: ['Bestseller'], image: null, categoryIds: ['cat_indian'] },
  { id: 'f6', restaurantId: 'r_tandoor', name: 'Dal Makhani', description: 'Slow-cooked black lentils, white butter', price: 269, rating: 4.6, reviews: 980, prepTime: 24, isVeg: true, tags: ['Rich'], image: null, categoryIds: ['cat_indian'] },
  { id: 'f7', restaurantId: 'r_tandoor', name: 'Chicken Kathi Roll', description: 'Flaky paratha, spiced chicken, onion', price: 199, rating: 4.5, reviews: 720, prepTime: 16, isVeg: false, tags: ['Street'], image: null, categoryIds: ['cat_indian', 'cat_burgers'] },
  { id: 'f8', restaurantId: 'r_tandoor', name: 'Garlic Naan', description: 'Tandoor naan, roasted garlic, butter', price: 69, rating: 4.8, reviews: 1340, prepTime: 10, isVeg: true, tags: ['Classic'], image: null, categoryIds: ['cat_indian'] },

  // Sushi & Co.
  { id: 'f9', restaurantId: 'r_sushi', name: 'Salmon Nigiri (4 pc)', description: 'Premium salmon, sushi rice, wasabi', price: 459, rating: 4.8, reviews: 320, prepTime: 20, isVeg: false, isBestseller: true, tags: ['Premium'], image: null, categoryIds: ['cat_asian'] },
  { id: 'f10', restaurantId: 'r_sushi', name: 'Veggie Rainbow Roll', description: 'Avocado, cucumber, pickled radish', price: 389, rating: 4.6, reviews: 210, prepTime: 18, isVeg: true, tags: ['Fresh'], image: null, categoryIds: ['cat_asian', 'cat_healthy'] },
  { id: 'f11', restaurantId: 'r_sushi', name: 'Miso Soup', description: 'Tofu, seaweed, scallion', price: 149, rating: 4.4, reviews: 160, prepTime: 8, isVeg: true, tags: ['Warm'], image: null, categoryIds: ['cat_asian', 'cat_healthy'] },
  { id: 'f12', restaurantId: 'r_sushi', name: 'Edamame Pod', description: 'Steamed soy beans, sea salt', price: 179, rating: 4.5, reviews: 140, prepTime: 8, isVeg: true, tags: ['Light'], image: null, categoryIds: ['cat_healthy'] },

  // Green Bowl
  { id: 'f13', restaurantId: 'r_greenbowl', name: 'Buddha Power Bowl', description: 'Quinoa, roasted veg, hummus, seeds', price: 289, mrp: 340, rating: 4.5, reviews: 460, prepTime: 14, isVeg: true, isBestseller: true, tags: ['Vegan'], image: A(Images.foodSalad), categoryIds: ['cat_healthy'] },
  { id: 'f14', restaurantId: 'r_greenbowl', name: 'Kale Citrus Salad', description: 'Kale, orange, almond, lemon dressing', price: 249, rating: 4.4, reviews: 280, prepTime: 12, isVeg: true, tags: ['Low Cal'], image: A(Images.foodSalad), categoryIds: ['cat_healthy'] },
  { id: 'f15', restaurantId: 'r_greenbowl', name: 'Green Detox Smoothie', description: 'Spinach, apple, ginger, celery', price: 179, rating: 4.3, reviews: 190, prepTime: 6, isVeg: true, tags: ['Cold'], image: null, categoryIds: ['cat_beverages', 'cat_breakfast'] },
  { id: 'f16', restaurantId: 'r_greenbowl', name: 'Avocado Toast', description: 'Sourdough, smashed avocado, chili', price: 219, rating: 4.6, reviews: 360, prepTime: 10, isVeg: true, tags: ['Brunch'], image: null, categoryIds: ['cat_breakfast', 'cat_healthy'] },

  // Pizza Republic
  { id: 'f17', restaurantId: 'r_pizzarep', name: 'Pepperoni Storm', description: 'Double pepperoni, mozzarella, oregano', price: 399, mrp: 479, rating: 4.4, reviews: 980, prepTime: 24, isVeg: false, isBestseller: true, tags: ['Cheesy'], image: A(Images.foodPizza), categoryIds: ['cat_pizza'] },
  { id: 'f18', restaurantId: 'r_pizzarep', name: 'Four Cheese', description: 'Mozzarella, cheddar, parmesan, gouda', price: 429, rating: 4.5, reviews: 640, prepTime: 24, isVeg: true, tags: ['Cheesy'], image: A(Images.foodPizza), categoryIds: ['cat_pizza'] },
  { id: 'f19', restaurantId: 'r_pizzarep', name: 'Cola Float', description: 'Vanilla ice-cream, chilled cola', price: 129, rating: 4.2, reviews: 220, prepTime: 5, isVeg: true, tags: ['Cold'], image: null, categoryIds: ['cat_beverages'] },
  { id: 'f20', restaurantId: 'r_pizzarep', name: 'Garlic Breadsticks', description: 'Baked dough, garlic butter, herbs', price: 159, rating: 4.6, reviews: 410, prepTime: 12, isVeg: true, tags: ['Classic'], image: null, categoryIds: ['cat_pizza'] },

  // Sweet Crumbs
  { id: 'f21', restaurantId: 'r_crumbs', name: 'Chocolate Lava Cake', description: 'Molten center, vanilla scoop', price: 219, mrp: 260, rating: 4.9, reviews: 1120, prepTime: 16, isVeg: true, isBestseller: true, tags: ['Warm'], image: A(Images.foodDessert), categoryIds: ['cat_desserts'] },
  { id: 'f22', restaurantId: 'r_crumbs', name: 'Red Velvet Cupcake', description: 'Cream cheese frosting, cocoa sponge', price: 129, rating: 4.7, reviews: 540, prepTime: 8, isVeg: true, tags: ['Baked'], image: A(Images.foodDessert), categoryIds: ['cat_desserts', 'cat_breakfast'] },
  { id: 'f23', restaurantId: 'r_crumbs', name: 'Blueberry Cheesecake', description: 'New York style, berry compote', price: 259, rating: 4.8, reviews: 480, prepTime: 10, isVeg: true, tags: ['Chilled'], image: null, categoryIds: ['cat_desserts'] },
  { id: 'f24', restaurantId: 'r_crumbs', name: 'Cold Brew Cookies', description: 'Espresso cookies, choco chunks', price: 149, rating: 4.5, reviews: 260, prepTime: 6, isVeg: true, tags: ['Crisp'], image: null, categoryIds: ['cat_desserts', 'cat_beverages'] },
];

// ---------------------------------------------------------------------------
// SHOP MODULE (E-COMMERCE)
// ---------------------------------------------------------------------------

export const shopCategories: ShopCategory[] = [
  { id: 'sc_fashion', name: 'Fashion', icon: 'shirt' },
  { id: 'sc_watches', name: 'Watches', icon: 'watch' },
  { id: 'sc_phones', name: 'Phones', icon: 'smartphone' },
  { id: 'sc_audio', name: 'Audio', icon: 'headphones' },
  { id: 'sc_laptops', name: 'Laptops', icon: 'laptop' },
  { id: 'sc_fitness', name: 'Fitness', icon: 'dumbbell' },
  { id: 'sc_home', name: 'Home', icon: 'sofa' },
  { id: 'sc_cameras', name: 'Cameras', icon: 'camera' },
];

export const products: Product[] = [
  // Fashion
  { id: 'p1', name: 'Linen Relaxed Shirt', brand: 'Northwind', description: 'Breathable linen, mother-of-pearl buttons, regular fit', price: 1299, mrp: 1999, rating: 4.6, reviews: 820, inStock: true, isTrending: true, tags: ['Trending'], colors: ['#6A5EF5', '#0B1020', '#FFFFFF'], sizes: ['S', 'M', 'L', 'XL'], image: null, categoryId: 'sc_fashion' },
  { id: 'p2', name: 'Tailored Chinos', brand: 'Northwind', description: 'Stretch cotton twill, tapered leg', price: 999, mrp: 1499, rating: 4.4, reviews: 410, inStock: true, tags: [], colors: ['#2B3346', '#6B7488'], sizes: ['30', '32', '34', '36'], image: null, categoryId: 'sc_fashion' },
  { id: 'p3', name: 'Oversized Hoodie', brand: 'Pulse', description: 'Brushed fleece, dropped shoulder', price: 1599, mrp: 2299, rating: 4.7, reviews: 560, inStock: true, isNew: true, tags: ['New'], colors: ['#FF6A3D', '#0B1020'], sizes: ['S', 'M', 'L', 'XL'], image: null, categoryId: 'sc_fashion' },

  // Watches
  { id: 'p4', name: 'Aura Minimal Watch', brand: 'Aurum', description: 'Sapphire glass, genuine leather, 3 ATM', price: 3499, mrp: 4999, rating: 4.8, reviews: 320, inStock: true, isTrending: true, tags: ['Trending'], colors: ['#5B46E5', '#0B1020'], image: A(Images.shopWatch), categoryId: 'sc_watches' },
  { id: 'p5', name: 'Chrono Sport', brand: 'Aurum', description: 'Stainless steel, chronograph, 5 ATM', price: 5499, mrp: 7999, rating: 4.6, reviews: 210, inStock: true, tags: [], colors: ['#0B1020', '#C9D0FF'], image: A(Images.shopWatch), categoryId: 'sc_watches' },
  { id: 'p6', name: 'Smart Band Pro', brand: 'Nova', description: 'AMOLED, SpO2, 14-day battery', price: 2499, mrp: 3499, rating: 4.5, reviews: 980, inStock: true, isNew: true, tags: ['New'], colors: ['#16A34A', '#0B1020'], image: null, categoryId: 'sc_watches' },

  // Phones
  { id: 'p7', name: 'Nova X Pro', brand: 'Nova', description: '6.7" AMOLED, 200MP, 5000mAh', price: 54999, mrp: 59999, rating: 4.7, reviews: 2100, inStock: true, isTrending: true, tags: ['Trending'], colors: ['#6A5EF5', '#0B1020', '#FFFFFF'], image: null, categoryId: 'sc_phones' },
  { id: 'p8', name: 'Nova Lite', brand: 'Nova', description: '6.5" LCD, 50MP, 6000mAh', price: 12999, mrp: 14999, rating: 4.3, reviews: 760, inStock: true, tags: [], colors: ['#0B1020', '#22BBA0'], image: null, categoryId: 'sc_phones' },
  { id: 'p9', name: 'Clear Case Armor', brand: 'Grip', description: 'Military grade drop protection', price: 699, mrp: 999, rating: 4.4, reviews: 430, inStock: false, tags: [], colors: ['#0B1020', '#FF6A3D'], image: null, categoryId: 'sc_phones' },

  // Audio
  { id: 'p10', name: 'Aura ANC Headphones', brand: 'Sonce', description: 'Adaptive noise cancel, 40h battery', price: 4999, mrp: 6999, rating: 4.8, reviews: 1420, inStock: true, isBestseller: true, isTrending: true, tags: ['Bestseller', 'Trending'], colors: ['#0B1020', '#6A5EF5'], image: A(Images.shopHeadphones), categoryId: 'sc_audio' },
  { id: 'p11', name: 'Pocket Buds', brand: 'Sonce', description: 'True wireless, ENC mics, 30h', price: 1999, mrp: 2999, rating: 4.5, reviews: 980, inStock: true, tags: [], colors: ['#FFFFFF', '#0B1020'], image: A(Images.shopHeadphones), categoryId: 'sc_audio' },
  { id: 'p12', name: 'Studio Monitor', brand: 'Sonce', description: 'Wired over-ear, flat response', price: 3499, mrp: 4499, rating: 4.6, reviews: 260, inStock: true, tags: [], colors: ['#2B3346'], image: null, categoryId: 'sc_audio' },

  // Laptops
  { id: 'p13', name: 'Aurora Book 14', brand: 'Aurora', description: '14" 2.8K OLED, 16GB, 1TB, 18h', price: 84999, mrp: 94999, rating: 4.7, reviews: 540, inStock: true, isTrending: true, tags: ['Trending'], colors: ['#0B1020', '#C9D0FF'], image: A(Images.shopWatch), categoryId: 'sc_laptops' },
  { id: 'p14', name: 'Aurora Book Air', brand: 'Aurora', description: '13" FHD, 8GB, 512GB, 15h', price: 62999, mrp: 69999, rating: 4.5, reviews: 310, inStock: true, tags: [], colors: ['#FFFFFF', '#0B1020'], image: null, categoryId: 'sc_laptops' },
  { id: 'p15', name: 'USB-C Hub 9-in-1', brand: 'Link', description: 'HDMI, PD, SD, 2x USB-A', price: 2499, mrp: 3499, rating: 4.4, reviews: 220, inStock: true, tags: [], colors: ['#0B1020'], image: null, categoryId: 'sc_laptops' },

  // Fitness
  { id: 'p16', name: 'Flex Smart Scale', brand: 'Pulse', description: 'Body composition, BLE sync', price: 1799, mrp: 2499, rating: 4.3, reviews: 180, inStock: true, tags: [], colors: ['#FFFFFF', '#0B1020'], image: null, categoryId: 'sc_fitness' },
  { id: 'p17', name: 'Resistance Band Set', brand: 'Pulse', description: '5 levels, door anchor, carry bag', price: 899, mrp: 1299, rating: 4.6, reviews: 640, inStock: true, isNew: true, tags: ['New'], colors: ['#16A34A', '#FF6A3D'], image: null, categoryId: 'sc_fitness' },
  { id: 'p18', name: 'Yoga Mat Pro', brand: 'Pulse', description: '6mm TPE, non-slip, alignment lines', price: 1299, mrp: 1899, rating: 4.7, reviews: 520, inStock: true, tags: [], colors: ['#22BBA0', '#6A5EF5'], image: null, categoryId: 'sc_fitness' },

  // Home
  { id: 'p19', name: 'Lounge Sofa 3-Seater', brand: 'Hearth', description: 'Bouclé fabric, solid wood frame', price: 42999, mrp: 54999, rating: 4.6, reviews: 160, inStock: true, isTrending: true, tags: ['Trending'], colors: ['#E1E5FF', '#0B1020'], image: null, categoryId: 'sc_home' },
  { id: 'p20', name: 'Aroma Diffuser', brand: 'Hearth', description: '200ml, wood grain, 7 lights', price: 1499, mrp: 1999, rating: 4.5, reviews: 340, inStock: true, tags: [], colors: ['#FFFFFF', '#22BBA0'], image: null, categoryId: 'sc_home' },
  { id: 'p21', name: 'Ceramic Mug Set', brand: 'Hearth', description: 'Set of 4, 350ml, dishwasher safe', price: 799, mrp: 1199, rating: 4.4, reviews: 210, inStock: true, tags: [], colors: ['#6A5EF5', '#FF6A3D'], image: null, categoryId: 'sc_home' },

  // Cameras
  { id: 'p22', name: 'Mirrorless Z30', brand: 'Lumen', description: '24MP, 4K30, kit lens', price: 64999, mrp: 72999, rating: 4.8, reviews: 280, inStock: true, isTrending: true, tags: ['Trending'], colors: ['#0B1020', '#2B3346'], image: null, categoryId: 'sc_cameras' },
  { id: 'p23', name: 'Pocket Vlog Cam', brand: 'Lumen', description: '4K60, gimbal, front screen', price: 24999, mrp: 29999, rating: 4.5, reviews: 190, inStock: true, isNew: true, tags: ['New'], colors: ['#0B1020', '#FF6A3D'], image: null, categoryId: 'sc_cameras' },
  { id: 'p24', name: 'Prime 35mm f1.4', brand: 'Lumen', description: 'Full-frame, weather sealed', price: 34999, mrp: 39999, rating: 4.7, reviews: 120, inStock: false, tags: [], colors: ['#0B1020'], image: null, categoryId: 'sc_cameras' },
];

// ---------------------------------------------------------------------------
// BANNERS
// ---------------------------------------------------------------------------

export const banners: Banner[] = [
  { id: 'b1', module: 'food', title: 'Crave something good?', subtitle: '50% OFF your first order', badge: 'NEW', image: A(Images.bannerFood) },
  { id: 'b2', module: 'food', title: 'Aurora Bistro', subtitle: 'Free delivery · 24 min', badge: 'FREE', image: A(Images.foodBurger) },
  { id: 'b3', module: 'shop', title: 'Big Electronics Sale', subtitle: 'Up to 40% OFF audio & laptops', badge: 'SALE', image: A(Images.bannerShop) },
  { id: 'b4', module: 'shop', title: 'Aura Minimal Watch', subtitle: 'Flat ₹1500 OFF · Limited', badge: 'HOT', image: A(Images.shopWatch) },
];

// ---------------------------------------------------------------------------
// USER & ORDERS
// ---------------------------------------------------------------------------

export const userProfile: UserProfile = {
  name: 'Aarav Sharma',
  email: 'aarav.sharma@example.com',
  phone: '+91 98765 43210',
  avatar: null,
  wallet: 250,
  addresses: [
    { id: 'a1', label: 'Home', line: '402, Aurora Heights, Civil Lines', city: 'Raipur', pin: '492001', isDefault: true },
    { id: 'a2', label: 'Work', line: 'Tech Park, 5th Floor, GE Road', city: 'Raipur', pin: '492001', isDefault: false },
    { id: 'a3', label: 'Mom', line: '12, Garden Villa, Avanti Vihar', city: 'Raipur', pin: '492006', isDefault: false },
  ],
};

export const orders: Order[] = [
  {
    id: 'o1',
    code: 'AUR-FD-20517',
    module: 'food',
    placedAt: '2026-08-27T19:42:00.000Z',
    status: 'out_for_delivery',
    items: [
      { id: 'li1', refId: 'f1', kind: 'food', name: 'Aurora Classic Burger', meta: 'Medium', unitPrice: 249, qty: 2, image: A(Images.foodBurger) },
      { id: 'li2', refId: 'f3', kind: 'food', name: 'Butter Croissant', unitPrice: 119, qty: 1, image: A(Images.foodDessert) },
    ],
    itemTotal: 617,
    deliveryFee: 0,
    discount: 120,
    total: 497,
    etaMinutes: 12,
    address: '402, Aurora Heights, Civil Lines, Raipur',
  },
  {
    id: 'o2',
    code: 'AUR-SH-19842',
    module: 'shop',
    placedAt: '2026-08-25T11:05:00.000Z',
    status: 'delivered',
    items: [
      { id: 'li3', refId: 'p10', kind: 'shop', name: 'Aura ANC Headphones', meta: 'Indigo', unitPrice: 4999, qty: 1, image: A(Images.shopHeadphones) },
    ],
    itemTotal: 4999,
    deliveryFee: 0,
    discount: 2000,
    total: 2999,
    etaMinutes: 0,
    address: 'Tech Park, 5th Floor, GE Road, Raipur',
  },
  {
    id: 'o3',
    code: 'AUR-FD-20488',
    module: 'food',
    placedAt: '2026-08-21T13:20:00.000Z',
    status: 'delivered',
    items: [
      { id: 'li4', refId: 'f13', kind: 'food', name: 'Buddha Power Bowl', unitPrice: 289, qty: 1, image: A(Images.foodSalad) },
      { id: 'li5', refId: 'f15', kind: 'food', name: 'Green Detox Smoothie', unitPrice: 179, qty: 2, image: null },
    ],
    itemTotal: 647,
    deliveryFee: 15,
    discount: 0,
    total: 662,
    etaMinutes: 0,
    address: '12, Garden Villa, Avanti Vihar, Raipur',
  },
];

// ---------------------------------------------------------------------------
// SELECTORS / HELPERS
// ---------------------------------------------------------------------------

export const getRestaurantById = (id: string): Restaurant | undefined =>
  restaurants.find((r) => r.id === id);

export const getFoodItemsByRestaurant = (restaurantId: string): FoodItem[] =>
  foodItems.filter((f) => f.restaurantId === restaurantId);

export const getProductById = (id: string): Product | undefined =>
  products.find((p) => p.id === id);

export const getBannersByModule = (module: 'food' | 'shop'): Banner[] =>
  banners.filter((b) => b.module === module);

export const searchFood = (query: string): FoodItem[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return foodItems.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.tags.some((t) => t.toLowerCase().includes(q)),
  );
};

export const searchProducts = (query: string): Product[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)),
  );
};

export const cartItemFromFood = (item: FoodItem, qty: number, meta?: string): CartItem => ({
  id: `${item.id}-${meta ?? 'default'}`,
  refId: item.id,
  kind: 'food',
  name: item.name,
  meta,
  unitPrice: item.price,
  qty,
  image: item.image,
});

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
