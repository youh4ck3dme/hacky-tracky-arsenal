import { useEffect, useState } from 'react';
import type { TimelineSnapshot } from '../../types/schrodinger';

interface PalimpsestTimelineProps {
  timeline: TimelineSnapshot[];
}

function statusTone(code: string): string {
  if (code.startsWith('2')) return 'text-emerald-300';
  if (code.startsWith('3')) return 'text-cyan-300';
  if (code.startsWith('4')) return 'text-amber-300';
  if (code.startsWith('5')) return 'text-red-300';
  return 'text-slate-400';
}

export function PalimpsestTimeline({ timeline }: PalimpsestTimelineProps) {
  const [index, setIndex] = useState(timeline.length - 1);

  useEffect(() => {
    setIndex(timeline.length - 1);
  }, [timeline.length]);

  if (timeline.length === 0) return null;

  const safeIndex = Math.min(Math.max(index, 0), timeline.length - 1);
  const bucket = timeline[safeIndex];
  const maxSnapshots = Math.max(...timeline.map((t) => t.totalSnapshots), 1);

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-indigo-300">Palimpsest · časová os</h3>
        <span className="text-xs text-slate-500">
          attack surface nie je snapshot, je sediment
        </span>
      </div>

      <div className="mt-4 flex items-end gap-1">
        {timeline.map((t, i) => (
          <button
            key={t.period}
            type="button"
            onClick={() => setIndex(i)}
            title={`${t.period}: ${t.totalSnapshots} snapshotov`}
            className="group flex flex-1 flex-col items-center gap-1"
          >
            <div
              className={`w-full rounded-t transition-all ${
                i === safeIndex
                  ? 'bg-indigo-400'
                  : 'bg-indigo-500/30 group-hover:bg-indigo-500/50'
              }`}
              style={{ height: `${Math.max((t.totalSnapshots / maxSnapshots) * 64, 4)}px` }}
            />
            <span
              className={`text-[10px] ${
                i === safeIndex ? 'font-semibold text-indigo-200' : 'text-slate-500'
              }`}
            >
              {t.period.slice(2)}
            </span>
          </button>
        ))}
      </div>

      <input
        type="range"
        min={0}
        max={timeline.length - 1}
        value={safeIndex}
        onChange={(e) => setIndex(Number(e.target.value))}
        className="mt-4 w-full accent-indigo-400"
        aria-label="Timeline year"
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-center">
          <div className="text-3xl font-bold text-indigo-200">{bucket.period}</div>
          <div className="mt-1 text-xs text-slate-400">
            {bucket.totalSnapshots} snapshotov · {bucket.uniquePaths} ciest
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-[11px]">
            {Object.entries(bucket.statuses)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([code, n]) => (
                <span key={code} className={statusTone(code)}>
                  {code}:{n}
                </span>
              ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-400">Verejné cesty v {bucket.period}:</p>
          <ul className="mt-2 space-y-1">
            {bucket.samplePaths.map((p) => (
              <li key={p} className="truncate font-mono text-xs text-slate-300">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
