const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// POST /api/products/search - Search Blinkit products
router.post('/search', productController.searchBlinkit.bind(productController));

module.exports = router;
