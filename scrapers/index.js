const scrapeGroups = require('./lists/groupsScraper');
const scrapeTeachers = require('./lists/teachersScraper');
const GroupScraper = require('./schedule/groupScraper');
const TeacherScraper = require('./schedule/teacherScraper');

const groupScraper = new GroupScraper();
const teacherScraper = new TeacherScraper();

module.exports = {
  scrapeGroups,
  scrapeTeachers,
  scrapeGroupSchedule: groupScraper.getSchedule.bind(groupScraper),
  scrapeTeacherSchedule: teacherScraper.getSchedule.bind(teacherScraper),
  GroupScraper,
  TeacherScraper,
};
