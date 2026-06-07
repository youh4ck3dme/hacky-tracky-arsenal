import { ProgressBar } from '../components/ProgressBar';
import { LogViewer } from '../components/LogViewer';
import { useActiveJob } from '../hooks/useJobStream';
import { cancelJob } from '../lib/api';
import type { Job } from '../types';

interface JobDetailProps {
  job: Job;
  onClose: () => void;
  onComplete: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'text-slate-400',
  running: 'text-cyan-400',
  completed: 'text-emerald-400',
  failed: 'text-red-400',
  cancelled: 'text-amber-400',
};

export function JobDetail({ job: initialJob, onClose, onComplete }: JobDetailProps) {
  const { job, progress, logs, status, exitCode, connected } = useActiveJob(initialJob);

  const isFinished =
    status === 'completed' || status === 'failed' || status === 'cancelled';

  const handleCancel = async () => {
    if (!job) return;
    await cancelJob(job.id);
  };

  const handleDone = () => {
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/80 p-4 sm:items-center">
      <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{job?.moduleName ?? initialJob.moduleName}</h2>
            <p className="text-sm text-slate-400">
              Job {job?.id.slice(0, 8)} ·{' '}
              <span className={STATUS_COLORS[job?.status ?? 'running']}>
                {job?.status}
              </span>
              {exitCode !== null && ` · exit ${exitCode}`}
              {connected && job?.status === 'running' && (
                <span className="ml-2 text-emerald-500">● live</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Zavrieť"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <ProgressBar progress={progress ?? job?.progress ?? null} />
        </div>

        <div className="mt-4">
          <LogViewer logs={logs.length > 0 ? logs : (job?.logs ?? [])} />
        </div>

        <div className="mt-4 flex gap-2">
          {job?.status === 'running' && (
            <button
              onClick={handleCancel}
              className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              Zrušiť
            </button>
          )}
          {isFinished && (
            <button
              onClick={handleDone}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
            >
              Hotovo — obnoviť stav
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
