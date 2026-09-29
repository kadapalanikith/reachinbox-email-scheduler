import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { scheduleEmailCampaign } from '../services/emailService.js';
import { parseCsvEmails } from '../utils/csvParser.js';
import { searchEmailsInES } from '../integrations/elasticsearch.js';

const scheduleSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string().email('Invalid email')).min(1, 'At least 1 recipient is required'),
  senderId: z.string().optional(),
  startTime: z.string().datetime().optional().or(z.date().optional()),
  delayMs: z.coerce.number().min(0).optional(),
  hourlyLimit: z.coerce.number().min(1).optional(),
});

export async function scheduleEmails(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const validatedData = scheduleSchema.parse(req.body);

    const result = await scheduleEmailCampaign({
      userId,
      ...validatedData,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: `Successfully scheduled ${result.totalScheduled} email(s)`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: error.errors },
      });
      return;
    }
    console.error('[Schedule Controller Error]:', error.message);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}

export async function parseCsvEndpoint(req: Request, res: Response) {
  try {
    let content = '';

    if (req.file) {
      content = req.file.buffer.toString('utf-8');
    } else if (req.body?.content) {
      content = req.body.content;
    } else {
      res.status(400).json({
        success: false,
        error: { message: 'No CSV content or file provided' },
      });
      return;
    }

    const parsed = parseCsvEmails(content);
    res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}

export async function getScheduledEmails(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          campaign: { userId },
          status: { in: ['SCHEDULED', 'PROCESSING'] },
        },
        include: {
          sender: { select: { email: true, name: true } },
          campaign: { select: { id: true, subject: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.email.count({
        where: {
          campaign: { userId },
          status: { in: ['SCHEDULED', 'PROCESSING'] },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        emails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}

export async function getSentEmails(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          campaign: { userId },
          status: { in: ['SENT', 'FAILED'] },
        },
        include: {
          sender: { select: { email: true, name: true } },
          campaign: { select: { id: true, subject: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.email.count({
        where: {
          campaign: { userId },
          status: { in: ['SENT', 'FAILED'] },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        emails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}

export async function searchEmails(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const query = (req.query.q as string) || '';
    const status = req.query.status as string | undefined;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));

    // 1. Attempt full-text search via Elasticsearch
    const esResult = await searchEmailsInES({
      userId,
      query,
      status,
      limit,
    });

    if (esResult) {
      res.status(200).json({
        success: true,
        source: 'elasticsearch',
        data: {
          emails: esResult.emails,
          total: esResult.total,
        },
      });
      return;
    }

    // 2. Fallback to PostgreSQL if Elasticsearch is not initialized or down
    console.log('[Search] Elasticsearch unavailable, falling back to PostgreSQL relational search.');
    const whereClause: any = {
      campaign: { userId },
    };

    if (status) {
      whereClause.status = status;
    }

    if (query.trim().length > 0) {
      whereClause.OR = [
        { recipient: { contains: query, mode: 'insensitive' } },
        { subject: { contains: query, mode: 'insensitive' } },
        { body: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: whereClause,
        include: { sender: { select: { email: true, name: true } } },
        orderBy: { scheduledAt: 'desc' },
        take: limit,
      }),
      prisma.email.count({ where: whereClause }),
    ]);

    res.status(200).json({
      success: true,
      source: 'database_fallback',
      data: {
        emails,
        total,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}

export async function getSenders(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    let senders = await prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (senders.length === 0) {
      const defaultSender = await prisma.sender.create({
        data: {
          userId,
          email: req.user!.email,
          name: req.user!.name,
          isDefault: true,
        },
      });
      senders = [defaultSender];
    }

    res.status(200).json({
      success: true,
      data: { senders },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}

export async function createSender(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { email, name } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: { message: 'Valid email is required' } });
      return;
    }

    const sender = await prisma.sender.create({
      data: {
        userId,
        email,
        name: name || email.split('@')[0],
      },
    });

    res.status(201).json({
      success: true,
      data: { sender },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
}
