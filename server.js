const express = require('express');
const cors = require('cors');
const https = require('https');
const axios = require('axios');
const cacheService = require('./services/cacheService');
const apiRoutes = require('./routes/apiRoutes');
const config = require('./config');
const Logger = require('./utils/logger');

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  Logger.info(`${req.method} ${req.url}`);
  next();
});

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    cacheInitialized: cacheService.isInitialized,
    lastUpdated: cacheService.cache?.lastUpdated || null,
  });
});

app.use((err, req, res, next) => {
  Logger.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

const httpsAgent = new https.Agent({
  rejectUnauthorized: config.httpsAgentOptions?.rejectUnauthorized ?? false,
  timeout: config.httpsAgentOptions?.timeout ?? 60000,
  keepAlive: true,
});

async function checkRSVPUConnection() {
  try {
    const response = await axios.head(config.baseUrl, {
      httpsAgent,
      timeout: 10000,
    });
    Logger.info(`RSVPU connection check: ${response.status}`);
    return true;
  } catch (error) {
    Logger.warn(`RSVPU connection failed: ${error.message}`);
    return false;
  }
}

async function startServer() {
  try {
    Logger.info('Starting server initialization...');
    const isConnected = await checkRSVPUConnection();
    if (!isConnected) {
      Logger.warn('Running in offline mode - some functionality may be limited');
    }
    Logger.info('Initializing cache service...');
    await cacheService.init();
    const updateInterval = setInterval(async () => {
      try {
        if (await checkRSVPUConnection()) {
          await cacheService.updateCache();
        }
      } catch (err) {
        Logger.error('Scheduled cache update failed:', err);
      }
    }, config.cacheUpdateInterval);
    process.on('SIGINT', () => {
      clearInterval(updateInterval);
      Logger.info('Server shutting down...');
      process.exit(0);
    });
    app.listen(config.port, () => {
      Logger.info(`Server successfully started on port ${config.port}`);
      Logger.info('Available endpoints:');
      Logger.info('GET /api/groups - List all groups');
      Logger.info('GET /api/teachers - List all teachers');
      Logger.info('GET /api/group/:id/schedule - Group schedule');
      Logger.info('GET /api/teacher/:id/schedule - Teacher schedule');
      Logger.info('GET /health - Server health check');
    });
  } catch (error) {
    Logger.error('Server startup failed:', error);
    process.exit(1);
  }
}
process.on('unhandledRejection', (err) => {
  Logger.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  Logger.error('Uncaught exception:', err);
  process.exit(1);
});
startServer();
