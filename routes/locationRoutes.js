const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// POST /api/location/search - Search for locations (Blinkit)
router.post('/search', locationController.searchLocation.bind(locationController));

// POST /api/location/confirm - Confirm selected location (Blinkit)
router.post('/confirm', locationController.confirmLocation.bind(locationController));

module.exports = router;
