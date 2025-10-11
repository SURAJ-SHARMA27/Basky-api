// ZeptoController: Handles Zepto API endpoints
const zeptoService = require('../services/zeptoService');

class ZeptoController {
    // POST /api/zepto/search-locations

    // POST /api/zepto/search-locations
    async searchLocations(req, res) {
        // Set a global timeout for the entire handler (e.g., 30 seconds)
        const API_TIMEOUT = 30000;
        let timeoutHandle;
        let finished = false;
        // Helper to respond without closing browser session (keep it alive for selectLocation)
        const safeRespond = async (status, data) => {
            if (finished) return;
            finished = true;
            clearTimeout(timeoutHandle);
            // Don't close browser session - keep it alive for subsequent calls
            res.status(status).json(data);
        };
        timeoutHandle = setTimeout(() => {
            safeRespond(504, { success: false, error: 'Request timed out after 30 seconds' });
        }, API_TIMEOUT);
        try {
            const { searchTerm } = req.body;
            if (!searchTerm) {
                return safeRespond(400, {
                    error: 'searchTerm is required',
                    example: { searchTerm: "malik residency" }
                });
            }
            console.log(`🔍 Searching for: ${searchTerm}`);
            
            // Try to reuse existing browser session first
            let page = zeptoService.getPage();
            let usingExistingSession = false;
            
            if (page) {
                try {
                    // Test if the existing page is still working and check the current URL
                    const currentUrl = await page.url();
                    console.log(`🌐 Current page URL: ${currentUrl}`);
                    
                    // Check if we're on the home page or a suitable page for location search
                    const isOnHomePage = currentUrl.includes('zeptonow.com') && 
                                       (currentUrl === 'https://www.zeptonow.com/' || 
                                        currentUrl.endsWith('zeptonow.com/') ||
                                        !currentUrl.includes('/search') && !currentUrl.includes('/products'));
                    
                    if (isOnHomePage) {
                        await page.evaluate(() => document.title);
                        console.log('🔄 Reusing existing browser session (on suitable page)...');
                        usingExistingSession = true;
                    } else {
                        console.log('🔄 Current page not suitable for location search, navigating to home page...');
                        try {
                            await page.goto('https://www.zeptonow.com/', { waitUntil: 'networkidle2', timeout: 15000 });
                            console.log('🔄 Successfully navigated to home page, reusing session...');
                            usingExistingSession = true;
                        } catch (navError) {
                            console.log('🔄 Navigation failed, will start fresh browser session...');
                            page = null;
                        }
                    }
                } catch (error) {
                    console.log('🔄 Existing session failed, starting new browser session...');
                    page = null;
                }
            }
            
            if (!page) {
                console.log('🔄 Starting new browser session for location search...');
                ({ page } = await zeptoService.initializeBrowser());
            }
            let locationClicked = false;
            const possibleSelectors = [
                'button[aria-label="Select Location"]',
                'button[aria-haspopup="dialog"]',
                '[data-testid="user-address"]',
                '.WCHS8',
                '.__4y7HY'
            ];
            for (const selector of possibleSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 3000 });
                    await page.click(selector);
                    locationClicked = true;
                    break;
                } catch (e) { continue; }
            }
            if (!locationClicked) {
                try {
                    await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const locationButton = buttons.find(btn =>
                            btn.textContent.includes('Select Location') ||
                            btn.getAttribute('aria-label')?.includes('Select Location')
                        );
                        if (locationButton) {
                            locationButton.click();
                            return true;
                        }
                        return false;
                    });
                    locationClicked = true;
                } catch (e) { }
            }
            const searchInputSelectors = [
                'input[placeholder="Search a new address"]',
                'input[placeholder*="Search"]',
                'input[placeholder*="address"]',
                'input[inputmode="text"]',
                'input[type="text"].focus\\:outline-none'
            ];
            let searchInput = null;
            for (const selector of searchInputSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 5000 });
                    searchInput = selector;
                    break;
                } catch (e) { continue; }
            }
            if (!searchInput) {
                await page.screenshot({ path: 'debug-search-input-not-found.png', fullPage: true });
                return safeRespond(500, {
                    success: false,
                    error: 'No element found for search input',
                    message: 'Could not find search input field. The page structure may have changed.',
                    debugInfo: {
                        triedSelectors: searchInputSelectors,
                        screenshotSaved: 'debug-search-input-not-found.png'
                    }
                });
            }
            const capturedResponses = [];
            const responseHandler = async (response) => {
                const url = response.url();
                if (url.includes('/api/v1/maps/place/autocomplete') ||
                    url.includes('cdn.bff.zeptonow.com/api/v1/maps/place/autocomplete') ||
                    url.includes('api.zepto.com/api/v1/maps/place/autocomplete')) {
                    try {
                        const responseData = await response.json();
                        capturedResponses.push({
                            url: url,
                            status: response.status(),
                            data: responseData,
                            timestamp: new Date().toISOString()
                        });
                    } catch (error) {
                        console.log('Failed to parse autocomplete response:', error.message);
                    }
                }
            };
            page.on('response', responseHandler);
            try {
                await page.click(searchInput);
                await page.evaluate((selector) => {
                    const input = document.querySelector(selector);
                    if (input) input.value = '';
                }, searchInput);
                await page.type(searchInput, searchTerm.replace(/\s+/g, '+'), { delay: 100 });
            } catch (e) {
                return safeRespond(500, { success: false, error: 'Failed to type in search input', details: e.message });
            }
            try {
                await new Promise((resolve, reject) => {
                    setTimeout(resolve, 3000);
                });
            } catch (e) {}
            page.off('response', responseHandler);
            if (capturedResponses.length > 0) {
                const latestResponse = capturedResponses[capturedResponses.length - 1];
                return safeRespond(200, {
                    success: true,
                    searchTerm: searchTerm,
                    predictions: latestResponse.data.predictions || [],
                    status: latestResponse.data.status,
                    timestamp: latestResponse.timestamp
                });
            } else {
                return safeRespond(404, {
                    success: false,
                    error: 'No location predictions found',
                    searchTerm: searchTerm
                });
            }
        } catch (error) {
            console.error('❌ Error in search-locations:', error.message);
            return safeRespond(500, {
                success: false,
                error: error.message,
                searchTerm: req.body.searchTerm || 'unknown'
            });
        }
    }

    // POST /api/zepto/select-location

    // POST /api/zepto/select-location
    async selectLocation(req, res) {
        try {
            const { description, main_text } = req.body;
            if (!description && !main_text) {
                return res.status(400).json({
                    error: 'description or main_text is required',
                    example: { description: "MALIK RESIDENCY TOWERS, Tetavli, Kausa, Mumbra, Thane, Maharashtra, India" }
                });
            }
            const searchText = main_text || description;
            // Reuse existing browser session if available, with error handling
            let page = zeptoService.getPage();
            
            if (page) {
                try {
                    // Test if the existing page is still working and check the current URL
                    const currentUrl = await page.url();
                    console.log(`🌐 Current page URL for selectLocation: ${currentUrl}`);
                    
                    // Check if we're on a page where location selection items should be available
                    // This could be home page with location search open or search results page
                    const isOnSuitablePage = currentUrl.includes('zeptonow.com');
                    
                    if (isOnSuitablePage) {
                        await page.evaluate(() => document.title);
                        console.log('🔄 Reusing existing browser session for selectLocation...');
                    } else {
                        console.log('🔄 Current page not suitable for location selection, opening new session...');
                        ({ page } = await zeptoService.initializeBrowser());
                    }
                } catch (error) {
                    console.log('🔄 Existing session failed, opening new browser session for selectLocation...');
                    ({ page } = await zeptoService.initializeBrowser());
                }
            } else {
                console.log('🔄 No existing session, opening new browser session for selectLocation...');
                ({ page } = await zeptoService.initializeBrowser());
            }
            const placeDetailsResponses = [];
            const deliveryCheckResponses = [];
            const responseHandler = async (response) => {
                const url = response.url();
                if (url.includes('/api/v1/maps/place/details') ||
                    url.includes('cdn.bff.zeptonow.com/api/v1/maps/place/details') ||
                    url.includes('api.zepto.com/api/v1/maps/place/details')) {
                    try {
                        const responseData = await response.json();
                        placeDetailsResponses.push({
                            url: url,
                            status: response.status(),
                            data: responseData,
                            timestamp: new Date().toISOString()
                        });
                    } catch (error) { }
                }
                if ((url.includes('/api/v2/get_page') || url.includes('cdn.bff.zeptonow.com/api/v2/get_page')) &&
                    url.includes('latitude') && url.includes('longitude')) {
                    try {
                        const responseData = await response.json();
                        deliveryCheckResponses.push({
                            url: url,
                            status: response.status(),
                            data: responseData,
                            timestamp: new Date().toISOString()
                        });
                    } catch (error) { }
                }
            };
            page.on('response', responseHandler);
            
            try {
                await page.waitForSelector('[data-testid="address-search-item"]', { timeout: 10000 });
                await page.evaluate((targetText) => {
                    const items = document.querySelectorAll('[data-testid="address-search-item"]');
                    for (const item of items) {
                        const mainTextElement = item.querySelector('.c4ZmYS');
                        const fullTextElement = item.querySelector('.ctyATk span');
                        const mainText = mainTextElement?.textContent?.trim() || '';
                        const fullText = fullTextElement?.textContent?.trim() || '';
                        if (mainText === targetText ||
                            mainText.toLowerCase().includes(targetText.toLowerCase()) ||
                            targetText.toLowerCase().includes(mainText.toLowerCase()) ||
                            fullText.toLowerCase().includes(targetText.toLowerCase())) {
                            item.click();
                            return { success: true, clicked: mainText, fullText: fullText };
                        }
                    }
                    if (items.length > 0) {
                        const firstItem = items[0];
                        firstItem.click();
                        return { success: true, fallback: true };
                    }
                    return { success: false, error: 'No items found to click' };
                }, searchText);
            } catch (error) {
                // If the current session fails, try with a fresh browser session
                try {
                    console.log('🔄 Current session failed, trying with fresh browser session...');
                    ({ page } = await zeptoService.initializeBrowser(true));
                    page.on('response', responseHandler);
                    
                    await page.waitForSelector('[data-testid="address-search-item"]', { timeout: 10000 });
                    await page.evaluate((targetText) => {
                        const items = document.querySelectorAll('[data-testid="address-search-item"]');
                        for (const item of items) {
                            const mainTextElement = item.querySelector('.c4ZmYS');
                            const fullTextElement = item.querySelector('.ctyATk span');
                            const mainText = mainTextElement?.textContent?.trim() || '';
                            const fullText = fullTextElement?.textContent?.trim() || '';
                            if (mainText === targetText ||
                                mainText.toLowerCase().includes(targetText.toLowerCase()) ||
                                targetText.toLowerCase().includes(mainText.toLowerCase()) ||
                                fullText.toLowerCase().includes(targetText.toLowerCase())) {
                                item.click();
                                return { success: true, clicked: mainText, fullText: fullText };
                            }
                        }
                        if (items.length > 0) {
                            const firstItem = items[0];
                            firstItem.click();
                            return { success: true, fallback: true };
                        }
                        return { success: false, error: 'No items found to click' };
                    }, searchText);
                } catch (retryError) {
                    // If even fresh session fails, fallback to Enter key
                    await page.keyboard.press('Enter');
                }
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
            try {
                await page.waitForSelector('[data-testid="location-confirm-btn"], button[aria-label="Confirm Action"], .cpG2SV', { timeout: 10000 });
                await page.click('[data-testid="location-confirm-btn"]');
                await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (error) {
                // Try alternative selectors
                const buttonSelectors = [
                    'button[aria-label="Confirm Action"]',
                    '.cpG2SV',
                    '.cdW7ko',
                    'button:contains("Confirm")',
                    'button:contains("Continue")',
                    '[class*="confirm"]',
                    '[class*="continue"]'
                ];
                for (const selector of buttonSelectors) {
                    try {
                        await page.waitForSelector(selector, { timeout: 2000 });
                        await page.click(selector);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        break;
                    } catch (e) { continue; }
                }
            }
            page.off('response', responseHandler);
            let responseData = {
                success: true,
                selected_location: searchText,
                timestamp: new Date().toISOString()
            };
            if (placeDetailsResponses.length > 0) {
                const latestPlaceDetails = placeDetailsResponses[placeDetailsResponses.length - 1];
                responseData.place_details = {
                    data: latestPlaceDetails.data,
                    api_url: latestPlaceDetails.url,
                    timestamp: latestPlaceDetails.timestamp
                };
            }
            if (deliveryCheckResponses.length > 0) {
                const latestDeliveryCheck = deliveryCheckResponses[deliveryCheckResponses.length - 1];
                responseData.delivery_check = {
                    data: latestDeliveryCheck.data,
                    api_url: latestDeliveryCheck.url,
                    timestamp: latestDeliveryCheck.timestamp,
                    message: "Yes, we deliver at this location!"
                };
            }
            if (placeDetailsResponses.length > 0 || deliveryCheckResponses.length > 0) {
                res.json(responseData);
            } else {
                res.json({
                    success: true,
                    selected_location: searchText,
                    message: 'Location selected but no API calls detected',
                    note: 'Location was selected successfully, but place details/delivery check APIs may not have been triggered',
                    fallback_data: {
                        clicked: true,
                        location: searchText
                    }
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                location: req.body.description || req.body.main_text || 'unknown'
            });
        }
    }

    // POST /api/zepto/search-products

    // POST /api/zepto/search-products
    async searchProducts(req, res) {
        try {
            const { productName } = req.body;
            if (!productName) {
                return res.status(400).json({
                    error: 'productName is required',
                    example: { productName: "dal" }
                });
            }
            // Try to reuse existing browser session first, with URL validation
            let page = zeptoService.getPage();
            
            if (page) {
                try {
                    const currentUrl = await page.url();
                    console.log(`🌐 Current page URL for searchProducts: ${currentUrl}`);
                    
                    // Test if the existing page is still working
                    await page.evaluate(() => document.title);
                    console.log('🔄 Reusing existing browser session for searchProducts...');
                } catch (error) {
                    console.log('🔄 Existing session failed, opening new browser session for searchProducts...');
                    ({ page } = await zeptoService.initializeBrowser());
                }
            } else {
                console.log('🔄 No existing session, opening new browser session for searchProducts...');
                ({ page } = await zeptoService.initializeBrowser());
            }
            const searchResponses = [];
            const responseHandler = async (response) => {
                const url = response.url();
                if (url.includes('/api/v3/search') ||
                    url.includes('cdn.bff.zeptonow.com/api/v3/search') ||
                    url.includes('api.zepto.com/api/v3/search')) {
                    try {
                        const responseData = await response.json();
                        const isAutosuggest = url.includes('mode=AUTOSUGGEST') || responseData.mode === 'AUTOSUGGEST';
                        if (!isAutosuggest && responseData.layout && Array.isArray(responseData.layout)) {
                            searchResponses.push({
                                url: url,
                                status: response.status(),
                                data: responseData,
                                timestamp: new Date().toISOString(),
                                searchType: 'PRODUCT_SEARCH'
                            });
                        } else if (isAutosuggest) {
                            // skip autosuggest
                        } else {
                            searchResponses.push({
                                url: url,
                                status: response.status(),
                                data: responseData,
                                timestamp: new Date().toISOString(),
                                searchType: 'UNKNOWN'
                            });
                        }
                    } catch (error) { }
                }
            };
            page.on('response', responseHandler);
            try {
                const searchInputSelectors = [
                    'input[placeholder="Search for over 5000 products"]',
                    'input[role="combobox"]',
                    'input[type="text"]',
                    '#\\«rj\\»--input'
                ];
                let alreadyOnSearchPage = false;
                let searchInput = null;
                for (const selector of searchInputSelectors) {
                    try {
                        await page.waitForSelector(selector, { timeout: 2000 });
                        searchInput = selector;
                        alreadyOnSearchPage = true;
                        break;
                    } catch (e) { continue; }
                }
                if (!alreadyOnSearchPage) {
                    const searchButtonSelectors = [
                        '[data-testid="search-bar-icon"]',
                        'a[aria-label="Search for products"]',
                        '.inline-block a[href="/search"]',
                        'a[href="/search"]'
                    ];
                    let searchButtonClicked = false;
                    for (const selector of searchButtonSelectors) {
                        try {
                            await page.waitForSelector(selector, { timeout: 3000 });
                            await page.click(selector);
                            searchButtonClicked = true;
                            break;
                        } catch (e) { continue; }
                    }
                    if (!searchButtonClicked) {
                        const secondarySearchSelectors = [
                            'button[class*="search"]',
                            '[aria-label*="search"]',
                            '[data-testid*="search"]',
                            '.search-icon',
                            'svg[class*="search"]',
                            '[href*="search"]'
                        ];
                        for (const selector of secondarySearchSelectors) {
                            try {
                                await page.waitForSelector(selector, { timeout: 2000 });
                                await page.click(selector);
                                searchButtonClicked = true;
                                break;
                            } catch (e) { continue; }
                        }
                        if (!searchButtonClicked) {
                            throw new Error('Could not find any search button or input');
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    for (const selector of searchInputSelectors) {
                        try {
                            await page.waitForSelector(selector, { timeout: 5000 });
                            searchInput = selector;
                            break;
                        } catch (e) { continue; }
                    }
                    if (!searchInput) {
                        throw new Error('Could not find search input after navigation');
                    }
                }
                await page.click(searchInput);
                await page.evaluate((selector) => {
                    const input = document.querySelector(selector);
                    if (input) input.value = '';
                }, searchInput);
                await page.type(searchInput, productName, { delay: 100 });
                await new Promise(resolve => setTimeout(resolve, 1000));
                await page.keyboard.press('Enter');
                await new Promise(resolve => setTimeout(resolve, 8000));
                // Try clicking search button if available
                const searchButtonSelectors = [
                    'button[type="submit"]',
                    'button[aria-label="Search"]',
                    '.search-button',
                    '[data-testid="search-submit"]'
                ];
                for (const selector of searchButtonSelectors) {
                    try {
                        const elements = await page.$$(selector);
                        if (elements.length > 0) {
                            await page.click(selector);
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            break;
                        }
                    } catch (e) { continue; }
                }
            } catch (error) {
                throw error;
            }
            page.off('response', responseHandler);
            const productSearchResponses = searchResponses.filter(resp =>
                resp.searchType === 'PRODUCT_SEARCH' ||
                (resp.data && resp.data.layout && Array.isArray(resp.data.layout))
            );
            if (productSearchResponses.length > 0) {
                const latestResponse = productSearchResponses[productSearchResponses.length - 1];
                res.json({
                    success: true,
                    productName: productName,
                    products: latestResponse.data.layout || [],
                    searchApiResponse: {
                        url: latestResponse.url,
                        timestamp: latestResponse.timestamp
                    }
                });
            } else {
                res.json({
                    success: false,
                    error: 'No product search API response captured',
                    productName: productName
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                productName: req.body.productName || 'unknown'
            });
        }
    }

    // POST /api/zepto/close-session
    async closeSession(req, res) {
        await zeptoService.closeBrowserSession();
        res.json({ success: true, message: 'Browser session closed successfully' });
    }

    // GET /api/zepto/health
    async health(req, res) {
        res.json({
            success: true,
            message: 'Zepto API is running',
            browser_status: zeptoService.getBrowser() ? 'active' : 'inactive'
        });
    }

    // GET /api/zepto/debug
    async debug(req, res) {
        const page = zeptoService.getPage();
        if (!page) {
            return res.json({ success: false, error: 'No active browser session' });
        }
        // ...add debug logic if needed...
        res.json({ success: true, message: 'Debug endpoint not implemented' });
    }
}

module.exports = new ZeptoController();
