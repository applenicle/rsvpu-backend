const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  baseUrl: 'https://old.rsvpu.ru/mobile/',
  groupsListUrl: 'https://old.rsvpu.ru/mobile/?groups',
  teachersListUrl: 'https://old.rsvpu.ru/mobile/?prep',
  dataDir: path.join(__dirname, '../data'),
  cacheFile: 'schedule.json',
  groupsFile: 'groups.json',
  teachersFile: 'teachers.json',
  cacheUpdateInterval: 6 * 60 * 60 * 1000,
  timeout: 60000,
  maxAttempts: 3,
  httpsAgent: {
    rejectUnauthorized: false,
    keepAlive: true,
  },
};
