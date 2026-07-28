import type { VantageFinding } from '../../types/schrodinger';
import { FindingBadge } from './FindingBadge';

interface QuantumMatrixProps {
  findings: VantageFinding[];
  riskScore?: number | null;
}

function riskTone(score: number): string {
  if (score >= 60) return 'text-amber-300 border-amber-500/40 bg-amber-500/10';
  if (score >= 30) return 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10';
  return 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10';
}

export function QuantumMatrix({ findings, riskScore }: QuantumMatrixProps) {
  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-500">
        Čakám na klasifikáciu findingov...
      </div>
    );
  }

  const headline =
    typeof riskScore === 'number'
      ? riskScore
      : findings.find((f) => f.id === 'matrix-summary')?.risk_score ?? null;

  return (
    <div
      className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5"
      data-testid="quantum-matrix"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-violet-300">Quantum Matrix</h3>
          <p className="mt-1 text-xs text-slate-400">
            CVE nie je fakt — je superpozícia, kým ju nezměříš z správneho uhla.
          </p>
        </div>
        {typeof headline === 'number' && (
          <div
            className={`rounded-lg border px-3 py-2 text-center ${riskTone(headline)}`}
            data-testid="risk-score"
          >
            <div className="text-[10px] uppercase tracking-wider opacity-80">risk_score</div>
            <div className="text-2xl font-bold font-mono tabular-nums">{headline}</div>
            <div className="text-[10px] opacity-70">/ 100</div>
          </div>
        )}
      </div>

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
            {f.severity && (
              <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                severity: {f.severity}
                {typeof f.risk_score === 'number' ? ` · weight ${f.risk_score}` : ''}
              </p>
            )}
            {f.next_actions && f.next_actions.length > 0 && (
              <ul className="mt-2 space-y-0.5 border-t border-slate-800 pt-2">
                {f.next_actions.map((a) => (
                  <li key={a} className="text-[11px] text-violet-200/80">
                    → {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
