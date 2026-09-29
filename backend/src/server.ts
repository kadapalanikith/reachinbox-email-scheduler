import express from 'express';
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

// ─── CORS ───────────────────────────────────────────────────────
// Explicit allowlist: GitHub Pages origin, CLIENT_URL origin, and local dev
const allowedOrigins = new Set<string>([
  'https://kadapalanikith.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

if (env.CLIENT_URL) {
  try {
    const parsed = new URL(env.CLIENT_URL);
    allowedOrigins.add(parsed.origin);
  } catch {
    allowedOrigins.add(env.CLIENT_URL.replace(/\/+$/, ''));
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin) and allowed origins
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        // Graceful CORS rejection without crashing Express with 500
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// ─── Core Middlewares ────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy headers from Nginx (required for secure cookies, X-Forwarded-For)
app.set('trust proxy', 1);

// ─── Bull Board ──────────────────────────────────────────────────
app.use('/admin/queues', serverAdapter.getRouter());

// ─── API Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/emails', emailRoutes);

// ─── Health Check ────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const redisHealthy = redisClient.status === 'ready' || redisClient.status === 'connect';
  const esHealthy = isESAvailable();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    services: {
      redis: redisHealthy ? 'connected' : 'disconnected',
      elasticsearch: esHealthy ? 'connected' : 'unavailable',
    },
  });
});

// ─── Error Handler ───────────────────────────────────────────────
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

    // 4. Start BullMQ worker in-process only if START_WORKER !== 'false'
    // In production Docker Compose, START_WORKER=false and a separate worker container runs
    if (process.env.START_WORKER !== 'false') {
      workerInstance = createEmailWorker();
    }

    const server = app.listen(env.PORT, () => {
      console.log(`=================================================`);
      console.log(`🚀 ReachInbox Server running at http://localhost:${env.PORT}`);
      console.log(`📊 Bull Board Dashboard at http://localhost:${env.PORT}/admin/queues`);
      console.log(`💻 Allowed frontend origin: ${env.CLIENT_URL}`);
      console.log(`🌐 Environment: ${env.NODE_ENV}`);
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
