import { useEffect, useRef } from 'react';
import type { JobLogEntry } from '../types';

interface LogViewerProps {
  logs: JobLogEntry[];
}

function colorize(line: string): string {
  if (line.includes('✅')) return 'text-emerald-400';
  if (line.includes('❌')) return 'text-red-400';
  if (line.includes('⚠')) return 'text-amber-400';
  if (line.includes('git clone') || line.includes('git pull')) return 'text-cyan-400';
  return 'text-slate-300';
}

export function LogViewer({ logs }: LogViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-80 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-relaxed">
      {logs.length === 0 && (
        <p className="text-slate-500">Čakám na výstup skriptu...</p>
      )}
      {logs.map((entry, i) => (
        <div key={`${entry.ts}-${i}`} className={colorize(entry.line)}>
          <span className="mr-2 text-slate-600">
            {entry.stream === 'stderr' ? '[err]' : '[out]'}
          </span>
          {entry.line}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
