import type { VantageFinding } from '../../types/schrodinger';
import { FindingBadge } from './FindingBadge';

interface QuantumMatrixProps {
  findings: VantageFinding[];
}

export function QuantumMatrix({ findings }: QuantumMatrixProps) {
  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-500">
        Čakám na klasifikáciu findingov...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
      <h3 className="font-semibold text-violet-300">Quantum Matrix</h3>
      <p className="mt-1 text-xs text-slate-400">
        CVE nie je fakt — je superpozícia, kým ju nezměříš z správneho uhla.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {findings.map((f) => (
          <div
            key={f.id}
            className="rounded-lg border border-slate-700 bg-slate-950/60 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{f.label}</span>
              <FindingBadge state={f.state} />
            </div>
            <p className="mt-1 text-xs text-slate-400">{f.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
