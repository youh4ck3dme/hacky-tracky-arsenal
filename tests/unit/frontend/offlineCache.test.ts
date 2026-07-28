import { beforeEach, describe, expect, it, vi } from 'vitest';

const memory = new Map<IDBValidKey, unknown>();

vi.mock('../../../frontend/src/lib/db', () => {
  return {
    STATUS_STORE: 'status',
    SCANS_STORE: 'scans',
    openArsenalDb: async () => {
      return {
        transaction(_store: string, mode: IDBTransactionMode) {
          const tx = {
            oncomplete: null as ((ev: Event) => void) | null,
            onerror: null as ((ev: Event) => void) | null,
            objectStore() {
              return {
                put(value: unknown, key: IDBValidKey) {
                  const req = {
                    onsuccess: null as ((ev: Event) => void) | null,
                    onerror: null as ((ev: Event) => void) | null,
                  };
                  queueMicrotask(() => {
                    if (mode === 'readonly') {
                      req.onerror?.(new Event('error'));
                      return;
                    }
                    memory.set(key, value);
                    req.onsuccess?.(new Event('success'));
                    tx.oncomplete?.(new Event('complete'));
                  });
                  return req;
                },
                get(key: IDBValidKey) {
                  const req = {
                    result: undefined as unknown,
                    onsuccess: null as ((ev: Event) => void) | null,
                    onerror: null as ((ev: Event) => void) | null,
                  };
                  queueMicrotask(() => {
                    req.result = memory.get(key);
                    req.onsuccess?.(new Event('success'));
                  });
                  return req;
                },
              };
            },
          };
          return tx;
        },
      };
    },
  };
});

describe('offlineCache', () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
  });

  it('saveStatusCache + loadStatusCache round-trip', async () => {
    // re-import after mock
    const { saveStatusCache, loadStatusCache } = await import(
      '../../../frontend/src/lib/offlineCache'
    );

    const sample = {
      scannedAt: '2026-07-28T12:00:00.000Z',
      h4ckRoot: '/tmp/h4ck',
      modules: [
        {
          id: 'network',
          name: 'Network Tools',
          description: 'x',
          icon: 'network',
          script: 'network-tools.sh',
          status: 'ready' as const,
          installedCount: 3,
          totalCount: 3,
          tools: [],
        },
      ],
      tools: [],
    };

    await saveStatusCache(sample);
    const loaded = await loadStatusCache();
    expect(loaded).toBeTruthy();
    expect(loaded!.h4ckRoot).toBe('/tmp/h4ck');
    expect(loaded!.modules[0].id).toBe('network');
  });

  it('loadStatusCache returns null when empty', async () => {
    const { loadStatusCache } = await import('../../../frontend/src/lib/offlineCache');
    const loaded = await loadStatusCache();
    expect(loaded).toBeNull();
  });
});
