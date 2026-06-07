import type { ArsenalStatusResponse, HealthResponse, Job, ModuleDefinition } from '../types';
import type { SchrodingerScan } from '../types/schrodinger';

const TOKEN_KEY = 'arsenal_api_token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && path !== '/api/health') {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health');
}

export async function fetchArsenalStatus(): Promise<ArsenalStatusResponse> {
  return apiFetch<ArsenalStatusResponse>('/api/arsenal/status');
}

export async function fetchModules(): Promise<ModuleDefinition[]> {
  return apiFetch<ModuleDefinition[]>('/api/modules');
}

export async function fetchJobs(): Promise<Job[]> {
  return apiFetch<Job[]>('/api/jobs');
}

export async function fetchJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/jobs/${id}`);
}

export async function createJob(moduleId: string): Promise<Job> {
  return apiFetch<Job>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify({ moduleId }),
  });
}

export async function cancelJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/jobs/${id}/cancel`, { method: 'POST' });
}

export async function createSchrodingerScan(target: string): Promise<SchrodingerScan> {
  return apiFetch<SchrodingerScan>('/api/schrodinger/scans', {
    method: 'POST',
    body: JSON.stringify({ target }),
  });
}

export async function fetchSchrodingerScan(id: string): Promise<SchrodingerScan> {
  return apiFetch<SchrodingerScan>(`/api/schrodinger/scans/${id}`);
}
