// ZeptoService: Manages browser session and Zepto scraping logic
const puppeteer = require('puppeteer');

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
        globalBrowser = await puppeteer.launch({
            headless: false,
            devtools: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=VizDisplayCompositor'
            ]
        });
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
