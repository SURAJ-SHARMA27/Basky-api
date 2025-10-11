const express = require('express');
const router = express.Router();
const scrapeController = require('../controllers/scrapeController');

// Location search endpoint
router.post('/location/search', scrapeController.searchLocation);

// Main scraping endpoint
router.post('/scrape', scrapeController.scrapeProducts);

// Get cached products (supports both location names and pincodes)
router.get('/products/:location/:item', scrapeController.getCachedProducts);

// Cache management endpoints
router.get('/cache/stats', scrapeController.getCacheStats);
router.delete('/cache/clear', scrapeController.clearCache);

// Health check
router.get('/health', scrapeController.healthCheck);

module.exports = router;
