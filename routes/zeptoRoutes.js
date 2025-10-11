const express = require('express');
const router = express.Router();
const zeptoController = require('../controllers/zeptoController');

// Zepto endpoints
router.post('/search-locations', zeptoController.searchLocations.bind(zeptoController));
router.post('/select-location', zeptoController.selectLocation.bind(zeptoController));
router.post('/search-products', zeptoController.searchProducts.bind(zeptoController));
router.post('/close-session', zeptoController.closeSession.bind(zeptoController));
router.get('/health', zeptoController.health.bind(zeptoController));
router.get('/debug', zeptoController.debug.bind(zeptoController));

module.exports = router;
