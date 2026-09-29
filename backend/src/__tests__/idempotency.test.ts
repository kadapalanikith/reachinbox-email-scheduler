import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../config/database.js';
import { redisClient } from '../config/redis.js';
import * as nodemailerIntegration from '../integrations/nodemailer.js';
import { createEmailWorker } from '../workers/emailWorker.js';

describe('Worker Idempotency & Concurrency Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never sends an email that is already marked as SENT in PostgreSQL', async () => {
    const emailId = 'email-already-sent-123';

    // Mock Redis lock acquisition success
    vi.spyOn(redisClient, 'set').mockResolvedValue('OK' as any);
    vi.spyOn(redisClient, 'get').mockResolvedValue(null as any);
    vi.spyOn(redisClient, 'del').mockResolvedValue(1 as any);

    // Mock Prisma email findUnique returning an already SENT email
    vi.spyOn(prisma.email, 'findUnique').mockResolvedValueOnce({
      id: emailId,
      status: 'SENT',
      recipient: 'already_sent@example.com',
      subject: 'Test',
      body: 'Hello',
      sender: { email: 'sender@reachinbox.ai' },
    } as any);

    // Spy on SMTP sendEmail
    const sendEmailSpy = vi.spyOn(nodemailerIntegration, 'sendEmail');

    const worker = createEmailWorker();
    const processor = (worker as any).processFn;

    const mockJob = {
      data: {
        emailId,
        senderId: 'sender-1',
        userId: 'user-1',
        recipient: 'already_sent@example.com',
        subject: 'Test',
        body: 'Hello',
      },
      opts: { attempts: 3 },
      attemptsMade: 0,
    };

    const result = await processor(mockJob);

    // Must be skipped with ALREADY_SENT
    expect(result).toEqual({ skipped: true, reason: 'ALREADY_SENT' });
    // sendEmail must NOT have been called
    expect(sendEmailSpy).not.toHaveBeenCalled();

    await worker.close();
  });

  it('prevents concurrent double-execution using Redis distributed lock', async () => {
    const emailId = 'email-concurrent-test';

    // Simulate lock acquisition failure (already locked by another instance)
    vi.spyOn(redisClient, 'set').mockResolvedValueOnce(null as any);

    const worker = createEmailWorker();
    const processor = (worker as any).processFn;

    const mockJob = {
      data: {
        emailId,
        senderId: 'sender-1',
        userId: 'user-1',
        recipient: 'concurrent@example.com',
        subject: 'Test',
        body: 'Hello',
      },
      opts: { attempts: 3 },
      attemptsMade: 0,
    };

    const result = await processor(mockJob);

    expect(result).toEqual({ skipped: true, reason: 'LOCKED_BY_ANOTHER_WORKER' });

    await worker.close();
  });
});
