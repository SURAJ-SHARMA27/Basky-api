// Handles Blinkit scraping and cache endpoints only
const BlinkitScraper = require('../services/blinkitScraper');
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

class ScrapeController {
  async searchLocation(req, res) {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ success: false, error: 'Missing query parameter', message: 'Please provide a location query to search' });
      }
      console.log(`🔍 Location search request: ${query}`);
      const scraper = new BlinkitScraper();
      const result = await scraper.searchLocation(query);
      res.json(result);
    } catch (error) {
      console.error('❌ Location search controller error:', error);
      res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
    }
  }

  async scrapeProducts(req, res) {
    try {
      const { location, searchTerm, pincode } = req.body;
      const locationQuery = location || pincode;
      if (!locationQuery || !searchTerm) {
        return res.status(400).json({ success: false, error: 'Missing required fields', message: 'Please provide both location (or pincode) and searchTerm', example: { location: 'Malik Residency Gurgaon', searchTerm: 'atta' } });
      }
      const cacheKey = `${locationQuery.toLowerCase()}-${searchTerm.toLowerCase()}`;
      const cached = cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log(`📦 Returning cached results for ${cacheKey}`);
        return res.json({ ...cached.data, fromCache: true });
      }
      console.log(`🔄 Starting fresh scrape for location: ${locationQuery}, term: ${searchTerm}`);
      const scraper = new BlinkitScraper();
      const result = await scraper.scrapeProducts(locationQuery, searchTerm);
      if (result.success) {
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        console.log(`💾 Cached results for ${cacheKey}`);
      }
      res.json(result);
    } catch (error) {
      console.error('❌ Scrape controller error:', error);
      res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
    }
  }

  async getCachedProducts(req, res) {
    try {
      const { location, item } = req.params;
      const cacheKey = `${location.toLowerCase()}-${item.toLowerCase()}`;
      const cached = cache.get(cacheKey);
      if (!cached) {
        return res.status(404).json({ success: false, error: 'No cached data found', message: `No cached results for location "${location}" and item "${item}". Try scraping first.`, hint: 'Use POST /api/scrape to get fresh data' });
      }
      if ((Date.now() - cached.timestamp) > CACHE_DURATION) {
        cache.delete(cacheKey);
        return res.status(404).json({ success: false, error: 'Cache expired', message: 'Cached data has expired. Please scrape again.' });
      }
      res.json({ ...cached.data, fromCache: true, cacheAge: Math.round((Date.now() - cached.timestamp) / 1000 / 60) });
    } catch (error) {
      console.error('❌ Get cached products error:', error);
      res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
    }
  }

  async getCacheStats(req, res) {
    try {
      const cacheEntries = Array.from(cache.entries()).map(([key, value]) => ({ key, age: Math.round((Date.now() - value.timestamp) / 1000 / 60), productsCount: value.data.products?.length || 0 }));
      res.json({ success: true, totalEntries: cache.size, entries: cacheEntries });
    } catch (error) {
      console.error('❌ Cache stats error:', error);
      res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
    }
  }

  async clearCache(req, res) {
    try {
      const entriesCleared = cache.size;
      cache.clear();
      res.json({ success: true, message: `Cleared ${entriesCleared} cache entries` });
    } catch (error) {
      console.error('❌ Clear cache error:', error);
      res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
    }
  }

  async healthCheck(req, res) {
    try {
      res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString(), cacheEntries: cache.size, uptime: process.uptime() });
    } catch (error) {
      res.status(500).json({ success: false, status: 'unhealthy', error: error.message });
    }
  }
}

module.exports = new ScrapeController();
