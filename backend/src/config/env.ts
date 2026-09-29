import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from backend root or monorepo root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().default('postgresql://reachinbox:reachinbox_secret_password@localhost:5432/reachinbox_scheduler'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Elasticsearch
  ELASTICSEARCH_URL: z.string().default('http://localhost:9200'),

  // JWT
  JWT_SECRET: z.string().default('super_secret_jwt_key_reachinbox_dev_min_32_chars_123456789'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Ethereal SMTP
  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.coerce.number().default(587),
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASSWORD: z.string().optional(),

  // Scheduler and Rate Limiting
  MAX_EMAILS_PER_HOUR: z.coerce.number().default(100),
  EMAIL_MIN_DELAY_MS: z.coerce.number().default(2000),
  WORKER_CONCURRENCY: z.coerce.number().default(10),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/auth/google/callback'),

  // Slack OAuth
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:5000/api/slack/callback'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
