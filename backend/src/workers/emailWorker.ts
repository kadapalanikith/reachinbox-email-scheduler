import { Worker, Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { redisClient, getBullRedisConfig } from '../config/redis.js';
import { env } from '../config/env.js';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from '../queue/emailQueue.js';
import { sendEmail } from '../integrations/nodemailer.js';
import { updateEmailDocument } from '../integrations/elasticsearch.js';
import {
  checkAndIncrementRateLimit,
  enforceMinimumSendDelay,
} from '../services/rateLimiter.js';
import { sendSlackRateLimitAlert } from '../integrations/slack.js';

export function createEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, senderId, userId, recipient, subject, body, hourlyLimit, delayMs } = job.data;
      const lockKey = `lock:email:${emailId}`;
      const lockToken = `${Date.now()}-${Math.random()}`;

      // 1. Distributed lock to prevent race conditions across multiple worker processes
      const acquiredLock = await redisClient.set(lockKey, lockToken, 'PX', 45000, 'NX');
      if (!acquiredLock) {
        console.warn(`[Worker] Could not acquire lock for email ${emailId}. Job is being handled concurrently.`);
        return { skipped: true, reason: 'LOCKED_BY_ANOTHER_WORKER' };
      }

      try {
        // 2. Fetch fresh email record from database
        const email = await prisma.email.findUnique({
          where: { id: emailId },
          include: { sender: true },
        });

        if (!email) {
          console.warn(`[Worker] Email record ${emailId} not found in DB. Skipping.`);
          return { skipped: true, reason: 'NOT_FOUND' };
        }

        // 3. Idempotency Check: if already SENT, do not resend under any circumstance
        if (email.status === 'SENT') {
          console.log(`[Worker Idempotency] Email ${emailId} is already marked as SENT. Skipping duplicate send.`);
          return { skipped: true, reason: 'ALREADY_SENT' };
        }

        // 4. Distributed Rate Limiting Check (Atomic Redis Lua)
        const limitToEnforce = hourlyLimit || env.MAX_EMAILS_PER_HOUR;
        const delayToEnforce = delayMs || env.EMAIL_MIN_DELAY_MS;

        const rateCheck = await checkAndIncrementRateLimit(senderId, limitToEnforce, delayToEnforce);

        if (!rateCheck.allowed) {
          console.warn(
            `[Worker Rate Limit] Sender ${senderId} exceeded hourly limit (${limitToEnforce}/hr) for window ${rateCheck.currentWindow}.`
          );

          // Calculate staggered next run time
          const nextRunTime = new Date(rateCheck.nextWindowStartTime.getTime() + rateCheck.staggerDelayMs);
          const delayUntilNext = Math.max(1000, nextRunTime.getTime() - Date.now());

          // Update DB scheduledAt time, keeping status as SCHEDULED
          await prisma.email.update({
            where: { id: emailId },
            data: {
              scheduledAt: nextRunTime,
              status: 'SCHEDULED',
            },
          });

          // Schedule new delayed job in BullMQ
          const newBullJob = await emailQueue.add(
            'send-email',
            { ...job.data },
            {
              delay: delayUntilNext,
              jobId: `email-${emailId}-rescheduled-${Date.now()}`,
            }
          );

          // Store new BullMQ job ID in DB
          if (newBullJob.id) {
            await prisma.email.update({
              where: { id: emailId },
              data: { bullJobId: newBullJob.id },
            });
          }

          // Trigger Slack notification if limit was just crossed for this hour
          if (rateCheck.shouldNotifySlack) {
            console.log(`[Worker] Rate limit breached for first time in window ${rateCheck.currentWindow}. Triggering Slack alert.`);
            const queuedCount = await prisma.email.count({
              where: {
                senderId,
                status: 'SCHEDULED',
                scheduledAt: { gte: rateCheck.nextWindowStartTime },
              },
            });

            // Fire Slack alert asynchronously
            sendSlackRateLimitAlert({
              userId,
              senderEmail: email.sender?.email || 'Unknown Sender',
              hourlyLimit: limitToEnforce,
              currentWindow: rateCheck.currentWindow,
              queuedForNextWindow: queuedCount,
            }).catch((err) => console.error('[Worker] Slack notification failed:', err.message));
          }

          return { rescheduled: true, nextRunTime: nextRunTime.toISOString() };
        }

        // 5. Enforce minimum delay between individual email sends
        await enforceMinimumSendDelay(senderId, delayToEnforce);

        // 6. Update database status to PROCESSING
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'PROCESSING',
            attempts: { increment: 1 },
          },
        });

        // 7. Dispatch email via Nodemailer / Ethereal SMTP
        const senderAddress = email.sender?.email || 'noreply@reachinbox.ai';
        const sendResult = await sendEmail({
          from: senderAddress,
          to: recipient,
          subject,
          html: body,
        });

        const previewUrl = sendResult.previewUrl ? sendResult.previewUrl.toString() : null;

        // 8. Update database record to SENT
        const sentAt = new Date();
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt,
            etherealPreviewUrl: previewUrl,
            errorMessage: null,
          },
        });

        // 9. Update Elasticsearch document
        await updateEmailDocument(emailId, {
          status: 'SENT',
          sentAt,
          etherealPreviewUrl: previewUrl,
        });

        console.log(`[Worker Success] Email ${emailId} successfully sent to ${recipient}`);
        return {
          success: true,
          emailId,
          recipient,
          previewUrl,
        };
      } catch (error: any) {
        console.error(`[Worker Error] Failed to process email ${emailId}:`, error.message);

        // Check if final attempt
        const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 3);
        if (isFinalAttempt) {
          await prisma.email.update({
            where: { id: emailId },
            data: {
              status: 'FAILED',
              errorMessage: error.message,
            },
          });

          await updateEmailDocument(emailId, {
            status: 'FAILED',
            errorMessage: error.message,
          });
        }

        throw error;
      } finally {
        // Release Redis lock safely if still held
        const currentLock = await redisClient.get(lockKey);
        if (currentLock === lockToken) {
          await redisClient.del(lockKey);
        }
      }
    },
    {
      connection: getBullRedisConfig(),
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('ready', () => {
    console.log(`[Worker] Email Worker ready with concurrency: ${env.WORKER_CONCURRENCY}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker Job Failed] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker Fatal Error]:', err.message);
  });

  return worker;
}
