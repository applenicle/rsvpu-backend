const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');
const Logger = require('../../utils/logger');
const config = require('../../config');

class BaseScraper {
  constructor(type) {
    this.type = type;
    this.axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
      timeout: 30000,
    });
  }

  async getSchedule(id) {
    try {
      const url = this.getUrl(id);
      Logger.info(`Fetching ${this.type} schedule for ID: ${id} from ${url}`);

      const response = await this.fetchWithRetry(url, 3);
      const $ = cheerio.load(response.data);

      return this.isScheduleEmpty($) ? [] : this.parseSchedule($);
    } catch (error) {
      Logger.error(`Error getting schedule for ${this.type} ID: ${id}`, error);
      throw error;
    }
  }

  async fetchWithRetry(url, maxAttempts) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        return await this.axiosInstance.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'ru-RU,ru;q=0.9',
          },
        });
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  getUrl(id) {
    return `${config.baseUrl}?v_${this.type === 'group' ? 'gru' : 'prep'}=${id}`;
  }

  isScheduleEmpty($) {
    try {
      const noScheduleElement = $('.no-schedule, .empty-schedule');
      if (noScheduleElement.length > 0) {
        Logger.info(`Empty schedule detected: ${noScheduleElement.text().trim()}`);
        return true;
      }
      return $('.dateBlock').length === 0;
    } catch (error) {
      Logger.error('Error checking for empty schedule', error);
      return false;
    }
  }

  parseSchedule($) {
    throw new Error('parseSchedule method must be implemented');
  }
}

module.exports = BaseScraper;
