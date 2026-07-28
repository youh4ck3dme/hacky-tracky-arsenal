import { describe, expect, it } from 'vitest';
import { schrodingerScanner } from '../../../backend/src/services/schrodingerScanner.js';

async function waitForScan(id: string, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = schrodingerScanner.getScan(id);
    if (s && (s.status === 'completed' || s.status === 'failed')) return s;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('scan timeout');
}

describe('Schrödinger full mock scan', () => {
  it('p95 full mock scan completes under 3s with 4 vantages + risk_score', async () => {
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t0 = Date.now();
      const created = await schrodingerScanner.createScan('example.com');
      const done = await waitForScan(created.id);
      times.push(Date.now() - t0);
      expect(done.status).toBe('completed');
      expect(done.vantages.length).toBe(4);
      expect(done.matrix.length).toBeGreaterThan(0);
      expect(typeof done.risk_score).toBe('number');
      expect(done.mode?.dnsProvider).toBe('mock');
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.min(times.length - 1, Math.ceil(times.length * 0.95) - 1)];
    expect(p95).toBeLessThan(3000);
  });

  it('quantum fixture target elevates risk_score', async () => {
    const created = await schrodingerScanner.createScan('quantum.example.com');
    const done = await waitForScan(created.id);
    expect(done.status).toBe('completed');
    expect(done.risk_score ?? 0).toBeGreaterThan(0);
    expect(done.matrix.some((f) => f.state === 'quantum' || f.state === 'temporal')).toBe(true);
  });
});
