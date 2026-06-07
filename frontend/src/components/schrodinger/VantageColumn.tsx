import type { VantageResult } from '../../types/schrodinger';
import { FindingBadge } from './FindingBadge';

interface VantageColumnProps {
  vantage: VantageResult;
}

export function VantageColumn({ vantage }: VantageColumnProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
      <h3 className="font-semibold text-cyan-300">{vantage.name}</h3>
      <p className="mt-1 text-xs text-slate-400">{vantage.summary}</p>
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
    </div>
  );
}
