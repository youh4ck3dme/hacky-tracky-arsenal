import { useEffect, useRef, useState } from 'react';
import { getToken } from '../lib/api';
import type { Job, JobLogEntry, JobProgress, JobStatus } from '../types';

function progressEqual(a: JobProgress | null | undefined, b: JobProgress | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return a.current === b.current && a.total === b.total && a.label === b.label;
}

export function useJobStream(jobId: string | null) {
  const [logs, setLogs] = useState<JobLogEntry[]>([]);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setLogs([]);
      setProgress(null);
      setStatus(null);
      setExitCode(null);
      setConnected(false);
      return;
    }

    setLogs([]);
    setProgress(null);
    setStatus('running');
    setExitCode(null);
    setConnected(false);

    const token = getToken();
    const url = `/api/jobs/${jobId}/stream`;

    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    let buffer = '';

    async function connect() {
      try {
        const res = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          if (!controller.signal.aborted) setConnected(false);
          return;
        }

        if (!controller.signal.aborted) setConnected(true);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let eventType = 'message';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const lines = part.split('\n');
            let data = '';
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                data = line.slice(6);
              }
            }
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              if (eventType === 'log') {
                setLogs((prev) => [...prev, parsed as JobLogEntry]);
              } else if (eventType === 'progress') {
                setProgress(parsed as JobProgress);
              } else if (eventType === 'done') {
                setStatus(parsed.status as JobStatus);
                setExitCode(parsed.exitCode ?? null);
              }
            } catch {
              // ignore malformed SSE chunks
            }
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setConnected(false);
        }
      }
    }

    void connect();

    return () => {
      controller.abort();
    };
  }, [jobId]);

  return { logs, progress, status, exitCode, connected };
}

/**
 * Merge SSE stream fields into a local Job copy without infinite re-render loops.
 * Do NOT put `job` in the effect deps — only stream fields.
 */
export function useActiveJob(initialJob: Job | null) {
  const [job, setJob] = useState<Job | null>(initialJob);
  const jobId = initialJob?.id ?? null;
  const stream = useJobStream(jobId);
  const lastSyncedId = useRef<string | null>(null);

  // Parent passed a different job → reset local copy once.
  useEffect(() => {
    if (!initialJob) {
      setJob(null);
      lastSyncedId.current = null;
      return;
    }
    if (lastSyncedId.current !== initialJob.id) {
      lastSyncedId.current = initialJob.id;
      setJob(initialJob);
    }
  }, [initialJob]);

  // Apply stream updates; bail out with same reference when nothing changed.
  useEffect(() => {
    if (!stream.status) return;

    setJob((prev) => {
      if (!prev) return prev;

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
    });
  }, [stream.status, stream.progress, stream.exitCode, stream.logs]);

  return { job, setJob, ...stream };
}
