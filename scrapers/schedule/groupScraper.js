const BaseScraper = require('./baseScraper');
const path = require('path');
const fs = require('fs');

class GroupScraper extends BaseScraper {
  constructor() {
    super('group');
  }

  async parseSchedule(page) {
    const hasSchedule = await this.checkElementExists(page, '.dateBlock');
    if (!hasSchedule) {
      return [];
    }
    return await page.evaluate(() => {
      const result = [];
      const dayBlocks = document.querySelectorAll('.dateBlock');

      dayBlocks.forEach((block) => {
        const dateElement = block.querySelector('.dateToday');
        if (!dateElement) return;

        const dateText = dateElement.textContent.trim();
        const dateMatch = dateText.match(
          /(Понедельник|Вторник|Среда|Четверг|Пятница|Суббота|Воскресенье),\s*(\d{2}\.\d{2}\.\d{4})/,
        );
        if (!dateMatch) return;

        const dayData = {
          dayName: dateMatch[1],
          date: dateMatch[2],
          classes: [],
        };

        const lessons = block.querySelectorAll('.disciplina_cont');
        lessons.forEach((lesson) => {
          const timeElement = lesson.querySelector('.disciplina_time');
          const startTime = timeElement?.querySelector('p')?.textContent.trim() || '';
          const endTime = timeElement?.querySelector('.end-time')?.textContent.trim() || '';

          const infoElement = lesson.querySelector('.disciplina_info');
          const type = infoElement?.querySelector('.predmet-type')?.textContent.trim() || '';
          const subject = infoElement?.querySelector('p')?.textContent.trim() || '';

          const teachers = Array.from(infoElement?.querySelectorAll('.prepod') || []).map((el) => {
            const clone = el.cloneNode(true);
            clone.querySelector('i')?.remove();
            return clone.textContent.replace(/\?$/, '').trim();
          });

          const classrooms = Array.from(infoElement?.querySelectorAll('.auditioria') || []).map(
            (el) => {
              const clone = el.cloneNode(true);
              clone.querySelector('i')?.remove();
              clone.querySelector('.pg')?.remove();
              clone.querySelector('.subgroup')?.remove();
              return clone.textContent.trim();
            },
          );

          const subgroups = Array.from(infoElement?.querySelectorAll('.subgroup span') || []).map(
            (el) => el.textContent.trim(),
          );

          dayData.classes.push({
            time: startTime && endTime ? `${startTime}-${endTime}` : '',
            type,
            subject,
            firstTeacher: teachers[0] || '',
            firstClassroom: classrooms[0] || '',
            firstGroup: subgroups[0] || '',
            secondTeacher: teachers[1] || '',
            secondClassroom: classrooms[1] || '',
            secondGroup: subgroups[1] || '',
          });
        });

        if (dayData.classes.length > 0) {
          result.push(dayData);
        }
      });

      return result;
    });
  }
}

module.exports = GroupScraper;
