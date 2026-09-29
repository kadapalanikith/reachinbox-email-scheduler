import { redisClient } from '../config/redis.js';
import { env } from '../config/env.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  currentWindow: string;
  nextWindow: string;
  nextWindowStartTime: Date;
  shouldNotifySlack: boolean;
  staggerDelayMs: number;
}

/**
 * Returns UTC calendar window string: YYYY-MM-DD-HH
 */
export function getHourWindow(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  return `${y}-${m}-${d}-${h}`;
}

/**
 * Returns the Date representing the start of the next hour window (00:00.000)
 */
export function getNextHourWindowStart(date: Date = new Date()): Date {
  const nextHour = new Date(date);
  nextHour.setUTCMinutes(0, 0, 0);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1);
  return nextHour;
}

/**
 * Redis Lua script for atomic rate limit evaluation and alert deduplication.
 * KEYS[1]: rate:{senderId}:{currentWindow}
 * KEYS[2]: rate_alert_sent:{senderId}:{currentWindow}
 * KEYS[3]: overflow_count:{senderId}:{nextWindow}
 * ARGV[1]: maxLimit (e.g. 100)
 * ARGV[2]: ttlSeconds (e.g. 7200)
 *
 * Returns [isAllowed (0 or 1), currentCount, shouldNotifySlack (0 or 1), overflowIndex]
 */
const RATE_LIMIT_LUA_SCRIPT = `
  local rateKey = KEYS[1]
  local alertKey = KEYS[2]
  local overflowKey = KEYS[3]
  local maxLimit = tonumber(ARGV[1])
  local ttlSeconds = tonumber(ARGV[2])

  local current = redisClient.call('GET', rateKey)
  local currentCount = 0
  if current then
    currentCount = tonumber(current)
  end

  if currentCount < maxLimit then
    -- Under limit, atomically increment and refresh TTL
    currentCount = redisClient.call('INCR', rateKey)
    if currentCount == 1 then
      redisClient.call('EXPIRE', rateKey, ttlSeconds)
    end
    return {1, currentCount, 0, 0}
  else
    -- Limit breached! Check if we should notify Slack (atomic SET NX)
    local shouldNotify = 0
    local alertSet = redisClient.call('SET', alertKey, '1', 'EX', ttlSeconds, 'NX')
    if alertSet then
      shouldNotify = 1
    end

    -- Increment overflow counter for next window to stagger delays
    local overflowIndex = redisClient.call('INCR', overflowKey)
    if overflowIndex == 1 then
      redisClient.call('EXPIRE', overflowKey, ttlSeconds * 2)
    end

    return {0, currentCount, shouldNotify, overflowIndex}
  end
`;

export async function checkAndIncrementRateLimit(
  senderId: string,
  hourlyLimit: number = env.MAX_EMAILS_PER_HOUR,
  delayMs: number = env.EMAIL_MIN_DELAY_MS
): Promise<RateLimitCheckResult> {
  const now = new Date();
  const currentWindow = getHourWindow(now);
  const nextWindowStart = getNextHourWindowStart(now);
  const nextWindow = getHourWindow(nextWindowStart);

  const rateKey = `rate:${senderId}:${currentWindow}`;
  const alertKey = `rate_alert_sent:${senderId}:${currentWindow}`;
  const overflowKey = `overflow_count:${senderId}:${nextWindow}`;

  // Evaluate atomically via Lua script
  const result = (await redisClient.eval(
    RATE_LIMIT_LUA_SCRIPT,
    3,
    rateKey,
    alertKey,
    overflowKey,
    hourlyLimit.toString(),
    '7200'
  )) as [number, number, number, number];

  const allowed = result[0] === 1;
  const currentCount = result[1];
  const shouldNotifySlack = result[2] === 1;
  const overflowIndex = result[3];

  // Staggering delay in milliseconds from top of next hour
  // If overflowIndex is 1, stagger = 0 ms; if 2, 1 * delayMs, etc.
  const staggerDelayMs = Math.max(0, (overflowIndex - 1) * delayMs);

  return {
    allowed,
    currentCount,
    limit: hourlyLimit,
    currentWindow,
    nextWindow,
    nextWindowStartTime: nextWindowStart,
    shouldNotifySlack,
    staggerDelayMs,
  };
}

/**
 * Enforces minimum delay between email sends for a given sender.
 * Checks `last_sent_at:{senderId}` in Redis.
 * If delta < minDelayMs, waits the remaining milliseconds before proceeding,
 * then atomically records the updated send timestamp.
 */
export async function enforceMinimumSendDelay(
  senderId: string,
  minDelayMs: number = env.EMAIL_MIN_DELAY_MS
): Promise<number> {
  const key = `last_sent_at:${senderId}`;
  const now = Date.now();

  const lastSentStr = await redisClient.get(key);
  let waitedMs = 0;

  if (lastSentStr) {
    const lastSent = parseInt(lastSentStr, 10);
    const elapsed = now - lastSent;
    if (elapsed < minDelayMs) {
      waitedMs = minDelayMs - elapsed;
      // Sleep for the remaining duration
      await new Promise((resolve) => setTimeout(resolve, waitedMs));
    }
  }

  // Update last sent timestamp with 2-hour TTL
  await redisClient.set(key, Date.now().toString(), 'EX', 7200);
  return waitedMs;
}
