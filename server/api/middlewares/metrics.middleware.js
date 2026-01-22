import { metrics } from '../../utils/metrics.js';

const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime();
  const originalSend = res.send;
  
  // Response size tracking
  let responseSize = 0;
  res.send = function(body) {
    if (body) {
      responseSize = Buffer.byteLength(
        typeof body === 'string' ? body : JSON.stringify(body),
        'utf8'
      );
    }
    return originalSend.call(this, body);
  };
  
  // Response finish event'inde metrikleri kaydet
  res.on('finish', () => {
    try {
      const duration = process.hrtime(start);
      const durationInSeconds = duration[0] + duration[1] / 1e9;
      
      const route = req.route?.path || req.path;
      const method = req.method || 'UNKNOWN';
      const statusCode = res.statusCode || 500;
      
      // HTTP request duration
      if (metrics.httpRequestDuration) {
        metrics.httpRequestDuration
          .labels(method, route, statusCode)
          .observe(durationInSeconds);
      }
      
      // HTTP request count
      if (metrics.httpRequestsTotal) {
        metrics.httpRequestsTotal
          .labels(method, route, statusCode)
          .inc();
      }
      
      // Response size
      if (responseSize > 0 && metrics.responseSizeBytes) {
        metrics.responseSizeBytes
          .labels(method, route)
          .observe(responseSize);
      }
      
      // Error tracking
      if (statusCode >= 400 && metrics.errorCounter) {
        metrics.errorCounter
          .labels('http_error', route)
          .inc();
      }
    } catch (error) {
      // Silently fail to prevent breaking the response
      console.error('Error recording metrics:', error.message);
    }
  });
  
  next();
};

export default metricsMiddleware;