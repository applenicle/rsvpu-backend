const fs = require('fs');
const { scrapeData } = require('../scraper');
const config = require('../config');

class CacheService {
  constructor() {
    this.cache = {
      schedule: null,
      groups: null,
      teachers: null,
      lastUpdated: null,
    };
    this.isUpdating = false;
  }

  async loadFromFile(filePath) {
    try {
      return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : null;
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error);
      return null;
    }
  }

  async initialize() {
    try {
      this.cache = {
        schedule: await this.loadFromFile(config.outputFile),
        groups: await this.loadFromFile(config.allGroupsFile),
        teachers: await this.loadFromFile(config.allTeachersFile),
        lastUpdated: new Date().toISOString(),
      };
      console.log('Cache initialized with file data');
      await this.updateCache();
    } catch (error) {
      console.error('Cache initialization failed:', error);
    }
  }

  async updateCache() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      console.log('Starting cache update...');
      const data = await scrapeData();

      this.cache = {
        schedule: data.schedule || this.cache.schedule,
        groups: data.allGroups || this.cache.groups,
        teachers: data.allTeachers || this.cache.teachers,
        lastUpdated: new Date().toISOString(),
      };

      // Сохраняем только если данные валидны
      if (data.schedule) {
        fs.writeFileSync(config.outputFile, JSON.stringify(data.schedule, null, 2));
      }
      if (data.allGroups) {
        fs.writeFileSync(config.allGroupsFile, JSON.stringify(data.allGroups, null, 2));
      }
      if (data.allTeachers) {
        fs.writeFileSync(config.allTeachersFile, JSON.stringify(data.allTeachers, null, 2));
      }

      console.log('Cache updated successfully');
    } catch (error) {
      console.error('Cache update failed:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  getSchedule() {
    return this.cache.schedule || { schedule: [] };
  }

  getGroups() {
    return this.cache.groups || [];
  }

  getTeachers() {
    return this.cache.teachers || [];
  }
}

module.exports = new CacheService();
