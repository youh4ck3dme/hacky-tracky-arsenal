import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { config } from '../config.js';
import { ALLOWED_SCRIPTS } from '../registry.js';
import { getToolsForModule } from '../registry.js';
import type { JobLogEntry, SseListener } from '../types.js';

const REPO_DIR_PATTERN = /repo_dir="([^"]+)"/;
const GIT_CLONE_PATTERN = /git clone/i;
const GIT_PULL_PATTERN = /git pull/i;
const MODULE_START_PATTERN = /Spúšťam modul:|modul:/i;

export interface RunScriptOptions {
  moduleId: string;
  onLog: (entry: JobLogEntry) => void;
  onProgress: (current: number, total: number, label: string) => void;
  signal?: AbortSignal;
}

export interface RunScriptResult {
  exitCode: number;
}

function detectProgressLabel(line: string, moduleId: string): string | null {
  const repoMatch = line.match(REPO_DIR_PATTERN);
  if (repoMatch) return repoMatch[1];

  if (GIT_CLONE_PATTERN.test(line) || GIT_PULL_PATTERN.test(line)) {
    const dirMatch = line.match(/(?:clone|pull).*?([\w.-]+)/i);
    if (dirMatch) return dirMatch[1];
  }

  if (MODULE_START_PATTERN.test(line)) {
    const modMatch = line.match(/([\w-]+\.sh)/);
    if (modMatch) return modMatch[1];
  }

  if (line.includes('WPScan')) return 'wpscan';
  if (line.includes('SecLists')) return 'SecLists';

  if (moduleId === 'full' && line.includes('exploit-tools')) return 'exploit';
  if (moduleId === 'full' && line.includes('web-hacking')) return 'web';
  if (moduleId === 'full' && line.includes('network-tools')) return 'network';
  if (moduleId === 'full' && line.includes('malware-tools')) return 'malware';
  if (moduleId === 'full' && line.includes('ai-tools')) return 'ai';

  return null;
}

export function getProgressTotal(moduleId: string): number {
  return getToolsForModule(moduleId).length;
}

export function runScript(options: RunScriptOptions): Promise<RunScriptResult> {
  const { moduleId, onLog, onProgress, signal } = options;
  const scriptName = ALLOWED_SCRIPTS[moduleId];

  if (!scriptName) {
    return Promise.reject(new Error(`Unknown module: ${moduleId}`));
  }

  const scriptPath = path.join(config.h4ckRoot, scriptName);
  const total = getProgressTotal(moduleId);
  let current = 0;
  const seenLabels = new Set<string>();

  onProgress(0, total, 'starting');

  return new Promise((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = spawn('bash', [scriptPath], {
        cwd: config.h4ckRoot,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      reject(err);
      return;
    }

    const handleAbort = () => {
      child.kill('SIGTERM');
    };

    signal?.addEventListener('abort', handleAbort);

    const processLine = (line: string, stream: 'stdout' | 'stderr') => {
      const trimmed = line.trimEnd();
      if (!trimmed) return;

      onLog({
        line: trimmed,
        ts: new Date().toISOString(),
        stream,
      });

      const label = detectProgressLabel(trimmed, moduleId);
      if (label && !seenLabels.has(label)) {
        seenLabels.add(label);
        current = Math.min(current + 1, total);
        onProgress(current, total, label);
      }
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      chunk.toString().split('\n').forEach((line) => processLine(line, 'stdout'));
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      chunk.toString().split('\n').forEach((line) => processLine(line, 'stderr'));
    });

    child.on('error', (err) => {
      signal?.removeEventListener('abort', handleAbort);
      reject(err);
    });

    child.on('close', (code) => {
      signal?.removeEventListener('abort', handleAbort);
      onProgress(total, total, 'done');
      resolve({ exitCode: code ?? 1 });
    });
  });
}

export function createSseEmitter(listeners: Set<SseListener>) {
  return (event: string, data: unknown) => {
    for (const listener of listeners) {
      listener(event, data);
    }
  };
}
