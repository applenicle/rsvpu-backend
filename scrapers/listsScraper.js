const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');
const Logger = require('../utils/logger');
const config = require('../config');
const agent = new https.Agent(config.httpsAgentOptions);

async function fetchData(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await axios.get(url, {
      httpsAgent: agent,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'ru-RU,ru',
      },
    });
    clearTimeout(timeout);
    return response.data;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

module.exports = {
  scrapeGroupsList: () => fetchData(config.groupsListUrl).then(parseGroups),
  scrapeTeachersList: () => fetchData(config.teachersListUrl).then(parseTeachers),
};

function parseGroups(html) {
  const $ = cheerio.load(html);
  return $('div[name="gr"]')
    .map((i, el) => ({
      id: $(el).attr('data'),
      name: $(el).text().trim(),
    }))
    .get();
}

function parseTeachers(html) {
  const $ = cheerio.load(html);
  return $('div[name="prep"]')
    .map((i, el) => ({
      id: $(el).attr('data'),
      name: $(el).text().trim(),
    }))
    .get();
}
