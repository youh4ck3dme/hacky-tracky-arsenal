import { useCallback, useEffect, useState } from 'react';
import { JobHistoryPanel } from '../components/JobHistoryPanel';
import { ModuleCard } from '../components/ModuleCard';
import { JobDetail } from './JobDetail';
import { useArsenalStatus } from '../hooks/useArsenalStatus';
import { createJob, fetchJob, fetchJobs } from '../lib/api';
import type { Job } from '../types';

interface DashboardProps {
  authenticated: boolean;
}

export function Dashboard({ authenticated }: DashboardProps) {
  const { status, loading, error, offline, cachedAt, refresh } =
    useArsenalStatus(authenticated);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [jobHistory, setJobHistory] = useState<Job[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [jobBusy, setJobBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadJobHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const jobs = await fetchJobs();
      setJobHistory(jobs);
      const running = jobs.find(
        (j) => j.status === 'running' || j.status === 'queued',
      );
      if (running) setActiveJob(running);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) loadJobHistory();
  }, [authenticated, loadJobHistory]);

  const handleUpdate = async (moduleId: string) => {
    setActionError(null);
    setJobBusy(true);
    try {
      const job = await createJob(moduleId);
      setActiveJob(job);
      await loadJobHistory();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Nepodarilo sa spustiť job');
    } finally {
      setJobBusy(false);
    }
  };

  const handleSelectHistoryJob = async (job: Job) => {
    try {
      const full = await fetchJob(job.id);
      setActiveJob(full);
    } catch {
      setActiveJob(job);
    }
  };

  const handleJobComplete = async () => {
    await refresh();
    await loadJobHistory();
  };

  const isJobActive =
    activeJob?.status === 'running' || activeJob?.status === 'queued';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">
            HACKY TRACKY Arsenal
          </h1>
          <p className="text-sm text-slate-400">Control Panel PWA</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading || offline}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-40"
        >
          {loading ? 'Skenujem...' : 'Obnoviť stav'}
        </button>
      </header>

      {offline && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Offline režim
          {cachedAt && (
            <> — posledná synchronizácia: {new Date(cachedAt).toLocaleString('sk-SK')}</>
          )}
          . Aktualizácia modulov je nedostupná.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {actionError && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      {status && (
        <>
          <p className="mb-4 text-xs text-slate-500">
            H4CK_ROOT: {status.h4ckRoot} · skenované:{' '}
            {new Date(status.scannedAt).toLocaleString('sk-SK')}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {status.modules.map((mod) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                disabled={jobBusy || isJobActive}
                offline={offline}
                onUpdate={handleUpdate}
              />
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <h3 className="font-semibold text-emerald-400">Spusti VŠETKO</h3>
            <p className="mt-1 text-sm text-slate-400">
              Kompletná inštalácia všetkých modulov (full-install.sh)
            </p>
            <button
              onClick={() => handleUpdate('full')}
              disabled={jobBusy || isJobActive || offline}
              className="mt-3 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40 transition-colors"
            >
              Spustiť full install
            </button>
          </div>

          <JobHistoryPanel
            jobs={jobHistory}
            loading={historyLoading}
            onSelectJob={handleSelectHistoryJob}
            onRefresh={loadJobHistory}
          />
        </>
      )}

      {activeJob && (
        <JobDetail
          job={activeJob}
          onClose={() => setActiveJob(null)}
          onComplete={handleJobComplete}
        />
      )}
    </div>
  );
}
