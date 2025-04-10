const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('../config');

puppeteer.use(StealthPlugin());

async function setupBrowser() {
  return await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1200,800',
    ],
    defaultViewport: null,
  });
}

async function scrapeWithRetry(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: config.timeout,
      });

      if (response.status() < 400) {
        return true;
      }
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  return false;
}

module.exports = {
  scrapeData: async () => {
    let browser;
    try {
      browser = await setupBrowser();
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );
      await page.setDefaultNavigationTimeout(config.timeout);

      // Проверка доступности сайта
      try {
        await scrapeWithRetry(page, config.baseUrl);
      } catch (error) {
        throw new Error(`Сайт ${config.baseUrl} недоступен: ${error.message}`);
      }

      // Парсинг данных последовательно вместо Promise.all
      const allGroups = await require('./groupsScraper')(page);
      const allTeachers = await require('./teachersScraper')(page);
      const schedule = await require('./scheduleScraper')(page);

      return {
        lastUpdated: new Date().toISOString(),
        schedule,
        allGroups,
        allTeachers,
      };
    } finally {
      if (browser) await browser.close();
    }
  },
};
