'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/admin.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = Router();

// Whole branch is admin-only.
router.use(authenticate(), requireRole('admin'));

router.get('/stats', controller.getStats);
router.get('/orders', controller.listOrders);

router.patch(
  '/orders/:id/status',
  [
    body('status')
      .isIn(['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'])
      .withMessage('Invalid order status'),
  ],
  validate,
  controller.setOrderStatus,
);

router.get('/partners', controller.listPartners);
router.patch(
  '/partners/:userId',
  [
    body('status').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected'),
    body('note').optional({ values: 'falsy' }).isString().isLength({ max: 300 }).withMessage('Note too long'),
  ],
  validate,
  controller.decidePartner,
);

module.exports = router;
