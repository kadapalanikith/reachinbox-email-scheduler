import { describe, it, expect, vi } from 'vitest';
import { parseCsvEmails } from '../utils/csvParser.js';
import { signToken, verifyToken } from '../utils/jwt.js';

describe('API Security, Tokens & CSV Endpoints', () => {
  it('signs and verifies JWT authentication tokens correctly', () => {
    const payload = {
      userId: 'user-uuid-1234',
      email: 'alex@example.com',
      name: 'Alex Turner',
    };

    const token = signToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
  });

  it('rejects tampered or malformed JWT tokens safely', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.token';
    const decoded = verifyToken(invalidToken);
    expect(decoded).toBeNull();
  });

  it('correctly processes CSV strings via parse utility', () => {
    const rawCsv = `name,email\nLead 1,lead1@company.com\nLead 2,lead2@company.com\nDuplicate,lead1@company.com\nInvalid,bademail`;
    const parsed = parseCsvEmails(rawCsv);

    expect(parsed.validEmails).toEqual(['lead1@company.com', 'lead2@company.com']);
    expect(parsed.duplicateCount).toBe(1);
    expect(parsed.invalidEntries).toEqual(['Invalid,bademail']);
  });
});
