const { chromium } = require('playwright');
const Logger = require('../../utils/logger');
const { ensureDir } = require('../../utils/helpers');
const path = require('path');
const fs = require('fs');
const config = require('../../config');

class BaseScraper {
  constructor(type) {
    this.type = type;
    this.browser = null;
  }

  async initializeBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        timeout: 60000,
      });
    }
    return this.browser;
  }

  async getSchedule(id) {
    try {
      await this.initializeBrowser();
      const page = await this.browser.newPage();

      const url = this.getUrl(id);
      Logger.info(`Fetching ${this.type} schedule for ID: ${id} from ${url}`);

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Проверка на пустое расписание
      const isEmpty = await this.isScheduleEmpty(page);
      if (isEmpty) {
        Logger.info(`Empty schedule for ${this.type} ID: ${id}`);
        return [];
      }

      // Ожидание загрузки расписания
      await this.waitForSchedule(page);

      // Сохранение отладочной информации
      await this.saveDebugContent(page, id);

      // Парсинг расписания
      const schedule = await this.parseSchedule(page);
      return schedule;
    } catch (error) {
      Logger.error(`Error getting schedule for ${this.type} ID: ${id}`, error);
      throw error;
    }
  }

  getUrl(id) {
    return `${config.baseUrl}?v_${this.type === 'group' ? 'gru' : 'prep'}=${id}`;
  }

  async isScheduleEmpty(page) {
    try {
      const noSchedule = await page.$('.no-schedule, .empty-schedule');
      if (noSchedule) {
        const message = await noSchedule.evaluate((el) => el.textContent.trim());
        Logger.info(`Empty schedule detected: ${message}`);
        return true;
      }
      const hasSchedule = await page.$('.dateBlock');
      return !hasSchedule;
    } catch (error) {
      Logger.error('Error checking for empty schedule', error);
      return false;
    }
  }

  async waitForSchedule(page) {
    try {
      await page.waitForSelector('.dateBlock', {
        timeout: 30000,
        state: 'attached',
      });
    } catch (error) {
      Logger.error('Failed to wait for schedule', error);
      throw new Error('Schedule elements not found');
    }
  }

  async saveDebugContent(page, id) {
    try {
      ensureDir(config.debugDir);
      const debugPath = path.join(config.debugDir, `${this.type}_${id}_${Date.now()}.html`);
      const content = await page.content();
      fs.writeFileSync(debugPath, content);
      Logger.info(`Debug content saved to ${debugPath}`);
    } catch (error) {
      Logger.error('Failed to save debug content', error);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async checkElementExists(page, selector) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = BaseScraper;
