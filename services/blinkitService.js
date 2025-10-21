// BlinkitService implementation (from your provided code)
const axios = require('axios');
const qs = require('querystring');
const puppeteer = require('puppeteer');

class BlinkitService {
  constructor(opts = {}) {
    this.base = opts.base || 'https://blinkit.com';
    this.defaultHeaders = Object.assign({
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      Connection: 'keep-alive',
      'Content-Type': 'application/json',
      Referer: 'https://blinkit.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
      access_token: 'null',
      app_client: 'consumer_web',
      app_version: '52434332',
      auth_key: opts.auth_key || 'c761ec3633c22afad934fb17a66385c1c06c5472b4898b866b7306186d0bb477',
      device_id: opts.device_id || '38a89992-1c91-4ff3-9f87-039d322a5e1f',
      rn_bundle_version: '1009003012',
      'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      session_uuid: opts.session_uuid || '',
      web_app_version: '1008010016'
    }, opts.extraHeaders || {});
    this.defaultCookies = opts.cookies || '';
  }

  buildUrl(path, params = {}) {
    const qsPart = qs.stringify(params);
    return `${this.base}${path}${qsPart ? `?${qsPart}` : ''}`;
  }

  async autoSuggest(query, lat, lng, session_token = '', opts = {}) {
    try {
      if (!query) throw new Error('query required');
      console.log('[Blinkit:autoSuggest] Start', { query, lat, lng });
      
      // Force browser path by default (can disable with FORCE_BLINKIT_BROWSER=false)
      const forceBrowser = process.env.FORCE_BLINKIT_BROWSER !== 'false' && opts.forceBrowser !== false;
      if (forceBrowser) {
        console.log('[Blinkit:autoSuggest] Using browser (default)');
        return await this.autoSuggestBrowser(query, lat, lng, session_token, opts);
      }
      
      const params = { query, lat: lat || '', lng: lng || '', session_token: session_token || '' };
      const url = this.buildUrl('/location/autoSuggest', params);
      console.log('[Blinkit:autoSuggest] URL:', url);
      
      const headers = Object.assign({}, this.defaultHeaders, opts.headers || {});
      if (opts.cookies || this.defaultCookies) headers.Cookie = opts.cookies || this.defaultCookies;
      
      console.log('[Blinkit:autoSuggest] Axios GET');
      const res = await axios.get(url, { headers, timeout: opts.timeout || 8000, validateStatus: null });
      console.log('[Blinkit:autoSuggest] Response status:', res.status);
      
      if (res.status === 403 && opts.tryBrowserFallback !== false) {
        console.log('[Blinkit:autoSuggest] 403 detected, fallback to browser');
        const browserResult = await this.autoSuggestBrowser(query, lat, lng, session_token, opts);
        return browserResult;
      }
      return { success: res.status === 200, status: res.status, headers: res.headers, data: res.data };
    } catch (err) {
      console.error('[Blinkit:autoSuggest] Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async confirmLocation(place_id, title, description = '', session_token = '', opts = {}) {
    try {
      if (!place_id || !title || !session_token) throw new Error('place_id, title and session_token are required');
      console.log('[Blinkit:confirmLocation] Start', { place_id, title });
      
      // Force browser path by default (can disable with FORCE_BLINKIT_BROWSER=false)
      const forceBrowser = process.env.FORCE_BLINKIT_BROWSER !== 'false' && opts.forceBrowser !== false;
      if (forceBrowser) {
        console.log('[Blinkit:confirmLocation] Using browser (default)');
        return await this.confirmLocationBrowser(place_id, title, description, session_token, opts);
      }
      
      const params = { place_id, title, description, is_pin_moved: opts.is_pin_moved === true ? 'true' : 'false', session_token };
      const url = this.buildUrl('/location/info', params);
      console.log('[Blinkit:confirmLocation] URL:', url);
      
      const headers = Object.assign({}, this.defaultHeaders, opts.headers || {});
      if (opts.cookies || this.defaultCookies) headers.Cookie = opts.cookies || this.defaultCookies;
      
      console.log('[Blinkit:confirmLocation] Axios GET');
      const res = await axios.get(url, { headers, timeout: opts.timeout || 8000, validateStatus: null });
      console.log('[Blinkit:confirmLocation] Response status:', res.status);
      
      if (res.status === 403 && opts.tryBrowserFallback !== false) {
        console.log('[Blinkit:confirmLocation] 403 detected, fallback to browser');
        const br = await this.confirmLocationBrowser(place_id, title, description, session_token, opts);
        return br;
      }
      if (res.status !== 200) return { success: false, status: res.status, error: `HTTP ${res.status}` };
      return { success: true, status: 200, locationData: res.data };
    } catch (err) {
      console.error('[Blinkit:confirmLocation] Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async searchProducts(query, location_data = {}, opts = {}) {
    try {
      if (!query) throw new Error('query required');
      console.log('[Blinkit:searchProducts] Start', { query, hasLocation: !!(location_data && location_data.coordinate) });
      
      // Force browser path by default (can disable with FORCE_BLINKIT_BROWSER=false)
      const forceBrowser = process.env.FORCE_BLINKIT_BROWSER !== 'false' && opts.forceBrowser !== false;
      if (forceBrowser) {
        console.log('[Blinkit:searchProducts] Using browser (default)');
        return await this.searchProductsBrowser(query, location_data, opts);
      }
      
      const params = Object.assign({
        offset: opts.offset || 0,
        limit: opts.limit || 24,
        last_snippet_type: opts.last_snippet_type || 'product_card_snippet_type_2',
        last_widget_type: opts.last_widget_type || 'listing_container',
        page_index: opts.page_index || 1,
        q: query,
        search_count: opts.search_count || 0,
        search_method: opts.search_method || 'basic',
        search_type: opts.search_type || 'auto_suggest',
        total_entities_processed: opts.total_entities_processed || 0,
      }, opts.queryParams || {});
      const url = this.buildUrl('/v1/layout/search', params);
      console.log('[Blinkit:searchProducts] URL:', url);
      
      const headers = Object.assign({}, this.defaultHeaders, opts.headers || {});
      if (opts.cookies || this.defaultCookies) headers.Cookie = opts.cookies || this.defaultCookies;
      if (location_data && location_data.coordinate) {
        const lat = location_data.coordinate.lat || location_data.coordinate.latitude || '';
        const lon = location_data.coordinate.lon || location_data.coordinate.lng || location_data.coordinate.longitude || '';
        if (lat) headers['lat'] = String(lat);
        if (lon) headers['lon'] = String(lon);
        headers['x-user-lat'] = String(lat);
        headers['x-user-lng'] = String(lon);
        console.log('[Blinkit:searchProducts] Location headers:', { lat, lon });
      }
      
      console.log('[Blinkit:searchProducts] Axios POST');
      const res = await axios.post(url, {}, { headers, timeout: opts.timeout || 10000, validateStatus: null });
      console.log('[Blinkit:searchProducts] Response status:', res.status);
      
      if (res.status === 403 && opts.tryBrowserFallback !== false) {
        console.log('[Blinkit:searchProducts] 403 detected, fallback to browser');
        return await this.searchProductsBrowser(query, location_data, opts);
      }
      if (res.status !== 200) {
        console.warn('[Blinkit:searchProducts] Non-200 status');
        return { success: false, status: res.status, error: `HTTP ${res.status}`, raw: res.data, headers: res.headers };
      }
      const products = this.parseProductsFromLayout(res.data);
      console.log('[Blinkit:searchProducts] Products parsed:', products.length);
      return { success: true, products, raw: res.data, headers: res.headers };
    } catch (err) {
      const axiosBody = err && err.response && err.response.data ? err.response.data : null;
      const msg = err && err.message ? err.message : 'unknown error';
      console.error('[Blinkit:searchProducts] Error:', msg);
      return { success: false, error: msg, raw: axiosBody };
    }
  }

  parseProductsFromLayout(data) {
    const products = [];
    try {
      if (data && data.response && Array.isArray(data.response.snippets)) {
        for (const snippet of data.response.snippets) {
          if (snippet.widget_type === 'product_card_snippet_type_2' && snippet.data) {
            const d = snippet.data;
            products.push({
              id: d.product_id || d.meta?.product_id || d.identity?.id || null,
              name: d.name?.text || d.display_name?.text || '',
              brand: d.brand_name?.text || d.meta?.brand || '',
              price: d.normal_price?.text || d.price || null,
              mrp: d.mrp?.text || null,
              variant: d.variant?.text || '',
              image: d.image?.url || d.media_container?.items?.[0]?.image?.url || null,
              inventory: d.inventory || 0,
              available: !d.is_sold_out && (d.inventory === undefined ? true : d.inventory > 0),
              offer_tag: d.offer_tag?.title?.text || null,
              merchant_id: d.merchant_id || d.meta?.merchant_id || null,
              group_id: d.group_id || null,
              platform: 'blinkit'
            });
          }
        }
      }
    } catch (e) {}
    return products;
  }

  async autoSuggestBrowser(query, lat, lng, session_token = '', opts = {}) {
    if (!query) throw new Error('query required');
    console.log('[Blinkit:autoSuggestBrowser] Launching browser', { query });
    const params = { query, lat: lat || '', lng: lng || '', session_token: session_token || '' };
    const url = this.buildUrl('/location/autoSuggest', params);
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    
    let browser;
    try {
      browser = await puppeteer.launch({ 
        headless: 'new', 
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox','--disable-dev-shm-usage', '--disable-web-security','--disable-features=VizDisplayCompositor','--single-process','--no-zygote'] 
      });
      
      console.log('[Blinkit:autoSuggestBrowser] Browser launched, creating page');
      const page = await browser.newPage();
      console.log('[Blinkit:autoSuggestBrowser] Page created, setting UA');
      
      if (this.defaultHeaders['User-Agent']) {
        await page.setUserAgent(this.defaultHeaders['User-Agent']);
      }
      
      console.log('[Blinkit:autoSuggestBrowser] Setting headers');
      const extraHeaders = Object.assign({}, this.defaultHeaders);
      const lowerHeaders = {};
      Object.keys(extraHeaders).forEach(k => { lowerHeaders[k.toLowerCase()] = String(extraHeaders[k]); });
      try { await page.setExtraHTTPHeaders(lowerHeaders); } catch (e) { 
        console.warn('[Blinkit:autoSuggestBrowser] Headers warning:', e.message); 
      }
      
      // Set cookies before navigation (if any)
      if (opts.cookies || this.defaultCookies) {
        console.log('[Blinkit:autoSuggestBrowser] Setting cookies');
        const cookies = (opts.cookies || this.defaultCookies).split(';').map(c => c.trim()).filter(Boolean).map(pair => {
          const idx = pair.indexOf('=');
          const name = pair.slice(0, idx);
          const value = pair.slice(idx + 1);
          return { name, value, domain: 'blinkit.com', path: '/' };
        });
        try { await page.setCookie(...cookies); } catch (e) {
          console.warn('[Blinkit:autoSuggestBrowser] Cookie warning:', e.message);
        }
      }
      
      // Navigate to about:blank to establish page context without triggering frame detachment
      console.log('[Blinkit:autoSuggestBrowser] Setting up page context');
      await page.goto('about:blank');
      
      const headers = Object.assign({}, this.defaultHeaders, opts.headers || {});
      console.log('[Blinkit:autoSuggestBrowser] Executing fetch in page');
      const result = await page.evaluate(async (endpoint, headers) => {
        try {
          const res = await fetch(endpoint, { method: 'GET', headers, credentials: 'include', mode: 'cors' });
          const text = await res.text();
          let data = null;
          try { data = JSON.parse(text); } catch (e) { data = text; }
          return { status: res.status, ok: res.ok, data, bodySnippet: text.slice(0, 300) };
        } catch (e) {
          return { status: 0, ok: false, error: e.message };
        }
      }, url, headers);
      console.log('[Blinkit:autoSuggestBrowser] Result status:', result.status);
      return { success: result.ok, status: result.status, data: result.data, error: result.error || null, bodySnippet: result.bodySnippet };
    } catch (err) {
      console.error('[Blinkit:autoSuggestBrowser] Error:', err.message);
      return { success: false, error: err.message };
    } finally {
      if (browser) {
        try { await browser.close(); } catch (_) {}
      }
    }
  }

  async confirmLocationBrowser(place_id, title, description = '', session_token = '', opts = {}) {
    const params = { place_id, title, description, is_pin_moved: opts.is_pin_moved === true ? 'true' : 'false', session_token };
    const url = this.buildUrl('/location/info', params);
    // const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox','--disable-dev-shm-usage', '--disable-web-security','--disable-features=VizDisplayCompositor' ] });

    try {
      const page = await browser.newPage();
      if (this.defaultHeaders['User-Agent']) await page.setUserAgent(this.defaultHeaders['User-Agent']);
      const extraHeaders = Object.assign({}, this.defaultHeaders);
      const lowerHeaders = {};
      Object.keys(extraHeaders).forEach(k => { lowerHeaders[k.toLowerCase()] = String(extraHeaders[k]); });
      try { await page.setExtraHTTPHeaders(lowerHeaders); } catch (_) {}
      try { await page.goto(this.base + '/', { waitUntil: 'networkidle2', timeout: 10000 }); } catch (_) {}
      if (opts.cookies || this.defaultCookies) {
        const cookies = (opts.cookies || this.defaultCookies).split(';').map(c => c.trim()).filter(Boolean).map(pair => {
          const idx = pair.indexOf('=');
          const name = pair.slice(0, idx);
          const value = pair.slice(idx + 1);
          return { name, value, domain: 'blinkit.com', path: '/' };
        });
        try { await page.setCookie(...cookies); } catch (_) {}
      }
      const result = await page.evaluate(async (endpoint, headers) => {
        try {
          const res = await fetch(endpoint, { method: 'GET', headers, credentials: 'include', mode: 'cors' });
          const text = await res.text();
          let data = null;
          try { data = JSON.parse(text); } catch (e) { data = text; }
          return { status: res.status, ok: res.ok, data };
        } catch (e) {
          return { status: 0, ok: false, error: e.message };
        }
      }, url, Object.assign({}, this.defaultHeaders, opts.headers || {}));
      if (!result.ok) return { success: false, status: result.status, error: result.error || `HTTP ${result.status}` };
      return { success: true, status: result.status, locationData: result.data };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      try { await browser.close(); } catch (_) {}
    }
  }

  async searchProductsBrowser(query, location_data = {}, opts = {}) {
    const params = Object.assign({
      offset: opts.offset || 0,
      limit: opts.limit || 24,
      last_snippet_type: opts.last_snippet_type || 'product_card_snippet_type_2',
      last_widget_type: opts.last_widget_type || 'listing_container',
      page_index: opts.page_index || 1,
      q: query,
      search_count: opts.search_count || 0,
      search_method: opts.search_method || 'basic',
      search_type: opts.search_type || 'auto_suggest',
      total_entities_processed: opts.total_entities_processed || 0,
    }, opts.queryParams || {});
    const url = this.buildUrl('/v1/layout/search', params);
    // const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox','--disable-dev-shm-usage', '--disable-web-security','--disable-features=VizDisplayCompositor' ] });
    try {
      const page = await browser.newPage();
      if (this.defaultHeaders['User-Agent']) await page.setUserAgent(this.defaultHeaders['User-Agent']);
      const extraHeaders = Object.assign({}, this.defaultHeaders);
      const lowerHeaders = {};
      Object.keys(extraHeaders).forEach(k => { lowerHeaders[k.toLowerCase()] = String(extraHeaders[k]); });
      try { await page.setExtraHTTPHeaders(lowerHeaders); } catch (_) {}
      try { await page.goto(this.base + '/', { waitUntil: 'networkidle2', timeout: 10000 }); } catch (_) {}
      if (opts.cookies || this.defaultCookies) {
        const cookies = (opts.cookies || this.defaultCookies).split(';').map(c => c.trim()).filter(Boolean).map(pair => {
          const idx = pair.indexOf('=');
          const name = pair.slice(0, idx);
          const value = pair.slice(idx + 1);
          return { name, value, domain: 'blinkit.com', path: '/' };
        });
        try { await page.setCookie(...cookies); } catch (_) {}
      }
      const result = await page.evaluate(async (endpoint, headers) => {
        try {
          const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({}), credentials: 'include', mode: 'cors' });
          const text = await res.text();
          let data = null;
          try { data = JSON.parse(text); } catch (e) { data = text; }
          return { status: res.status, ok: res.ok, data };
        } catch (e) {
          return { status: 0, ok: false, error: e.message };
        }
      }, url, Object.assign({}, this.defaultHeaders, opts.headers || {}, (location_data && location_data.coordinate) ? { lat: String(location_data.coordinate.lat || location_data.coordinate.latitude || ''), lon: String(location_data.coordinate.lon || location_data.coordinate.lng || location_data.coordinate.longitude || '') } : {}));
      if (!result.ok) return { success: false, status: result.status, error: result.error || `HTTP ${result.status}` };
      const products = this.parseProductsFromLayout(result.data);
      return { success: true, products, raw: result.data };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      try { await browser.close(); } catch (_) {}
    }
  }
}

module.exports = BlinkitService;
