import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import logger from '../utils/logger.js';

const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    logger.warn('SENTRY_DSN bulunamadı. Error tracking devre dışı.');
    return;
  }

  try {
    Sentry.init({
      dsn: dsn,
      environment: process.env.NODE_ENV || 'development',
      release: `realtalk@${process.env.npm_package_version || '1.0.0'}`,
      
      // Integrations: prefer default integrations and add profiling
      integrations: [
        ...(typeof Sentry.getDefaultIntegrations === 'function' ? Sentry.getDefaultIntegrations() : []),
        nodeProfilingIntegration(),
      ],
      
      // Performance monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 0.1,
      
      // Before send hook
      beforeSend(event) {
        // Sensitive data filtering
        if (event.request) {
          // Headers'dan sensitive data temizle
          if (event.request.headers) {
            const sensitiveHeaders = ['authorization', 'cookie', 'token', 'password'];
            sensitiveHeaders.forEach(header => {
              if (event.request.headers[header]) {
                event.request.headers[header] = '[FILTERED]';
              }
            });
          }
          
          if (event.request.data) {
            const sensitiveFields = ['password', 'token', 'secret', 'creditCard'];
            sensitiveFields.forEach(field => {
              if (event.request.data[field]) {
                event.request.data[field] = '[FILTERED]';
              }
            });
          }
        }
        
        if (!event.user && event.request && event.request.url) {
          const userIdMatch = event.request.url.match(/users\/([^\/]+)/);
          if (userIdMatch) {
            event.user = { id: userIdMatch[1] };
          }
        }
        
        return event;
      },
      
      // Debug mode
      debug: process.env.NODE_ENV === 'development',
    });
    
    logger.info('Sentry initialized successfully');
  } catch (error) {
    logger.error('Sentry initialization failed:', error);
  }
};

// Sentry transaction wrapper
const withSentryTransaction = (name, operation) => {
  return Sentry.startTransaction({
    op: 'function',
    name: name,
  });
};

// Sentry span wrapper
const withSentrySpan = (operation, description, callback) => {
  const transaction = Sentry.getCurrentHub().getScope().getTransaction();
  if (transaction) {
    const span = transaction.startChild({
      op: operation,
      description: description,
    });
    try {
      const result = callback();
      span.finish();
      return result;
    } catch (error) {
      span.setStatus('internal_error');
      span.finish();
      throw error;
    }
  }
  return callback();
};

// User context setter
const setSentryUser = (user) => {
  Sentry.setUser({
    id: user._id || user.id,
    username: user.username,
    email: user.email,
    ip_address: '{{auto}}',
  });
};

// Clear user context
const clearSentryUser = () => {
  Sentry.setUser(null);
};

export { 
  Sentry, 
  initSentry, 
  withSentryTransaction, 
  withSentrySpan, 
  setSentryUser, 
  clearSentryUser 
};