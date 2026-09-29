import { describe, it, expect } from 'vitest';
import { parseCsvEmails, isValidEmail } from '../utils/csvParser.js';

describe('CSV & Text Email Parser', () => {
  it('validates standard email addresses accurately', () => {
    expect(isValidEmail('john@example.com')).toBe(true);
    expect(isValidEmail('sarah.smith+test@domain.co.uk')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('missing@tld')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('parses single column email list with header', () => {
    const csv = `email
john@example.com
jane@example.com
bob@test.org`;

    const result = parseCsvEmails(csv);
    expect(result.validEmails).toEqual([
      'john@example.com',
      'jane@example.com',
      'bob@test.org',
    ]);
    expect(result.invalidEntries).toHaveLength(0);
    expect(result.duplicateCount).toBe(0);
  });

  it('parses two-column CSV with name,email header', () => {
    const csv = `name,email
John Doe,john@example.com
Jane Smith,jane@example.com`;

    const result = parseCsvEmails(csv);
    expect(result.validEmails).toEqual([
      'john@example.com',
      'jane@example.com',
    ]);
    expect(result.invalidEntries).toHaveLength(0);
  });

  it('detects and counts duplicate emails without repeating them', () => {
    const csv = `email
alice@example.com
bob@example.com
alice@example.com
ALICE@example.com`;

    const result = parseCsvEmails(csv);
    expect(result.validEmails).toEqual([
      'alice@example.com',
      'bob@example.com',
    ]);
    expect(result.duplicateCount).toBe(2);
  });

  it('captures invalid rows separately without dropping valid ones', () => {
    const csv = `email
valid1@example.com
not-a-valid-email
valid2@example.com
@broken.com`;

    const result = parseCsvEmails(csv);
    expect(result.validEmails).toEqual([
      'valid1@example.com',
      'valid2@example.com',
    ]);
    expect(result.invalidEntries).toEqual([
      'not-a-valid-email',
      '@broken.com',
    ]);
  });

  it('handles empty input gracefully', () => {
    const result = parseCsvEmails('');
    expect(result.validEmails).toEqual([]);
    expect(result.totalParsed).toBe(0);
  });
});
