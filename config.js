const path = require('path');

module.exports = {
  baseUrl: 'https://old.rsvpu.ru/mobile/',
  groupUrl: 'https://old.rsvpu.ru/mobile/?v_gru=4949',
  groupsListUrl: 'https://old.rsvpu.ru/mobile/?groups',
  teachersListUrl: 'https://old.rsvpu.ru/mobile/?prep',
  outputDir: path.join(__dirname, 'debug'),
  outputFile: path.join(__dirname, 'public', 'schedule.json'),
  allGroupsFile: path.join(__dirname, 'public', 'groups.json'),
  allTeachersFile: path.join(__dirname, 'public', 'teachers.json'),
  htmlFile: path.join(__dirname, 'debug', 'page_content.html'),
  timeout: 30000,
  retries: 3,
  retryDelay: 5000,
};
