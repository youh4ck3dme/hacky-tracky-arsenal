import { useEffect, useState } from 'react';
import { getToken } from '../lib/api';
import type { Job, JobLogEntry, JobProgress, JobStatus } from '../types';

export function useJobStream(jobId: string | null) {
  const [logs, setLogs] = useState<JobLogEntry[]>([]);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    setLogs([]);
    setProgress(null);
    setStatus('running');
    setExitCode(null);

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
          setConnected(false);
          return;
        }

        setConnected(true);
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

            const parsed = JSON.parse(data);
            if (eventType === 'log') {
              setLogs((prev) => [...prev, parsed as JobLogEntry]);
            } else if (eventType === 'progress') {
              setProgress(parsed as JobProgress);
            } else if (eventType === 'done') {
              setStatus(parsed.status as JobStatus);
              setExitCode(parsed.exitCode ?? null);
            }
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setConnected(false);
        }
      }
    }

    connect();

    return () => {
      controller.abort();
      setConnected(false);
    };
  }, [jobId]);

  return { logs, progress, status, exitCode, connected };
}

export function useActiveJob(initialJob: Job | null) {
  const [job, setJob] = useState<Job | null>(initialJob);
  const stream = useJobStream(job?.id ?? null);

  useEffect(() => {
    if (stream.status && job) {
      setJob((prev) =>
        prev
          ? {
              ...prev,
              status: stream.status!,
              progress: stream.progress ?? prev.progress,
              exitCode: stream.exitCode,
              logs: stream.logs.length > 0 ? stream.logs : prev.logs,
            }
          : prev,
      );
    }
  }, [stream.status, stream.progress, stream.exitCode, stream.logs, job]);

  return { job, setJob, ...stream };
}
