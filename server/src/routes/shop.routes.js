'use strict';

const { Router } = require('express');
const controller = require('../controllers/shop.controller');

const router = Router();

router.get('/categories', controller.listCategories);
router.get('/categories/:id', controller.getCategory);
router.get('/categories/:id/products', controller.getCategoryProducts);

router.get('/stores', controller.listStores);
router.get('/stores/:id', controller.getStore);
router.get('/stores/:id/products', controller.getStoreProducts);

router.get('/products', controller.listProducts);
router.get('/products/:id', controller.getProduct);

router.get('/popular', controller.listPopular);
router.get('/offers', controller.listOffers);

module.exports = router;
