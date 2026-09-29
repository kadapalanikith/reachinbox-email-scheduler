import express from 'express';
// Reload trigger for synced .env Google OAuth credentials
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { redisClient } from './config/redis.js';
import { initElasticsearch, isESAvailable } from './integrations/elasticsearch.js';
import { getTransporter } from './integrations/nodemailer.js';
import { serverAdapter } from './queue/emailQueue.js';
import authRoutes from './routes/authRoutes.js';
import slackRoutes from './routes/slackRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createEmailWorker } from './workers/emailWorker.js';

export const app = express();

// Middlewares
app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Bull Board real-time queue visibility UI
app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/emails', emailRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const redisHealthy = redisClient.status === 'ready' || redisClient.status === 'connect';
  const esHealthy = isESAvailable();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      redis: redisHealthy ? 'connected' : 'disconnected',
      elasticsearch: esHealthy ? 'connected' : 'unavailable',
    },
  });
});

// Centralized Error Handling
app.use(errorHandler);

let workerInstance: any = null;

export async function startServer() {
  try {
    // 1. Connect Redis
    await redisClient.connect().catch((err) => {
      console.warn('[Redis] Connection warning:', err.message);
    });

    // 2. Initialize Elasticsearch index
    await initElasticsearch();

    // 3. Initialize / verify Ethereal SMTP
    await getTransporter().catch((err) => {
      console.warn('[SMTP] Initial transport warning:', err.message);
    });

    // 4. Start BullMQ worker in the same process if configured (or run standalone via worker.ts)
    if (process.env.START_WORKER !== 'false') {
      workerInstance = createEmailWorker();
    }

    const server = app.listen(env.PORT, () => {
      console.log(`=================================================`);
      console.log(`🚀 ReachInbox Server running at http://localhost:${env.PORT}`);
      console.log(`📊 Bull Board Dashboard at http://localhost:${env.PORT}/admin/queues`);
      console.log(`💻 Frontend Client configured at ${env.CLIENT_URL}`);
      console.log(`=================================================`);
    });

    return server;
  } catch (error: any) {
    console.error('Fatal Server Startup Error:', error);
    process.exit(1);
  }
}

// Auto-start if directly executed
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
