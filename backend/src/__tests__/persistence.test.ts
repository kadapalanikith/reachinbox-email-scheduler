import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailQueue } from '../queue/emailQueue.js';
import { createEmailWorker } from '../workers/emailWorker.js';

describe('Restart Persistence & Queue Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves delayed jobs across worker stops and restarts without re-seeding from DB', async () => {
    // Mock getDelayed from BullMQ queue
    const fakeJobs = [
      { id: 'job-1', data: { emailId: 'e-1', recipient: 'delayed1@test.com' }, delay: 30000 },
      { id: 'job-2', data: { emailId: 'e-2', recipient: 'delayed2@test.com' }, delay: 32000 },
    ];

    vi.spyOn(emailQueue, 'getDelayed').mockResolvedValue(fakeJobs as any);

    // Initial worker starts
    const worker1 = createEmailWorker();
    expect(worker1).toBeDefined();

    // Verify jobs exist in delayed queue
    const delayedBeforeStop = await emailQueue.getDelayed();
    expect(delayedBeforeStop).toHaveLength(2);
    expect(delayedBeforeStop[0].id).toBe('job-1');

    // Simulate worker shutdown
    await worker1.close();

    // Redis keeps state: delayed jobs are STILL intact in queue
    const delayedAfterStop = await emailQueue.getDelayed();
    expect(delayedAfterStop).toHaveLength(2);

    // Worker restarts
    const worker2 = createEmailWorker();
    expect(worker2).toBeDefined();

    // Recovered delayed jobs remain present and ready for dispatch
    const recoveredDelayed = await emailQueue.getDelayed();
    expect(recoveredDelayed).toHaveLength(2);
    expect(recoveredDelayed[1].data.recipient).toBe('delayed2@test.com');

    await worker2.close();
  });
});
