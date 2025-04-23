const express = require('express');
const cors = require('cors');
const cacheService = require('./services/cacheService');
const apiRoutes = require('./routes/apiRoutes');
const config = require('./config');
const Logger = require('./utils/logger');

const app = express();

// Улучшенная обработка CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }),
);

app.use(express.json({ limit: '10mb' }));

// Логирование всех запросов
app.use((req, res, next) => {
  Logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Роуты API
app.use('/api', apiRoutes);

// Обработка favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Health Check с проверкой кеша
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      cacheStatus: cacheService.isInitialized ? 'ready' : 'initializing',
      lastUpdated: cacheService.cache?.lastUpdated || null,
      uptime: process.uptime(),
    };
    res.status(200).json(healthStatus);
  } catch (err) {
    res.status(503).json({ status: 'SERVICE_UNAVAILABLE' });
  }
});

// Обработка 502 ошибки
app.use((req, res, next) => {
  res.status(502).json({
    success: false,
    error: 'Bad Gateway',
    message: 'Сервер временно недоступен. Попробуйте позже.',
  });
});

// Обработка других ошибок
app.use((err, req, res, next) => {
  Logger.error(`[ERROR] ${err.stack}`);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
  });
});

// Запуск сервера с улучшенной обработкой
const startServer = async () => {
  try {
    // Инициализация кеша с повторными попытками
    let retries = 3;
    while (retries > 0) {
      try {
        await cacheService.init();
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    const server = app.listen(config.port, () => {
      Logger.info(`Сервер запущен на порту ${config.port}`);
    });

    // Обработка ошибок сервера
    server.on('error', (err) => {
      Logger.error(`Server error: ${err.message}`);
      process.exit(1);
    });
  } catch (error) {
    Logger.error(`Не удалось запустить сервер: ${error.message}`);
    process.exit(1);
  }
};

startServer();
