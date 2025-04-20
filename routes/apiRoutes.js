const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');

router.get('/groups', (req, res) => {
  try {
    const groups = cacheService.getGroups();
    res.json({
      success: true,
      count: groups.length,
      data: groups,
      lastUpdated: cacheService.cache.lastUpdated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/teachers', (req, res) => {
  try {
    const teachers = cacheService.getTeachers();
    res.json({
      success: true,
      count: teachers.length,
      data: teachers,
      lastUpdated: cacheService.cache.lastUpdated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
router.get('/group/:id/schedule', async (req, res) => {
  try {
    const data = await cacheService.getGroupSchedule(req.params.id);
    if (data.status === 'not_found') {
      return res.status(404).json({
        success: false,
        message: 'Группа не найдена',
        ...data,
      });
    }
    if (!data.success) {
      return res.status(500).json(data);
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      group: {
        id: req.params.id,
        name: 'Неизвестный группа',
        exists: false,
      },
      schedule: [],
      lastUpdated: new Date().toISOString(),
      status: 'error',
    });
  }
});

router.get('/teacher/:id/schedule', async (req, res) => {
  try {
    const data = await cacheService.getTeacherSchedule(req.params.id);
    if (data.status === 'not_found') {
      return res.status(404).json({
        success: false,
        message: 'Преподаватель не найден',
        ...data,
      });
    }
    if (!data.success) {
      return res.status(500).json(data);
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      teacher: {
        id: req.params.id,
        name: 'Неизвестный преподаватель',
        exists: false,
      },
      schedule: [],
      lastUpdated: new Date().toISOString(),
      status: 'error',
    });
  }
});

module.exports = router;
