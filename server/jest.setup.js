// jest.setup.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanupRedisMonitoring } from './api/middlewares/dbPerformance.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables for testing
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

let mongoServer;

globalThis.jest?.setTimeout(30000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
  });
  
  console.log('Test MongoDB bağlantısı başarılı');
});

afterAll(async () => {
  // Cleanup Redis monitoring interval
  cleanupRedisMonitoring();
  
  await mongoose.disconnect();
  
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('Test MongoDB bağlantısı kapatıldı');
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});