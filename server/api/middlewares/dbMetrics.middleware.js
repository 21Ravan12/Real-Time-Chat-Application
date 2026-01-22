import mongoose from 'mongoose';
import { metrics } from '../../utils/metrics.js';

// Attach database query duration metrics for either Sequelize-like OR Mongoose
// This function is best-effort and will not throw on unsupported DB clients.
export const setupDbMetrics = (dbClient) => {
  // Sequelize-style instrumentation
  if (dbClient && typeof dbClient.addHook === 'function') {
    dbClient.addHook('beforeQuery', (options) => {
      options.metricsStartTime = process.hrtime();
    });

    dbClient.addHook('afterQuery', (options, query) => {
      if (!options.metricsStartTime) return;

      const duration = process.hrtime(options.metricsStartTime);
      const durationInSeconds = duration[0] + duration[1] / 1e9;

      const model = options.model?.name || 'unknown';
      const operation = options.type || 'query';

      metrics.databaseQueryDuration
        .labels(model, operation)
        .observe(durationInSeconds);
    });

    return;
  }

  // Mongoose instrumentation: wrap Query.prototype.exec to measure durations
  try {
    const QueryProto = (dbClient && dbClient.Query && dbClient.Query.prototype) || mongoose.Query.prototype;

    if (QueryProto && !QueryProto.__hasMetricsWrapped) {
      const originalExec = QueryProto.exec;

      QueryProto.exec = async function (...args) {
        const start = process.hrtime();

        try {
          const result = await originalExec.apply(this, args);

          const duration = process.hrtime(start);
          const durationInSeconds = duration[0] + duration[1] / 1e9;

          const model = this.model && this.model.modelName ? this.model.modelName : 'unknown';
          const operation = this.op || 'query';

          metrics.databaseQueryDuration.labels(model, operation).observe(durationInSeconds);

          return result;
        } catch (err) {
          const duration = process.hrtime(start);
          const durationInSeconds = duration[0] + duration[1] / 1e9;

          const model = this.model && this.model.modelName ? this.model.modelName : 'unknown';
          const operation = this.op || 'query';

          metrics.databaseQueryDuration.labels(model, operation).observe(durationInSeconds);

          throw err;
        }
      };

      QueryProto.__hasMetricsWrapped = true;
    }
  } catch (err) {
    // Best-effort: don't crash the app if instrumentation fails
    // eslint-disable-next-line no-console
    console.warn('DB metrics setup failed:', err);
  }
};

export default setupDbMetrics;