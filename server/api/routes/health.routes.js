import express from 'express';
import os from 'os';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { redisClient } from '../../config/redis.config.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packagePath = join(__dirname, '../../../package.json');

/**
 * @route   GET /api/v1/health
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const packageData = JSON.parse(await readFile(packagePath, 'utf8'));
    
    const healthStatus = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'RealTalk API',
      version: packageData.version,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        freeMemory: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
        loadAvg: os.loadavg()
      },
      process: {
        pid: process.pid,
        memoryUsage: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
          external: `${Math.round(process.memoryUsage().external / 1024 / 1024)} MB`
        },
        nodeVersion: process.version,
        uptime: `${Math.floor(process.uptime())}s`
      }
    };
    
    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'RealTalk API',
      warning: 'Package information unavailable',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/health/ready
 * @access  Public
 */
router.get('/ready', async (req, res) => {
  const checks = {
    api: true,
    database: false,
    redis: false,
    fileSystem: true
  };
  
  const errors = [];
  
  try {
    try {
      const readyState = mongoose.connection.readyState; // 1 = connected
      if (readyState === 1) {
        checks.database = true;
      } else {
        checks.database = false;
        errors.push('Database: not connected');
      }
    } catch (dbError) {
      errors.push(`Database: ${dbError.message}`);
      checks.database = false;
    }
    
    try {
      await redisClient.ping();
      checks.redis = true;
    } catch (redisError) {
      errors.push(`Redis: ${redisError.message}`);
      checks.redis = false;
    }
    
    try {
      const testPath = join(__dirname, '../../logs/health-check.test');
      const fs = await import('fs');
      fs.writeFileSync(testPath, 'test');
      fs.unlinkSync(testPath);
    } catch (fsError) {
      errors.push(`FileSystem: ${fsError.message}`);
      checks.fileSystem = false;
    }
    
    const allChecksPassed = Object.values(checks).every(v => v === true);
    
    const response = {
      status: allChecksPassed ? 'READY' : 'NOT_READY',
      timestamp: new Date().toISOString(),
      checks: checks,
      environment: process.env.NODE_ENV || 'development'
    };
    
    if (errors.length > 0) {
      response.errors = errors;
    }
    
    res.status(allChecksPassed ? 200 : 503).json(response);
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: checks
    });
  }
});

/**
 * @route   GET /api/v1/health/live
 * @access  Public
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'LIVE',
    timestamp: new Date().toISOString(),
    service: 'RealTalk API',
    uptime: `${Math.floor(process.uptime())} seconds`
  });
});

/**
 * @route   GET /api/v1/health/detailed
 * @access  Public
 */
router.get('/detailed', async (req, res) => {
  try {
    const packageData = JSON.parse(await readFile(packagePath, 'utf8'));
    
    const detailedStatus = {
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      
      application: {
        name: packageData.name,
        version: packageData.version,
        description: packageData.description,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
        uptime: process.uptime()
      },
      
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        cpus: os.cpus().map(cpu => ({
          model: cpu.model,
          speed: `${cpu.speed} MHz`
        })),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usagePercentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
        },
        loadAverage: os.loadavg(),
        networkInterfaces: os.networkInterfaces()
      },
      
      process: {
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime(),
        versions: process.versions
      },
      
      connections: {
        database: 'checking...',
        redis: 'checking...'
      }
    };
    
    // Database connection check (MongoDB via mongoose)
    try {
      const readyState = mongoose.connection.readyState; // 1 = connected
      if (readyState === 1) {
        detailedStatus.connections.database = 'connected';
      } else {
        detailedStatus.connections.database = 'disconnected';
        detailedStatus.status = 'DEGRADED';
      }
    } catch (error) {
      detailedStatus.connections.database = `disconnected: ${error.message}`;
      detailedStatus.status = 'DEGRADED';
    }
    
    // Redis connection check
    try {
      await redisClient.ping();
      detailedStatus.connections.redis = 'connected';
    } catch (error) {
      detailedStatus.connections.redis = `disconnected: ${error.message}`;
      detailedStatus.status = 'DEGRADED';
    }
    
    res.status(200).json(detailedStatus);
  } catch (error) {
    res.status(200).json({
      status: 'DEGRADED',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router;