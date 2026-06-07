import { useState } from 'react';
import type { ModuleStatusResult } from '../types';
import { ToolStatusList } from './ToolStatusList';

const STATUS_STYLES = {
  ready: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  missing: 'bg-red-500/20 text-red-400 border-red-500/30',
} as const;

const STATUS_LABELS = {
  ready: 'Ready',
  partial: 'Partial',
  missing: 'Missing',
} as const;

const ICONS: Record<string, string> = {
  shield: '🛡️',
  globe: '🌐',
  network: '📡',
  bug: '🦠',
  brain: '🧠',
  rocket: '🚀',
};

interface ModuleCardProps {
  module: ModuleStatusResult;
  disabled: boolean;
  offline: boolean;
  onUpdate: (moduleId: string) => void;
}

export function ModuleCard({ module, disabled, offline, onUpdate }: ModuleCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-5 transition hover:border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{ICONS[module.icon] ?? '📦'}</span>
            <h3 className="font-semibold">{module.name}</h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[module.status]}`}
            >
              {STATUS_LABELS[module.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">{module.description}</p>
          <p className="mt-1 text-xs text-slate-500">
            {module.installedCount}/{module.totalCount} nástrojov · {module.script}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onUpdate(module.id)}
          disabled={disabled || offline}
          title={offline ? 'Nedostupné offline' : undefined}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          Aktualizovať modul
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 transition-colors"
        >
          {expanded ? 'Skryť' : 'Detaily'}
        </button>
      </div>

      {expanded && <ToolStatusList tools={module.tools} />}
    </div>
  );
}
