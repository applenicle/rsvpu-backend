const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  ensureDir: (dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  },

  saveDebugHtml: async (page, filename) => {
    try {
      const debugDir = config.debugDir;
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const filePath = path.join(debugDir, `${filename}.html`);
      const content = await page.content();
      fs.writeFileSync(filePath, content);
      console.log(`Debug HTML saved to ${filePath}`);
    } catch (error) {
      console.error('Error saving debug HTML:', error);
    }
  },
};
