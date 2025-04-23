const fs = require('fs');

module.exports = {
  ensureDir: (dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  },
};
