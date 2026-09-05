'use strict';

const { Router } = require('express');
const controller = require('../controllers/flashSale.controller');

const router = Router();

router.get('/active', controller.getActive);
router.get('/upcoming', controller.getUpcoming);

module.exports = router;
