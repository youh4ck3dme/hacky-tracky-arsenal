import type { ToolStatus } from '../types';

interface ToolStatusListProps {
  tools: ToolStatus[];
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('sk-SK');
}

export function ToolStatusList({ tools }: ToolStatusListProps) {
  return (
    <ul className="mt-3 space-y-2 border-t border-slate-700 pt-3">
      {tools.map((tool) => (
        <li
          key={tool.id}
          className="flex items-start justify-between gap-2 text-xs"
        >
          <div>
            <span
              className={
                tool.installed ? 'text-emerald-400' : 'text-slate-500'
              }
            >
              {tool.installed ? '●' : '○'}
            </span>{' '}
            <span className="font-medium">{tool.name}</span>
            {tool.optional && (
              <span className="ml-1 text-slate-500">(voliteľný)</span>
            )}
            {tool.healthy === false && (
              <span className="ml-1 text-amber-400">[health fail]</span>
            )}
            <div className="text-slate-500">{tool.repoDir}</div>
          </div>
          <div className="text-right text-slate-500 shrink-0">
            {tool.commit && <div>{tool.commit}</div>}
            <div>{formatDate(tool.lastUpdated)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
