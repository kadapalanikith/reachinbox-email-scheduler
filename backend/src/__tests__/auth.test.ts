import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword, verifyPassword, isValidEmail } from '../utils/password.js';
import { register, login, demoLogin, getCurrentUser, logout } from '../controllers/authController.js';
import { prisma } from '../config/database.js';

describe('Authentication & Password Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Hashing & Verification Utility', () => {
    it('hashes passwords securely using scrypt with random salt', async () => {
      const password = 'SuperSecretPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).toContain(':');
      expect(hash2).toContain(':');
      // Different salts produce different hashes
      expect(hash1).not.toBe(hash2);

      const isValid = await verifyPassword(password, hash1);
      expect(isValid).toBe(true);
    });

    it('rejects incorrect passwords with timing-safe comparison', async () => {
      const password = 'CorrectPassword123';
      const hash = await hashPassword(password);

      const isMatch = await verifyPassword('WrongPassword', hash);
      expect(isMatch).toBe(false);
    });

    it('handles malformed hashes safely without throwing errors', async () => {
      expect(await verifyPassword('password', '')).toBe(false);
      expect(await verifyPassword('password', 'malformed_hash')).toBe(false);
      expect(await verifyPassword('password', 'salt_only:')).toBe(false);
    });

    it('validates email formats accurately', () => {
      expect(isValidEmail('user@reachinbox.ai')).toBe(true);
      expect(isValidEmail('test.lead+123@example.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('missing-domain@')).toBe(false);
      expect(isValidEmail('@missing-user.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('Registration Flow (POST /api/auth/register)', () => {
    it('successfully registers a new user with hashed password and default sender', async () => {
      const mockCreatedUser = {
        id: 'new-user-uuid',
        email: 'founder@startup.io',
        name: 'founder',
        avatar: null,
        passwordHash: 'dummy_hash',
      };

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.user, 'create').mockResolvedValue(mockCreatedUser as any);
      vi.spyOn(prisma.sender, 'create').mockResolvedValue({ id: 'sender-1' } as any);

      const req: any = {
        body: {
          email: 'founder@startup.io',
          password: 'SecurePassword123',
        },
      };

      let statusCode = 0;
      let responseBody: any = null;
      let cookieSet = '';

      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
        cookie: (name: string, val: string) => {
          cookieSet = name;
        },
      };

      await register(req, res);

      expect(statusCode).toBe(201);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.user.email).toBe('founder@startup.io');
      expect(responseBody.data.user.passwordHash).toBeUndefined();
      expect(cookieSet).toBe('token');
      expect(prisma.sender.create).toHaveBeenCalled();
    });

    it('rejects duplicate email registrations', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'existing-id',
        email: 'existing@reachinbox.ai',
      } as any);

      const req: any = {
        body: {
          email: 'existing@reachinbox.ai',
          password: 'Password123',
        },
      };

      let statusCode = 0;
      let responseBody: any = null;

      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
      };

      await register(req, res);

      expect(statusCode).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toContain('already exists');
    });

    it('rejects passwords shorter than 6 characters', async () => {
      const req: any = {
        body: {
          email: 'user@reachinbox.ai',
          password: '123',
        },
      };

      let statusCode = 0;
      let responseBody: any = null;

      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
      };

      await register(req, res);

      expect(statusCode).toBe(400);
      expect(responseBody.error.message).toContain('at least 6 characters');
    });
  });

  describe('Login Flow (POST /api/auth/login)', () => {
    it('successfully logs in with valid credentials', async () => {
      const rawPassword = 'ValidPassword123';
      const storedHash = await hashPassword(rawPassword);

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-uuid-1',
        email: 'user@reachinbox.ai',
        name: 'Reach User',
        avatar: null,
        passwordHash: storedHash,
      } as any);

      const req: any = {
        body: {
          email: 'user@reachinbox.ai',
          password: rawPassword,
        },
      };

      let statusCode = 0;
      let responseBody: any = null;
      let cookieName = '';

      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
        cookie: (name: string) => {
          cookieName = name;
        },
      };

      await login(req, res);

      expect(statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.user.email).toBe('user@reachinbox.ai');
      expect(cookieName).toBe('token');
    });

    it('rejects login with incorrect password safely', async () => {
      const storedHash = await hashPassword('CorrectPassword123');

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-uuid-1',
        email: 'user@reachinbox.ai',
        passwordHash: storedHash,
      } as any);

      const req: any = {
        body: {
          email: 'user@reachinbox.ai',
          password: 'WrongPassword456',
        },
      };

      let statusCode = 0;
      let responseBody: any = null;

      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
      };

      await login(req, res);

      expect(statusCode).toBe(401);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toBe('Invalid email or password.');
    });

    it('rejects login when user does not exist without revealing email existence', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const req: any = {
        body: {
          email: 'nonexistent@reachinbox.ai',
          password: 'SomePassword123',
        },
      };

      let statusCode = 0;
      let responseBody: any = null;

      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        },
      };

      await login(req, res);

      expect(statusCode).toBe(401);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toBe('Invalid email or password.');
    });
  });

  describe('Session, Demo Login & Logout', () => {
    it('maintains working demoLogin for reviewer evaluation', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'reviewer-id',
        email: 'reviewer@reachinbox.ai',
        name: 'ReachInbox Evaluator',
        avatar: null,
      } as any);

      const req: any = {};
      let statusCode = 0;
      let cookieSet = '';

      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: vi.fn(),
        cookie: (name: string) => {
          cookieSet = name;
        },
      };

      await demoLogin(req, res);
      expect(statusCode).toBe(200);
      expect(cookieSet).toBe('token');
    });

    it('returns authenticated user via getCurrentUser', async () => {
      const req: any = {
        user: { id: 'u1', email: 'test@reachinbox.ai', name: 'Test' },
      };
      let statusCode = 0;
      let responseBody: any = null;

      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
        },
      };

      await getCurrentUser(req, res);
      expect(statusCode).toBe(200);
      expect(responseBody.data.user.email).toBe('test@reachinbox.ai');
    });

    it('clears auth cookie on logout', async () => {
      const req: any = {};
      let cookieCleared = '';
      const res: any = {
        clearCookie: (name: string) => {
          cookieCleared = name;
        },
        status: (code: number) => res,
        json: vi.fn(),
      };

      await logout(req, res);
      expect(cookieCleared).toBe('token');
    });
  });
});
