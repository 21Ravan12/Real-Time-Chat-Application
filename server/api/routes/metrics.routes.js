import express from 'express';
import { register } from '../../utils/metrics.js';

const router = express.Router();

/**
 * @route   GET /api/v1/metrics
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

/**
 * @route   GET /api/v1/metrics/json
 * @access  Public
 */
router.get('/json', async (req, res) => {
  try {
    const metrics = await register.getMetricsAsJSON();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;