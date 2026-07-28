import { useEffect, useRef, useState } from 'react';
import { PalimpsestTimeline } from '../components/schrodinger/PalimpsestTimeline';
import { QuantumMatrix } from '../components/schrodinger/QuantumMatrix';
import { ShadowDiffPanel } from '../components/schrodinger/ShadowDiffPanel';
import { VantageColumn } from '../components/schrodinger/VantageColumn';
import { useSchrodingerScan } from '../hooks/useSchrodingerScan';
import { cancelSchrodingerScan, createSchrodingerScan } from '../lib/api';
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  showShadowNotification,
} from '../lib/notify';
import { loadScanSnapshot, saveScanSnapshot } from '../lib/scanHistory';
import { diffHeadline, diffScans, type ShadowDiff } from '../lib/shadowDiff';
import type { SchrodingerScan as ScanType } from '../types/schrodinger';

function skErrorHint(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes('dig')) {
    return 'DNS: dig chýba v PATH. Nainštaluj dnsutils/bind-tools, alebo nastav SCHRODINGER_DNS_MODE=mock.';
  }
  if (m.includes('allowlist')) {
    return 'Allowlist deny: target nie je v SCHRODINGER_ALLOWLIST. Pridaj doménu alebo nastav *.';
  }
  if (m.includes('ssrf')) {
    return 'SSRF block: resolvovaná IP je v súkromnom/metadata rozsahu — connect zrušený.';
  }
  return null;
}

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
  const riskScore = stream.riskScore ?? scan?.risk_score ?? null;
  const notices = stream.notices.length > 0 ? stream.notices : (scan?.notices ?? []);

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

  const handleCancel = async () => {
    if (!scan) return;
    try {
      const cancelled = await cancelSchrodingerScan(scan.id);
      setScan(cancelled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    }
  };

  const progressPct =
    stream.progress && stream.progress.total > 0
      ? Math.round((stream.progress.current / stream.progress.total) * 100)
      : status === 'completed'
        ? 100
        : 0;

  const streamError = stream.error;
  const displayError = error ?? streamError;
  const hint = displayError ? skErrorHint(displayError) : null;

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
          className="min-w-50 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          disabled={busy || status === 'running'}
          className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40"
        >
          {busy || status === 'running' ? 'Skenujem...' : 'Scan'}
        </button>
        {status === 'running' && (
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Cancel
          </button>
        )}
      </form>

      {displayError && (
        <div
          className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          data-testid="scan-error"
        >
          <p>{displayError}</p>
          {hint && <p className="mt-1 text-xs text-red-200/80">{hint}</p>}
        </div>
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
            {scan.mode && (
              <span className="ml-3 text-xs text-slate-500">
                mode {scan.mode.scanMode}/{scan.mode.dnsProvider}
                {scan.mode.dohEnabled ? ' · DoH' : ''}
              </span>
            )}
            {typeof riskScore === 'number' && status === 'completed' && (
              <span className="ml-3 font-mono text-violet-300" data-testid="risk-score-inline">
                risk {riskScore}/100
              </span>
            )}
          </div>

          {notices.length > 0 && (
            <div
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-100/90 space-y-1"
              data-testid="scan-notices"
            >
              {notices.map((n) => (
                <p key={n}>⚠ {n}</p>
              ))}
            </div>
          )}

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

          {status === 'completed' && vantages.length === 0 && !displayError && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400">
              Prázdny výsledok — žiadne vantage neboli spustené (skontroluj SCHRODINGER_VANTAGES).
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

          <QuantumMatrix findings={matrix} riskScore={riskScore} />

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
