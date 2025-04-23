const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const config = require('../config');
const { scrapeGroupsList, scrapeTeachersList } = require('../scrapers/listsScraper');

class CacheService {
  constructor() {
    this.cache = {
      groups: [],
      teachers: [],
      lastUpdated: null,
    };
    this.isInitialized = false;
    this.initializationAttempts = 0;
    this.MAX_ATTEMPTS = 3;
  }

  async init() {
    try {
      if (this.initializationAttempts >= this.MAX_ATTEMPTS) {
        Logger.warn('Достигнуто максимальное количество попыток инициализации');
        this.isInitialized = false;
        return;
      }
      this.initializationAttempts++;
      Logger.info(`Попытка инициализации кеша #${this.initializationAttempts}`);
      await this.loadCacheFromFile();
      if (this.isEmpty() || this.isCacheStale()) {
        Logger.info('Кеш требует обновления');
        await this.updateCache();
      } else {
        Logger.info('Используется существующий кеш');
      }
      this.isInitialized = true;
      Logger.info('Кеш успешно инициализирован');
    } catch (error) {
      Logger.error(`Ошибка инициализации кеша: ${error.message}`);
      if (this.initializationAttempts < this.MAX_ATTEMPTS) {
        const delay = 5000;
        Logger.warn(`Повторная попытка через ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.init();
      }
      Logger.error('Не удалось инициализировать кеш после всех попыток');
      this.isInitialized = false;
    }
  }
  async loadCacheFromFile() {
    const cachePath = path.join(config.dataDir, config.cacheFile);
    if (!fs.existsSync(cachePath)) {
      Logger.warn('Файл кеша не найден, будет создан новый');
      return;
    }
    try {
      const data = fs.readFileSync(cachePath, 'utf8');
      this.cache = JSON.parse(data);
      Logger.info(`Кеш загружен из файла: ${cachePath}`);
    } catch (error) {
      Logger.error(`Ошибка загрузки кеша: ${error.message}`);
      throw error;
    }
  }
  async fetchWithRetry(url, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await axios.get(url, {
          httpsAgent: new https.Agent(config.sslOptions),
          timeout: config.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        });
        return response.data;
      } catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)));
      }
    }
  }
  async loadCache() {
    const cachePath = path.join(config.dataDir, config.cacheFile);
    if (fs.existsSync(cachePath)) {
      try {
        const data = fs.readFileSync(cachePath, 'utf8');
        this.cache = JSON.parse(data);
        Logger.info(`Loaded cache from ${cachePath}`);
      } catch (error) {
        Logger.error('Failed to parse cache file', error);
        throw error;
      }
    } else {
      Logger.info('No cache file found, will create new one');
    }
  }
  async updateCache() {
    try {
      Logger.info('Starting cache update...');
      const [groups, teachers] = await Promise.all([
        this.retryOperation(() => scrapeGroupsList(), 3),
        this.retryOperation(() => scrapeTeachersList(), 3),
      ]);
      this.cache = {
        lastUpdated: new Date().toISOString(),
        groups,
        teachers,
      };
      await this.saveCache();
      Logger.info('Cache updated successfully');
    } catch (error) {
      Logger.error('Cache update failed', error);
      throw error;
    }
  }
  async retryOperation(operation, maxAttempts = 3) {
    let attempt = 1;
    while (attempt <= maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        Logger.warn(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt >= maxAttempts) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        attempt++;
      }
    }
  }
  async saveCache() {
    const cachePath = path.join(config.dataDir, config.cacheFile);
    try {
      fs.writeFileSync(cachePath, JSON.stringify(this.cache, null, 2));
      Logger.info(`Cache saved to ${cachePath}`);
    } catch (error) {
      Logger.error('Failed to save cache', error);
      throw error;
    }
  }
  isEmpty() {
    return !this.cache.groups?.length || !this.cache.teachers?.length;
  }
  isCacheStale() {
    if (!this.cache.lastUpdated) return true;
    const lastUpdated = new Date(this.cache.lastUpdated);
    const now = new Date();
    return now - lastUpdated > config.cacheUpdateInterval;
  }
  getGroups() {
    this.checkInitialized();
    return this.cache.groups;
  }
  getTeachers() {
    this.checkInitialized();
    return this.cache.teachers;
  }
  async getGroupSchedule(groupId) {
    this.checkInitialized();
    const group = this.cache.groups.find((g) => g.id === groupId);
    if (!group) {
      Logger.warn(`Group ${groupId} not found in cache`);
      return {
        success: false,
        group: {
          id: groupId,
          name: 'Неизвестная группа',
          exists: false,
        },
        schedule: [],
        lastUpdated: new Date().toISOString(),
        status: 'not_found',
      };
    }
    try {
      Logger.info(`Fetching schedule for group ${groupId} (${group.name})`);
      const schedule = await this.retryOperation(() => this.groupScraper.getSchedule(groupId), 3);
      return {
        success: true,
        group: {
          id: groupId,
          name: group.name,
          exists: true,
        },
        schedule: schedule || [],
        lastUpdated: new Date().toISOString(),
        status: schedule && schedule.length ? 'success' : 'empty',
      };
    } catch (error) {
      Logger.error(`Failed to get schedule for group ${groupId}`, error);
      return {
        success: false,
        group: {
          id: groupId,
          name: group?.name || 'Неизвестная группа',
          exists: !!group,
        },
        schedule: [],
        error: error.message,
        lastUpdated: new Date().toISOString(),
        status: 'error',
      };
    }
  }
  async getTeacherSchedule(teacherId) {
    this.checkInitialized();
    const teacher = this.cache.teachers.find((t) => t.id === teacherId);
    if (!teacher) {
      Logger.warn(`Teacher ${teacherId} not found in cache`);
      return {
        success: false,
        teacher: {
          id: teacherId,
          name: 'Неизвестный преподаватель',
          exists: false,
        },
        schedule: [],
        lastUpdated: new Date().toISOString(),
        status: 'not_found',
      };
    }
    try {
      Logger.info(`Fetching schedule for teacher ${teacherId} (${teacher.name})`);
      const schedule = await this.retryOperation(
        () => this.teacherScraper.getSchedule(teacherId),
        3,
      );
      return {
        success: true,
        teacher: {
          id: teacherId,
          name: teacher.name,
          exists: true,
        },
        schedule: schedule || [],
        lastUpdated: new Date().toISOString(),
        status: schedule && schedule.length ? 'success' : 'empty',
      };
    } catch (error) {
      Logger.error(`Failed to get schedule for teacher ${teacherId}`, error);
      return {
        success: false,
        teacher: {
          id: teacherId,
          name: teacher?.name || 'Неизвестный преподаватель',
          exists: !!teacher,
        },
        schedule: [],
        error: error.message,
        lastUpdated: new Date().toISOString(),
        status: 'error',
      };
    }
  }
  checkInitialized() {
    if (!this.isInitialized) {
      throw new Error('CacheService not initialized. Call init() first.');
    }
  }
  async cleanup() {
    try {
      await this.groupScraper.close();
      await this.teacherScraper.close();
    } catch (error) {
      Logger.error('Error during cleanup', error);
    }
  }
}

module.exports = new CacheService();
