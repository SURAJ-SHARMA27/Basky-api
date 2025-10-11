// Handles Blinkit location-related operations only
const BlinkitService = require('../services/blinkitService');

class LocationController {
  constructor() {
    this.blinkitService = new BlinkitService();
  }

  // POST /api/location/search
  async searchLocation(req, res) {
    try {
      const { query, lat, lng, session_token } = req.body;
      if (!query) {
        return res.status(400).json({ success: false, error: 'Query parameter is required' });
      }
      const result = await this.blinkitService.autoSuggest(query, lat, lng, session_token, { tryBrowserFallback: true });
      const statusCode = result.status && !result.success ? Math.max(400, result.status) : 200;
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('❌ Location search controller error:', error);
      res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
    }
  }

  // POST /api/location/confirm
  async confirmLocation(req, res) {
    try {
      const { place_id, title, description, session_token } = req.body;
      if (!place_id || !title || !session_token) {
        return res.status(400).json({ success: false, error: 'place_id, title, and session_token are required' });
      }
      const result = await this.blinkitService.confirmLocation(place_id, title, description, session_token, { tryBrowserFallback: true });
      if (!result.success) {
        return res.status(500).json(result);
      }
      const data = result.locationData || {};
      const normalized = {
        is_serviceable: !!data.is_serviceable,
        is_available: !!data.is_available,
        coordinate: data.coordinate || { lat: null, lon: null },
        display_address: data.display_address || {},
        location_info: data.location_info || {}
      };
      res.json({ success: true, locationData: normalized });
    } catch (error) {
      console.error('❌ Location confirmation controller error:', error);
      res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
    }
  }
}

module.exports = new LocationController();
