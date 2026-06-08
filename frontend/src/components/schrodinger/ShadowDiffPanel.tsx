import type { FindingState } from '../../types/schrodinger';
import { diffHeadline, type ShadowDiff, type SignalChangeKind } from '../../lib/shadowDiff';

interface ShadowDiffPanelProps {
  diff: ShadowDiff;
  notifPermission: NotificationPermission;
  notifSupported: boolean;
  onEnableNotifications: () => void;
}

const KIND_META: Record<SignalChangeKind, { sign: string; cls: string }> = {
  added: { sign: '+', cls: 'text-emerald-400' },
  removed: { sign: '−', cls: 'text-red-400' },
  changed: { sign: '~', cls: 'text-amber-400' },
};

const STATE_CLS: Record<FindingState, string> = {
  collapsed: 'text-emerald-300',
  quantum: 'text-amber-300',
  temporal: 'text-indigo-300',
  absent: 'text-slate-400',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function ShadowDiffPanel({
  diff,
  notifPermission,
  notifSupported,
  onEnableNotifications,
}: ShadowDiffPanelProps) {
  return (
    <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-fuchsia-300">Shadow Diff</h3>
        <span className="text-xs text-slate-500">git diff pre attack surface — nie pre súbory</span>
      </div>

      {diff.isFirstScan ? (
        <p className="mt-3 text-sm text-slate-400">
          Prvý scan tohto cieľa — uložený ako <span className="text-fuchsia-300">baseline</span>.
          Diff sa zobrazí pri ďalšom scane po reconnecte.
        </p>
      ) : !diff.hasChanges ? (
        <p className="mt-3 text-sm text-slate-400">
          Žiadne zmeny od posledného scanu ({formatTime(diff.prevAt!)}). Attack surface stabilný.
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs text-slate-500">
            oproti {formatTime(diff.prevAt!)} · <span className="text-fuchsia-300">{diffHeadline(diff)}</span>
          </p>

          {diff.signals.length > 0 && (
            <ul className="mt-3 space-y-1.5 font-mono text-xs">
              {diff.signals.map((s) => {
                const meta = KIND_META[s.kind];
                return (
                  <li key={`${s.kind}-${s.key}`} className="flex gap-2">
                    <span className={`font-bold ${meta.cls}`}>{meta.sign}</span>
                    <span className="text-slate-500">[{s.vantage}]</span>
                    <span className="flex-1 text-slate-200">
                      {s.label}
                      {s.kind === 'changed' && s.prevState ? (
                        <span className="text-slate-400">
                          {' '}
                          <span className={STATE_CLS[s.prevState]}>{s.prevState}</span>
                          {' → '}
                          <span className={STATE_CLS[s.state]}>{s.state}</span>
                        </span>
                      ) : (
                        <span className={`ml-1 ${STATE_CLS[s.state]}`}>· {s.state}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {diff.vantageChanges.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-xs">
              {diff.vantageChanges.map((v) => (
                <li key={v.vantage} className="flex gap-2">
                  <span className="font-bold text-amber-400">~</span>
                  <span className="flex-1 text-slate-300">
                    <span className="text-slate-200">{v.name}</span>:{' '}
                    <span className={STATE_CLS[v.from]}>{v.from}</span>
                    {' → '}
                    <span className={STATE_CLS[v.to]}>{v.to}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {notifSupported && notifPermission !== 'granted' && (
        <button
          type="button"
          onClick={onEnableNotifications}
          className="mt-4 rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-semibold text-fuchsia-200 hover:bg-fuchsia-500/20"
        >
          {notifPermission === 'denied'
            ? 'Upozornenia blokované (povoľ v prehliadači)'
            : 'Povoliť upozornenia o zmenách'}
        </button>
      )}
      {notifSupported && notifPermission === 'granted' && diff.hasChanges && (
        <p className="mt-3 text-xs text-emerald-400">● Upozornenie odoslané do zariadenia</p>
      )}
    </div>
  );
}
