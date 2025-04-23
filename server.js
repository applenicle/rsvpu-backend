const express = require('express');
const cors = require('cors');
const cacheService = require('./services/cacheService');
const apiRoutes = require('./routes/apiRoutes');
const config = require('./config');
const Logger = require('./utils/logger');
const https = require('https');

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
    lastUpdated: cacheService.cache.lastUpdated,
  });
});

app.use((err, req, res, next) => {
  Logger.error('Server error', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

async function checkSSLCertificate() {
  const target = new URL(config.groupsListUrl);
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: target.hostname,
        port: 443,
        method: 'HEAD',
        agent: new https.Agent({ rejectUnauthorized: false }),
      },
      (res) => {
        resolve(true);
      },
    );

    req.on('error', (e) => {
      Logger.warn(`SSL certificate error: ${e.message}`);
      resolve(false);
    });

    req.end();
  });
}

async function startServer() {
  const sslValid = await checkSSLCertificate();
  if (!sslValid) {
    Logger.warn('Using insecure SSL connection');
    config.axiosConfig.httpsAgent.rejectUnauthorized = false;
  }
  try {
    Logger.info('Initializing CacheService...');
    const cacheInitialized = await cacheService.init();

    if (!cacheInitialized) {
      Logger.warn('CacheService initialized with errors, some functionality may be limited');
    }

    const updateInterval = setInterval(async () => {
      try {
        Logger.info('Scheduled cache update started');
        await cacheService.updateCache();
      } catch (err) {
        Logger.error('Scheduled update failed:', err);
      }
    }, config.cacheUpdateInterval);

    process.on('SIGINT', async () => {
      Logger.info('Shutting down server...');
      clearInterval(updateInterval);
      process.exit(0);
    });

    app.listen(config.port, () => {
      Logger.info(`Server running on port ${config.port}`);
      Logger.info('Available endpoints:');
      Logger.info('GET /api/groups - List all groups');
      Logger.info('GET /api/teachers - List all teachers');
      Logger.info('GET /api/group/:id/schedule - Group schedule');
      Logger.info('GET /api/teacher/:id/schedule - Teacher schedule');
      Logger.info('GET /health - Server health check');
    });
  } catch (error) {
    Logger.error('Server startup failed', error);
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
