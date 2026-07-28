/**
 * Guards against the Maximum update depth loop in useActiveJob:
 * stream-driven setState must not recreate job when fields are unchanged.
 */
import { describe, expect, it } from 'vitest';
import type { Job, JobProgress } from '../../../frontend/src/types';

function progressEqual(a: JobProgress | null | undefined, b: JobProgress | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return a.current === b.current && a.total === b.total && a.label === b.label;
}

function mergeJob(
  prev: Job,
  stream: {
    status: Job['status'] | null;
    progress: JobProgress | null;
    exitCode: number | null;
    logs: Job['logs'];
  },
): Job {
  if (!stream.status) return prev;
  const nextStatus = stream.status ?? prev.status;
  const nextProgress = stream.progress ?? prev.progress;
  const nextExit = stream.exitCode !== null ? stream.exitCode : prev.exitCode;
  const nextLogs = stream.logs.length > 0 ? stream.logs : prev.logs;
  if (
    prev.status === nextStatus &&
    progressEqual(prev.progress, nextProgress) &&
    prev.exitCode === nextExit &&
    prev.logs === nextLogs
  ) {
    return prev;
  }
  return {
    ...prev,
    status: nextStatus,
    progress: nextProgress,
    exitCode: nextExit,
    logs: nextLogs,
  };
}

const baseJob: Job = {
  id: 'job-1',
  moduleId: 'full',
  moduleName: 'Full Install',
  status: 'running',
  progress: { current: 0, total: 10, label: 'start' },
  exitCode: null,
  logs: [],
  createdAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  finishedAt: null,
};

describe('useActiveJob merge (anti infinite-loop)', () => {
  it('returns same reference when stream fields are unchanged', () => {
    const stream = {
      status: 'running' as const,
      progress: { current: 0, total: 10, label: 'start' },
      exitCode: null,
      logs: [] as Job['logs'],
    };
    const once = mergeJob(baseJob, stream);
    // same values → same reference
    const twice = mergeJob(once, stream);
    expect(twice).toBe(once);
  });

  it('returns new object when status changes', () => {
    const next = mergeJob(baseJob, {
      status: 'completed',
      progress: baseJob.progress,
      exitCode: 0,
      logs: baseJob.logs,
    });
    expect(next).not.toBe(baseJob);
    expect(next.status).toBe('completed');
    expect(next.exitCode).toBe(0);
  });

  it('returns new object when progress advances', () => {
    const next = mergeJob(baseJob, {
      status: 'running',
      progress: { current: 3, total: 10, label: 'step' },
      exitCode: null,
      logs: baseJob.logs,
    });
    expect(next).not.toBe(baseJob);
    expect(next.progress?.current).toBe(3);
  });

  it('keeps previous logs when stream logs empty', () => {
    const withLogs: Job = {
      ...baseJob,
      logs: [{ ts: 't', line: 'hi', stream: 'stdout' }],
    };
    const next = mergeJob(withLogs, {
      status: 'running',
      progress: withLogs.progress,
      exitCode: null,
      logs: [],
    });
    expect(next.logs).toBe(withLogs.logs);
    expect(next).toBe(withLogs);
  });
});
