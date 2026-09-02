'use strict';

/**
 * Seed dataset - mirrors the Aurasure mobile app's mock data 1:1 (same ids),
 * with remote image URLs. After seeding, the API returns the same entities
 * the app already knows, so wiring the client later needs no id remapping.
 */

const img = (seed) => ({ kind: 'uri', uri: `https://picsum.photos/seed/${seed}/800/560` });
const sq = (seed) => ({ kind: 'uri', uri: `https://picsum.photos/seed/${seed}/640/640` });

// ---------------------------------------------------------------------------
// FOOD
// ---------------------------------------------------------------------------

const foodCategories = [
  { id: 'cat_biryani', name: 'Biryani', icon: 'utensils', image: sq('aur-biryani'), sortOrder: 1 },
  { id: 'cat_chowmein', name: 'Chowmin', icon: 'fish', image: sq('aur-chowmein'), sortOrder: 2 },
  { id: 'cat_pizza', name: 'Pizza', icon: 'pizza', image: sq('aur-pizza'), sortOrder: 3 },
  { id: 'cat_breakfast', name: 'Breakfast', icon: 'croissant', image: sq('aur-dosa'), sortOrder: 4 },
  { id: 'cat_burgers', name: 'Burger', icon: 'beef', image: sq('aur-burger'), sortOrder: 5 },
];

const foodVibes = [
  { id: 'vibe_litti', name: 'Litti Chokha', tagline: "Bihar's Dish", image: sq('aur-litti'), from: '#7B2FF7', to: '#B23FE0', sortOrder: 1 },
  { id: 'vibe_burger', name: 'Veg Burger', tagline: 'Meaty & Cheesy', image: sq('aur-burger'), from: '#F0603E', to: '#F5A623', sortOrder: 2 },
  { id: 'vibe_biryani', name: 'Veg Biryani', tagline: 'Royal Dum Style', image: sq('aur-biryani'), from: '#F5B301', to: '#F5851F', sortOrder: 3 },
  { id: 'vibe_pizza', name: 'Veg Pizza', tagline: 'Wood-fired', image: sq('aur-pizza'), from: '#8B93A7', to: '#4A5468', sortOrder: 4 },
  { id: 'vibe_fried', name: 'Fried Chicken', tagline: 'Crispy & Juicy', image: sq('aur-fried'), from: '#D62828', to: '#9B2226', sortOrder: 5 },
  { id: 'vibe_ice', name: 'Wow Ice Cream', tagline: 'Waffle & Sundae', image: sq('aur-ice'), from: '#FF8BA7', to: '#F2545B', sortOrder: 6 },
];

const restaurants = [
  { id: 'r_aurora', name: 'Aurora Bistro', cuisines: ['Continental', 'Italian', 'Grill'], rating: 4.7, reviews: 2840, deliveryTime: 24, deliveryFee: 19, minOrder: 149, distanceKm: 1.2, priceForTwo: 650, promo: '50% OFF up to ₹120', isVeg: false, isPopular: true, line: 'Shop 3, Shankar Nagar', offer: 'Free delivery', cover: img('aur-burger'), tags: ['Bestseller', 'Pure Veg Options'], categoryIds: ['cat_burgers', 'cat_pizza', 'cat_breakfast'] },
  { id: 'r_tandoor', name: 'Tandoor Nights', cuisines: ['North Indian', 'Mughlai'], rating: 4.6, reviews: 5120, deliveryTime: 31, deliveryFee: 29, minOrder: 199, distanceKm: 2.4, priceForTwo: 720, promo: '₹125 OFF above ₹349', isVeg: false, isPopular: true, line: 'road 12, Tejgaon', offer: 'BOGO on Naan', cover: img('aur-biryani'), tags: ['Spicy', 'Family'], categoryIds: ['cat_biryani', 'cat_burgers'] },
  { id: 'r_sushi', name: 'Sushi & Co.', cuisines: ['Japanese', 'Thai'], rating: 4.8, reviews: 1980, deliveryTime: 38, deliveryFee: 39, minOrder: 299, distanceKm: 3.1, priceForTwo: 1100, promo: '20% OFF', isVeg: false, isPopular: true, line: 'City Centre, Telibandha', offer: 'Complimentary Miso', cover: img('aur-chowmein'), tags: ['Premium', 'Healthy'], categoryIds: ['cat_chowmein', 'cat_breakfast'] },
  { id: 'r_greenbowl', name: 'Green Bowl', cuisines: ['Salads', 'Smoothies'], rating: 4.5, reviews: 1340, deliveryTime: 21, deliveryFee: 15, minOrder: 129, distanceKm: 0.9, priceForTwo: 480, promo: 'Buy 1 Get 1', isVeg: true, isPopular: true, line: '5, Devendra Nagar', offer: 'Detox free', cover: img('aur-salad'), tags: ['Vegan', 'Low Cal'], categoryIds: ['cat_breakfast'] },
  { id: 'r_pizzarep', name: 'Pizza Republic', cuisines: ['Italian', 'Wood-fired'], rating: 4.4, reviews: 3620, deliveryTime: 27, deliveryFee: 25, minOrder: 249, distanceKm: 1.8, priceForTwo: 690, promo: '40% OFF up to ₹80', isVeg: false, isPopular: true, line: '12, Pandri Main Road', offer: 'Garlic bread free', cover: img('aur-pizza'), tags: ['Cheesy', 'Crowd Favourite'], categoryIds: ['cat_pizza'] },
  { id: 'r_crumbs', name: 'Sweet Crumbs', cuisines: ['Bakery', 'Desserts'], rating: 4.9, reviews: 2210, deliveryTime: 19, deliveryFee: 12, minOrder: 99, distanceKm: 0.6, priceForTwo: 320, promo: '15% OFF', isVeg: true, isPopular: true, line: '403, VIP Road', offer: 'Cookie free', cover: img('aur-dessert'), tags: ['Freshly Baked', 'Eggless'], categoryIds: ['cat_breakfast'] },
  { id: 'r_spicy', name: 'Spicy Wok', cuisines: ['Chinese', 'Snacks'], rating: 4.5, reviews: 640, deliveryTime: 15, deliveryFee: 0, minOrder: 149, distanceKm: 100.2, priceForTwo: 450, promo: 'Flat 20% OFF', isVeg: false, isNew: true, isNewlyJoined: true, isPopular: false, line: 'road 8, Tejgaon', offer: 'Free delivery', cover: img('aur-chowmein'), tags: ['Noodles', 'Momos'], categoryIds: ['cat_chowmein'] },
  { id: 'r_biryani', name: 'Royal Biryani House', cuisines: ['Biryani', 'Mughlai'], rating: 4.6, reviews: 410, deliveryTime: 20, deliveryFee: 0, minOrder: 199, distanceKm: 100.4, priceForTwo: 520, promo: '₹100 OFF first order', isVeg: false, isNew: true, isNewlyJoined: true, isPopular: false, line: 'Plot 14, GE Road', offer: 'Extra raita free', cover: img('aur-biryani'), tags: ['Dum', 'Family'], categoryIds: ['cat_biryani'] },
  { id: 'r_foodhouse', name: 'Food House', cuisines: ['Snacks', 'Chinese'], rating: 4.4, reviews: 980, deliveryTime: 30, deliveryFee: 15, minOrder: 129, distanceKm: 100.1, priceForTwo: 380, promo: 'Buy 1 Get 1', isVeg: false, isNew: true, isNewlyJoined: false, isClosed: true, isPopular: false, line: 'road 12, Tejgaon', offer: '', cover: img('aur-kebab'), tags: ['Quick Bites'], categoryIds: ['cat_burgers', 'cat_chowmein'] },
];

const foodItems = [
  { id: 'f1', restaurantId: 'r_aurora', name: 'Aurora Classic Burger', description: 'Sesame bun, aged cheddar, smoked patty, house sauce', price: 249, mrp: 320, rating: 4.7, reviews: 820, prepTime: 18, isVeg: false, isBestseller: true, isPopular: true, isSpecial: true, vibeId: 'vibe_burger', tags: ['Bestseller'], image: img('aur-burger'), categoryIds: ['cat_burgers'] },
  { id: 'f2', restaurantId: 'r_aurora', name: 'Truffle Margherita', description: 'Wood-fired base, fresh mozzarella, basil, truffle oil', price: 329, mrp: 399, rating: 4.6, reviews: 540, prepTime: 22, isVeg: true, isPopular: true, isSpecial: true, vibeId: 'vibe_pizza', tags: ['Wood-fired'], image: img('aur-pizza'), categoryIds: ['cat_pizza'] },
  { id: 'f3', restaurantId: 'r_aurora', name: 'Butter Croissant', description: 'Flaky, all-butter, baked every morning', price: 119, mrp: 149, rating: 4.8, reviews: 410, prepTime: 10, isVeg: true, isPopular: true, tags: ['Fresh'], image: img('aur-dessert'), categoryIds: ['cat_breakfast'] },
  { id: 'f4', restaurantId: 'r_aurora', name: 'Iced Caramel Latte', description: 'Cold brew, caramel, oat milk option', price: 189, mrp: 229, rating: 4.5, reviews: 320, prepTime: 8, isVeg: true, isSpecial: true, tags: ['Cold'], image: null, categoryIds: ['cat_breakfast'] },
  { id: 'f5', restaurantId: 'r_tandoor', name: 'Butter Chicken', description: 'Tomato cashew gravy, tandoor chicken, cream', price: 349, mrp: 420, rating: 4.7, reviews: 1620, prepTime: 26, isVeg: false, isBestseller: true, isPopular: true, isSpecial: true, tags: ['Bestseller'], image: img('aur-kebab'), categoryIds: ['cat_biryani'] },
  { id: 'f6', restaurantId: 'r_tandoor', name: 'Dal Makhani', description: 'Slow-cooked black lentils, white butter', price: 269, mrp: 319, rating: 4.6, reviews: 980, prepTime: 24, isVeg: true, isPopular: true, tags: ['Rich'], image: null, categoryIds: ['cat_biryani'] },
  { id: 'f7', restaurantId: 'r_tandoor', name: 'Chicken Kathi Roll', description: 'Flaky paratha, spiced chicken, onion', price: 199, mrp: 249, rating: 4.5, reviews: 720, prepTime: 16, isVeg: false, isSpecial: true, tags: ['Street'], image: null, categoryIds: ['cat_biryani', 'cat_burgers'] },
  { id: 'f8', restaurantId: 'r_tandoor', name: 'Garlic Naan', description: 'Tandoor naan, roasted garlic, butter', price: 69, mrp: 89, rating: 4.8, reviews: 1340, prepTime: 10, isVeg: true, isPopular: true, tags: ['Classic'], image: null, categoryIds: ['cat_biryani'] },
  { id: 'f9', restaurantId: 'r_sushi', name: 'Salmon Nigiri (4 pc)', description: 'Premium salmon, sushi rice, wasabi', price: 459, mrp: 529, rating: 4.8, reviews: 320, prepTime: 20, isVeg: false, isBestseller: true, isPopular: true, tags: ['Premium'], image: null, categoryIds: ['cat_chowmein'] },
  { id: 'f10', restaurantId: 'r_sushi', name: 'Veggie Rainbow Roll', description: 'Avocado, cucumber, pickled radish', price: 389, mrp: 449, rating: 4.6, reviews: 210, prepTime: 18, isVeg: true, isPopular: true, tags: ['Fresh'], image: null, categoryIds: ['cat_chowmein', 'cat_breakfast'] },
  { id: 'f11', restaurantId: 'r_sushi', name: 'Miso Soup', description: 'Tofu, seaweed, scallion', price: 149, mrp: 179, rating: 4.4, reviews: 160, prepTime: 8, isVeg: true, tags: ['Warm'], image: null, categoryIds: ['cat_chowmein', 'cat_breakfast'] },
  { id: 'f12', restaurantId: 'r_sushi', name: 'Edamame Pod', description: 'Steamed soy beans, sea salt', price: 179, mrp: 219, rating: 4.5, reviews: 140, prepTime: 8, isVeg: true, tags: ['Light'], image: null, categoryIds: ['cat_breakfast'] },
  { id: 'f13', restaurantId: 'r_greenbowl', name: 'Buddha Power Bowl', description: 'Quinoa, roasted veg, hummus, seeds', price: 289, mrp: 340, rating: 4.5, reviews: 460, prepTime: 14, isVeg: true, isBestseller: true, isPopular: true, tags: ['Vegan'], image: img('aur-salad'), categoryIds: ['cat_breakfast'] },
  { id: 'f14', restaurantId: 'r_greenbowl', name: 'Kale Citrus Salad', description: 'Kale, orange, almond, lemon dressing', price: 249, mrp: 299, rating: 4.4, reviews: 280, prepTime: 12, isVeg: true, isPopular: true, tags: ['Low Cal'], image: img('aur-salad'), categoryIds: ['cat_breakfast'] },
  { id: 'f15', restaurantId: 'r_greenbowl', name: 'Green Detox Smoothie', description: 'Spinach, apple, ginger, celery', price: 179, mrp: 219, rating: 4.3, reviews: 190, prepTime: 6, isVeg: true, isSpecial: true, tags: ['Cold'], image: null, categoryIds: ['cat_breakfast'] },
  { id: 'f16', restaurantId: 'r_greenbowl', name: 'Avocado Toast', description: 'Sourdough, smashed avocado, chili', price: 219, mrp: 299, rating: 4.6, reviews: 360, prepTime: 10, isVeg: true, isPopular: true, tags: ['Brunch'], image: null, categoryIds: ['cat_breakfast'] },
  { id: 'f17', restaurantId: 'r_pizzarep', name: 'Pepperoni Storm', description: 'Double pepperoni, mozzarella, oregano', price: 399, mrp: 479, rating: 4.4, reviews: 980, prepTime: 24, isVeg: false, isBestseller: true, isPopular: true, isSpecial: true, tags: ['Cheesy'], image: img('aur-pizza'), categoryIds: ['cat_pizza'] },
  { id: 'f18', restaurantId: 'r_pizzarep', name: 'Four Cheese', description: 'Mozzarella, cheddar, parmesan, gouda', price: 429, mrp: 499, rating: 4.5, reviews: 640, prepTime: 24, isVeg: true, isSpecial: true, tags: ['Cheesy'], image: img('aur-pizza'), categoryIds: ['cat_pizza'] },
  { id: 'f19', restaurantId: 'r_pizzarep', name: 'Cola Float', description: 'Vanilla ice-cream, chilled cola', price: 129, mrp: 159, rating: 4.2, reviews: 220, prepTime: 5, isVeg: true, tags: ['Cold'], image: null, categoryIds: ['cat_pizza'] },
  { id: 'f20', restaurantId: 'r_pizzarep', name: 'Garlic Breadsticks', description: 'Baked dough, garlic butter, herbs', price: 159, mrp: 199, rating: 4.6, reviews: 410, prepTime: 12, isVeg: true, isPopular: true, tags: ['Classic'], image: null, categoryIds: ['cat_pizza'] },
  { id: 'f21', restaurantId: 'r_crumbs', name: 'Chocolate Lava Cake', description: 'Molten center, vanilla scoop', price: 219, mrp: 260, rating: 4.9, reviews: 1120, prepTime: 16, isVeg: true, isBestseller: true, isPopular: true, isSpecial: true, tags: ['Warm'], image: img('aur-dessert'), categoryIds: ['cat_breakfast'] },
  { id: 'f22', restaurantId: 'r_crumbs', name: 'Red Velvet Cupcake', description: 'Cream cheese frosting, cocoa sponge', price: 129, mrp: 159, rating: 4.7, reviews: 540, prepTime: 8, isVeg: true, isPopular: true, isSpecial: true, tags: ['Baked'], image: img('aur-dessert'), categoryIds: ['cat_breakfast'] },
  { id: 'f23', restaurantId: 'r_crumbs', name: 'Blueberry Cheesecake', description: 'New York style, berry compote', price: 259, mrp: 299, rating: 4.8, reviews: 480, prepTime: 10, isVeg: true, isSpecial: true, tags: ['Chilled'], image: null, categoryIds: ['cat_breakfast'] },
  { id: 'f24', restaurantId: 'r_crumbs', name: 'Cold Brew Cookies', description: 'Espresso cookies, choco chunks', price: 149, mrp: 189, rating: 4.5, reviews: 260, prepTime: 6, isVeg: true, tags: ['Crisp'], image: null, categoryIds: ['cat_breakfast'] },
  { id: 'f25', restaurantId: 'r_spicy', name: 'Veg Chowmein', description: 'Wok-tossed noodles, crunchy veggies', price: 149, mrp: 189, rating: 4.5, reviews: 320, prepTime: 12, isVeg: true, isPopular: true, isSpecial: true, tags: ['Wok'], image: img('aur-chowmein'), categoryIds: ['cat_chowmein'] },
  { id: 'f26', restaurantId: 'r_spicy', name: 'Steamed Veg Momos', description: 'Tibetan dumplings, spicy chutney', price: 169, mrp: 219, rating: 4.6, reviews: 410, prepTime: 14, isVeg: true, isPopular: true, isSpecial: true, tags: ['Steamed'], image: img('aur-momos'), categoryIds: ['cat_chowmein'] },
  { id: 'f27', restaurantId: 'r_biryani', name: 'Royal Chicken Biryani', description: 'Dum-cooked basmati, saffron, mint', price: 329, mrp: 399, rating: 4.7, reviews: 280, prepTime: 24, isVeg: false, isBestseller: true, isPopular: true, isSpecial: true, vibeId: 'vibe_biryani', tags: ['Dum'], image: img('aur-biryani'), categoryIds: ['cat_biryani'] },
  { id: 'f28', restaurantId: 'r_biryani', name: 'Chicken Kebab Platter', description: 'Char-grilled kebabs, mint chutney', price: 329, mrp: 399, rating: 4.6, reviews: 190, prepTime: 20, isVeg: false, isPopular: true, isSpecial: true, tags: ['Grill'], image: img('aur-kebab'), categoryIds: ['cat_biryani'] },
  { id: 'f29', restaurantId: 'r_foodhouse', name: 'Crispy Fried Chicken', description: 'Golden fried, crunchy coating', price: 299, mrp: 359, rating: 4.5, reviews: 340, prepTime: 18, isVeg: false, isPopular: true, isSpecial: true, vibeId: 'vibe_fried', tags: ['Crispy'], image: img('aur-fried'), categoryIds: ['cat_burgers'] },
  { id: 'f30', restaurantId: 'r_foodhouse', name: 'Masala Dosa', description: 'Crisp dosa, potato masala, chutney', price: 139, mrp: 179, rating: 4.6, reviews: 260, prepTime: 14, isVeg: true, isPopular: true, isSpecial: true, tags: ['South'], image: img('aur-dosa'), categoryIds: ['cat_breakfast'] },
  { id: 'f31', restaurantId: 'r_foodhouse', name: 'Maharaja Veg Thali', description: 'Dal, sabzi, roti, rice, papad', price: 299, mrp: 349, rating: 4.7, reviews: 210, prepTime: 22, isVeg: true, isPopular: true, isSpecial: true, tags: ['Thali'], image: img('aur-thali'), categoryIds: ['cat_biryani'] },
  { id: 'f32', restaurantId: 'r_tandoor', name: 'Litti Chokha Combo', description: 'Roasted litti, ghee, spicy chokha', price: 149, mrp: 199, rating: 4.8, reviews: 560, prepTime: 16, isVeg: true, isBestseller: true, isPopular: true, isSpecial: true, vibeId: 'vibe_litti', tags: ["Bihar's Dish"], image: img('aur-litti'), categoryIds: ['cat_biryani'] },
  { id: 'f33', restaurantId: 'r_crumbs', name: 'Wow Ice Cream Sundae', description: 'Waffle bowl, two scoops, toppings', price: 179, mrp: 229, rating: 4.8, reviews: 430, prepTime: 10, isVeg: true, isPopular: true, isSpecial: true, vibeId: 'vibe_ice', tags: ['Sundae'], image: img('aur-ice'), categoryIds: ['cat_breakfast'] },
];

// ---------------------------------------------------------------------------
// SHOP
// ---------------------------------------------------------------------------

const shopCategories = [
  { id: 'sc_fashion', name: 'Fashion', icon: 'shirt', tagline: 'Shirts, kurtas & more', image: img('aur-fashion'), sortOrder: 1 },
  { id: 'sc_sunglasses', name: 'Sunglasses', icon: 'glasses', tagline: 'Aviators to sports shades', image: sq('aur-sunglasses'), sortOrder: 2 },
  { id: 'sc_watches', name: 'Watches', icon: 'watch', tagline: 'Analog, smart & chrono', image: img('aur-watch'), sortOrder: 3 },
  { id: 'sc_phones', name: 'Phones', icon: 'smartphone', tagline: 'Flagships without the price', image: img('aur-phone'), sortOrder: 4 },
  { id: 'sc_audio', name: 'Audio', icon: 'headphones', tagline: 'Headphones & earbuds', image: img('aur-headphones'), sortOrder: 5 },
  { id: 'sc_laptops', name: 'Laptops', icon: 'laptop', tagline: 'Work, study & creative', image: img('aur-laptop'), sortOrder: 6 },
  { id: 'sc_fitness', name: 'Fitness', icon: 'dumbbell', tagline: 'Gear for every rep', image: null, sortOrder: 7 },
  { id: 'sc_home', name: 'Home & Living', icon: 'sofa', tagline: 'Make home feel like home', image: img('aur-diffuser'), sortOrder: 8 },
  { id: 'sc_cameras', name: 'Cameras', icon: 'camera', tagline: 'Photography & vlogging', image: img('aur-camera'), sortOrder: 9 },
  { id: 'sc_footwear', name: 'Footwear', icon: 'shoeSneaker', tagline: 'Sneakers, runners & more', image: img('aur-sneaker'), sortOrder: 10 },
];

const shopStores = [
  { id: 's_titanium', name: 'Titanium House', brand: 'Titanium', road: 'GE Road', house: 'Plot 14', city: 'Raipur', pin: '492001', rating: 4.7, reviews: 2840, deliveryMins: 35, deliveryFee: 19, minOrder: 499, promo: 'Flat ₹500 OFF above ₹2,999', isNiche: false, isPopular: true, tags: ['Watches', 'Authorised'], categoryIds: ['sc_watches', 'sc_sunglasses'], cover: img('aur-store-watch') },
  { id: 's_sonce', name: 'Sonce Audio Hub', brand: 'Sonce', road: 'Telibandha Road', house: '2nd Floor, City Centre', city: 'Raipur', pin: '492001', rating: 4.6, reviews: 1980, deliveryMins: 30, deliveryFee: 0, minOrder: 299, promo: 'Up to 40% OFF audio week', isNiche: true, isPopular: true, tags: ['Headphones', 'Earbuds'], categoryIds: ['sc_audio', 'sc_laptops'], cover: img('aur-store-audio') },
  { id: 's_nova', name: 'Nova Electronics', brand: 'Nova', road: 'Pandri Main Road', house: 'Shop 21', city: 'Raipur', pin: '492001', rating: 4.5, reviews: 3210, deliveryMins: 42, deliveryFee: 29, minOrder: 199, promo: 'No-cost EMI on phones', isNiche: false, isPopular: true, tags: ['Phones', 'Laptops'], categoryIds: ['sc_phones', 'sc_laptops'], cover: img('aur-store-electronics') },
  { id: 's_pulse', name: 'Pulse Fitness Store', brand: 'Pulse', road: 'Shankar Nagar', house: 'Plot 7', city: 'Raipur', pin: '492007', rating: 4.4, reviews: 860, deliveryMins: 38, deliveryFee: 15, minOrder: 399, promo: 'Extra 10% OFF on combos', isNiche: true, isPopular: false, tags: ['Fitness', 'Smart gear'], categoryIds: ['sc_fitness', 'sc_footwear'], cover: img('aur-store-fitness') },
  { id: 's_hearth', name: 'Hearth Living', brand: 'Hearth', road: 'Civil Lines', house: '402, Aurora Heights', city: 'Raipur', pin: '492001', rating: 4.8, reviews: 1240, deliveryMins: 50, deliveryFee: 0, minOrder: 599, promo: 'Free delivery + gift wrap', isNiche: false, isPopular: true, tags: ['Home', 'Furnishing'], categoryIds: ['sc_home'], cover: img('aur-store-home') },
  { id: 's_lumen', name: 'Lumen Camera Studio', brand: 'Lumen', road: 'VIP Road', house: '12, Ram Nagar', city: 'Raipur', pin: '492001', rating: 4.6, reviews: 540, deliveryMins: 45, deliveryFee: 25, minOrder: 999, promo: 'Free SD card with cameras', isNiche: true, isPopular: false, tags: ['Cameras', 'Lenses'], categoryIds: ['sc_cameras', 'sc_laptops'], cover: img('aur-store-camera') },
  { id: 's_northwind', name: 'Northwind Fashion House', brand: 'Northwind', road: 'Devendra Nagar', house: '5, First Floor', city: 'Raipur', pin: '492001', rating: 4.5, reviews: 1670, deliveryMins: 40, deliveryFee: 0, minOrder: 499, promo: 'NEW season · up to 50% OFF', isNiche: false, isPopular: true, tags: ['Clothing', 'Footwear'], categoryIds: ['sc_fashion', 'sc_footwear'], cover: img('aur-store-fashion') },
  { id: 's_grip', name: 'Grip Gadget Store', brand: 'Grip', road: 'Amapali Square', house: 'Shop 9', city: 'Raipur', pin: '492004', rating: 4.3, reviews: 720, deliveryMins: 28, deliveryFee: 12, minOrder: 199, promo: 'Buy 2 cases, get 1 free', isNiche: true, isPopular: false, tags: ['Accessories', 'Cases'], categoryIds: ['sc_phones', 'sc_laptops'], cover: img('aur-store-gadget') },
  { id: 's_solace', name: 'Solace Eyewear', brand: 'Solace', road: 'Sadar Bazar Road', house: '8, City Plaza', city: 'Raipur', pin: '492001', rating: 4.7, reviews: 920, deliveryMins: 32, deliveryFee: 0, minOrder: 499, promo: 'Sunglasses fest · up to 35% OFF', isNiche: true, isPopular: true, tags: ['Sunglasses', 'UV400'], categoryIds: ['sc_sunglasses'], cover: img('aur-store-eyewear') },
];

const products = [
  { id: 'p1', storeId: 's_northwind', name: 'Linen Relaxed Shirt', brand: 'Northwind', description: 'Breathable linen, mother-of-pearl buttons, regular fit', price: 1299, mrp: 1999, rating: 4.6, reviews: 820, inStock: true, deliveryMins: 40, tags: ['Trending'], colors: ['#6A5EF5', '#0B1020', '#FFFFFF'], sizes: ['S', 'M', 'L', 'XL'], image: null, categoryId: 'sc_fashion' },
  { id: 'p2', storeId: 's_northwind', name: 'Tailored Chinos', brand: 'Northwind', description: 'Stretch cotton twill, tapered leg', price: 999, mrp: 1499, rating: 4.4, reviews: 410, inStock: true, deliveryMins: 40, tags: [], colors: ['#2B3346', '#6B7488'], sizes: ['30', '32', '34', '36'], image: null, categoryId: 'sc_fashion' },
  { id: 'p3', storeId: 's_northwind', name: 'Oversized Hoodie', brand: 'Pulse', description: 'Brushed fleece, dropped shoulder', price: 1599, mrp: 2299, rating: 4.7, reviews: 560, inStock: true, isNew: true, deliveryMins: 40, tags: ['New'], colors: ['#FF6A3D', '#0B1020'], sizes: ['S', 'M', 'L', 'XL'], image: null, categoryId: 'sc_fashion' },
  { id: 'sg1', storeId: 's_solace', name: 'Solar Aviator Gold', brand: 'Solace', description: 'Polarised aviator, gradient lenses, UV400', price: 1899, mrp: 2799, rating: 4.6, reviews: 640, inStock: true, deliveryMins: 32, tags: ['Polarised'], colors: ['#C9A15A', '#0B1020'], image: img('aur-sunglasses'), categoryId: 'sc_sunglasses' },
  { id: 'sg2', storeId: 's_solace', name: 'Halo Wayfarer Black', brand: 'Solace', description: 'Classic wayfarer, smoke lenses, UV400', price: 1299, mrp: 1999, rating: 4.7, reviews: 1120, inStock: true, isTrending: true, isSpecialOffer: true, deliveryMins: 32, tags: ['Bestseller'], colors: ['#0B1020', '#5B4636'], image: img('aur-sunglasses-2'), categoryId: 'sc_sunglasses' },
  { id: 'sg3', storeId: 's_solace', name: 'Retro Round Gold', brand: 'Solace', description: 'Vintage round frame, gold rim, UV400', price: 1599, mrp: 2299, rating: 4.5, reviews: 430, inStock: true, deliveryMins: 32, tags: ['Retro'], colors: ['#C9A15A', '#0B1020'], image: img('aur-sunglasses-3'), categoryId: 'sc_sunglasses' },
  { id: 'sg4', storeId: 's_solace', name: 'Velocity Sport Wrap', brand: 'Solace', description: 'Photochromic wraparound for cycling & running', price: 2199, mrp: 2999, rating: 4.8, reviews: 380, inStock: true, isSpecialOffer: true, deliveryMins: 32, tags: ['Sport'], colors: ['#0B1020', '#FF4B2E'], image: img('aur-sunglasses-4'), categoryId: 'sc_sunglasses' },
  { id: 'sg5', storeId: 's_solace', name: 'Skyline Blue Mirror', brand: 'Solace', description: 'Blue mirror aviator, slim steel frame', price: 1999, mrp: 2799, rating: 4.6, reviews: 290, inStock: true, isNew: true, deliveryMins: 32, tags: ['Mirror'], colors: ['#C9D0FF', '#0B1020'], image: img('aur-sunglasses-5'), categoryId: 'sc_sunglasses' },
  { id: 'sg6', storeId: 's_solace', name: 'Rose Gradient Aviator', brand: 'Solace', description: 'Rose gradient lenses, feather-light metal frame', price: 1699, mrp: 2599, rating: 4.5, reviews: 210, inStock: true, deliveryMins: 32, tags: ['Gradient'], colors: ['#F8C8D8', '#0B1020'], image: img('aur-sunglasses-6'), categoryId: 'sc_sunglasses' },
  { id: 'p4', storeId: 's_titanium', name: 'Aura Minimal Watch', brand: 'Aurum', description: 'Sapphire glass, genuine leather, 3 ATM', price: 3499, mrp: 4999, rating: 4.8, reviews: 320, inStock: true, isTrending: true, isSpecialOffer: true, deliveryMins: 35, tags: ['Trending'], colors: ['#5B46E5', '#0B1020'], image: img('aur-watch'), categoryId: 'sc_watches' },
  { id: 'p5', storeId: 's_titanium', name: 'Chrono Sport', brand: 'Aurum', description: 'Stainless steel, chronograph, 5 ATM', price: 5499, mrp: 7999, rating: 4.6, reviews: 210, inStock: true, deliveryMins: 35, tags: [], colors: ['#0B1020', '#C9D0FF'], image: img('aur-watch-2'), categoryId: 'sc_watches' },
  { id: 'p6', storeId: 's_titanium', name: 'Smart Band Pro', brand: 'Nova', description: 'AMOLED, SpO2, 14-day battery', price: 2499, mrp: 3499, rating: 4.5, reviews: 980, inStock: true, isNew: true, isSpecialOffer: true, deliveryMins: 35, tags: ['New'], colors: ['#16A34A', '#0B1020'], image: img('aur-smartwatch'), categoryId: 'sc_watches' },
  { id: 'p7', storeId: 's_nova', name: 'Nova X Pro', brand: 'Nova', description: '6.7" AMOLED, 200MP, 5000mAh', price: 54999, mrp: 59999, rating: 4.7, reviews: 2100, inStock: true, isTrending: true, deliveryMins: 42, tags: ['Trending'], colors: ['#6A5EF5', '#0B1020', '#FFFFFF'], image: img('aur-phone'), categoryId: 'sc_phones' },
  { id: 'p8', storeId: 's_nova', name: 'Nova Lite', brand: 'Nova', description: '6.5" LCD, 50MP, 6000mAh', price: 12999, mrp: 14999, rating: 4.3, reviews: 760, inStock: true, deliveryMins: 42, tags: [], colors: ['#0B1020', '#22BBA0'], image: img('aur-phone-2'), categoryId: 'sc_phones' },
  { id: 'p9', storeId: 's_grip', name: 'Clear Case Armor', brand: 'Grip', description: 'Military grade drop protection', price: 699, mrp: 999, rating: 4.4, reviews: 430, inStock: true, deliveryMins: 28, tags: [], colors: ['#0B1020', '#FF6A3D'], image: null, categoryId: 'sc_phones' },
  { id: 'p10', storeId: 's_sonce', name: 'Aura ANC Headphones', brand: 'Sonce', description: 'Adaptive noise cancel, 40h battery', price: 4999, mrp: 6999, rating: 4.8, reviews: 1420, inStock: true, isBestseller: true, isTrending: true, isSpecialOffer: true, deliveryMins: 30, tags: ['Bestseller', 'Trending'], colors: ['#0B1020', '#6A5EF5'], image: img('aur-headphones'), categoryId: 'sc_audio' },
  { id: 'p11', storeId: 's_sonce', name: 'Pocket Buds', brand: 'Sonce', description: 'True wireless, ENC mics, 30h', price: 1999, mrp: 2999, rating: 4.5, reviews: 980, inStock: true, isSpecialOffer: true, deliveryMins: 30, tags: [], colors: ['#FFFFFF', '#0B1020'], image: img('aur-earbuds'), categoryId: 'sc_audio' },
  { id: 'p12', storeId: 's_sonce', name: 'Studio Monitor', brand: 'Sonce', description: 'Wired over-ear, flat response', price: 3499, mrp: 4499, rating: 4.6, reviews: 260, inStock: true, deliveryMins: 30, tags: [], colors: ['#2B3346'], image: img('aur-headphones-2'), categoryId: 'sc_audio' },
  { id: 'p13', storeId: 's_nova', name: 'Aurora Book 14', brand: 'Aurora', description: '14" 2.8K OLED, 16GB, 1TB, 18h', price: 84999, mrp: 94999, rating: 4.7, reviews: 540, inStock: true, isTrending: true, deliveryMins: 42, tags: ['Trending'], colors: ['#0B1020', '#C9D0FF'], image: img('aur-laptop'), categoryId: 'sc_laptops' },
  { id: 'p14', storeId: 's_nova', name: 'Aurora Book Air', brand: 'Aurora', description: '13" FHD, 8GB, 512GB, 15h', price: 62999, mrp: 69999, rating: 4.5, reviews: 310, inStock: true, deliveryMins: 42, tags: [], colors: ['#FFFFFF', '#0B1020'], image: img('aur-laptop-2'), categoryId: 'sc_laptops' },
  { id: 'p15', storeId: 's_nova', name: 'USB-C Hub 9-in-1', brand: 'Link', description: 'HDMI, PD, SD, 2x USB-A', price: 2499, mrp: 3499, rating: 4.4, reviews: 220, inStock: true, deliveryMins: 42, tags: [], colors: ['#0B1020'], image: null, categoryId: 'sc_laptops' },
  { id: 'p16', storeId: 's_pulse', name: 'Flex Smart Scale', brand: 'Pulse', description: 'Body composition, BLE sync', price: 1799, mrp: 2499, rating: 4.3, reviews: 180, inStock: true, deliveryMins: 38, tags: [], colors: ['#FFFFFF', '#0B1020'], image: null, categoryId: 'sc_fitness' },
  { id: 'p17', storeId: 's_pulse', name: 'Resistance Band Set', brand: 'Pulse', description: '5 levels, door anchor, carry bag', price: 899, mrp: 1299, rating: 4.6, reviews: 640, inStock: true, isNew: true, isSpecialOffer: true, deliveryMins: 38, tags: ['New'], colors: ['#16A34A', '#FF6A3D'], image: null, categoryId: 'sc_fitness' },
  { id: 'p18', storeId: 's_pulse', name: 'Yoga Mat Pro', brand: 'Pulse', description: '6mm TPE, non-slip, alignment lines', price: 1299, mrp: 1899, rating: 4.7, reviews: 520, inStock: true, deliveryMins: 38, tags: [], colors: ['#22BBA0', '#6A5EF5'], image: null, categoryId: 'sc_fitness' },
  { id: 'p19', storeId: 's_hearth', name: 'Lounge Sofa 3-Seater', brand: 'Hearth', description: 'Bouclé fabric, solid wood frame', price: 42999, mrp: 54999, rating: 4.6, reviews: 160, inStock: true, deliveryMins: 50, tags: [], colors: ['#E1E5FF', '#0B1020'], image: null, categoryId: 'sc_home' },
  { id: 'p20', storeId: 's_hearth', name: 'Aroma Diffuser', brand: 'Hearth', description: '200ml, wood grain, 7 lights', price: 1499, mrp: 1999, rating: 4.5, reviews: 340, inStock: true, isTrending: true, isSpecialOffer: true, deliveryMins: 50, tags: [], colors: ['#FFFFFF', '#22BBA0'], image: img('aur-diffuser'), categoryId: 'sc_home' },
  { id: 'p21', storeId: 's_hearth', name: 'Ceramic Mug Set', brand: 'Hearth', description: 'Set of 4, 350ml, dishwasher safe', price: 799, mrp: 1199, rating: 4.4, reviews: 210, inStock: true, isSpecialOffer: true, deliveryMins: 50, tags: [], colors: ['#6A5EF5', '#FF6A3D'], image: null, categoryId: 'sc_home' },
  { id: 'p22', storeId: 's_lumen', name: 'Mirrorless Z30', brand: 'Lumen', description: '24MP, 4K30, kit lens', price: 64999, mrp: 72999, rating: 4.8, reviews: 280, inStock: true, deliveryMins: 45, tags: [], colors: ['#0B1020', '#2B3346'], image: img('aur-camera'), categoryId: 'sc_cameras' },
  { id: 'p23', storeId: 's_lumen', name: 'Pocket Vlog Cam', brand: 'Lumen', description: '4K60, gimbal, front screen', price: 24999, mrp: 29999, rating: 4.5, reviews: 190, inStock: true, isNew: true, deliveryMins: 45, tags: ['New'], colors: ['#0B1020', '#FF6A3D'], image: img('aur-camera-2'), categoryId: 'sc_cameras' },
  { id: 'p24', storeId: 's_lumen', name: 'Prime 35mm f1.4', brand: 'Lumen', description: 'Full-frame, weather sealed', price: 34999, mrp: 39999, rating: 4.7, reviews: 120, inStock: false, deliveryMins: 45, tags: [], colors: ['#0B1020'], image: null, categoryId: 'sc_cameras' },
  { id: 'fw1', storeId: 's_northwind', name: 'Court Classic Sneakers', brand: 'Northwind', description: 'White leather, clean court silhouette', price: 2499, mrp: 3499, rating: 4.6, reviews: 760, inStock: true, isSpecialOffer: true, deliveryMins: 40, tags: ['Classic'], colors: ['#FFFFFF', '#0B1020'], sizes: ['7', '8', '9', '10', '11'], image: img('aur-sneaker'), categoryId: 'sc_footwear' },
  { id: 'fw2', storeId: 's_northwind', name: 'Trail Runner X', brand: 'Northwind', description: 'Grippy outsole, breathable mesh upper', price: 3299, mrp: 3999, rating: 4.7, reviews: 520, inStock: true, isTrending: true, deliveryMins: 40, tags: ['Running'], colors: ['#0B1020', '#FFFFFF'], sizes: ['7', '8', '9', '10', '11'], image: img('aur-sneaker-2'), categoryId: 'sc_footwear' },
  { id: 'fw3', storeId: 's_northwind', name: 'High Court 87', brand: 'Northwind', description: 'Retro high-top, padded ankle collar', price: 3799, mrp: 4799, rating: 4.5, reviews: 310, inStock: true, isNew: true, deliveryMins: 40, tags: ['New'], colors: ['#FFFFFF', '#1D7A4F'], sizes: ['7', '8', '9', '10', '11'], image: img('aur-sneaker-3'), categoryId: 'sc_footwear' },
];

const banners = [
  { id: 'b1', module: 'food', title: 'Crave something good?', subtitle: '50% OFF your first order', badge: 'NEW', image: img('aur-banner-food'), target: { kind: 'search' }, sortOrder: 1, active: true },
  { id: 'b2', module: 'food', title: 'Aurora Bistro', subtitle: 'Free delivery · 24 min', badge: 'FREE', image: img('aur-banner-bistro'), target: { kind: 'store', storeId: 'r_aurora' }, sortOrder: 2, active: true },
  { id: 'b3', module: 'shop', title: 'Big Electronics Sale', subtitle: 'Up to 40% OFF audio & laptops', badge: 'SALE', image: img('aur-banner-shop'), target: { kind: 'search' }, sortOrder: 3, active: true },
  { id: 'b4', module: 'shop', title: 'Aura Minimal Watch', subtitle: 'Flat ₹1500 OFF · Limited', badge: 'HOT', image: img('aur-banner-watch'), target: { kind: 'product', productId: 'p4' }, sortOrder: 4, active: true },
  { id: 'b5', module: 'shop', title: 'Sunglasses Fest', subtitle: 'Up to 35% OFF at Solace Eyewear', badge: 'FEST', image: img('aur-banner-sunglasses'), target: { kind: 'category', categoryId: 'sc_sunglasses' }, sortOrder: 5, active: true },
  { id: 'b6', module: 'shop', title: 'Audio Week', subtitle: 'ANC headphones from ₹4,999', badge: 'WEEK', image: img('aur-banner-audio'), target: { kind: 'category', categoryId: 'sc_audio' }, sortOrder: 6, active: true },
];

// Promo code campaigns shown in the admin panel (Promotions -> Promo codes).
// A code becomes spendable once it is issued to a customer or claimed in-app.
const in90Days = () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

const promos = [
  { id: 'promo_welcome50', code: 'WELCOME50', title: 'Flat ₹50 off your first order', subtitle: 'On orders above ₹199', description: 'Valid once per customer.', module: 'all', offType: 'flat', offValue: 50, maxDiscount: 0, minOrder: 199, startsAt: null, expiresAt: in90Days(), usageLimit: 0, perUserLimit: 1, selfClaim: true, active: true },
  { id: 'promo_food25', code: 'FOOD25', title: '25% off on food orders', subtitle: 'Up to ₹120 off', description: 'Applies to the food app only.', module: 'food', offType: 'percent', offValue: 25, maxDiscount: 120, minOrder: 249, startsAt: null, expiresAt: in90Days(), usageLimit: 500, perUserLimit: 1, selfClaim: true, active: true },
  { id: 'promo_shop150', code: 'SHOP150', title: 'Flat ₹150 off electronics', subtitle: 'On orders above ₹999', description: 'Applies to the shop app only.', module: 'shop', offType: 'flat', offValue: 150, maxDiscount: 0, minOrder: 999, startsAt: null, expiresAt: in90Days(), usageLimit: 200, perUserLimit: 1, selfClaim: true, active: true },
  { id: 'promo_freedel', code: 'FREEDEL', title: 'Free delivery on all orders', subtitle: 'No minimum order', description: 'Delivery fee waived at checkout.', module: 'all', offType: 'flat', offValue: 0, maxDiscount: 0, minOrder: 0, startsAt: null, expiresAt: in90Days(), usageLimit: 0, perUserLimit: 2, selfClaim: true, active: true },
];

module.exports = {
  foodCategories,
  foodVibes,
  restaurants,
  foodItems,
  shopCategories,
  shopStores,
  products,
  banners,
  promos,
};
