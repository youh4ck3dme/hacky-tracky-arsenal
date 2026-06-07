import fs from 'node:fs';
import { config } from './config.js';
import type { ArsenalRegistry, ModuleDefinition, ToolDefinition } from './types.js';

let cached: ArsenalRegistry | null = null;

export function loadRegistry(): ArsenalRegistry {
  if (cached) return cached;
  const raw = fs.readFileSync(config.registryPath, 'utf-8');
  cached = JSON.parse(raw) as ArsenalRegistry;
  return cached;
}

export function getModule(moduleId: string): ModuleDefinition | undefined {
  return loadRegistry().modules.find((m) => m.id === moduleId);
}

export function getTool(toolId: string): ToolDefinition | undefined {
  return loadRegistry().tools.find((t) => t.id === toolId);
}

export function getToolsForModule(moduleId: string): ToolDefinition[] {
  const mod = getModule(moduleId);
  if (!mod) return [];
  const registry = loadRegistry();
  return mod.toolIds
    .map((id) => registry.tools.find((t) => t.id === id))
    .filter((t): t is ToolDefinition => t !== undefined);
}

export const ALLOWED_SCRIPTS: Record<string, string> = {
  exploit: 'exploit-tools.sh',
  web: 'web-hacking.sh',
  network: 'network-tools.sh',
  malware: 'malware-tools.sh',
  ai: 'ai-tools.sh',
  full: 'full-install.sh',
};
