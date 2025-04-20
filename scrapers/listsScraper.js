const { chromium } = require('playwright');
const Logger = require('../utils/logger');
const config = require('../config');
const { saveDebugHtml } = require('../utils/helpers');

async function scrapeList(url, selector, type) {
  const browser = await chromium.launch({
    headless: true,
    timeout: 60000,
  });
  const page = await browser.newPage();

  try {
    Logger.info(`Loading ${type} list from ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    try {
      await page.waitForSelector(selector, {
        timeout: 30000,
        state: 'attached',
      });
    } catch (error) {
      await saveDebugHtml(page, `${type}_list_failed`);
      Logger.error(`Elements not found for ${type} list`, error);
      throw new Error(`Failed to find ${type} list elements`);
    }

    await saveDebugHtml(page, `${type}_list`);

    const items = await page.evaluate(
      ({ selector, type }) => {
        const elements = Array.from(document.querySelectorAll(selector));
        return elements.map((el) => {
          const id = el.getAttribute('data');
          const name = el.textContent.trim();
          return {
            id,
            name,
            url: `?v_${type === 'gru' ? 'gru' : 'prep'}=${id}`,
          };
        });
      },
      { selector, type },
    );

    Logger.info(`Found ${items.length} ${type} items`);
    return items;
  } catch (error) {
    Logger.error(`Error scraping ${type} list`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function scrapeGroupsList() {
  return await scrapeList(config.groupsListUrl, 'div[name="gr"]', 'gru');
}

async function scrapeTeachersList() {
  return await scrapeList(config.teachersListUrl, 'div[name="prep"]', 'prep');
}

module.exports = {
  scrapeGroupsList,
  scrapeTeachersList,
};
