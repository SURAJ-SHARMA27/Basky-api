// ZeptoService: Manages browser session and Zepto scraping logic
const puppeteer = require('puppeteer');

// Helper to build consistent launch options for Cloud Run / container
function buildLaunchOptions(overrides = {}) {
    // Common args recommended for running Chrome in minimal container / Cloud Run
    const baseArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // use /tmp instead of /dev/shm
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--single-process',
        '--no-zygote'
    ];

    // Allow overriding / extending args
    const args = Array.from(new Set([...(overrides.args || []), ...baseArgs]));

    // In puppeteer >= 20, headless defaults changed; explicitly set to 'new'
    const headless = overrides.headless !== undefined ? overrides.headless : 'new';

    // If running inside the official puppeteer image, chromium is already in PATH.
    // Allow explicit executable path via env var if set.
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    return { headless, args, executablePath, ...overrides };
}

let globalBrowser = null;
let globalPage = null;

async function closeBrowserSession() {
    if (globalBrowser) {
        try { await globalBrowser.close(); } catch (e) {}
        globalBrowser = null;
        globalPage = null;
    }
}

async function initializeBrowser(forceNew = false) {
    if (forceNew || !globalBrowser || !globalPage) {
        if (forceNew) await closeBrowserSession();
        globalBrowser = await puppeteer.launch(buildLaunchOptions({ devtools: false }));
        globalPage = await globalBrowser.newPage();
        await globalPage.setViewport({ width: 1366, height: 768 });
        await globalPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await globalPage.goto('https://www.zeptonow.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    }
    return { browser: globalBrowser, page: globalPage };
}

module.exports = {
    closeBrowserSession,
    initializeBrowser,
    getBrowser: () => globalBrowser,
    getPage: () => globalPage
};
