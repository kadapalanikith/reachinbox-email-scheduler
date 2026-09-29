import { redisClient } from './config/redis.js';
import { createEmailWorker } from './workers/emailWorker.js';
import { getTransporter } from './integrations/nodemailer.js';
import { env } from './config/env.js';

async function startWorkerProcess() {
  console.log('Starting standalone BullMQ Email Worker process...');
  await redisClient.connect().catch((err) => console.warn('[Redis] Connection warning:', err.message));
  await getTransporter().catch((err) => console.warn('[SMTP] Transport warning:', err.message));

  const worker = createEmailWorker();
  console.log(`BullMQ Email Worker initialized successfully (Concurrency: ${env.WORKER_CONCURRENCY}).`);

  const gracefulShutdown = async () => {
    console.log('Stopping worker gracefully...');
    await worker.close();
    await redisClient.quit();
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

startWorkerProcess();
