import type { VantageResult } from '../../types/schrodinger';
import { FindingBadge } from './FindingBadge';

interface VantageColumnProps {
  vantage: VantageResult;
}

function computeCounts(vantage: VantageResult) {
  if (vantage.counts) return vantage.counts;
  const counts = { collapsed: 0, quantum: 0, temporal: 0, absent: 0 };
  for (const f of vantage.findings) {
    counts[f.state] += 1;
  }
  return counts;
}

export function VantageColumn({ vantage }: VantageColumnProps) {
  const counts = computeCounts(vantage);
  const total =
    counts.collapsed + counts.quantum + counts.temporal + counts.absent;
  const score =
    typeof vantage.score === 'number'
      ? vantage.score
      : counts.quantum > 0
        ? 40
        : counts.temporal > 0
          ? 50
          : counts.collapsed > 0
            ? 85
            : 0;

  return (
    <div
      className="rounded-xl border border-slate-700 bg-slate-900/80 p-4"
      data-testid={`vantage-${vantage.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-cyan-300">{vantage.name}</h3>
        <span
          className="shrink-0 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-mono text-cyan-200"
          title="Column score"
        >
          {score}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">{vantage.summary}</p>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wide">
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
          {counts.collapsed} coll
        </span>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">
          {counts.quantum} qnt
        </span>
        <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-indigo-300">
          {counts.temporal} tmp
        </span>
        <span className="rounded-full border border-slate-600 bg-slate-800/80 px-2 py-0.5 text-slate-400">
          {counts.absent} abs
        </span>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-500">
          {total} total
        </span>
      </div>

      {vantage.findings.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Žiadne findingy v tomto uhle.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {vantage.findings.slice(0, 8).map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-200">{f.label}</span>
                <FindingBadge state={f.state} />
              </div>
              <p className="mt-1 text-slate-500 break-all">{f.detail}</p>
            </li>
          ))}
          {vantage.findings.length > 8 && (
            <li className="text-xs text-slate-500">
              +{vantage.findings.length - 8} ďalších findingov
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
