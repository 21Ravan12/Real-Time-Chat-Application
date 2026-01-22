import { metrics } from '../../utils/metrics.js';
import logger from '../../utils/logger.js';

// MongoDB performance monitoring
export const dbPerformanceMiddleware = (mongoose) => {
  // Query timing
  mongoose.set('debug', (collectionName, method, query, doc) => {
    const startTime = Date.now();
    
    return function(err, result, millis) {
      const duration = millis || (Date.now() - startTime);
      
      // Metrik kaydet
      metrics.databaseQueryDuration
        .labels(collectionName, method)
        .observe(duration / 1000);
      
      // Slow query logging
      if (duration > 1000) { // 1 saniyeden uzun
        logger.warn('Slow query detected', {
          collection: collectionName,
          method: method,
          duration: `${duration}ms`,
          query: JSON.stringify(query),
          doc: doc ? 'with doc' : 'no doc'
        });
      }
      
      // High frequency query detection
      if (method === 'find' && duration < 10) {
        // Çok hızlı query'ler için cache hit olabilir
        metrics.cacheHitRate.set(
          metrics.cacheHitRate.get() + 0.1 // Örnek cache hit artışı
        );
      }
    };
  });
  
  // Connection pool monitoring
  const connection = mongoose.connection;
  
  connection.on('connected', () => {
    logger.info('MongoDB connected with performance monitoring');
  });
  
  connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
    metrics.errorCounter.labels('database_disconnected', 'mongodb').inc();
  });
  
  connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
  
  connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
    metrics.errorCounter.labels('database_error', 'mongodb').inc();
  });
  
  // Pool stats logging
  setInterval(() => {
    if (connection.db && connection.db.serverConfig) {
      const pool = connection.db.serverConfig.s.pool;
      logger.debug('MongoDB connection pool stats', {
        totalConnections: pool.totalConnectionCount,
        availableConnections: pool.availableConnectionCount,
        waitQueueSize: pool.waitQueueSize
      });
    }
  }, 60000); // Her dakika
};

// Redis performance monitoring
let redisStatsInterval = null;

export const redisPerformanceMiddleware = (redisClient) => {
  // Skip Redis monitoring in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  
  redisClient.on('connect', () => {
    logger.info('Redis connected with performance monitoring');
  });
  
  redisClient.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
    metrics.errorCounter.labels('cache_error', 'redis').inc();
  });
  
  // Redis stats tracking
  redisStatsInterval = setInterval(async () => {
    try {
      const info = await redisClient.info();
      const lines = info.split('\r\n');
      
      const stats = {
        connected_clients: lines.find(l => l.startsWith('connected_clients:'))?.split(':')[1],
        used_memory: lines.find(l => l.startsWith('used_memory_human:'))?.split(':')[1],
        keyspace_hits: lines.find(l => l.startsWith('keyspace_hits:'))?.split(':')[1],
        keyspace_misses: lines.find(l => l.startsWith('keyspace_misses:'))?.split(':')[1]
      };
      
      // Cache hit rate hesapla
      const hits = parseInt(stats.keyspace_hits) || 0;
      const misses = parseInt(stats.keyspace_misses) || 0;
      const total = hits + misses;
      
      if (total > 0) {
        const hitRate = (hits / total) * 100;
        metrics.cacheHitRate.set(hitRate);
      }
      
      logger.debug('Redis stats', stats);
    } catch (error) {
      logger.error('Failed to get Redis stats', { error: error.message });
    }
  }, 30000); // 30 saniyede bir
};

// Cleanup function for closing Redis stats interval
export const cleanupRedisMonitoring = () => {
  if (redisStatsInterval) {
    clearInterval(redisStatsInterval);
    redisStatsInterval = null;
  }
};