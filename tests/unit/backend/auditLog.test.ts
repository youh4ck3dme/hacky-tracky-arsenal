import { describe, expect, it, beforeEach } from 'vitest';
import { AuditLog, resetAuditLog } from '../../../backend/src/schrodinger/auditLog.js';

describe('AuditLog', () => {
  let log: AuditLog;

  beforeEach(() => {
    log = new AuditLog(10); // small buffer for testing
  });

  it('appends events with correct fields', () => {
    const event = log.append('scan.created', 'api', { foo: 'bar' }, {
      target: 'example.com',
      scanId: 'scan-1',
    });

    expect(event.id).toBeTruthy();
    expect(event.action).toBe('scan.created');
    expect(event.actor).toBe('api');
    expect(event.target).toBe('example.com');
    expect(event.scanId).toBe('scan-1');
    expect(event.detail.foo).toBe('bar');
    expect(event.ts).toBeTruthy();
  });

  it('query returns newest first', () => {
    log.append('scan.created', 'api', {});
    log.append('scan.completed', 'system', {});

    const events = log.getAll();
    expect(events[0].action).toBe('scan.completed');
    expect(events[1].action).toBe('scan.created');
  });

  it('query filters by action', () => {
    log.append('scan.created', 'api', {});
    log.append('scan.completed', 'system', {});
    log.append('scan.created', 'api', {});

    const events = log.query({ action: 'scan.created' });
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.action === 'scan.created')).toBe(true);
  });

  it('query filters by scanId', () => {
    log.append('scan.created', 'api', {}, { scanId: 'a' });
    log.append('scan.completed', 'system', {}, { scanId: 'b' });
    log.append('scan.failed', 'system', {}, { scanId: 'a' });

    const events = log.query({ scanId: 'a' });
    expect(events).toHaveLength(2);
  });

  it('query respects limit', () => {
    for (let i = 0; i < 5; i++) {
      log.append('scan.created', 'api', {});
    }
    const events = log.query({ limit: 3 });
    expect(events).toHaveLength(3);
  });

  it('ring buffer drops oldest events when over capacity', () => {
    const smallLog = new AuditLog(3);
    smallLog.append('scan.created', 'api', { n: 1 });
    smallLog.append('scan.created', 'api', { n: 2 });
    smallLog.append('scan.created', 'api', { n: 3 });
    smallLog.append('scan.created', 'api', { n: 4 }); // should drop n=1

    expect(smallLog.size).toBe(3);

    const events = smallLog.getAll();
    // Should have 4, 3, 2 (newest first), and 1 should be gone
    expect(events[0].detail.n).toBe(4);
    expect(events[2].detail.n).toBe(2);
  });

  it('clear empties the buffer', () => {
    log.append('scan.created', 'api', {});
    log.append('scan.completed', 'system', {});
    log.clear();
    expect(log.size).toBe(0);
    expect(log.getAll()).toHaveLength(0);
  });
});

describe('resetAuditLog', () => {
  it('resets the singleton', () => {
    resetAuditLog();
    // Just verify it doesn't throw
    expect(true).toBe(true);
  });
});
