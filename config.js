const path = require('path');

module.exports = {
  port: 3000,
  baseUrl: 'https://old.rsvpu.ru/mobile/',
  groupsListUrl: 'https://old.rsvpu.ru/mobile/?groups',
  teachersListUrl: 'https://old.rsvpu.ru/mobile/?prep',
  dataDir: path.join(__dirname, '../data'),
  cacheFile: 'schedule.json',
  groupsFile: 'groups.json',
  teachersFile: 'teachers.json',
  cacheUpdateInterval: 6 * 60 * 60 * 1000,
  timeout: 120000,
  maxAttempts: 5,
  httpsAgentOptions: {
    rejectUnauthorized: false,
    keepAlive: true,
    timeout: 120000,
  },
};
