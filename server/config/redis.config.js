import redis from 'redis';
import logger from '../utils/logger.js';

// Use mock Redis client in test environment
let redisClient;

if (process.env.NODE_ENV === 'test') {
  // Import jest and create mock client for testing
  const { jest } = await import('@jest/globals');
  
  redisClient = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    setEx: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn().mockReturnValue(redisClient),
    isOpen: true
  };
} else {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 5) {
          logger.error('Too many retries on REDIS. Connection Terminated');
          return new Error('Too many retries.');
        }
        return Math.min(retries * 100, 5000);
      },
    },
  });

  redisClient.on('error', (err) => {
    logger.error(`Redis error: ${err.message}`);
  });

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
  });
}

export { redisClient };

export const connectRedis = async () => {
  if (process.env.NODE_ENV !== 'test') {
    await redisClient.connect();
  }
  return redisClient;
};
