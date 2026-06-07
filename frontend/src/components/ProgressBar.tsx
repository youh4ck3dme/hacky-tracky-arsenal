import type { JobProgress } from '../types';

interface ProgressBarProps {
  progress: JobProgress | null;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  if (!progress) return null;

  const pct =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-400">
        <span>
          {progress.label} — {progress.current}/{progress.total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
