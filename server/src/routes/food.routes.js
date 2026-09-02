'use strict';

const { Router } = require('express');
const controller = require('../controllers/food.controller');

const router = Router();

router.get('/categories', controller.listCategories);
router.get('/vibes', controller.listVibes);
router.get('/vibes/:id/items', controller.getVibeItems);

router.get('/restaurants', controller.listRestaurants);
router.get('/restaurants/:id', controller.getRestaurant);
router.get('/restaurants/:id/items', controller.getRestaurantItems);

router.get('/items', controller.listItems);
router.get('/items/:id', controller.getItem);

router.get('/popular', controller.listPopular);
router.get('/offers', controller.listOffers);
router.get('/new-stores', controller.listNewStores);

module.exports = router;
