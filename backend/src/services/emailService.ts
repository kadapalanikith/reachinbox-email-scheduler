import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { emailQueue, EmailJobData } from '../queue/emailQueue.js';
import { indexEmailDocument } from '../integrations/elasticsearch.js';
import { env } from '../config/env.js';

export interface ScheduleCampaignInput {
  userId: string;
  senderId?: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime?: Date | string;
  delayMs?: number;
  hourlyLimit?: number;
}

export async function getOrCreateDefaultSender(userId: string) {
  let sender = await prisma.sender.findFirst({
    where: { userId, isDefault: true },
  });

  if (!sender) {
    sender = await prisma.sender.findFirst({
      where: { userId },
    });
  }

  if (!sender) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    sender = await prisma.sender.create({
      data: {
        userId,
        email: user?.email || 'reachinbox-user@ethereal.email',
        name: user?.name || 'Default Sender',
        isDefault: true,
      },
    });
  }

  return sender;
}

export async function scheduleEmailCampaign(input: ScheduleCampaignInput) {
  const { userId, subject, body, recipients } = input;

  if (!recipients || recipients.length === 0) {
    throw new Error('At least one valid recipient email is required.');
  }

  const delayMs = input.delayMs ?? env.EMAIL_MIN_DELAY_MS;
  const hourlyLimit = input.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR;
  const startTimestamp = input.startTime ? new Date(input.startTime).getTime() : Date.now();
  const startTime = new Date(startTimestamp);

  // 1. Resolve Sender
  let senderId = input.senderId;
  if (!senderId) {
    const defaultSender = await getOrCreateDefaultSender(userId);
    senderId = defaultSender.id;
  }

  // 2. Create Campaign in PostgreSQL
  const campaign = await prisma.campaign.create({
    data: {
      userId,
      subject,
      body,
      startTime,
      delayMs,
      hourlyLimit,
    },
  });

  const scheduledEmails = [];
  const now = Date.now();

  // 3. Create individual Email records & BullMQ delayed jobs
  for (let index = 0; index < recipients.length; index++) {
    const recipient = recipients[index];
    const scheduledTime = new Date(startTimestamp + index * delayMs);
    const delay = Math.max(0, scheduledTime.getTime() - now);

    // Unique idempotency key per recipient within campaign
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${campaign.id}:${recipient}:${index}`)
      .digest('hex');

    // Create Email record in PostgreSQL
    const emailRecord = await prisma.email.create({
      data: {
        campaignId: campaign.id,
        senderId,
        recipient,
        subject,
        body,
        scheduledAt: scheduledTime,
        status: 'SCHEDULED',
        idempotencyKey,
      },
    });

    // 4. Add BullMQ delayed job
    const jobData: EmailJobData = {
      emailId: emailRecord.id,
      campaignId: campaign.id,
      senderId,
      userId,
      recipient,
      subject,
      body,
      idempotencyKey,
      hourlyLimit,
      delayMs,
    };

    const job = await emailQueue.add('send-email', jobData, {
      delay,
      jobId: `email-${emailRecord.id}`,
    });

    // 5. Update Email record with BullMQ Job ID
    if (job.id) {
      await prisma.email.update({
        where: { id: emailRecord.id },
        data: { bullJobId: job.id },
      });
    }

    // 6. Index into Elasticsearch
    indexEmailDocument({
      id: emailRecord.id,
      userId,
      senderId,
      campaignId: campaign.id,
      recipient,
      subject,
      body,
      status: 'SCHEDULED',
      scheduledAt: scheduledTime,
      createdAt: emailRecord.createdAt,
    }).catch((err) => console.error('[ES Index Error]:', err.message));

    scheduledEmails.push({
      id: emailRecord.id,
      recipient,
      scheduledAt: scheduledTime,
      bullJobId: job.id,
    });
  }

  return {
    campaignId: campaign.id,
    totalScheduled: scheduledEmails.length,
    firstScheduledAt: scheduledEmails[0]?.scheduledAt,
    lastScheduledAt: scheduledEmails[scheduledEmails.length - 1]?.scheduledAt,
    emails: scheduledEmails,
  };
}
