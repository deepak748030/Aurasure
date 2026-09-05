'use strict';

const { Router } = require('express');
const controller = require('../controllers/app.controller');

const router = Router();

router.get('/settings', controller.getSettings);
router.get('/content/:key', controller.getContent);
router.get('/cities', controller.listCities);

module.exports = router;
