'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/user.controller');
const rewards = require('../controllers/rewards.controller');
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

// Delivery partner / vendor applications.
router.post(
  '/me/partner-application',
  [body('kind').isIn(['delivery', 'vendor']).withMessage('kind must be delivery or vendor')],
  validate,
  controller.savePartnerApplication,
);

// Rewards: wallet, loyalty points, coupons, referral.
router.get('/me/wallet', rewards.getWallet);
router.post(
  '/me/wallet/add',
  [body('amount').isFloat({ min: 10, max: 25000 }).withMessage('Amount between 10 and 25000')],
  validate,
  rewards.addWalletMoney,
);

router.get('/me/loyalty', rewards.getLoyalty);
router.post(
  '/me/loyalty/redeem',
  [body('points').isInt({ min: 100 }).withMessage('At least 100 points')],
  validate,
  rewards.redeemLoyalty,
);

router.get('/me/coupons', rewards.getCoupons);
router.post('/me/coupons/:couponId/apply', rewards.applyCoupon);

router.get('/me/referral', rewards.getReferral);
router.post(
  '/me/referral/apply',
  [body('code').trim().isLength({ min: 4, max: 16 }).withMessage('Valid referral code required')],
  validate,
  rewards.applyReferral,
);

module.exports = router;
