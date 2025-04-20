const { chromium } = require('playwright');

class BrowserManager {
  static async launch() {
    return await chromium.launch({
      headless: true,
      timeout: 60000,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}

module.exports = BrowserManager;
