import { useEffect, useRef, useState } from 'react';
import { PalimpsestTimeline } from '../components/schrodinger/PalimpsestTimeline';
import { QuantumMatrix } from '../components/schrodinger/QuantumMatrix';
import { ShadowDiffPanel } from '../components/schrodinger/ShadowDiffPanel';
import { VantageColumn } from '../components/schrodinger/VantageColumn';
import { useSchrodingerScan } from '../hooks/useSchrodingerScan';
import { createSchrodingerScan } from '../lib/api';
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  showShadowNotification,
} from '../lib/notify';
import { loadScanSnapshot, saveScanSnapshot } from '../lib/scanHistory';
import { diffHeadline, diffScans, type ShadowDiff } from '../lib/shadowDiff';
import type { SchrodingerScan as ScanType } from '../types/schrodinger';

export function SchrodingerScan() {
  const [target, setTarget] = useState('example.com');
  const [scan, setScan] = useState<ScanType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [diff, setDiff] = useState<ShadowDiff | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(notificationPermission());
  const diffedScanId = useRef<string | null>(null);

  const stream = useSchrodingerScan(scan?.id ?? null);
  const vantages = stream.vantages.length > 0 ? stream.vantages : (scan?.vantages ?? []);
  const matrix = stream.matrix.length > 0 ? stream.matrix : (scan?.matrix ?? []);
  const timeline = stream.timeline.length > 0 ? stream.timeline : (scan?.timeline ?? []);
  const status = stream.status ?? scan?.status;

  // Shadow Diff: when a scan completes, diff it against the cached baseline for
  // this target, persist the new snapshot, and notify on change.
  useEffect(() => {
    if (!scan || status !== 'completed') return;
    if (matrix.length === 0 || vantages.length === 0) return;
    if (diffedScanId.current === scan.id) return;
    diffedScanId.current = scan.id;

    const snapshot = {
      target: scan.target,
      savedAt: new Date().toISOString(),
      vantages,
      matrix,
    };

    (async () => {
      const prev = await loadScanSnapshot(scan.target);
      const result = diffScans(prev, snapshot);
      setDiff(result);
      await saveScanSnapshot(snapshot);
      if (result.hasChanges) {
        await showShadowNotification(
          `Lab target ${scan.target} sa zmenil`,
          `${diffHeadline(result)} od posledného scanu`,
        );
      }
    })();
  }, [scan, status, matrix, vantages]);

  const handleEnableNotifications = async () => {
    setNotifPerm(await requestNotificationPermission());
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setDiff(null);
    diffedScanId.current = null;
    try {
      const result = await createSchrodingerScan(target.trim());
      setScan(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setBusy(false);
    }
  };

  const progressPct =
    stream.progress && stream.progress.total > 0
      ? Math.round((stream.progress.current / stream.progress.total) * 100)
      : status === 'completed'
        ? 100
        : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-violet-400">Schrödinger Scan</h1>
        <p className="text-sm text-slate-400">
          Jeden target · 4 vantage points (kde + kedy) · kvantová a temporálna klasifikácia
        </p>
      </header>

      <form onSubmit={handleScan} className="flex flex-wrap gap-3">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="example.com"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          disabled={busy || status === 'running'}
          className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40"
        >
          {busy || status === 'running' ? 'Skenujem...' : 'Scan'}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}

      {scan && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm">
            <span className="text-slate-400">Target:</span>{' '}
            <span className="font-mono text-violet-300">{scan.target}</span>
            <span className="ml-4 text-slate-500">· {status}</span>
            {stream.connected && status === 'running' && (
              <span className="ml-2 text-emerald-400">● live</span>
            )}
          </div>

          {stream.progress && status === 'running' && (
            <div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  {stream.progress.vantage}: {stream.progress.label}
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {vantages.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {vantages.map((v) => (
                <VantageColumn key={v.id} vantage={v} />
              ))}
            </div>
          )}

          {timeline.length > 0 && <PalimpsestTimeline timeline={timeline} />}

          <QuantumMatrix findings={matrix} />

          {diff && (
            <ShadowDiffPanel
              diff={diff}
              notifPermission={notifPerm}
              notifSupported={notificationsSupported()}
              onEnableNotifications={handleEnableNotifications}
            />
          )}
        </div>
      )}
    </div>
  );
}
