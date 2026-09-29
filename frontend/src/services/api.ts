import axios from 'axios';
import { User, EmailItem, Sender, SlackStatus, CsvParseResult } from '../types/index';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  auth: {
    getMe: async (): Promise<User> => {
      const res = await apiClient.get('/auth/me');
      return res.data.data.user;
    },
    demoLogin: async (): Promise<User> => {
      const res = await apiClient.post('/auth/demo-login');
      return res.data.data.user;
    },
    logout: async (): Promise<void> => {
      await apiClient.post('/auth/logout');
    },
  },

  slack: {
    getStatus: async (): Promise<SlackStatus> => {
      const res = await apiClient.get('/slack/status');
      return res.data.data;
    },
    disconnect: async (): Promise<void> => {
      await apiClient.post('/slack/disconnect');
    },
    testNotification: async (): Promise<{ message: string }> => {
      const res = await apiClient.post('/slack/test');
      return res.data;
    },
  },

  emails: {
    schedule: async (data: {
      subject: string;
      body: string;
      recipients: string[];
      senderId?: string;
      startTime?: string;
      delayMs?: number;
      hourlyLimit?: number;
    }) => {
      const res = await apiClient.post('/emails/schedule', data);
      return res.data;
    },

    parseCsvFile: async (file: File): Promise<CsvParseResult> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/emails/parse-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },

    parseCsvText: async (content: string): Promise<CsvParseResult> => {
      const res = await apiClient.post('/emails/parse-csv', { content });
      return res.data.data;
    },

    getScheduled: async (page = 1, limit = 20): Promise<{ emails: EmailItem[]; total: number }> => {
      const res = await apiClient.get('/emails/scheduled', { params: { page, limit } });
      return {
        emails: res.data.data.emails,
        total: res.data.data.pagination.total,
      };
    },

    getSent: async (page = 1, limit = 20): Promise<{ emails: EmailItem[]; total: number }> => {
      const res = await apiClient.get('/emails/sent', { params: { page, limit } });
      return {
        emails: res.data.data.emails,
        total: res.data.data.pagination.total,
      };
    },

    search: async (query: string, status?: string): Promise<{ emails: EmailItem[]; total: number; source: string }> => {
      const res = await apiClient.get('/emails/search', { params: { q: query, status } });
      return {
        emails: res.data.data.emails,
        total: res.data.data.total,
        source: res.data.source,
      };
    },

    getSenders: async (): Promise<Sender[]> => {
      const res = await apiClient.get('/emails/senders');
      return res.data.data.senders;
    },
  },
};
