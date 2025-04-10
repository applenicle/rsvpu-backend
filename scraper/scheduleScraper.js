const config = require('../config');
const fs = require('fs');

module.exports = async function scrapeGroupSchedule(page, url = config.groupUrl) {
  console.log(`Loading schedule from: ${url}`);
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: config.timeout,
  });

  try {
    await page.waitForSelector('.dateBlock', { timeout: 10000 });
  } catch (error) {
    console.error('Schedule not found:', error);
    return [];
  }

  const schedule = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.dateBlock'))
      .map((dateBlock) => {
        const dateElement = dateBlock.querySelector('.dateToday');
        if (!dateElement) return null;

        const dateText = dateElement.textContent.trim();
        const dateMatch = dateText.match(
          /(Понедельник|Вторник|Среда|Четверг|Пятница|Суббота|Воскресенье),\s*(\d{2}\.\d{2}\.\d{4})/,
        );
        if (!dateMatch) return null;

        return {
          dayName: dateMatch[1],
          date: dateMatch[2],
          classes: Array.from(dateBlock.querySelectorAll('.disciplina_cont'))
            .map((table) => {
              const timeElement = table.querySelector('.disciplina_time');
              const infoElement = table.querySelector('.disciplina_info');
              if (!timeElement || !infoElement) return null;

              const teachers = Array.from(infoElement.querySelectorAll('.prepod')).map((el) => {
                const clone = el.cloneNode(true);
                clone.querySelector('i.fa-graduation-cap')?.remove();
                return clone.textContent.replace(/\?$/, '').trim();
              });

              const auditoriums = Array.from(infoElement.querySelectorAll('.auditioria')).map(
                (el) => {
                  const clone = el.cloneNode(true);
                  clone.querySelector('i.fa-university')?.remove();
                  clone.querySelector('.pg')?.remove();
                  clone.querySelector('.subgroup')?.remove();
                  return clone.textContent.trim();
                },
              );

              const subgroups = Array.from(infoElement.querySelectorAll('.subgroup span')).map(
                (el) => el.textContent.trim(),
              );

              return {
                time: `${timeElement.querySelector('p')?.textContent.trim() || ''}-${
                  timeElement.querySelector('.end-time')?.textContent.trim() || ''
                }`,
                type: infoElement.querySelector('.predmet-type')?.textContent.trim() || '',
                subject: infoElement.querySelector('p')?.textContent.trim() || '',
                firstTeacher: teachers[0] || '',
                firstClassroom: auditoriums[0] || '',
                firstGroup: subgroups[0] || '',
                secondTeacher: teachers[1] || '',
                secondClassroom: auditoriums[1] || '',
                secondGroup: subgroups[1] || '',
              };
            })
            .filter(Boolean),
        };
      })
      .filter(Boolean);
  });

  return schedule;
};
