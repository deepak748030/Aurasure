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
router.patch('/documents', vendor.setDocument);
router.post('/submit', vendor.submit);
router.patch('/open', vendor.setOpen);
router.get('/dashboard', vendor.dashboard);
router.get('/orders', vendor.listOrders);
router.patch('/orders/:id/status', vendor.advanceOrder);
router.get('/catalog', vendor.listCatalog);
router.post('/catalog', vendor.upsertCatalog);
router.delete('/catalog/:id', vendor.deleteCatalog);
router.post('/issues', vendor.raiseIssue);
router.post('/uploads', singleImage, vendor.upload);

module.exports = router;
