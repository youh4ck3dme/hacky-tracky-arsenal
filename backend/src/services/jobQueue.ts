import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { getModule } from '../registry.js';
import type { Job, JobLogEntry, SseListener } from '../types.js';
import { getProgressTotal, runScript } from './scriptRunner.js';

interface PersistedJobs {
  jobs: Job[];
}

class JobQueue {
  private jobs = new Map<string, Job>();
  private listeners = new Map<string, Set<SseListener>>();
  private activeJobId: string | null = null;
  private abortController: AbortController | null = null;
  private processing = false;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(config.jobsDataPath)) return;
      const raw = fs.readFileSync(config.jobsDataPath, 'utf-8');
      const data = JSON.parse(raw) as PersistedJobs;
      for (const job of data.jobs) {
        if (job.status === 'running' || job.status === 'queued') {
          job.status = 'failed';
          job.finishedAt = new Date().toISOString();
        }
        this.jobs.set(job.id, job);
      }
    } catch {
      // ignore corrupt persistence file
    }
  }

  private persist(): void {
    const dir = path.dirname(config.jobsDataPath);
    fs.mkdirSync(dir, { recursive: true });
    const jobs = Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
    fs.writeFileSync(config.jobsDataPath, JSON.stringify({ jobs }, null, 2));
  }

  private emit(jobId: string, event: string, data: unknown): void {
    const set = this.listeners.get(jobId);
    if (!set) return;
    for (const listener of set) {
      listener(event, data);
    }
  }

  private trimLogs(logs: JobLogEntry[]): JobLogEntry[] {
    if (logs.length <= config.maxLogLines) return logs;
    return logs.slice(logs.length - config.maxLogLines);
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  listJobs(limit = 20): Job[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((j) => ({ ...j, logs: [] }));
  }

  getActiveJob(): Job | null {
    if (!this.activeJobId) return null;
    return this.jobs.get(this.activeJobId) ?? null;
  }

  subscribe(jobId: string, listener: SseListener): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(listener);

    const job = this.jobs.get(jobId);
    if (job) {
      for (const log of job.logs) {
        listener('log', log);
      }
      listener('progress', job.progress);
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        listener('done', { status: job.status, exitCode: job.exitCode });
      }
    }

    return () => {
      this.listeners.get(jobId)?.delete(listener);
    };
  }

  async enqueue(moduleId: string): Promise<Job> {
    const mod = getModule(moduleId);
    if (!mod) {
      throw new Error(`Unknown module: ${moduleId}`);
    }

    const total = getProgressTotal(moduleId);
    const job: Job = {
      id: uuidv4(),
      moduleId,
      moduleName: mod.name,
      status: 'queued',
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      exitCode: null,
      progress: { current: 0, total, label: 'queued' },
      logs: [],
    };

    this.jobs.set(job.id, job);
    this.persist();
    this.processQueue();

    return job;
  }

  async cancel(jobId: string): Promise<Job | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    if (job.status === 'queued') {
      job.status = 'cancelled';
      job.finishedAt = new Date().toISOString();
      this.persist();
      this.emit(jobId, 'done', { status: 'cancelled', exitCode: null });
      return job;
    }

    if (job.status === 'running' && this.activeJobId === jobId) {
      this.abortController?.abort();
      job.status = 'cancelled';
      job.finishedAt = new Date().toISOString();
      this.persist();
      this.emit(jobId, 'done', { status: 'cancelled', exitCode: null });
      this.activeJobId = null;
      this.abortController = null;
      this.processQueue();
      return job;
    }

    return job;
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.activeJobId) return;

    const queued = Array.from(this.jobs.values()).find((j) => j.status === 'queued');
    if (!queued) return;

    this.processing = true;
    await this.runJob(queued);
    this.processing = false;
    this.processQueue();
  }

  private async runJob(job: Job): Promise<void> {
    this.activeJobId = job.id;
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    this.persist();

    this.abortController = new AbortController();

    try {
      const result = await runScript({
        moduleId: job.moduleId,
        signal: this.abortController.signal,
        onLog: (entry) => {
          job.logs = this.trimLogs([...job.logs, entry]);
          this.emit(job.id, 'log', entry);
        },
        onProgress: (current, total, label) => {
          job.progress = { current, total, label };
          this.emit(job.id, 'progress', job.progress);
          this.persist();
        },
      });

      if (this.jobs.get(job.id)?.status !== 'cancelled') {
        job.status = result.exitCode === 0 ? 'completed' : 'failed';
        job.exitCode = result.exitCode;
        job.finishedAt = new Date().toISOString();
        this.emit(job.id, 'done', { status: job.status, exitCode: result.exitCode });
      }
    } catch (err) {
      if (this.jobs.get(job.id)?.status !== 'cancelled') {
        job.status = 'failed';
        job.exitCode = 1;
        job.finishedAt = new Date().toISOString();
        const message = err instanceof Error ? err.message : 'Unknown error';
        const entry: JobLogEntry = {
          line: `Error: ${message}`,
          ts: new Date().toISOString(),
          stream: 'stderr',
        };
        job.logs = this.trimLogs([...job.logs, entry]);
        this.emit(job.id, 'log', entry);
        this.emit(job.id, 'done', { status: 'failed', exitCode: 1 });
      }
    } finally {
      this.activeJobId = null;
      this.abortController = null;
      this.persist();
    }
  }
}

export const jobQueue = new JobQueue();
