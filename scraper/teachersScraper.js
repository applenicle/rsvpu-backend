const config = require('../config');
const fs = require('fs');

module.exports = async function scrapeAllTeachers(page) {
  console.log('Loading teachers list...');
  await page.goto(config.teachersListUrl, {
    waitUntil: 'networkidle2',
    timeout: config.timeout,
  });

  try {
    await page.waitForSelector('div[name="prep"].li', { timeout: 10000 });
  } catch (error) {
    console.error('Teacher elements not found:', error);
    return [];
  }

  const teachers = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div[name="prep"].li')).map((el) => ({
      id: el.getAttribute('data'),
      name: el.textContent.trim(),
      url: `?v_prep=${el.getAttribute('data')}`,
    }));
  });

  if (teachers.length === 0) {
    console.warn('Empty teachers list. Saving page for debugging...');
    const html = await page.content();
    fs.writeFileSync(path.join(config.outputDir, 'teachers_page.html'), html);
  }

  fs.writeFileSync(config.allTeachersFile, JSON.stringify(teachers, null, 2));
  console.log(`Saved ${teachers.length} teachers`);
  return teachers;
};
