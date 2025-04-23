const BaseScraper = require('./baseScraper');

class GroupScraper extends BaseScraper {
  constructor() {
    super('group');
  }

  parseSchedule($) {
    const result = [];

    $('.dateBlock').each((i, block) => {
      const $block = $(block);
      const dateElement = $block.find('.dateToday');
      if (!dateElement.length) return;

      const dateText = dateElement.text().trim();
      const dateMatch = dateText.match(
        /(Понедельник|Вторник|Среда|Четверг|Пятница|Суббота|Воскресенье),\s*(\d{2}\.\d{2}\.\d{4})/i,
      );
      if (!dateMatch) return;

      const dayData = {
        dayName: dateMatch[1],
        date: dateMatch[2],
        classes: [],
      };

      $block.find('.disciplina_cont').each((j, lesson) => {
        const $lesson = $(lesson);
        const timeElement = $lesson.find('.disciplina_time');
        const infoElement = $lesson.find('.disciplina_info');

        if (!timeElement.length || !infoElement.length) return;

        const startTime = timeElement.find('p').text().trim() || '';
        const endTime = timeElement.find('.end-time').text().trim() || '';

        const type = infoElement.find('.predmet-type').text().trim() || '';

        const subjects = infoElement
          .find('p')
          .map((k, el) => {
            const $el = $(el).clone();
            $el.find('i').remove();
            return $el.text().replace(/\?$/, '').trim();
          })
          .get();

        const teachers = infoElement
          .find('.prepod')
          .map((k, el) => {
            const $el = $(el).clone();
            $el.find('i').remove();
            return $el.text().replace(/\?$/, '').trim();
          })
          .get();

        const subgroups = infoElement?.find('.subgroup span').map((k, el) => {
          const $el = $(el).clone();
          return $el.text().trim();
        });

        const classrooms = infoElement
          .find('.auditioria')
          .map((k, el) => {
            const $el = $(el).clone();
            $el.find('i, .pg, .subgroup').remove();
            return $el.text().trim();
          })
          .get();

        dayData.classes.push({
          startTime,
          endTime,
          type,
          firstSubject: subjects[0] || '',
          firstTeacher: teachers[0] || '',
          firstClassroom: classrooms[0] || '',
          firstGroup: subgroups[0] || '',
          secondSubject: subjects[1] || '',
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
  }
}

module.exports = GroupScraper;
