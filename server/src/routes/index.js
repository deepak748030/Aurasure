'use strict';

const { Router } = require('express');
const mongoose = require('mongoose');
const requireDb = require('../middlewares/requireDb');
const { ok } = require('../utils/response');
const healthController = require('../controllers/health.controller');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const adminRoutes = require('./admin.routes');
const foodRoutes = require('./food.routes');
const shopRoutes = require('./shop.routes');
const bannerRoutes = require('./banner.routes');
const searchRoutes = require('./search.routes');
const orderRoutes = require('./order.routes');
const vendorRoutes = require('./vendor.routes');
const riderRoutes = require('./rider.routes');

const router = Router();

// Liveness probe - always reachable (no DB needed)
router.get('/health', healthController.health);

// Auth needs the database (users), so it is guarded like the rest.
router.use('/auth', requireDb, authRoutes);

// Data routes - all guarded by requireDb
router.use('/users', requireDb, userRoutes);
router.use('/admin', requireDb, adminRoutes);
router.use('/food', requireDb, foodRoutes);
router.use('/shop', requireDb, shopRoutes);
router.use('/banners', requireDb, bannerRoutes);
router.use('/search', requireDb, searchRoutes);
router.use('/orders', requireDb, orderRoutes);
router.use('/vendor', requireDb, vendorRoutes);
router.use('/rider', requireDb, riderRoutes);

// Dev stats
router.get('/stats', requireDb, async (req, res, next) => {
  try {
    const [users, restaurants, foodItems, shops, products, orders] = await Promise.all([
      mongoose.model('User').countDocuments(),
      mongoose.model('Restaurant').countDocuments(),
      mongoose.model('FoodItem').countDocuments(),
      mongoose.model('ShopStore').countDocuments(),
      mongoose.model('Product').countDocuments(),
      mongoose.model('Order').countDocuments(),
    ]);
    return ok(res, { users, restaurants, foodItems, shops, products, orders });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
