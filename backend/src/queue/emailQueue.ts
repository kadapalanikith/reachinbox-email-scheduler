import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getBullRedisConfig } from '../config/redis.js';
import { env } from '../config/env.js';

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

export interface EmailJobData {
  emailId: string;
  campaignId: string;
  senderId: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  idempotencyKey: string;
  hourlyLimit?: number;
  delayMs?: number;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: getBullRedisConfig(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // keep 24 hours
    },
    removeOnFail: {
      count: 1000,
    },
  },
});

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue, {
      displayName: 'ReachInbox Outreach Dispatch Queue',
      description: 'Handles BullMQ delayed dispatches, 100/hr sender rate-limiting, and retry backoffs.',
      allowRetries: true,
      readOnlyMode: false,
    }),
  ],
  serverAdapter: serverAdapter,
  options: {
    uiConfig: {
      boardTitle: 'ReachInbox Queue Monitor',
      miscLinks: [
        {
          text: 'Back to ReachInbox Dashboard',
          // Use env CLIENT_URL so this works in production, not just localhost
          url: `${env.CLIENT_URL}/dashboard`,
        },
      ],
      environment: {
        label: 'BullMQ Production',
        color: '#4F46E5',
        textColor: '#FFFFFF',
      },
      pollingInterval: {
        showSetting: true,
        forceInterval: 3000,
      },
    },
  },
});
