export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

export interface Sender {
  id: string;
  email: string;
  name: string | null;
  isDefault: boolean;
}

export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface EmailItem {
  id: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  bullJobId: string | null;
  idempotencyKey: string;
  attempts: number;
  errorMessage: string | null;
  etherealPreviewUrl: string | null;
  createdAt: string;
  sender?: {
    email: string;
    name: string | null;
  };
  campaign?: {
    id: string;
    subject: string;
  };
}

export interface SlackStatus {
  connected: boolean;
  connection?: {
    teamName: string;
    channelName: string | null;
    createdAt: string;
  };
}

export interface CsvParseResult {
  validEmails: string[];
  invalidEntries: string[];
  duplicateCount: number;
  totalParsed: number;
}
