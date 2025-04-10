const express = require('express');
const cors = require('cors');
const cacheService = require('./services/cacheService');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = 3001;

// Middleware
app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET'],
  }),
);
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    lastUpdated: cacheService.cache.lastUpdated,
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    await cacheService.initialize();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      // Обновление кэша каждые 30 минут
      setInterval(() => cacheService.updateCache(), 30 * 60 * 1000);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
