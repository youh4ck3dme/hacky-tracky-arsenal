import type { Job } from '../types';

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-slate-500/20 text-slate-300',
  running: 'bg-cyan-500/20 text-cyan-300',
  completed: 'bg-emerald-500/20 text-emerald-300',
  failed: 'bg-red-500/20 text-red-300',
  cancelled: 'bg-amber-500/20 text-amber-300',
};

interface JobHistoryPanelProps {
  jobs: Job[];
  loading: boolean;
  onSelectJob: (job: Job) => void;
  onRefresh: () => void;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('sk-SK');
}

export function JobHistoryPanel({
  jobs,
  loading,
  onSelectJob,
  onRefresh,
}: JobHistoryPanelProps) {
  return (
    <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/80 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-200">História jobov</h3>
          <p className="mt-1 text-sm text-slate-400">
            Posledných {jobs.length} install/update jobov
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs hover:bg-slate-800 disabled:opacity-40"
        >
          {loading ? 'Načítavam...' : 'Obnoviť'}
        </button>
      </div>

      {jobs.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Zatiaľ žiadne joby.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-slate-500">
                <th className="pb-2 pr-4">Modul</th>
                <th className="pb-2 pr-4">Stav</th>
                <th className="pb-2 pr-4">Progress</th>
                <th className="pb-2 pr-4">Exit</th>
                <th className="pb-2">Čas</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className="cursor-pointer border-b border-slate-800 hover:bg-slate-800/50"
                >
                  <td className="py-2 pr-4 font-medium">{job.moduleName}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[job.status] ?? ''}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-400">
                    {job.progress.current}/{job.progress.total}
                  </td>
                  <td className="py-2 pr-4 text-slate-400">
                    {job.exitCode ?? '—'}
                  </td>
                  <td className="py-2 text-slate-500">
                    {formatTime(job.finishedAt ?? job.startedAt ?? job.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
