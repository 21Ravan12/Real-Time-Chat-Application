import express from 'express';
import { createServer } from 'http';
import { configureServer } from './config/server.config.js';
import { connectDB } from './config/db.config.js';
import { createSocketServer } from './config/socket.config.js';
import metricsMiddleware from './api/middlewares/metrics.middleware.js';
import { setupDbMetrics } from './api/middlewares/dbMetrics.middleware.js';
import { dbPerformanceMiddleware, redisPerformanceMiddleware } from './api/middlewares/dbPerformance.middleware.js';
import { redisClient } from './config/redis.config.js';
import { metrics } from './utils/metrics.js';
import 'dotenv/config';
import logger from './utils/logger.js';
import { initSentry } from './config/sentry.config.js';
import { 
  sentryRequestHandler, 
  sentryTracingHandler, 
  sentryErrorHandler,
  sentryUserContext,
  sentryPerformanceMiddleware,
  captureSentryError
} from './api/middlewares/sentry.middleware.js';
import { globalErrorHandler } from './api/middlewares/error.middleware.js';

// Sentry initialization
initSentry();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Sentry middleware (diğer middleware'lardan ÖNCE)
app.use(sentryRequestHandler);
app.use(sentryTracingHandler);
app.use(sentryPerformanceMiddleware);

// Configure server middleware and routes
configureServer(app);

// ========================
// MONITORING & METRICS SETUP
// ========================

// 1. Database metrics setup (DB bağlantısından önce)
import db from './config/db.config.js';
setupDbMetrics(db);

// 2. Global metrics middleware (routes'tan önce)
app.use(metricsMiddleware);

// 3. Database and Redis performance monitoring
dbPerformanceMiddleware(db);
redisPerformanceMiddleware(redisClient);

// 4. API response time middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // API response time metrik
    metrics.apiResponseTime
      .labels(req.path, req.method)
      .observe(duration);
    
    // Slow API endpoint detection
    if (duration > 2000) { // 2 saniyeden uzun
      logger.warn('Slow API endpoint detected', {
        endpoint: req.path,
        method: req.method,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    }
  });
  
  next();
});

// ========================
// ROUTES SETUP
// ========================

// Import routes
import apiRoutes from './api/routes/index.js';
app.use(sentryUserContext);
app.use('/api', apiRoutes);

// ========================
// MONITORING ENDPOINTS
// ========================

// Health check endpoint (basic)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'RealTalk API',
    uptime: process.uptime()
  });
});

// Prometheus metrics endpoint (alternatif yol)
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metrics.register.contentType);
    const metricsData = await metrics.getMetrics();
    res.send(metricsData);
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    res.status(500).send('Error generating metrics');
  }
});

// ========================
// ERROR HANDLING MIDDLEWARE
// ========================

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Sentry error handler (diğer middleware'lardan SONRA)
app.use(sentryErrorHandler);

// Global application error handler (en son)
app.use(globalErrorHandler);

// ========================
// SOCKET.IO SETUP
// ========================

// Initialize Socket.io
const io = createSocketServer(httpServer);

// Socket.io connection tracking
io.engine.on("connection", (rawSocket) => {
  metrics.activeSocketConnections.inc();
  
  rawSocket.on("close", () => {
    metrics.activeSocketConnections.dec();
  });
});

// ========================
// SERVER STARTUP
// ========================

// Connect to database and start server
const startServer = async () => {
  try {
    logger.info('Starting server initialization...');
    
    // Database connection
    await connectDB();
    logger.info('Database connected successfully');
    
    // Redis connection
    if (process.env.REDIS_URL) {
      await redisClient.connect();
      logger.info('Redis connected successfully');
    }
    
    // Server startup
    const port = process.env.PORT || 5000;
    httpServer.listen(port, () => {
      const serverInfo = {
        environment: process.env.NODE_ENV || 'development',
        port: port,
        pid: process.pid,
        timestamp: new Date().toISOString()
      };
      
      logger.info('Server started successfully', serverInfo);
      
      console.log(`
      ============================================
      🚀 RealTalk Server Started Successfully!
      ============================================
      Environment: ${serverInfo.environment}
      Port: ${serverInfo.port}
      PID: ${serverInfo.pid}
      
      📊 Monitoring Endpoints:
      Health:      http://localhost:${port}/health
      API Docs:    http://localhost:${port}/api/docs
      Metrics:     http://localhost:${port}/metrics
      API Metrics: http://localhost:${port}/api/v1/metrics
      
      🏥 Health Checks:
      Basic:       http://localhost:${port}/api/v1/health
      Readiness:   http://localhost:${port}/api/v1/health/ready
      Liveness:    http://localhost:${port}/api/v1/health/live
      
      📈 Prometheus: http://localhost:9090
      📊 Grafana:    http://localhost:3000 (admin/admin)
      ============================================
      `);
      
      // Initial metrics
      logger.info('Server metrics initialized', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      });
    });
    
  } catch (error) {
    logger.error('Server startup failed:', {
      error: error.message,
      stack: error.stack
    });
    
    console.error(`
    ============================================
    ❌ Server Startup Failed!
    ============================================
    Error: ${error.message}
    
    Please check:
    1. Database connection
    2. Environment variables
    3. Port availability
    ============================================
    `);
    
    process.exit(1);
  }
};

// ========================
// PROCESS EVENT HANDLERS
// ========================

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Update metrics
  metrics.activeSocketConnections.set(0);
  
  // Close server
  httpServer.close(async () => {
    logger.info('HTTP server closed');
    
    // Close database connections
    try {
      // db is the mongoose instance (exported as default). Try the standard
      // disconnect/close methods in a safe, best-effort manner.
      if (db && typeof db.disconnect === 'function') {
        await db.disconnect();
      } else if (db && db.connection && typeof db.connection.close === 'function') {
        await db.connection.close();
      } else if (typeof db.close === 'function') {
        await db.close();
      }

      logger.info('Database connection closed');
    } catch (dbError) {
      logger.error('Error closing database:', dbError);
    }
    
    // Close Redis
    try {
      if (redisClient && redisClient.quit) {
        await redisClient.quit();
        logger.info('Redis connection closed');
      }
    } catch (redisError) {
      logger.error('Error closing Redis:', redisError);
    }
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Global unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { 
    promise: promise, 
    reason: reason 
  });
  
  try {
    captureSentryError(new Error(`Unhandled Rejection: ${reason}`), {
      type: 'unhandled_rejection',
      promise: promise ? String(promise) : undefined,
      reason: reason ? String(reason) : undefined
    });
  } catch (e) {
    logger.error('Error capturing unhandledRejection in Sentry:', e);
  }

  metrics.errorCounter.labels('unhandled_rejection', 'global').inc();

  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// Global uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { 
    error: error.message, 
    stack: error.stack 
  });
  
  try {
    captureSentryError(error, {
      type: 'uncaught_exception',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    logger.error('Error capturing uncaughtException in Sentry:', e);
  }

  metrics.errorCounter.labels('uncaught_exception', 'global').inc();

  // Graceful shutdown for uncaught exceptions
  setTimeout(() => {
    gracefulShutdown('UNCAUGHT_EXCEPTION');
    process.exit(1);
  }, 1000);
});

// ========================
// PERFORMANCE MONITORING
// ========================

// Track server uptime
setInterval(() => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  // Log every 5 minutes in production, every minute in development
  const logInterval = process.env.NODE_ENV === 'production' ? 300000 : 60000;
  
  if (uptime % (logInterval / 1000) < 1) {
    logger.debug('Server performance snapshot', {
      uptime: `${Math.floor(uptime / 60)} minutes`,
      memoryUsage: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
      activeConnections: io.engine.clientsCount || 0
    });
  }
}, 10000); // Check every 10 seconds

// ========================
// START THE SERVER
// ========================

// Only start if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { io, app, httpServer }; // Export for testing