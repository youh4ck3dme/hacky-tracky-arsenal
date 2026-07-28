import { useEffect, useState } from 'react';
import { getToken } from '../lib/api';
import type {
  ScanProgress,
  ScanStatus,
  SchrodingerScan,
  TimelineSnapshot,
  VantageFinding,
  VantageResult,
} from '../types/schrodinger';

export function useSchrodingerScan(scanId: string | null) {
  const [vantages, setVantages] = useState<VantageResult[]>([]);
  const [matrix, setMatrix] = useState<VantageFinding[]>([]);
  const [timeline, setTimeline] = useState<TimelineSnapshot[]>([]);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [notices, setNotices] = useState<string[]>([]);

  // Reset synchronously when the scan changes so consumers never observe the
  // previous scan's (completed) results during the render that swaps scanId.
  const [trackedScanId, setTrackedScanId] = useState(scanId);
  if (scanId !== trackedScanId) {
    setTrackedScanId(scanId);
    setVantages([]);
    setMatrix([]);
    setTimeline([]);
    setProgress(null);
    setStatus(scanId ? 'running' : null);
    setError(null);
    setConnected(false);
    setRiskScore(null);
    setNotices([]);
  }

  useEffect(() => {
    if (!scanId) return;

    const token = getToken();
    const url = `/api/schrodinger/scans/${scanId}/stream`;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    let buffer = '';

    async function connect() {
      try {
        const res = await fetch(url, { headers, signal: controller.signal });
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
              if (line.startsWith('event: ')) eventType = line.slice(7).trim();
              else if (line.startsWith('data: ')) data = line.slice(6);
            }
            if (!data) continue;

            const parsed = JSON.parse(data);
            if (eventType === 'vantage') {
              setVantages((prev) => {
                const next = prev.filter((v) => v.id !== parsed.id);
                return [...next, parsed as VantageResult];
              });
            } else if (eventType === 'finding') {
              setMatrix((prev) => [...prev, parsed as VantageFinding]);
            } else if (eventType === 'timeline') {
              setTimeline(parsed as TimelineSnapshot[]);
            } else if (eventType === 'progress') {
              setProgress(parsed as ScanProgress);
            } else if (eventType === 'done') {
              setStatus(parsed.status as ScanStatus);
              setError(parsed.error ?? null);
              if (typeof parsed.risk_score === 'number') {
                setRiskScore(parsed.risk_score);
              }
              if (Array.isArray(parsed.notices)) {
                setNotices(parsed.notices as string[]);
              }
            }
          }
        }
      } catch {
        if (!controller.signal.aborted) setConnected(false);
      }
    }

    connect();
    return () => {
      controller.abort();
      setConnected(false);
    };
  }, [scanId]);

  return {
    vantages,
    matrix,
    timeline,
    progress,
    status,
    error,
    connected,
    riskScore,
    notices,
  };
}

export function mergeScanWithStream(
  initial: SchrodingerScan,
  stream: ReturnType<typeof useSchrodingerScan>,
): SchrodingerScan {
  return {
    ...initial,
    status: stream.status ?? initial.status,
    vantages: stream.vantages.length > 0 ? stream.vantages : initial.vantages,
    matrix: stream.matrix.length > 0 ? stream.matrix : initial.matrix,
    timeline: stream.timeline.length > 0 ? stream.timeline : initial.timeline,
    error: stream.error ?? initial.error,
  };
}
