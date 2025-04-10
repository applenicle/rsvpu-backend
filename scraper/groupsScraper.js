const config = require('../config');

module.exports = async function (page) {
  console.log('Loading groups list...');

  try {
    await page.goto(config.groupsListUrl, {
      waitUntil: 'networkidle2',
      timeout: config.timeout,
    });

    await page.waitForSelector('div[name="gr"].li', { timeout: 10000 });

    const groups = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div[name="gr"].li')).map((el) => ({
        id: el.getAttribute('data'),
        name: el.textContent.trim(),
        url: `?v_gru=${el.getAttribute('data')}`,
      }));
    });

    if (groups.length === 0) {
      throw new Error('No groups found on the page');
    }

    console.log(`Found ${groups.length} groups`);
    return groups;
  } catch (error) {
    console.error('Error scraping groups:', error);
    return [];
  }
};
