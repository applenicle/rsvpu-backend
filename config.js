const path = require('path');

module.exports = {
  port: 3001,
  baseUrl: 'https://old.rsvpu.ru/mobile/',
  groupsListUrl: 'https://old.rsvpu.ru/mobile/?groups',
  teachersListUrl: 'https://old.rsvpu.ru/mobile/?prep',
  dataDir: path.join(__dirname, 'data'),
  debugDir: path.join(__dirname, 'debug'),
  cacheFile: 'schedule.json',
  groupsFile: 'groups.json',
  teachersFile: 'teachers.json',
  cacheUpdateInterval: 3600000,
  timeout: 60000,
  maxAttempts: 3,
};
