import { execFile } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { promisify } from 'node:util';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import type {
  FindingState,
  ScanProgress,
  SchrodingerListener,
  SchrodingerScan,
  VantageFinding,
  VantageId,
  VantageResult,
} from '../types/schrodinger.js';
import { classifyMatrix } from './schrodingerMatrix.js';

const execFileAsync = promisify(execFile);

const TARGET_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const DNS_SAMPLE_SIZE = 30;
const PORTS = [80, 443, 22, 8080, 8443];
const WEB_PATHS = ['/', '/wp-admin', '/robots.txt'];
interface UaFetchResult {
  status: number;
  server: string;
  length: number;
  title: string;
}

const USER_AGENTS = [
  { id: 'chrome', label: 'Chrome', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  { id: 'googlebot', label: 'Googlebot', value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
  { id: 'curl', label: 'curl', value: 'curl/8.0' },
];

class SchrodingerScannerService {
  private scans = new Map<string, SchrodingerScan>();
  private listeners = new Map<string, Set<SchrodingerListener>>();

  validateTarget(target: string): string {
    const trimmed = target.trim().toLowerCase();
    if (!TARGET_REGEX.test(trimmed)) {
      throw new Error('Invalid domain. Use format: example.com');
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(trimmed)) {
      throw new Error('IP addresses not supported in MVP');
    }
    return trimmed;
  }

  getScan(id: string): SchrodingerScan | undefined {
    return this.scans.get(id);
  }

  subscribe(scanId: string, listener: SchrodingerListener): () => void {
    if (!this.listeners.has(scanId)) {
      this.listeners.set(scanId, new Set());
    }
    this.listeners.get(scanId)!.add(listener);

    const scan = this.scans.get(scanId);
    if (scan) {
      for (const v of scan.vantages) {
        listener('vantage', v);
      }
      for (const f of scan.matrix) {
        listener('finding', f);
      }
      if (scan.status === 'completed' || scan.status === 'failed') {
        listener('done', { status: scan.status, error: scan.error });
      }
    }

    return () => this.listeners.get(scanId)?.delete(listener);
  }

  private emit(scanId: string, event: string, data: unknown): void {
    for (const listener of this.listeners.get(scanId) ?? []) {
      listener(event, data);
    }
  }

  private emitProgress(scanId: string, progress: ScanProgress): void {
    this.emit(scanId, 'progress', progress);
  }

  async createScan(target: string): Promise<SchrodingerScan> {
    const normalized = this.validateTarget(target);
    const scan: SchrodingerScan = {
      id: uuidv4(),
      target: normalized,
      status: 'queued',
      createdAt: new Date().toISOString(),
      finishedAt: null,
      vantages: [],
      matrix: [],
      error: null,
    };

    this.scans.set(scan.id, scan);
    if (this.scans.size > 10) {
      const oldest = [...this.scans.entries()].sort((a, b) =>
        a[1].createdAt.localeCompare(b[1].createdAt),
      )[0];
      if (oldest) this.scans.delete(oldest[0]);
    }

    this.runScan(scan.id);
    return scan;
  }

  private async runScan(scanId: string): Promise<void> {
    const scan = this.scans.get(scanId);
    if (!scan) return;

    scan.status = 'running';

    try {
      const dns = await this.scanDns(scan.target, scanId);
      scan.vantages.push(dns);
      this.emit(scanId, 'vantage', dns);

      const ua = await this.scanUserAgents(scan.target, scanId);
      scan.vantages.push(ua);
      this.emit(scanId, 'vantage', ua);

      const netweb = await this.scanNetWeb(scan.target, scanId);
      scan.vantages.push(netweb);
      this.emit(scanId, 'vantage', netweb);

      scan.matrix = classifyMatrix(scan.vantages);
      for (const finding of scan.matrix) {
        this.emit(scanId, 'finding', finding);
      }

      scan.status = 'completed';
      scan.finishedAt = new Date().toISOString();
      this.emitProgress(scanId, { vantage: 'done', label: 'done', current: 3, total: 3 });
      this.emit(scanId, 'done', { status: 'completed', error: null });
    } catch (err) {
      scan.status = 'failed';
      scan.error = err instanceof Error ? err.message : 'Scan failed';
      scan.finishedAt = new Date().toISOString();
      this.emit(scanId, 'done', { status: 'failed', error: scan.error });
    }
  }

  private loadResolvers(): string[] {
    const resolversPath = path.join(config.h4ckRoot, 'resolvers/resolvers.txt');
    if (!fs.existsSync(resolversPath)) {
      return ['8.8.8.8', '1.1.1.1', '9.9.9.9'];
    }
    const lines = fs.readFileSync(resolversPath, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^\d+\.\d+\.\d+\.\d+$/.test(l));
    const shuffled = [...lines].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, DNS_SAMPLE_SIZE);
  }

  private async scanDns(target: string, scanId: string): Promise<VantageResult> {
    const resolvers = this.loadResolvers();
    const findings: VantageFinding[] = [];
    const answers = new Map<string, string[]>();

    for (let i = 0; i < resolvers.length; i++) {
      const resolver = resolvers[i];
      this.emitProgress(scanId, {
        vantage: 'dns',
        label: resolver,
        current: i + 1,
        total: resolvers.length,
      });

      try {
        const { stdout } = await execFileAsync('dig', [
          `@${resolver}`, target, 'A', '+short', '+time=2', '+tries=1',
        ], { timeout: 3000 });
        const ips = stdout.trim().split('\n').filter((l) => /^\d+\.\d+\.\d+\.\d+$/.test(l.trim()));
        if (ips.length > 0) {
          answers.set(resolver, ips);
          findings.push({
            id: `dns-${resolver}`,
            label: resolver,
            detail: ips.join(', '),
            state: 'collapsed',
            vantage: 'dns',
          });
        }
      } catch {
        findings.push({
          id: `dns-${resolver}-timeout`,
          label: resolver,
          detail: 'timeout / no answer',
          state: 'absent',
          vantage: 'dns',
        });
      }
    }

    const uniqueIpSets = new Set(
      [...answers.values()].map((ips) => [...ips].sort().join(',')),
    );

    const summary =
      uniqueIpSets.size >= 2
        ? `Quantum DNS: ${uniqueIpSets.size} distinct A-record sets across ${answers.size} resolvers`
        : answers.size > 0
          ? `Collapsed DNS: consistent resolution (${[...uniqueIpSets][0] ?? 'n/a'})`
          : 'No DNS answers from sampled resolvers';

    if (uniqueIpSets.size >= 2) {
      findings.unshift({
        id: 'dns-quantum-split',
        label: 'DNS split-horizon',
        detail: `${uniqueIpSets.size} different answer sets detected`,
        state: 'quantum',
        vantage: 'dns',
      });
    }

    return { id: 'dns', name: `DNS Resolvers (${resolvers.length})`, findings, summary };
  }

  private async fetchWithUa(target: string, ua: string): Promise<UaFetchResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`https://${target}/`, {
        headers: { 'User-Agent': ua },
        signal: controller.signal,
        redirect: 'follow',
      });
      const text = await res.text();
      const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
      return {
        status: res.status,
        server: res.headers.get('server') ?? 'unknown',
        length: text.length,
        title: titleMatch?.[1]?.trim() ?? '',
      };
    } catch {
      try {
        const res = await fetch(`http://${target}/`, {
          headers: { 'User-Agent': ua },
          signal: controller.signal,
          redirect: 'follow',
        });
        const text = await res.text();
        const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
        return {
          status: res.status,
          server: res.headers.get('server') ?? 'unknown',
          length: text.length,
          title: titleMatch?.[1]?.trim() ?? '',
        };
      } catch {
        return { status: 0, server: 'none', length: 0, title: '' };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private async scanUserAgents(target: string, scanId: string): Promise<VantageResult> {
    const findings: VantageFinding[] = [];
    const results: Array<{ id: string; label: string; data: UaFetchResult }> = [];

    for (let i = 0; i < USER_AGENTS.length; i++) {
      const ua = USER_AGENTS[i];
      this.emitProgress(scanId, {
        vantage: 'ua',
        label: ua.label,
        current: i + 1,
        total: USER_AGENTS.length,
      });
      const data = await this.fetchWithUa(target, ua.value);
      results.push({ id: ua.id, label: ua.label, data });
      findings.push({
        id: `ua-${ua.id}`,
        label: ua.label,
        detail: `HTTP ${data.status} · ${data.server} · ${data.length}B · "${data.title}"`,
        state: data.status > 0 ? 'collapsed' : 'absent',
        vantage: 'ua',
      });
    }

    const statuses = new Set(results.map((r) => r.data.status));
    const lengths = results.filter((r) => r.data.length > 0).map((r) => r.data.length);
    const lengthSpread =
      lengths.length >= 2
        ? (Math.max(...lengths) - Math.min(...lengths)) / Math.max(...lengths)
        : 0;

    const isQuantum = statuses.size > 1 || lengthSpread > 0.1;
    if (isQuantum) {
      findings.unshift({
        id: 'ua-quantum-diff',
        label: 'UA response divergence',
        detail: `${statuses.size} distinct status codes; body length spread ${Math.round(lengthSpread * 100)}%`,
        state: 'quantum',
        vantage: 'ua',
      });
    }

    const summary = isQuantum
      ? 'Quantum UA: different responses per User-Agent'
      : results.some((r) => r.data.status > 0)
        ? 'Collapsed UA: consistent HTTP fingerprint'
        : 'No HTTP response from any User-Agent';

    return { id: 'ua', name: 'User-Agent HTTP (3)', findings, summary };
  }

  private probePort(host: string, port: number): Promise<boolean> {
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

  private async probeHttpPath(target: string, urlPath: string): Promise<{
    status: number;
    server: string;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      for (const scheme of ['https', 'http']) {
        try {
          const res = await fetch(`${scheme}://${target}${urlPath}`, {
            signal: controller.signal,
            redirect: 'manual',
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

  private async scanNetWeb(target: string, scanId: string): Promise<VantageResult> {
    const findings: VantageFinding[] = [];
    const openPorts: number[] = [];

    for (let i = 0; i < PORTS.length; i++) {
      const port = PORTS[i];
      this.emitProgress(scanId, {
        vantage: 'netweb',
        label: `port ${port}`,
        current: i + 1,
        total: PORTS.length + WEB_PATHS.length,
      });
      const open = await this.probePort(target, port);
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
    for (let i = 0; i < WEB_PATHS.length; i++) {
      const urlPath = WEB_PATHS[i];
      this.emitProgress(scanId, {
        vantage: 'netweb',
        label: urlPath,
        current: PORTS.length + i + 1,
        total: PORTS.length + WEB_PATHS.length,
      });
      const result = await this.probeHttpPath(target, urlPath);
      webResults.push({ path: urlPath, ...result });
      findings.push({
        id: `web-path-${urlPath}`,
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
      });
    } else if (!port443open && !port80open && httpWorks) {
      findings.unshift({
        id: 'netweb-quantum-http-port',
        label: 'HTTP responds, ports filtered',
        detail: 'HTTP works but TCP probes show closed/filtered',
        state: 'quantum',
        vantage: 'netweb',
      });
    }

    const hasQuantum = findings.some((f) => f.state === 'quantum');
    const summary = hasQuantum
      ? 'Quantum Net/Web: network and application layers disagree'
      : openPorts.length > 0 || httpWorks
        ? 'Collapsed Net/Web: consistent network + HTTP picture'
        : 'Target appears silent on network and web probes';

    return { id: 'netweb', name: 'Network vs Web', findings, summary };
  }
}

export const schrodingerScanner = new SchrodingerScannerService();
