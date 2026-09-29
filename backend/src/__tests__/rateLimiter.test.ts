import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getHourWindow,
  getNextHourWindowStart,
  checkAndIncrementRateLimit,
} from '../services/rateLimiter.js';
import { redisClient } from '../config/redis.js';

describe('Distributed Rate Limiting & Rescheduling Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly formats UTC hour window keys', () => {
    const fixedDate = new Date('2026-09-29T17:35:00.000Z');
    const window = getHourWindow(fixedDate);
    expect(window).toBe('2026-09-29-17');
  });

  it('correctly calculates the start of the next hour window', () => {
    const fixedDate = new Date('2026-09-29T17:35:00.000Z');
    const nextStart = getNextHourWindowStart(fixedDate);
    expect(nextStart.toISOString()).toBe('2026-09-29T18:00:00.000Z');
  });

  it('allows send when within hourly rate limit', async () => {
    // Mock redisClient.eval to simulate under limit: [allowed=1, currentCount=1, notify=0, overflow=0]
    vi.spyOn(redisClient, 'eval').mockResolvedValueOnce([1, 1, 0, 0] as any);

    const result = await checkAndIncrementRateLimit('sender-123', 2, 2000);
    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(1);
    expect(result.shouldNotifySlack).toBe(false);
  });

  it('rejects and triggers Slack notification when limit is breached for the first time', async () => {
    // Mock redisClient.eval to simulate limit breach with alert flag: [allowed=0, currentCount=2, notify=1, overflow=1]
    vi.spyOn(redisClient, 'eval').mockResolvedValueOnce([0, 2, 1, 1] as any);

    const result = await checkAndIncrementRateLimit('sender-123', 2, 2000);
    expect(result.allowed).toBe(false);
    expect(result.shouldNotifySlack).toBe(true);
    expect(result.staggerDelayMs).toBe(0); // first overflow runs at top of hour
  });

  it('calculates staggered delay for subsequent overflow jobs in the same window', async () => {
    // 3rd email in overflow: overflowIndex = 3, so stagger = (3 - 1) * 2000ms = 4000ms
    vi.spyOn(redisClient, 'eval').mockResolvedValueOnce([0, 2, 0, 3] as any);

    const result = await checkAndIncrementRateLimit('sender-123', 2, 2000);
    expect(result.allowed).toBe(false);
    expect(result.shouldNotifySlack).toBe(false); // Already notified in this window
    expect(result.staggerDelayMs).toBe(4000);
  });
});
