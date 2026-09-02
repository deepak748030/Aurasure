'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const router = Router();

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
    body('phone').trim().isLength({ min: 10, max: 15 }).withMessage('Valid phone number required'),
    body('password').isLength({ min: 6, max: 72 }).withMessage('Password must be at least 6 characters'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email'),
  ],
  validate,
  controller.register,
);

router.post(
  '/login',
  [
    body('phone').trim().isLength({ min: 10, max: 15 }).withMessage('Valid phone number required'),
    body('password').isLength({ min: 1 }).withMessage('Password required'),
  ],
  validate,
  controller.login,
);

router.get('/me', authenticate(), controller.me);

module.exports = router;
