import promClient from 'prom-client';

// Initialize Prometheus client
export const register = new promClient.Registry();

// Collect default metrics
promClient.collectDefaultMetrics({ register });

// BUSINESS METRİKLERİ
const businessMetrics = {
  // Kullanıcı metrikleri
  newUsersToday: new promClient.Counter({
    name: 'users_new_today',
    help: 'New users registered today',
    labelNames: ['source'], // web, mobile, api
    registers: [register]
  }),
  
  activeUsersNow: new promClient.Gauge({
    name: 'users_active_now',
    help: 'Users currently active in the last 5 minutes',
    registers: [register]
  }),
  
  userSessions: new promClient.Counter({
    name: 'user_sessions_total',
    help: 'Total user sessions started',
    registers: [register]
  }),
  
  // Mesaj metrikleri
  messagesSent: new promClient.Counter({
    name: 'messages_sent_total',
    help: 'Total messages sent',
    labelNames: ['type', 'platform'], // private/group, web/mobile
    registers: [register]
  }),
  
  messagesPerMinute: new promClient.Gauge({
    name: 'messages_per_minute',
    help: 'Messages sent in the last minute',
    registers: [register]
  }),
  
  avgMessageLength: new promClient.Histogram({
    name: 'message_length_chars',
    help: 'Average message length in characters',
    buckets: [10, 50, 100, 200, 500],
    registers: [register]
  }),
  
  // Chat room metrikleri
  activeChatRooms: new promClient.Gauge({
    name: 'chat_rooms_active',
    help: 'Currently active chat rooms',
    labelNames: ['type'],
    registers: [register]
  }),
  
  roomsCreated: new promClient.Counter({
    name: 'chat_rooms_created_total',
    help: 'Total chat rooms created',
    registers: [register]
  }),
  
  // Friend sistem metrikleri
  friendRequests: new promClient.Counter({
    name: 'friend_requests_total',
    help: 'Total friend requests',
    labelNames: ['status'], // sent, accepted, rejected
    registers: [register]
  }),
  
  // Engagement metrikleri
  userEngagementTime: new promClient.Histogram({
    name: 'user_engagement_seconds',
    help: 'User engagement time per session',
    buckets: [60, 300, 900, 1800, 3600, 7200],
    registers: [register]
  }),
  
  // Performance metrikleri
  apiResponseTime: new promClient.Histogram({
    name: 'api_response_time_ms',
    help: 'API response time in milliseconds',
    labelNames: ['endpoint', 'method'],
    buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
    registers: [register]
  }),
  
  // Cache metrikleri
  cacheHitRate: new promClient.Gauge({
    name: 'cache_hit_rate',
    help: 'Redis cache hit rate percentage',
    registers: [register]
  }),
  
  // Queue metrikleri (future)
  messageQueueSize: new promClient.Gauge({
    name: 'message_queue_size',
    help: 'Number of messages waiting in queue',
    registers: [register]
  }),

  // Socket metrikleri
  activeSocketConnections: new promClient.Gauge({
    name: 'socket_connections_active',
    help: 'Number of active socket connections',
    registers: [register]
  }),

  // Error counter
  errorCounter: new promClient.Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'source'],
    registers: [register]
  }),

  // HTTP metrics
  httpRequestDuration: new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register]
  }),

  httpRequestsTotal: new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  }),

  responseSizeBytes: new promClient.Histogram({
    name: 'http_response_size_bytes',
    help: 'HTTP response size in bytes',
    labelNames: ['method', 'route'],
    buckets: [100, 1000, 10000, 100000, 1000000],
    registers: [register]
  }),

  // Database metrics
  databaseQueryDuration: new promClient.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Database query latency in seconds',
    labelNames: ['model', 'operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register]
  })
};

// Helper fonksiyonlar
export const trackNewUser = (source = 'web') => {
  businessMetrics.newUsersToday.inc({ source });
};

export const trackMessage = (type = 'private', platform = 'web', length = 0) => {
  businessMetrics.messagesSent.inc({ type, platform });
  businessMetrics.messagesPerMinute.inc();
  if (length > 0) {
    businessMetrics.avgMessageLength.observe(length);
  }
};

export const trackFriendRequest = (status = 'sent') => {
  businessMetrics.friendRequests.inc({ status });
};

export const trackUserSession = (durationSeconds) => {
  businessMetrics.userSessions.inc();
  if (durationSeconds) {
    businessMetrics.userEngagementTime.observe(durationSeconds);
  }
};

export const updateActiveUsers = (count) => {
  businessMetrics.activeUsersNow.set(count);
};

export const updateActiveRooms = (privateCount, groupCount) => {
  businessMetrics.activeChatRooms.set({ type: 'private' }, privateCount);
  businessMetrics.activeChatRooms.set({ type: 'group' }, groupCount);
};

// Mevcut metrics export'una ekle
export const metrics = {
  register,
  ...businessMetrics,
  
  // Helper'ları da export et
  trackNewUser,
  trackMessage,
  trackFriendRequest,
  trackUserSession,
  updateActiveUsers,
  updateActiveRooms,
  
  // Prometheus utilities
  getMetrics: async () => register.metrics(),
  getMetricsAsJSON: async () => register.getMetricsAsJSON()
};