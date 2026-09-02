'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = Router();

router.use(authenticate());

router.get('/me', controller.getMe);
router.put('/me', controller.updateMe);

router.get('/me/addresses', controller.getAddresses);
router.post(
  '/me/addresses',
  [
    body('label').trim().isLength({ min: 1, max: 40 }).withMessage('Label required'),
    body('line').trim().isLength({ min: 3, max: 160 }).withMessage('Address line required'),
    body('city').trim().isLength({ min: 2, max: 60 }).withMessage('City required'),
    body('pin').trim().isLength({ min: 4, max: 10 }).withMessage('PIN required'),
  ],
  validate,
  controller.addAddress,
);
router.put('/me/addresses/:addressId', controller.updateAddress);
router.delete('/me/addresses/:addressId', controller.deleteAddress);

router.get('/me/favorites', controller.getFavorites);
router.put(
  '/me/favorites',
  [
    body('module').isIn(['food', 'shop']).withMessage('module must be food or shop'),
    body('refId').trim().isLength({ min: 1 }).withMessage('refId required'),
  ],
  validate,
  controller.putFavorite,
);

module.exports = router;
