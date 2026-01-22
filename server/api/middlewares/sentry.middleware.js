import { Sentry, setSentryUser, clearSentryUser } from '../../config/sentry.config.js';
import logger from '../../utils/logger.js';

// Sentry request handler middleware
export const sentryRequestHandler = (Sentry && Sentry.Handlers && typeof Sentry.Handlers.requestHandler === 'function')
  ? Sentry.Handlers.requestHandler({
      include: {
        ip: true,
        user: ['id', 'username', 'email'],
        request: ['data', 'headers', 'method', 'query_string', 'url'],
      },
    })
  : (req, res, next) => next();

// Sentry tracing handler middleware
export const sentryTracingHandler = (Sentry && Sentry.Handlers && typeof Sentry.Handlers.tracingHandler === 'function')
  ? Sentry.Handlers.tracingHandler()
  : (req, res, next) => next();

// Sentry error handler middleware
export const sentryErrorHandler = (Sentry && Sentry.Handlers && typeof Sentry.Handlers.errorHandler === 'function')
  ? Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Sadece 500 ve üstü error'ları Sentry'e gönder
        return error.statusCode >= 500 || !error.statusCode;
      },
    })
  : (err, req, res, next) => next(err);

// User context middleware
export const sentryUserContext = (req, res, next) => {
  if (req.user) {
    setSentryUser(req.user);
  }
  next();
};

// Clear user context middleware
export const clearSentryUserContext = (req, res, next) => {
  clearSentryUser();
  next();
};

// Performance monitoring middleware
export const sentryPerformanceMiddleware = (req, res, next) => {
  if (!Sentry || typeof Sentry.startTransaction !== 'function' || typeof Sentry.getCurrentHub !== 'function') {
    return next();
  }

  const transaction = Sentry.startTransaction({
    name: `${req.method} ${req.route?.path || req.path}`,
    op: 'http.server',
  });

  Sentry.getCurrentHub().configureScope(scope => {
    scope.setSpan(transaction);
  });

  res.on('finish', () => {
    try {
      transaction.setHttpStatus(res.statusCode);
      transaction.setData('http.route', req.route?.path || req.path);
      transaction.setData('http.method', req.method);
      transaction.setData('http.query', req.query);
      transaction.setData('http.user_agent', req.get('user-agent'));
      
      // Response time'i tag olarak ekle
      const responseTime = res.get('X-Response-Time');
      if (responseTime) {
        transaction.setTag('response_time', responseTime);
      }
    } catch (e) {
      // ignore any transaction errors
    } finally {
      try { transaction.finish(); } catch (e) {}
    }
  });

  next();
};

// Error capture utility
export const captureSentryError = (error, context = {}) => {
  logger.error('Capturing error to Sentry:', {
    error: error?.message || String(error),
    stack: error?.stack,
    ...context
  });

  if (!Sentry || typeof Sentry.withScope !== 'function' || typeof Sentry.captureException !== 'function') {
    // Sentry is not available; nothing more to do
    return;
  }

  Sentry.withScope(scope => {
    // Context bilgilerini ekle
    Object.keys(context).forEach(key => {
      scope.setExtra(key, context[key]);
    });

    // Error'ı capture et
    Sentry.captureException(error);
  });
};

// Message capture utility
export const captureSentryMessage = (message, level = 'info', context = {}) => {
  Sentry.withScope(scope => {
    Object.keys(context).forEach(key => {
      scope.setExtra(key, context[key]);
    });
    
    Sentry.captureMessage(message, level);
  });
};