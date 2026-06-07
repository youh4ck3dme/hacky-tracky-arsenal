export type ModuleStatus = 'ready' | 'partial' | 'missing';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface HealthCheck {
  type: 'fileExists';
  paths: string[];
}

export interface ToolDefinition {
  id: string;
  name: string;
  repoDir: string;
  category: string;
  optional?: boolean;
  healthCheck?: HealthCheck;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  script: string;
  icon: string;
  toolIds: string[];
}

export interface ArsenalRegistry {
  version: string;
  modules: ModuleDefinition[];
  tools: ToolDefinition[];
}

export interface ToolStatus {
  id: string;
  name: string;
  repoDir: string;
  category: string;
  optional?: boolean;
  installed: boolean;
  healthy: boolean | null;
  lastUpdated: string | null;
  commit: string | null;
}

export interface ModuleStatusResult {
  id: string;
  name: string;
  description: string;
  icon: string;
  script: string;
  status: ModuleStatus;
  installedCount: number;
  totalCount: number;
  tools: ToolStatus[];
}

export interface ArsenalStatusResponse {
  scannedAt: string;
  h4ckRoot: string;
  modules: ModuleStatusResult[];
  tools: ToolStatus[];
}

export interface JobProgress {
  current: number;
  total: number;
  label: string;
}

export interface JobLogEntry {
  line: string;
  ts: string;
  stream: 'stdout' | 'stderr';
}

export interface Job {
  id: string;
  moduleId: string;
  moduleName: string;
  status: JobStatus;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  progress: JobProgress;
  logs: JobLogEntry[];
}

export type SseListener = (event: string, data: unknown) => void;
