import net from 'node:net';
import type { PortProfile, VantageFinding, VantageResult } from '../../../types/schrodinger.js';
import { countStates } from '../dns/types.js';
import { assertSafeConnectTargets, isBlockedIp } from '../ssrf.js';

const PROFILES: Record<PortProfile, number[]> = {
  quick: [80, 443, 8080, 8443],
  web: [80, 443, 8000, 8080, 8443, 8888, 3000, 5000],
};

const DEFAULT_PATHS = ['/', '/robots.txt', '/wp-admin', '/.well-known/security.txt'];

export interface NetWebOptions {
  profile: PortProfile;
  paths?: string[];
  mock: boolean;
  /** Resolved IPs already SSRF-checked; empty → connect by hostname (still checked if provided). */
  resolvedIps: string[];
  onProgress?: (current: number, total: number, label: string) => void;
}

export async function probeNetWeb(
  target: string,
  options: NetWebOptions,
): Promise<VantageResult> {
  const ports = PROFILES[options.profile] ?? PROFILES.quick;
  const paths = options.paths ?? DEFAULT_PATHS;
  const total = ports.length + paths.length;
  let step = 0;
  const findings: VantageFinding[] = [];
  const openPorts: number[] = [];

  // SSRF re-check before any connect
  let connectHost = target;
  if (options.resolvedIps.length > 0) {
    const safe = assertSafeConnectTargets(options.resolvedIps);
    connectHost = safe[0];
  } else if (!options.mock) {
    // Hostname connect still allowed only if not a literal blocked IP
    if (isBlockedIp(target)) {
      throw new Error(`SSRF block: target ${target}`);
    }
  }

  for (const port of ports) {
    step += 1;
    options.onProgress?.(step, total, `port ${port}`);
    const open = options.mock
      ? mockPortOpen(target, port)
      : await probePort(connectHost, port);
    if (open) openPorts.push(port);
    findings.push({
      id: `net-port-${port}`,
      label: `TCP :${port}`,
      detail: open ? 'open' : 'closed/filtered',
      state: open ? 'collapsed' : 'absent',
      vantage: 'netweb',
    });
  }

  const webResults: Array<{ path: string; status: number; server: string }> = [];
  for (const urlPath of paths) {
    step += 1;
    options.onProgress?.(step, total, urlPath);
    const result = options.mock
      ? mockHttpPath(target, urlPath)
      : await probeHttpPath(target, urlPath, connectHost);
    webResults.push({ path: urlPath, ...result });
    findings.push({
      id: `web-path-${urlPath.replace(/\W+/g, '_') || 'root'}`,
      label: `HTTP ${urlPath}`,
      detail: result.status > 0 ? `HTTP ${result.status} · ${result.server}` : 'no response',
      state: result.status > 0 ? 'collapsed' : 'absent',
      vantage: 'netweb',
    });
  }

  const httpWorks = webResults.some((r) => r.status > 0);
  const port443open = openPorts.includes(443);
  const port80open = openPorts.includes(80);

  if ((port443open || port80open) && !httpWorks) {
    findings.unshift({
      id: 'netweb-quantum-port-http',
      label: 'Port open, HTTP silent',
      detail: `Ports ${openPorts.join(',')} open but HTTP paths unreachable`,
      state: 'quantum',
      vantage: 'netweb',
      severity: 'high',
    });
  } else if (!port443open && !port80open && httpWorks) {
    findings.unshift({
      id: 'netweb-quantum-http-port',
      label: 'HTTP responds, ports filtered',
      detail: 'HTTP works but TCP probes show closed/filtered',
      state: 'quantum',
      vantage: 'netweb',
      severity: 'medium',
    });
  }

  // Special mock quantum for open-no-http fixture target
  if (options.mock && target === 'open-no-http.example.com') {
    // already handled by mockPortOpen/mockHttpPath
  }

  const hasQuantum = findings.some((f) => f.state === 'quantum');
  const summary = hasQuantum
    ? 'Quantum Net/Web: network and application layers disagree'
    : openPorts.length > 0 || httpWorks
      ? 'Collapsed Net/Web: consistent network + HTTP picture'
      : 'Target appears silent on network and web probes';

  const score = hasQuantum ? 35 : openPorts.length > 0 || httpWorks ? 85 : 0;

  return {
    id: 'netweb',
    name: `Network vs Web (${options.profile})`,
    findings,
    summary,
    counts: countStates(findings),
    score,
    meta: {
      profile: options.profile,
      openPorts,
      httpWorks,
      connectHost: options.mock ? 'mock' : connectHost,
    },
  };
}

function probePort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (open: boolean) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(2000);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

async function probeHttpPath(
  target: string,
  urlPath: string,
  connectHost: string,
): Promise<{ status: number; server: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    for (const scheme of ['https', 'http'] as const) {
      try {
        const res = await fetch(`${scheme}://${connectHost}${urlPath}`, {
          signal: controller.signal,
          redirect: 'manual',
          headers: { Host: target },
        });
        return { status: res.status, server: res.headers.get('server') ?? 'unknown' };
      } catch {
        continue;
      }
    }
    return { status: 0, server: 'none' };
  } finally {
    clearTimeout(timeout);
  }
}

function mockPortOpen(target: string, port: number): boolean {
  if (target === 'silent.example.com') return false;
  if (target === 'open-no-http.example.com') {
    return port === 80 || port === 443;
  }
  if (target === 'http-filtered.example.com') {
    return false;
  }
  // default: web ports open
  return port === 80 || port === 443;
}

function mockHttpPath(
  target: string,
  urlPath: string,
): { status: number; server: string } {
  if (target === 'silent.example.com') return { status: 0, server: 'none' };
  if (target === 'open-no-http.example.com') return { status: 0, server: 'none' };
  if (target === 'http-filtered.example.com') {
    return { status: urlPath === '/' ? 200 : 404, server: 'mock-edge' };
  }
  if (urlPath === '/wp-admin') return { status: 302, server: 'mock' };
  if (urlPath === '/.well-known/security.txt') return { status: 200, server: 'mock' };
  return { status: 200, server: 'mock' };
}
