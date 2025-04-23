const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const { ensureDir } = require('../utils/helpers');
const config = require('../config');
const { scrapeGroupsList, scrapeTeachersList } = require('../scrapers/listsScraper');
const GroupScraper = require('../scrapers/schedule/groupScraper');
const TeacherScraper = require('../scrapers/schedule/teacherScraper');

class CacheService {
  constructor() {
    this.cache = {
      lastUpdated: null,
      groups: [],
      teachers: [],
    };
    this.groupScraper = new GroupScraper();
    this.teacherScraper = new TeacherScraper();
    this.isInitialized = false;
    this.initializationPromise = null;
  }
  async init() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = (async () => {
      try {
        ensureDir(config.dataDir);
        try {
          await this.loadCache();
          Logger.info('Cache loaded successfully');
        } catch (loadError) {
          Logger.warn('Failed to load cache, will fetch fresh data', loadError);
        }
        if (this.isEmpty() || this.isCacheStale()) {
          Logger.info('Cache needs update, fetching fresh data');
          await this.updateCache();
        } else {
          Logger.info('Using existing cache');
        }
        this.isInitialized = true;
        Logger.info('CacheService initialized successfully');
        return true;
      } catch (error) {
        Logger.error('CacheService initialization failed', error);
        this.isInitialized = false;
        throw error;
      }
    })();
    return this.initializationPromise;
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
