import type { FindingState } from '../../types/schrodinger';

const STYLES: Record<FindingState, string> = {
  collapsed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  quantum: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  absent: 'border-slate-600 bg-slate-800/50 text-slate-400',
};

const LABELS: Record<FindingState, string> = {
  collapsed: 'Collapsed',
  quantum: 'Quantum',
  absent: 'Absent',
};

interface FindingBadgeProps {
  state: FindingState;
}

export function FindingBadge({ state }: FindingBadgeProps) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${STYLES[state]}`}>
      {LABELS[state]}
    </span>
  );
}
