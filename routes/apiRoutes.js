const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const scraper = require('../scraper');

router.get('/groups', (req, res) => {
  try {
    res.json(cacheService.getGroups());
  } catch (error) {
    console.error('Error in /groups route:', error);
    res.status(500).json({ error: 'Failed to load groups' });
  }
});

router.get('/teachers', (req, res) => {
  try {
    res.json(cacheService.getTeachers());
  } catch (error) {
    console.error('Error in /teachers route:', error);
    res.status(500).json({ error: 'Failed to load teachers' });
  }
});

router.get('/schedule', (req, res) => {
  try {
    res.json(cacheService.getSchedule());
  } catch (error) {
    console.error('Error in /schedule route:', error);
    res.status(500).json({ error: 'Failed to load schedule' });
  }
});

router.get('/schedule/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!['group', 'teacher'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type specified' });
    }

    const url = `${config.baseUrl}?v_${type === 'group' ? 'gru' : 'prep'}=${id}`;
    console.log(`Fetching custom schedule from: ${url}`);

    const schedule = await scraper.scrapeCustomSchedule(url);
    res.json(schedule || []);
  } catch (error) {
    console.error('Error in dynamic schedule route:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

module.exports = router;
