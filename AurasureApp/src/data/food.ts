import type { ImageSourcePropType } from 'react-native';
import type { CartItem, FoodCategory, FoodItem, FoodVibe, Restaurant } from '@/types';
import { Images } from '@/assets';

type Ref = { kind: 'asset'; source: ImageSourcePropType } | null;

const A = (source: ImageSourcePropType): Ref => ({ kind: 'asset', source });

// ---------------------------------------------------------------------------
// FOOD MODULE
// ---------------------------------------------------------------------------

export const foodCategories: FoodCategory[] = [
  { id: 'cat_biryani', name: 'Biryani', icon: 'utensils', image: A(Images.foodBiryani) },
  { id: 'cat_chowmein', name: 'Chowmin', icon: 'fish', image: A(Images.foodChowmein) },
  { id: 'cat_pizza', name: 'Pizza', icon: 'pizza', image: A(Images.foodPizza) },
  { id: 'cat_breakfast', name: 'Breakfast', icon: 'croissant', image: A(Images.foodDosa) },
  { id: 'cat_burgers', name: 'Burger', icon: 'beef', image: A(Images.foodBurger) },
];

export const foodVibes: FoodVibe[] = [
  { id: 'vibe_litti', name: 'Litti Chokha', tagline: "Bihar's Dish", image: A(Images.foodLitti), from: '#7B2FF7', to: '#B23FE0' },
  { id: 'vibe_burger', name: 'Veg Burger', tagline: 'Meaty & Cheesy', image: A(Images.foodBurger), from: '#F0603E', to: '#F5A623' },
  { id: 'vibe_biryani', name: 'Veg Biryani', tagline: 'Royal Dum Style', image: A(Images.foodBiryani), from: '#F5B301', to: '#F5851F' },
  { id: 'vibe_pizza', name: 'Veg Pizza', tagline: 'Wood-fired', image: A(Images.foodPizza), from: '#8B93A7', to: '#4A5468' },
  { id: 'vibe_fried', name: 'Fried Chicken', tagline: 'Crispy & Juicy', image: A(Images.foodFriedChicken), from: '#D62828', to: '#9B2226' },
  { id: 'vibe_ice', name: 'Wow Ice Cream', tagline: 'Waffle & Sundae', image: A(Images.foodIcecream), from: '#FF8BA7', to: '#F2545B' },
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
    isPopular: true,
    line: 'Shop 3, Shankar Nagar',
    offer: 'Free delivery',
    cover: A(Images.foodBurger),
    tags: ['Bestseller', 'Pure Veg Options'],
    categoryIds: ['cat_burgers', 'cat_pizza', 'cat_breakfast'],
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
    isPopular: true,
    line: 'road 12, Tejgaon',
    offer: 'BOGO on Naan',
    cover: A(Images.foodBiryani),
    tags: ['Spicy', 'Family'],
    categoryIds: ['cat_biryani', 'cat_burgers'],
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
    isPopular: true,
    line: 'City Centre, Telibandha',
    offer: 'Complimentary Miso',
    cover: A(Images.foodChowmein),
    tags: ['Premium', 'Healthy'],
    categoryIds: ['cat_chowmein', 'cat_breakfast'],
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
    isPopular: true,
    line: '5, Devendra Nagar',
    offer: 'Detox free',
    cover: A(Images.foodDosa),
    tags: ['Vegan', 'Low Cal'],
    categoryIds: ['cat_breakfast'],
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
    isPopular: true,
    line: '12, Pandri Main Road',
    offer: 'Garlic bread free',
    cover: A(Images.foodPizza),
    tags: ['Cheesy', 'Crowd Favourite'],
    categoryIds: ['cat_pizza'],
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
    isPopular: true,
    line: '403, VIP Road',
    offer: 'Cookie free',
    cover: A(Images.foodIcecream),
    tags: ['Freshly Baked', 'Eggless'],
    categoryIds: ['cat_breakfast'],
  },
  {
    id: 'r_spicy',
    name: 'Spicy Wok',
    cuisines: ['Chinese', 'Snacks'],
    rating: 4.5,
    reviews: 640,
    deliveryTime: 15,
    deliveryFee: 0,
    minOrder: 149,
    distanceKm: 100.2,
    priceForTwo: 450,
    promo: 'Flat 20% OFF',
    isVeg: false,
    isNew: true,
    isNewlyJoined: true,
    isPopular: false,
    line: 'road 8, Tejgaon',
    offer: 'Free delivery',
    cover: A(Images.foodChowmein),
    tags: ['Noodles', 'Momos'],
    categoryIds: ['cat_chowmein'],
  },
  {
    id: 'r_biryani',
    name: 'Royal Biryani House',
    cuisines: ['Biryani', 'Mughlai'],
    rating: 4.6,
    reviews: 410,
    deliveryTime: 20,
    deliveryFee: 0,
    minOrder: 199,
    distanceKm: 100.4,
    priceForTwo: 520,
    promo: '₹100 OFF first order',
    isVeg: false,
    isNew: true,
    isNewlyJoined: true,
    isPopular: false,
    line: 'Plot 14, GE Road',
    offer: 'Extra raita free',
    cover: A(Images.foodBiryani),
    tags: ['Dum', 'Family'],
    categoryIds: ['cat_biryani'],
  },
  {
    id: 'r_foodhouse',
    name: 'Food House',
    cuisines: ['Snacks', 'Chinese'],
    rating: 4.4,
    reviews: 980,
    deliveryTime: 30,
    deliveryFee: 15,
    minOrder: 129,
    distanceKm: 100.1,
    priceForTwo: 380,
    promo: 'Buy 1 Get 1',
    isVeg: false,
    isNew: true,
    isNewlyJoined: false,
    isClosed: true,
    isPopular: false,
    line: 'road 12, Tejgaon',
    offer: '',
    cover: A(Images.foodKebab),
    tags: ['Quick Bites'],
    categoryIds: ['cat_burgers', 'cat_chowmein'],
  },
];

export const foodItems: FoodItem[] = [
  // Aurora Bistro
  { id: 'f1', restaurantId: 'r_aurora', name: 'Aurora Classic Burger', description: 'Sesame bun, aged cheddar, smoked patty, house sauce', price: 249, mrp: 320, rating: 4.7, reviews: 820, prepTime: 18, isVeg: false, isBestseller: true, isPopular: true, isSpecial: true, vibeId: 'vibe_burger', tags: ['Bestseller'], image: A(Images.foodBurger), categoryIds: ['cat_burgers'] },
  { id: 'f2', restaurantId: 'r_aurora', name: 'Truffle Margherita', description: 'Wood-fired base, fresh mozzarella, basil, truffle oil', price: 329, mrp: 399, rating: 4.6, reviews: 540, prepTime: 22, isVeg: true, isPopular: true, isSpecial: true, vibeId: 'vibe_pizza', tags: ['Wood-fired'], image: A(Images.foodPizza), categoryIds: ['cat_pizza'] },
  { id: 'f3', restaurantId: 'r_aurora', name: 'Butter Croissant', description: 'Flaky, all-butter, baked every morning', price: 119, mrp: 149, rating: 4.8, reviews: 410, prepTime: 10, isVeg: true, isPopular: true, tags: ['Fresh'], image: A(Images.foodDessert), categoryIds: ['cat_breakfast'] },
  { id: 'f4', restaurantId: 'r_aurora', name: 'Iced Caramel Latte', description: 'Cold brew, caramel, oat milk option', price: 189, mrp: 229, rating: 4.5, reviews: 320, prepTime: 8, isVeg: true, isSpecial: true, tags: ['Cold'], image: null, categoryIds: ['cat_breakfast'] },

  // Tandoor Nights
  { id: 'f5', restaurantId: 'r_tandoor', name: 'Butter Chicken', description: 'Tomato cashew gravy, tandoor chicken, cream', price: 349, mrp: 420, rating: 4.7, reviews: 1620, prepTime: 26, isVeg: false, isBestseller: true, isPopular: true, isSpecial: true, tags: ['Bestseller'], image: A(Images.foodKebab), categoryIds: ['cat_biryani'] },
  { id: 'f6', restaurantId: 'r_tandoor', name: 'Dal Makhani', description: 'Slow-cooked black lentils, white butter', price: 269, mrp: 319, rating: 4.6, reviews: 980, prepTime: 24, isVeg: true, isPopular: true, tags: ['Rich'], image: null, categoryIds: ['cat_biryani'] },
  { id: 'f7', restaurantId: 'r_tandoor', name: 'Chicken Kathi Roll', description: 'Flaky paratha, spiced chicken, onion', price: 199, mrp: 249, rating: 4.5, reviews: 720, prepTime: 16, isVeg: false, isSpecial: true, tags: ['Street'], image: null, categoryIds: ['cat_biryani', 'cat_burgers'] },
  { id: 'f8', restaurantId: 'r_tandoor', name: 'Garlic Naan', description: 'Tandoor naan, roasted garlic, butter', price: 69, mrp: 89, rating: 4.8, reviews: 1340, prepTime: 10, isVeg: true, isPopular: true, tags: ['Classic'], image: null, categoryIds: ['cat_biryani'] },

  // Sushi & Co.
  { id: 'f9', restaurantId: 'r_sushi', name: 'Salmon Nigiri (4 pc)', description: 'Premium salmon, sushi rice, wasabi', price: 459, mrp: 529, rating: 4.8, reviews: 320, prepTime: 20, isVeg: false, isBestseller: true, isPopular: true, tags: ['Premium'], image: null, categoryIds: ['cat_chowmein'] },
  { id: 'f10', restaurantId: 'r_sushi', name: 'Veggie Rainbow Roll', description: 'Avocado, cucumber, pickled radish', price: 389, mrp: 449, rating: 4.6, reviews: 210, prepTime: 18, isVeg: true, isPopular: true, tags: ['Fresh'], image: null, categoryIds: ['cat_chowmein', 'cat_breakfast'] },
  { id: 'f11', restaurantId: 'r_sushi', name: 'Miso Soup', description: 'Tofu, seaweed, scallion', price: 149, mrp: 179, rating: 4.4, reviews: 160, prepTime: 8, isVeg: true, tags: ['Warm'], image: null, categoryIds: ['cat_chowmein', 'cat_breakfast'] },
  { id: 'f12', restaurantId: 'r_sushi', name: 'Edamame Pod', description: 'Steamed soy beans, sea salt', price: 179, mrp: 219, rating: 4.5, reviews: 140, prepTime: 8, isVeg: true, tags: ['Light'], image: null, categoryIds: ['cat_breakfast'] },

  // Green Bowl
  { id: 'f13', restaurantId: 'r_greenbowl', name: 'Buddha Power Bowl', description: 'Quinoa, roasted veg, hummus, seeds', price: 289, mrp: 340, rating: 4.5, reviews: 460, prepTime: 14, isVeg: true, isBestseller: true, isPopular: true, tags: ['Vegan'], image: A(Images.foodSalad), categoryIds: ['cat_breakfast'] },
  { id: 'f14', restaurantId: 'r_greenbowl', name: 'Kale Citrus Salad', description: 'Kale, orange, almond, lemon dressing', price: 249, mrp: 299, rating: 4.4, reviews: 280, prepTime: 12, isVeg: true, isPopular: true, tags: ['Low Cal'], image: A(Images.foodSalad), categoryIds: ['cat_breakfast'] },
  { id: 'f15', restaurantId: 'r_greenbowl', name: 'Green Detox Smoothie', description: 'Spinach, apple, ginger, celery', price: 179, mrp: 219, rating: 4.3, reviews: 190, prepTime: 6, isVeg: true, isSpecial: true, tags: ['Cold'], image: null, categoryIds: ['cat_breakfast'] },
  { id: 'f16', restaurantId: 'r_greenbowl', name: 'Avocado Toast', description: 'Sourdough, smashed avocado, chili', price: 219, mrp: 299, rating: 4.6, reviews: 360, prepTime: 10, isVeg: true, isPopular: true, tags: ['Brunch'], image: null, categoryIds: ['cat_breakfast'] },

  // Pizza Republic
  { id: 'f17', restaurantId: 'r_pizzarep', name: 'Pepperoni Storm', description: 'Double pepperoni, mozzarella, oregano', price: 399, mrp: 479, rating: 4.4, reviews: 980, prepTime: 24, isVeg: false, isBestseller: true, isPopular: true, isSpecial: true, tags: ['Cheesy'], image: A(Images.foodPizza), categoryIds: ['cat_pizza'] },
  { id: 'f18', restaurantId: 'r_pizzarep', name: 'Four Cheese', description: 'Mozzarella, cheddar, parmesan, gouda', price: 429, mrp: 499, rating: 4.5, reviews: 640, prepTime: 24, isVeg: true, isSpecial: true, tags: ['Cheesy'], image: A(Images.foodPizza), categoryIds: ['cat_pizza'] },
  { id: 'f19', restaurantId: 'r_pizzarep', name: 'Cola Float', description: 'Vanilla ice-cream, chilled cola', price: 129, mrp: 159, rating: 4.2, reviews: 220, prepTime: 5, isVeg: true, tags: ['Cold'], image: null, categoryIds: ['cat_pizza'] },
  { id: 'f20', restaurantId: 'r_pizzarep', name: 'Garlic Breadsticks', description: 'Baked dough, garlic butter, herbs', price: 159, mrp: 199, rating: 4.6, reviews: 410, prepTime: 12, isVeg: true, isPopular: true, tags: ['Classic'], image: null, categoryIds: ['cat_pizza'] },

  // Sweet Crumbs
  { id: 'f21', restaurantId: 'r_crumbs', name: 'Chocolate Lava Cake', description: 'Molten center, vanilla scoop', price: 219, mrp: 260, rating: 4.9, reviews: 1120, prepTime: 16, isVeg: true, isBestseller: true, isPopular: true, isSpecial: true, tags: ['Warm'], image: A(Images.foodDessert), categoryIds: ['cat_breakfast'] },
  { id: 'f22', restaurantId: 'r_crumbs', name: 'Red Velvet Cupcake', description: 'Cream cheese frosting, cocoa sponge', price: 129, mrp: 159, rating: 4.7, reviews: 540, prepTime: 8, isVeg: true, isPopular: true, isSpecial: true, tags: ['Baked'], image: A(Images.foodDessert), categoryIds: ['cat_breakfast'] },
  { id: 'f23', restaurantId: 'r_crumbs', name: 'Blueberry Cheesecake', description: 'New York style, berry compote', price: 259, mrp: 299, rating: 4.8, reviews: 480, prepTime: 10, isVeg: true, isSpecial: true, tags: ['Chilled'], image: null, categoryIds: ['cat_breakfast'] },
  { id: 'f24', restaurantId: 'r_crumbs', name: 'Cold Brew Cookies', description: 'Espresso cookies, choco chunks', price: 149, mrp: 189, rating: 4.5, reviews: 260, prepTime: 6, isVeg: true, tags: ['Crisp'], image: null, categoryIds: ['cat_breakfast'] },

  // Spicy Wok
  { id: 'f25', restaurantId: 'r_spicy', name: 'Veg Chowmein', description: 'Wok-tossed noodles, crunchy veggies', price: 149, mrp: 189, rating: 4.5, reviews: 320, prepTime: 12, isVeg: true, isPopular: true, isSpecial: true, tags: ['Wok'], image: A(Images.foodChowmein), categoryIds: ['cat_chowmein'] },
  { id: 'f26', restaurantId: 'r_spicy', name: 'Steamed Veg Momos', description: 'Tibetan dumplings, spicy chutney', price: 169, mrp: 219, rating: 4.6, reviews: 410, prepTime: 14, isVeg: true, isPopular: true, isSpecial: true, tags: ['Steamed'], image: A(Images.foodMomos), categoryIds: ['cat_chowmein'] },

  // Royal Biryani House
  { id: 'f27', restaurantId: 'r_biryani', name: 'Royal Chicken Biryani', description: 'Dum-cooked basmati, saffron, mint', price: 329, mrp: 399, rating: 4.7, reviews: 280, prepTime: 24, isVeg: false, isBestseller: true, isPopular: true, isSpecial: true, vibeId: 'vibe_biryani', tags: ['Dum'], image: A(Images.foodBiryani), categoryIds: ['cat_biryani'] },
  { id: 'f28', restaurantId: 'r_biryani', name: 'Chicken Kebab Platter', description: 'Char-grilled kebabs, mint chutney', price: 329, mrp: 399, rating: 4.6, reviews: 190, prepTime: 20, isVeg: false, isPopular: true, isSpecial: true, tags: ['Grill'], image: A(Images.foodKebab), categoryIds: ['cat_biryani'] },

  // Food House
  { id: 'f29', restaurantId: 'r_foodhouse', name: 'Crispy Fried Chicken', description: 'Golden fried, crunchy coating', price: 299, mrp: 359, rating: 4.5, reviews: 340, prepTime: 18, isVeg: false, isPopular: true, isSpecial: true, vibeId: 'vibe_fried', tags: ['Crispy'], image: A(Images.foodFriedChicken), categoryIds: ['cat_burgers'] },
  { id: 'f30', restaurantId: 'r_foodhouse', name: 'Masala Dosa', description: 'Crisp dosa, potato masala, chutney', price: 139, mrp: 179, rating: 4.6, reviews: 260, prepTime: 14, isVeg: true, isPopular: true, isSpecial: true, tags: ['South'], image: A(Images.foodDosa), categoryIds: ['cat_breakfast'] },
  { id: 'f31', restaurantId: 'r_foodhouse', name: 'Maharaja Veg Thali', description: 'Dal, sabzi, roti, rice, papad', price: 299, mrp: 349, rating: 4.7, reviews: 210, prepTime: 22, isVeg: true, isPopular: true, isSpecial: true, tags: ['Thali'], image: A(Images.foodThali), categoryIds: ['cat_biryani'] },

  // More (Litti / Ice cream)
  { id: 'f32', restaurantId: 'r_tandoor', name: 'Litti Chokha Combo', description: 'Roasted litti, ghee, spicy chokha', price: 149, mrp: 199, rating: 4.8, reviews: 560, prepTime: 16, isVeg: true, isBestseller: true, isPopular: true, isSpecial: true, vibeId: 'vibe_litti', tags: ["Bihar's Dish"], image: A(Images.foodLitti), categoryIds: ['cat_biryani'] },
  { id: 'f33', restaurantId: 'r_crumbs', name: 'Wow Ice Cream Sundae', description: 'Waffle bowl, two scoops, toppings', price: 179, mrp: 229, rating: 4.8, reviews: 430, prepTime: 10, isVeg: true, isPopular: true, isSpecial: true, vibeId: 'vibe_ice', tags: ['Sundae'], image: A(Images.foodIcecream), categoryIds: ['cat_breakfast'] },
];

// ---------------------------------------------------------------------------
// SELECTORS / HELPERS
// ---------------------------------------------------------------------------

export const getRestaurantById = (id: string): Restaurant | undefined =>
  restaurants.find((r) => r.id === id);

export const getFoodItemsByRestaurant = (restaurantId: string): FoodItem[] =>
  foodItems.filter((f) => f.restaurantId === restaurantId);

export const getPopularFoodItems = (): FoodItem[] => foodItems.filter((f) => f.isPopular);

export const getSpecialFoodItems = (): FoodItem[] => foodItems.filter((f) => f.isSpecial);

export const getNewRestaurants = (): Restaurant[] => restaurants.filter((r) => r.isNew);

export const getVibeItems = (vibeId: string): FoodItem[] => foodItems.filter((f) => f.vibeId === vibeId);

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
