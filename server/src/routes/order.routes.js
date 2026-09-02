'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/order.controller');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = Router();

router.use(authenticate());

const itemRules = [
  body('module').isIn(['food', 'shop']).withMessage('module must be food or shop'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.refId').trim().isLength({ min: 1 }).withMessage('refId required'),
  body('items.*.name').trim().isLength({ min: 1 }).withMessage('name required'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('unitPrice must be >= 0'),
  body('items.*.qty').isInt({ min: 1 }).withMessage('qty must be >= 1'),
  body('address').trim().isLength({ min: 3 }).withMessage('Delivery address required'),
  body('deliveryFee').optional().isFloat({ min: 0 }).withMessage('deliveryFee must be >= 0'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('discount must be >= 0'),
];

router.post('/', itemRules, validate, controller.createOrder);
router.get('/', controller.listOrders);
router.get('/:id', controller.getOrder);
router.patch('/:id/status', [body('status').isIn(['cancelled']).withMessage('Only cancel is allowed')], validate, controller.updateStatus);

module.exports = router;
