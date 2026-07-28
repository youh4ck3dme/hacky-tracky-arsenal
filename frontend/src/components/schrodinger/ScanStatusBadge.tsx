import type { ScanStatus } from '../../types/schrodinger';

const STYLES: Record<ScanStatus, string> = {
  queued: 'border-slate-600 bg-slate-800/80 text-slate-300',
  running: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  completed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  failed: 'border-red-500/40 bg-red-500/10 text-red-300',
  cancelled: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
};

const LABELS: Record<ScanStatus, string> = {
  queued: 'queued',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
};

interface ScanStatusBadgeProps {
  status: ScanStatus;
}

export function ScanStatusBadge({ status }: ScanStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
      data-testid="scan-status-badge"
      data-status={status}
    >
      {LABELS[status]}
    </span>
  );
}
