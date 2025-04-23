const BaseScraper = require('./baseScraper');

class TeacherScraper extends BaseScraper {
  constructor() {
    super('teacher');
  }

  parseSchedule($) {
    const result = [];
    const dayBlocks = $('.dateBlock');

    dayBlocks.each((_, block) => {
      const dateElement = $(block).find('.dateToday');
      if (!dateElement.length) return;

      const dateText = dateElement.text().trim();
      const dateMatch = dateText.match(
        /(Понедельник|Вторник|Среда|Четверг|Пятница|Суббота|Воскресенье),\s*(\d{2}\.\d{2}\.\d{4})/,
      );
      if (!dateMatch) return;

      const dayData = {
        dayName: dateMatch[1],
        date: dateMatch[2],
        classes: [],
      };

      $(block)
        .find('.disciplina_cont')
        .each((_, lesson) => {
          const timeElement = $(lesson).find('.disciplina_time');
          const startTime = timeElement.find('p').text().trim();
          const endTime = timeElement.find('.end-time').text().trim();

          const infoElement = $(lesson).find('.disciplina_info');
          const type = infoElement.find('.predmet-type').text().trim();
          const subject = infoElement.find('p').text().trim();

          const groups = infoElement
            .find('.allgroup a.view-link')
            .map((_, el) => $(el).text().trim())
            .get();

          const classroom = infoElement
            .find('.auditioria')
            .map((_, el) => {
              const clone = $(el).clone();
              clone.find('i, .pg, .subgroup').remove();
              return clone.text().trim();
            })
            .get();

          dayData.classes.push({
            startTime,
            endTime,
            type,
            subject,
            groups,
            classroom,
          });
        });

      if (dayData.classes.length > 0) {
        result.push(dayData);
      }
    });

    return result;
  }
}

module.exports = TeacherScraper;
