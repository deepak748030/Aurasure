'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = Router();
router.use(authenticate());

router.post(
  '/intents',
  [
    body('amount').isFloat({ min: 1 }).withMessage('Amount required'),
    body('purpose').isIn(['wallet', 'order']).withMessage('purpose must be wallet or order'),
    body('method').optional().isIn(['upi', 'card', 'netbanking', 'paytm', 'phonepe']),
  ],
  validate,
  controller.createIntent,
);

router.post(
  '/confirm',
  [
    body('razorpayOrderId').trim().isLength({ min: 6 }).withMessage('razorpayOrderId required'),
    body('razorpayPaymentId').trim().isLength({ min: 6 }).withMessage('razorpayPaymentId required'),
    body('razorpaySignature').trim().isLength({ min: 10 }).withMessage('razorpaySignature required'),
  ],
  validate,
  controller.confirmPayment,
);

module.exports = router;
