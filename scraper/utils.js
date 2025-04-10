const fs = require('fs');

function ensureDirectories(dirs) {
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

async function waitForContent(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { timeout });
  return page.$eval(selector, (el) => el.innerHTML);
}

module.exports = {
  ensureDirectories,
  waitForContent,
};
