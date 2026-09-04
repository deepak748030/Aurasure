'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const auth = require('../controllers/riderAuth.controller');
const rider = require('../controllers/rider.controller');
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
    body('vehicleType').optional().isIn(['bike', 'scooter', 'cycle', 'ev', '']),
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

router.use(authenticate(), requireRole('delivery'));

router.get('/auth/me', auth.me);
router.get('/me', rider.getMe);
router.patch('/onboarding', rider.updateOnboarding);
router.patch('/documents', rider.setDocument);
router.post('/submit', rider.submit);
router.patch('/duty', [body('state').isIn(['online', 'offline', 'break']).withMessage('Invalid duty state')], validate, rider.setDuty);

router.post('/location/batch', rider.locationBatch);
router.get('/offers', rider.getOffers);
router.post('/tasks/:id/accept', rider.acceptTask);
router.post('/tasks/:id/reject', rider.rejectTask);
router.get('/tasks/active', rider.getActiveTask);
router.get('/tasks/:id', rider.getTask);
router.post('/tasks/:id/arrived-pickup', rider.arrivedPickup);
router.post('/tasks/:id/pickup', [body('otp').trim().isLength({ min: 4, max: 10 })], validate, rider.pickupOtp);
router.post('/tasks/:id/arrived-drop', rider.arrivedDrop);
router.post('/tasks/:id/deliver', [body('otp').trim().isLength({ min: 4, max: 10 })], validate, rider.deliver);
router.post('/tasks/:id/fail', rider.failTask);
router.get('/tasks', rider.listTasks);

router.get('/earnings', rider.earnings);
router.get('/leaderboard', rider.leaderboard);
router.get('/payouts', rider.payouts);
router.post('/cod/deposit', rider.codDeposit);
router.get('/incentives', rider.incentives);
router.post('/sos', rider.sos);
router.post('/push-token', rider.pushToken);
router.post('/issues', rider.raiseIssue);
router.post('/uploads', singleImage, rider.upload);

module.exports = router;
