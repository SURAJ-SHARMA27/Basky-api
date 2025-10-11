// Handles Blinkit product search only
const BlinkitService = require('../services/blinkitService');

class ProductController {
  constructor() {
    this.blinkitService = new BlinkitService();
  }

  // POST /api/products/search
  async searchBlinkit(req, res) {
    try {
      console.log('➡️ POST /api/products/search entry - headers snippet:', JSON.stringify(Object.keys(req.headers || {}).slice(0,30)));
      console.log('➡️ POST /api/products/search body snippet:', JSON.stringify(req.body || {}).slice(0,500));
      const { query, location_data } = req.body;
      if (!query) {
        return res.status(400).json({ success: false, error: 'Query parameter is required' });
      }
      const incoming = req.headers || {};
      const forwardHeaders = {};
      const whitelist = ['user-agent','referer','access_token','app_client','app_version','auth_key','device_id','rn_bundle_version','session_uuid','web_app_version','lat','lon'];
      whitelist.forEach(h => {
        if (incoming[h]) forwardHeaders[h] = incoming[h];
        const alt = h.replace(/_/g, '-');
        if (!forwardHeaders[h] && incoming[alt]) forwardHeaders[h] = incoming[alt];
      });
      console.log('➡️ Forwarding to BlinkitService.searchProducts with headers:', forwardHeaders);
      const result = await this.blinkitService.searchProducts(query, location_data, { headers: forwardHeaders, tryBrowserFallback: true });
      console.log('🔍 Blinkit search result:', {
        success: result.success,
        status: result.status || null,
        error: result.error || null,
        productsCount: (result.products && result.products.length) || 0,
        rawSnippet: result.raw ? (typeof result.raw === 'string' ? result.raw.slice(0,500) : JSON.stringify(result.raw).slice(0,500)) : null
      });
      if (!result.success) {
        return res.status(502).json(result);
      }
      return res.json(result);
    } catch (error) {
      console.error('❌ Blinkit product search controller error:', error);
      res.status(500).json({ success: false, error: 'Failed to search products', message: error.message });
    }
  }
}

module.exports = new ProductController();
