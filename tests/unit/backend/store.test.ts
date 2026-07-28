import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../../backend/src/schrodinger/memoryStore.js';
import type { SchrodingerScan } from '../../../backend/src/types/schrodinger.js';

function makeScan(id: string, target = 'example.com', minutesAgo = 0): SchrodingerScan {
  const date = new Date(Date.now() - minutesAgo * 60_000);
  return {
    id,
    target,
    status: 'completed',
    createdAt: date.toISOString(),
    finishedAt: date.toISOString(),
    vantages: [],
    matrix: [],
    timeline: [],
    error: null,
    risk_score: null,
    notices: [],
  };
}

describe('InMemoryStore', () => {
  it('saves and retrieves a scan', async () => {
    const store = new InMemoryStore();
    const scan = makeScan('s1');
    await store.saveScan(scan);

    const retrieved = await store.getScan('s1');
    expect(retrieved).toEqual(scan);
  });

  it('returns undefined for unknown ID', async () => {
    const store = new InMemoryStore();
    expect(await store.getScan('nope')).toBeUndefined();
  });

  it('lists scans newest first', async () => {
    const store = new InMemoryStore();
    await store.saveScan(makeScan('old', 'a.com', 10));
    await store.saveScan(makeScan('new', 'b.com', 0));

    const list = await store.listScans();
    expect(list[0].id).toBe('new');
    expect(list[1].id).toBe('old');
  });

  it('respects list limit', async () => {
    const store = new InMemoryStore();
    for (let i = 0; i < 5; i++) {
      await store.saveScan(makeScan(`s${i}`, 'x.com', i));
    }
    const list = await store.listScans(3);
    expect(list).toHaveLength(3);
  });

  it('deletes a scan', async () => {
    const store = new InMemoryStore();
    await store.saveScan(makeScan('s1'));
    expect(await store.deleteScan('s1')).toBe(true);
    expect(await store.getScan('s1')).toBeUndefined();
    expect(await store.deleteScan('s1')).toBe(false); // already deleted
  });

  it('evicts oldest when over capacity', async () => {
    const store = new InMemoryStore(3);
    await store.saveScan(makeScan('a', 'x.com', 30));
    await store.saveScan(makeScan('b', 'x.com', 20));
    await store.saveScan(makeScan('c', 'x.com', 10));
    await store.saveScan(makeScan('d', 'x.com', 0)); // should evict 'a'

    expect(await store.count()).toBe(3);
    expect(await store.getScan('a')).toBeUndefined(); // evicted
    expect(await store.getScan('d')).toBeDefined();
  });
});
