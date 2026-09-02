'use strict';

const { Router } = require('express');
const controller = require('../controllers/banner.controller');

const router = Router();

router.get('/', controller.listBanners);

module.exports = router;
