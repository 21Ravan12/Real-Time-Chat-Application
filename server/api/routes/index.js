import express from 'express';
const router = express.Router();
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import friendRoutes from './friend.routes.js';
import chatRoutes from './chat.routes.js';
import groupRoutes from './group.routes.js';
import healthRoutes from './health.routes.js';
import metricsRoutes from './metrics.routes.js'; 
import testRoutes from './test.routes.js';

router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/friends', friendRoutes);
router.use('/v1/chats', chatRoutes);
router.use('/v1/groups', groupRoutes);
router.use('/v1/health', healthRoutes);
router.use('/v1/metrics', metricsRoutes); 
router.use('/v1/test', testRoutes);

router.get('/docs', (req, res) => {
  res.json({
    message: 'API Documentation',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      friends: '/api/v1/friends',
      chats: '/api/v1/chats',
      groups: '/api/v1/groups',
      health: '/api/v1/health',
      metrics: '/api/v1/metrics' 
    }
  });
});

// 404 Handler for API routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

export default router;