const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');
const Logger = require('../utils/logger');
const config = require('../config');

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 10000,
});

async function fetchWithRetry(url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await axiosInstance.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9',
        },
      });
      return response.data;
    } catch (error) {
      if (i === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function scrapeList(url, selector, type) {
  try {
    Logger.info(`Loading ${type} list from ${url}`);

    const data = await fetchWithRetry(url);
    const $ = cheerio.load(data);
    const items = [];

    $(selector).each((i, el) => {
      items.push({
        id: $(el).attr('data'),
        name: $(el).text().trim(),
      });
    });

    Logger.info(`Found ${items.length} ${type} items`);
    return items;
  } catch (error) {
    Logger.error(`Error scraping ${type} list: ${error.message}`);
    throw error;
  }
}

module.exports = {
  scrapeGroupsList: () => scrapeList(config.groupsListUrl, 'div[name="gr"]', 'gr'),
  scrapeTeachersList: () => scrapeList(config.teachersListUrl, 'div[name="prep"]', 'prep'),
};
