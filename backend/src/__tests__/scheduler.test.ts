import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scheduleEmailCampaign } from '../services/emailService.js';
import { prisma } from '../config/database.js';
import { emailQueue } from '../queue/emailQueue.js';

describe('Email Campaign Scheduler Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('schedules individual delayed jobs for each recipient with staggered timing', async () => {
    const fakeCampaignId = 'camp-uuid-123';
    const fakeSenderId = 'sender-uuid-456';
    const fakeUserId = 'user-uuid-789';

    // Mock Prisma campaign creation
    vi.spyOn(prisma.campaign, 'create').mockResolvedValueOnce({
      id: fakeCampaignId,
      userId: fakeUserId,
      subject: 'Welcome to ReachInbox',
      body: '<p>Hello</p>',
      startTime: new Date('2026-09-29T18:00:00.000Z'),
      delayMs: 2000,
      hourlyLimit: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Mock Sender lookup
    vi.spyOn(prisma.sender, 'findFirst').mockResolvedValueOnce({
      id: fakeSenderId,
      userId: fakeUserId,
      email: 'test@reachinbox.ai',
      name: 'Tester',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Mock Prisma email creation
    let emailCounter = 0;
    vi.spyOn(prisma.email, 'create').mockImplementation((args: any) => {
      emailCounter++;
      return Promise.resolve({
        id: `email-${emailCounter}`,
        campaignId: fakeCampaignId,
        senderId: fakeSenderId,
        recipient: args.data.recipient,
        subject: args.data.subject,
        body: args.data.body,
        scheduledAt: args.data.scheduledAt,
        status: 'SCHEDULED',
        idempotencyKey: args.data.idempotencyKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    });

    vi.spyOn(prisma.email, 'update').mockResolvedValue({} as any);

    // Mock BullMQ queue.add
    let jobCounter = 0;
    const addedJobs: any[] = [];
    vi.spyOn(emailQueue, 'add').mockImplementation((name, data, opts) => {
      jobCounter++;
      const job = { id: `bull-job-${jobCounter}`, name, data, opts };
      addedJobs.push(job);
      return Promise.resolve(job as any);
    });

    const startTime = new Date(Date.now() + 60000); // 1 minute from now
    const recipients = ['user1@test.com', 'user2@test.com', 'user3@test.com'];

    const result = await scheduleEmailCampaign({
      userId: fakeUserId,
      senderId: fakeSenderId,
      subject: 'Welcome to ReachInbox',
      body: '<p>Hello</p>',
      recipients,
      startTime,
      delayMs: 2000,
      hourlyLimit: 50,
    });

    expect(result.totalScheduled).toBe(3);
    expect(addedJobs).toHaveLength(3);

    // Verify first email delayed by approx 60000ms
    // Second email delayed by first + 2000ms
    // Third email delayed by first + 4000ms
    const delay0 = addedJobs[0].opts.delay;
    const delay1 = addedJobs[1].opts.delay;
    const delay2 = addedJobs[2].opts.delay;

    expect(delay1 - delay0).toBe(2000);
    expect(delay2 - delay1).toBe(2000);

    // Check unique BullMQ job IDs
    expect(addedJobs[0].id).toBe('bull-job-1');
    expect(addedJobs[1].id).toBe('bull-job-2');
    expect(addedJobs[2].id).toBe('bull-job-3');
  });
});
