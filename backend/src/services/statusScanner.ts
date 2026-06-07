import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { config } from '../config.js';
import { getToolsForModule, loadRegistry } from '../registry.js';
import type {
  ArsenalStatusResponse,
  ModuleStatus,
  ModuleStatusResult,
  ToolDefinition,
  ToolStatus,
} from '../types.js';

function runGit(repoPath: string, args: string): string | null {
  try {
    return execSync(`git -C "${repoPath}" ${args}`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function checkHealth(tool: ToolDefinition): boolean | null {
  if (!tool.healthCheck) return null;
  if (tool.healthCheck.type === 'fileExists') {
    return tool.healthCheck.paths.some((p) =>
      fs.existsSync(path.join(config.h4ckRoot, p)),
    );
  }
  return null;
}

function scanTool(tool: ToolDefinition): ToolStatus {
  const repoPath = path.join(config.h4ckRoot, tool.repoDir);
  const installed = fs.existsSync(repoPath);
  let lastUpdated: string | null = null;
  let commit: string | null = null;

  if (installed && fs.existsSync(path.join(repoPath, '.git'))) {
    lastUpdated = runGit(repoPath, 'log -1 --format=%cI');
    commit = runGit(repoPath, 'rev-parse --short HEAD');
  }

  return {
    id: tool.id,
    name: tool.name,
    repoDir: tool.repoDir,
    category: tool.category,
    optional: tool.optional,
    installed,
    healthy: installed ? checkHealth(tool) : null,
    lastUpdated,
    commit,
  };
}

function aggregateModuleStatus(
  tools: ToolStatus[],
  moduleToolIds: string[],
): { status: ModuleStatus; installedCount: number; totalCount: number } {
  const requiredTools = tools.filter(
    (t) => moduleToolIds.includes(t.id) && !t.optional,
  );
  const allTools = tools.filter((t) => moduleToolIds.includes(t.id));
  const installedRequired = requiredTools.filter((t) => t.installed).length;
  const installedAll = allTools.filter((t) => t.installed).length;
  const totalRequired = requiredTools.length;
  const totalAll = allTools.length;

  let status: ModuleStatus;
  if (installedRequired === totalRequired && totalRequired > 0) {
    status = 'ready';
  } else if (installedAll > 0) {
    status = 'partial';
  } else {
    status = 'missing';
  }

  return { status, installedCount: installedAll, totalCount: totalAll };
}

export function scanArsenalStatus(): ArsenalStatusResponse {
  const registry = loadRegistry();
  const tools = registry.tools.map(scanTool);
  const toolMap = new Map(tools.map((t) => [t.id, t]));

  const modules: ModuleStatusResult[] = registry.modules
    .filter((m) => m.id !== 'full')
    .map((mod) => {
      const modTools = mod.toolIds
        .map((id) => toolMap.get(id))
        .filter((t): t is ToolStatus => t !== undefined);
      const agg = aggregateModuleStatus(tools, mod.toolIds);

      return {
        id: mod.id,
        name: mod.name,
        description: mod.description,
        icon: mod.icon,
        script: mod.script,
        status: agg.status,
        installedCount: agg.installedCount,
        totalCount: agg.totalCount,
        tools: modTools,
      };
    });

  return {
    scannedAt: new Date().toISOString(),
    h4ckRoot: config.h4ckRoot,
    modules,
    tools,
  };
}
