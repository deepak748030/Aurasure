'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const auth = require('../controllers/vendorAuth.controller');
const vendor = require('../controllers/vendor.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const { singleImage } = require('../middlewares/upload');
const validate = require('../middlewares/validate');

const router = Router();

router.post(
  '/auth/register',
  [
    body('name').trim().isLength({ min: 2, max: 80 }),
    body('phone').trim().isLength({ min: 10, max: 15 }),
    body('password').isLength({ min: 6, max: 72 }),
    body('module').isIn(['food', 'shop']),
    body('email').optional({ values: 'falsy' }).isEmail(),
  ],
  validate,
  auth.register,
);

router.post(
  '/auth/login',
  [
    body('phone').trim().isLength({ min: 10, max: 15 }),
    body('password').isLength({ min: 1 }),
  ],
  validate,
  auth.login,
);

router.use(authenticate(), requireRole('vendor'));

router.get('/auth/me', auth.me);
router.get('/me', vendor.getMe);
router.patch('/me', vendor.updateProfile);
router.get('/onboarding', vendor.getOnboarding);
router.patch('/onboarding', vendor.patchOnboarding);
router.patch('/documents', vendor.setDocument);
router.post('/submit', vendor.submit);
router.patch('/open', vendor.setOpen);
router.get('/dashboard', vendor.dashboard);
router.get('/orders', vendor.listOrders);
router.get('/orders/:id', vendor.getOrder);
router.post('/orders/:id/accept', vendor.acceptOrder);
router.post('/orders/:id/reject', vendor.rejectOrder);
router.post('/orders/:id/partial-accept', vendor.partialAcceptOrder);
router.post('/orders/:id/ready', vendor.readyOrder);
router.patch('/orders/:id/status', vendor.advanceOrder);
router.get('/items', vendor.listCatalog);
router.get('/catalog', vendor.listCatalog);
router.post('/items', vendor.upsertCatalog);
router.post('/items/bulk', vendor.bulkCatalog);
router.patch('/items/:id', vendor.upsertCatalog);
router.patch('/items/:id/availability', vendor.upsertCatalog);
router.post('/catalog', vendor.upsertCatalog);
router.delete('/catalog/:id', vendor.deleteCatalog);
router.patch('/outlets/:id', vendor.updateOutlet);
router.post('/outlets/:id/pause', vendor.pauseOutlet);
router.get('/stats', vendor.stats);
router.get('/payouts', vendor.payouts);
router.get('/payouts/:id/statement', vendor.payoutStatement);
router.get('/ratings', vendor.ratings);
router.post('/ratings/:id/reply', vendor.replyRating);
router.get('/staff', vendor.listStaff);
router.post('/staff', vendor.addStaff);
router.delete('/staff/:id', vendor.removeStaff);
router.post('/push-token', vendor.savePushToken);
router.post('/issues', vendor.raiseIssue);
router.post('/uploads', singleImage, vendor.upload);

module.exports = router;
