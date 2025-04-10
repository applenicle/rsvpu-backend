const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const config = {
  baseUrl: 'https://old.rsvpu.ru/mobile/',
  groupUrl: 'https://old.rsvpu.ru/mobile/?v_gru=4949',
  groupsListUrl: 'https://old.rsvpu.ru/mobile/?groups',
  teachersListUrl: 'https://old.rsvpu.ru/mobile/?prep',
  outputDir: path.join(__dirname, 'debug'),
  outputFile: path.join(__dirname, 'public', 'schedule.json'),
  allGroupsFile: path.join(__dirname, 'public', 'groups.json'),
  allTeachersFile: path.join(__dirname, 'public', 'teachers.json'),
  htmlFile: path.join(__dirname, 'debug', 'page_content.html'),
  timeout: 30000, // Увеличено время ожидания
};

function ensureDirectories() {
  [path.dirname(config.outputFile), config.outputDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Создана директория: ${dir}`);
    }
  });
}

async function waitForContent(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { timeout });
  return page.$eval(selector, (el) => el.innerHTML);
}

async function scrapeAllGroups(page) {
  console.log('Загрузка списка групп...');
  await page.goto(config.groupsListUrl, {
    waitUntil: 'networkidle2',
    timeout: config.timeout,
  });

  // Ждем появления хотя бы одного элемента группы
  try {
    await page.waitForSelector('div[name="gr"].li', { timeout: 10000 });
  } catch (error) {
    console.error('Элементы групп не найдены:', error);
    return [];
  }

  const groups = await page.evaluate(() => {
    const groups = [];
    const groupElements = document.querySelectorAll('div[name="gr"].li');

    groupElements.forEach((el) => {
      const groupId = el.getAttribute('data');
      const groupName = el.textContent.trim();

      if (groupId && groupName) {
        groups.push({
          id: groupId,
          name: groupName,
          url: `?v_gru=${groupId}`,
        });
      }
    });

    return groups;
  });

  if (groups.length === 0) {
    console.warn('Список групп пуст. Проверьте структуру страницы.');
    const html = await page.content();
    fs.writeFileSync(path.join(config.outputDir, 'groups_page.html'), html);
    console.log('HTML страницы с группами сохранен для отладки');
  }

  fs.writeFileSync(config.allGroupsFile, JSON.stringify(groups, null, 2));
  console.log(`Список групп сохранен (${groups.length} записей)`);
  return groups;
}

async function scrapeAllTeachers(page) {
  console.log('Загрузка списка преподавателей...');
  await page.goto(config.teachersListUrl, {
    waitUntil: 'networkidle2',
    timeout: config.timeout,
  });

  // Ждем появления хотя бы одного преподавателя
  try {
    await page.waitForSelector('div[name="prep"].li', { timeout: 10000 });
  } catch (error) {
    console.error('Элементы преподавателей не найдены:', error);
    return [];
  }

  const teachers = await page.evaluate(() => {
    const teachers = [];
    const teacherElements = document.querySelectorAll('div[name="prep"].li');

    teacherElements.forEach((el) => {
      const teacherId = el.getAttribute('data');
      const teacherName = el.textContent.trim();

      if (teacherId && teacherName) {
        teachers.push({
          id: teacherId,
          name: teacherName,
          url: `?v_prep=${teacherId}`,
        });
      }
    });

    return teachers;
  });

  if (teachers.length === 0) {
    console.warn('Список преподавателей пуст. Проверьте структуру страницы.');
    const html = await page.content();
    fs.writeFileSync(path.join(config.outputDir, 'teachers_page.html'), html);
    console.log('HTML страницы с преподавателями сохранен для отладки');
  }

  fs.writeFileSync(config.allTeachersFile, JSON.stringify(teachers, null, 2));
  console.log(`Список преподавателей сохранен (${teachers.length} записей)`);
  return teachers;
}

async function scrapeGroupSchedule(page) {
  console.log(`Загрузка расписания группы: ${config.groupUrl}`);
  await page.goto(config.groupUrl, {
    waitUntil: 'networkidle2',
    timeout: config.timeout,
  });

  // Ждем загрузки расписания
  try {
    await page.waitForSelector('.dateBlock', { timeout: 10000 });
  } catch (error) {
    console.error('Расписание не найдено:', error);
    return [];
  }

  const html = await page.content();
  fs.writeFileSync(config.htmlFile, html);
  console.log(`HTML сохранен в: ${config.htmlFile}`);

  const schedule = await page.evaluate(() => {
    const result = [];
    const dateBlocks = document.querySelectorAll('.dateBlock');

    dateBlocks.forEach((dateBlock) => {
      const dateElement = dateBlock.querySelector('.dateToday');
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

      const tables = dateBlock.querySelectorAll('.disciplina_cont');
      tables.forEach((table) => {
        const timeElement = table.querySelector('.disciplina_time');
        const infoElement = table.querySelector('.disciplina_info');
        if (!timeElement || !infoElement) return;

        const startTime = timeElement.querySelector('p')?.textContent.trim() || '';
        const endTime = timeElement.querySelector('.end-time')?.textContent.trim() || '';
        const type = infoElement.querySelector('.predmet-type')?.textContent.trim() || '';
        const subject = infoElement.querySelector('p')?.textContent.trim() || '';

        const teachers = Array.from(infoElement.querySelectorAll('.prepod')).map((el) => {
          const clone = el.cloneNode(true);
          const icon = clone.querySelector('i.fa-graduation-cap');
          if (icon) icon.remove();
          return clone.textContent.replace(/\?$/, '').trim();
        });

        const auditoriums = Array.from(infoElement.querySelectorAll('.auditioria')).map((el) => {
          const clone = el.cloneNode(true);
          const icon = clone.querySelector('i.fa-university');
          if (icon) icon.remove();
          const pg = clone.querySelector('.pg');
          if (pg) pg.remove();
          const subgroup = clone.querySelector('.subgroup');
          if (subgroup) subgroup.remove();
          return clone.textContent.trim();
        });

        const subgroups = Array.from(infoElement.querySelectorAll('.subgroup span')).map((el) =>
          el.textContent.trim(),
        );

        const classInfo = {
          time: startTime && endTime ? `${startTime}-${endTime}` : '',
          type: type,
          subject: subject,
          firstTeacher: teachers[0] || '',
          firstClassroom: auditoriums[0] || '',
          firstGroup: subgroups[0] || '',
          secondTeacher: teachers[1] || '',
          secondClassroom: auditoriums[1] || '',
          secondGroup: subgroups[1] || '',
        };

        dayData.classes.push(classInfo);
      });

      result.push(dayData);
    });

    return result;
  });

  return schedule;
}

async function scrapeSchedule() {
  ensureDirectories();
  let browser;
  try {
    console.log('Запуск браузера...');
    browser = await puppeteer.launch({
      headless: true, // Изменено на true для сервера
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1200,800',
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );
    await page.setDefaultNavigationTimeout(config.timeout);

    // Парсим все группы
    const allGroups = await scrapeAllGroups(page);

    // Парсим всех преподавателей
    const allTeachers = await scrapeAllTeachers(page);

    // Парсим расписание конкретной группы
    const schedule = await scrapeGroupSchedule(page);

    // Сохраняем результат
    const output = {
      lastUpdated: new Date().toISOString(),
      schedule: schedule,
      allGroups: allGroups,
      allTeachers: allTeachers,
    };

    fs.writeFileSync(config.outputFile, JSON.stringify(output, null, 2));
    console.log('Данные успешно сохранены');

    return output;
  } catch (error) {
    console.error('Ошибка при парсинге:', error);
    const errorData = {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(config.outputDir, 'error.json'), JSON.stringify(errorData, null, 2));
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

if (require.main === module) {
  scrapeSchedule()
    .then(() => console.log('Парсинг завершен успешно'))
    .catch((error) => {
      console.error('Ошибка при парсинге:', error);
      process.exit(1);
    });
}

module.exports = { scrapeSchedule };
