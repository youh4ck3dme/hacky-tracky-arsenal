import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config.js';
import { ConcurrencyLimiter } from '../../schrodinger/guardrails.js';
import { getAuditLog } from '../../schrodinger/auditLog.js';
import type {
  ScanProgress,
  SchrodingerListener,
  SchrodingerScan,
  VantageResult,
} from '../../types/schrodinger.js';
import { validateAndAuthorizeTarget } from './allowlist.js';
import { enrichWithDoh } from './dns/doh.js';
import { createDnsProvider } from './dns/factory.js';
import { isVantageEnabled, loadSchrodingerFlags, type SchrodingerFlags } from './flags.js';
import { probeNetWeb } from './probes/netweb.js';
import { probeUserAgents } from './probes/userAgent.js';
import {
  classifyMatrixWithRules,
  defaultRulesPath,
  loadRules,
  type SchrodingerRule,
} from './rules/engine.js';
import { ScanStore } from './scanStore.js';
import { assertSafeConnectTargets, SsrfBlockedError } from './ssrf.js';
import { scanTimeVantage } from './timeVantage.js';

class SchrodingerScannerService {
  private listeners = new Map<string, Set<SchrodingerListener>>();
  private readonly store: ScanStore;
  private readonly flags: SchrodingerFlags;
  private readonly rules: SchrodingerRule[];
  private readonly concurrency: ConcurrencyLimiter;
  /** Active AbortControllers keyed by scanId — enables cancel. */
  private readonly abortControllers = new Map<string, AbortController>();
  /** SSE event counter per scan — supports Last-Event-ID reconnect. */
  private readonly eventCounters = new Map<string, number>();

  constructor() {
    this.store = new ScanStore(config.scansDataPath);
    this.flags = loadSchrodingerFlags(config.arsenalRoot);
    this.concurrency = new ConcurrencyLimiter(config.schrodinger.maxConcurrent);
    const rulesPath = this.flags.rulesPath ?? defaultRulesPath(config.arsenalRoot);
    try {
      this.rules = loadRules(rulesPath).rules;
    } catch {
      this.rules = [];
    }
  }

  /** Exposed for unit tests. */
  validateTarget(target: string): string {
    return validateAndAuthorizeTarget(target, this.flags);
  }

  getFlags(): SchrodingerFlags {
    return this.flags;
  }

  getScan(id: string): SchrodingerScan | undefined {
    return this.store.get(id);
  }

  listScans(limit = 20): SchrodingerScan[] {
    return this.store.list(limit);
  }

  subscribe(scanId: string, listener: SchrodingerListener): () => void {
    if (!this.listeners.has(scanId)) {
      this.listeners.set(scanId, new Set());
    }
    this.listeners.get(scanId)!.add(listener);

    const scan = this.store.get(scanId);
    if (scan) {
      for (const v of scan.vantages) {
        listener('vantage', v);
      }
      if (scan.timeline.length > 0) {
        listener('timeline', scan.timeline);
      }
      for (const f of scan.matrix) {
        listener('finding', f);
      }
      if (
        scan.status === 'completed' ||
        scan.status === 'failed' ||
        scan.status === 'cancelled'
      ) {
        listener('done', {
          status: scan.status,
          error: scan.error,
          risk_score: scan.risk_score,
          notices: scan.notices,
        });
      }
    }

    return () => this.listeners.get(scanId)?.delete(listener);
  }

  /** Get the next event ID for a scan (monotonically increasing). */
  nextEventId(scanId: string): number {
    const current = this.eventCounters.get(scanId) ?? 0;
    const next = current + 1;
    this.eventCounters.set(scanId, next);
    return next;
  }

  /** Get the current event counter for Last-Event-ID replay support. */
  getEventCount(scanId: string): number {
    return this.eventCounters.get(scanId) ?? 0;
  }

  private emit(scanId: string, event: string, data: unknown): void {
    for (const listener of this.listeners.get(scanId) ?? []) {
      listener(event, data);
    }
  }

  private emitProgress(scanId: string, progress: ScanProgress): void {
    this.emit(scanId, 'progress', progress);
  }

  private save(scan: SchrodingerScan): void {
    this.store.set(scan);
  }

  async createScan(target: string): Promise<SchrodingerScan> {
    const normalized = this.validateTarget(target);

    // Concurrency guard
    let releaseConcurrency: (() => void) | null = null;
    try {
      releaseConcurrency = this.concurrency.acquire();
    } catch {
      throw new Error(`Max concurrent scans (${this.concurrency.limit}) exceeded. Try again later.`);
    }

    const { provider } = await createDnsProvider(this.flags.dnsMode);

    const scan: SchrodingerScan = {
      id: uuidv4(),
      target: normalized,
      status: 'queued',
      createdAt: new Date().toISOString(),
      finishedAt: null,
      vantages: [],
      matrix: [],
      timeline: [],
      error: null,
      risk_score: null,
      notices: [],
      mode: {
        scanMode: this.flags.scanMode,
        dnsMode: this.flags.dnsMode,
        dnsProvider: provider.id,
        dohEnabled: this.flags.dohEnabled,
        portProfile: this.flags.portProfile,
        enabledVantages: [...this.flags.enabledVantages],
      },
    };

    scan.status = 'running';
    this.save(scan);

    // Audit
    getAuditLog().append('scan.created', 'api', { scanId: scan.id }, {
      target: normalized,
      scanId: scan.id,
    });

    // Set up abort controller for cancel support
    const abortController = new AbortController();
    this.abortControllers.set(scan.id, abortController);

    // Optional start delay (tests set SCHRODINGER_SCAN_START_DELAY_MS so DELETE
    // can land while status is still running — mock scans otherwise finish in <1ms).
    const startDelayMs = Number(process.env.SCHRODINGER_SCAN_START_DELAY_MS ?? 0);
    if (startDelayMs > 0) {
      setTimeout(() => {
        void this.runScan(scan.id, abortController.signal, releaseConcurrency!);
      }, startDelayMs);
    } else {
      void this.runScan(scan.id, abortController.signal, releaseConcurrency);
    }
    return scan;
  }

  /**
   * Cancel a running scan. The AbortSignal propagates to all in-flight
   * fetch/dig calls. Returns the updated scan or undefined if not found.
   */
  cancelScan(scanId: string): SchrodingerScan | undefined {
    const scan = this.store.get(scanId);
    if (!scan) return undefined;
    if (scan.status !== 'running' && scan.status !== 'queued') return scan;

    // Signal abort to running vantage probes
    const controller = this.abortControllers.get(scanId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(scanId);
    }

    scan.status = 'cancelled';
    scan.finishedAt = new Date().toISOString();
    scan.error = 'Scan cancelled by user';
    this.save(scan);

    this.emit(scanId, 'done', {
      status: 'cancelled',
      error: scan.error,
      risk_score: null,
      notices: scan.notices,
    });

    // Audit
    getAuditLog().append('scan.cancelled', 'api', { scanId }, {
      target: scan.target,
      scanId,
    });

    return scan;
  }

  private isTerminal(status: SchrodingerScan['status']): boolean {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
  }

  private async runScan(
    scanId: string,
    signal: AbortSignal,
    releaseConcurrency: () => void,
  ): Promise<void> {
    const scan = this.store.get(scanId);
    if (!scan) { releaseConcurrency(); return; }

    // cancelScan may have finalized before work starts
    if (this.isTerminal(scan.status)) {
      releaseConcurrency();
      return;
    }

    if (scan.status !== 'running') {
      scan.status = 'running';
      this.save(scan);
    }

    const mock = this.flags.scanMode === 'mock';
    const notices: string[] = [];
    let resolvedIps: string[] = [];

    try {
      if (signal.aborted || (scan.status as string) === 'cancelled') {
        throw new Error('Scan cancelled');
      }

      if (isVantageEnabled(this.flags, 'dns')) {
        const dns = await this.scanDns(scan.target, scanId, notices);
        if (signal.aborted) throw new Error('Scan cancelled');
        resolvedIps = dns.resolvedIps;
        scan.vantages.push(dns.vantage);
        this.save(scan);
        this.emit(scanId, 'vantage', dns.vantage);
      }

      // SSRF re-check after DNS, before UA / NetWeb connect
      if (!mock && resolvedIps.length > 0) {
        try {
          resolvedIps = assertSafeConnectTargets(resolvedIps);
        } catch (err) {
          if (err instanceof SsrfBlockedError) {
            notices.push(err.message);
            scan.notices = notices;
            scan.error = err.message;
            scan.status = 'failed';
            scan.finishedAt = new Date().toISOString();
            this.save(scan);
            this.emit(scanId, 'done', {
              status: 'failed',
              error: scan.error,
              risk_score: null,
              notices,
            });
            getAuditLog().append('ssrf.blocked', 'system', {
              ip: (err as SsrfBlockedError).ip,
            }, { target: scan.target, scanId });
            return;
          }
          throw err;
        }
      }

      if (signal.aborted) throw new Error('Scan cancelled');

      if (isVantageEnabled(this.flags, 'ua')) {
        const ua = await this.scanUa(scan.target, scanId, mock, resolvedIps);
        if (signal.aborted) throw new Error('Scan cancelled');
        scan.vantages.push(ua);
        this.save(scan);
        this.emit(scanId, 'vantage', ua);
      }

      if (signal.aborted) throw new Error('Scan cancelled');

      if (isVantageEnabled(this.flags, 'netweb')) {
        const netweb = await this.scanNetWeb(scan.target, scanId, mock, resolvedIps);
        if (signal.aborted) throw new Error('Scan cancelled');
        scan.vantages.push(netweb);
        this.save(scan);
        this.emit(scanId, 'vantage', netweb);
      }

      if (signal.aborted) throw new Error('Scan cancelled');

      if (isVantageEnabled(this.flags, 'time')) {
        const time = await this.scanTime(scan.target, scanId, mock);
        if (signal.aborted) throw new Error('Scan cancelled');
        scan.vantages.push(time.vantage);
        scan.timeline = time.timeline;
        this.save(scan);
        this.emit(scanId, 'vantage', time.vantage);
        this.emit(scanId, 'timeline', time.timeline);
      }

      this.emitProgress(scanId, {
        vantage: 'classify',
        label: 'Quantum Matrix',
        current: 1,
        total: 1,
      });

      const classified = classifyMatrixWithRules(scan.vantages, this.rules);
      scan.matrix = classified.findings;
      scan.risk_score = classified.risk_score;
      for (const finding of scan.matrix) {
        this.emit(scanId, 'finding', finding);
      }

      // cancelScan may have won the race — never clobber terminal cancelled/failed
      if (this.isTerminal(scan.status) || signal.aborted) {
        if ((scan.status as string) === 'cancelled' || signal.aborted) {
          this.finalizeCancelled(scan, scanId, notices);
        }
        return;
      }

      scan.notices = notices;
      scan.status = 'completed';
      scan.finishedAt = new Date().toISOString();
      this.save(scan);
      this.emitProgress(scanId, {
        vantage: 'done',
        label: 'done',
        current: scan.vantages.length,
        total: scan.vantages.length,
      });
      this.emit(scanId, 'done', {
        status: 'completed',
        error: null,
        risk_score: scan.risk_score,
        notices: scan.notices,
      });

      // Audit
      getAuditLog().append('scan.completed', 'system', {
        risk_score: scan.risk_score,
        vantages: scan.vantages.length,
      }, { target: scan.target, scanId });
    } catch (err) {
      // cancelScan already set cancelled + emitted done — do not overwrite
      if ((scan.status as string) === 'cancelled') {
        return;
      }

      const msg = err instanceof Error ? err.message : 'Scan failed';
      const wasCancel =
        signal.aborted || /cancelled/i.test(msg);

      if (wasCancel) {
        this.finalizeCancelled(scan, scanId, notices);
        return;
      }

      scan.status = 'failed';
      scan.error = msg;
      scan.notices = notices;
      scan.finishedAt = new Date().toISOString();
      this.save(scan);
      this.emit(scanId, 'done', {
        status: 'failed',
        error: scan.error,
        risk_score: null,
        notices,
      });

      // Audit
      getAuditLog().append('scan.failed', 'system', {
        error: scan.error,
      }, { target: scan.target, scanId });
    } finally {
      this.abortControllers.delete(scanId);
      releaseConcurrency();
    }
  }

  /** Idempotent cancel finalization (cancelScan and abort path share this). */
  private finalizeCancelled(
    scan: SchrodingerScan,
    scanId: string,
    notices: string[],
  ): void {
    if (scan.status === 'cancelled' && scan.finishedAt) {
      // cancelScan already persisted + emitted
      return;
    }
    scan.status = 'cancelled';
    scan.error = scan.error ?? 'Scan cancelled by user';
    scan.notices = notices.length > 0 ? notices : scan.notices;
    scan.finishedAt = scan.finishedAt ?? new Date().toISOString();
    this.save(scan);
    this.emit(scanId, 'done', {
      status: 'cancelled',
      error: scan.error,
      risk_score: null,
      notices: scan.notices,
    });
    getAuditLog().append('scan.cancelled', 'system', { scanId }, {
      target: scan.target,
      scanId,
    });
  }

  private async scanDns(
    target: string,
    scanId: string,
    notices: string[],
  ): Promise<{ vantage: VantageResult; resolvedIps: string[] }> {
    const { provider, notices: providerNotices } = await createDnsProvider(
      this.flags.dnsMode,
    );
    notices.push(...providerNotices);

    const resolversPath = path.join(config.h4ckRoot, 'resolvers/resolvers.txt');
    const outcome = await provider.scan(target, {
      sampleSize: this.flags.dnsSampleSize,
      concurrency: this.flags.dnsConcurrency,
      timeoutMs: this.flags.dnsTimeoutMs,
      retries: this.flags.dnsRetries,
      resolversPath,
      onProgress: (current, total, label) => {
        this.emitProgress(scanId, {
          vantage: 'dns',
          label,
          current,
          total,
        });
      },
    });
    notices.push(...outcome.notices);

    // Optional DoH enrichment (second opinion only)
    if (this.flags.dohEnabled && this.flags.scanMode !== 'mock') {
      try {
        const doh = await enrichWithDoh(target);
        const detail = doh
          .map((d) =>
            d.aRecords.length > 0
              ? `${d.provider}: ${d.aRecords.join(', ')}`
              : `${d.provider}: ${d.error ?? 'empty'}`,
          )
          .join(' · ');
        outcome.vantage.findings.unshift({
          id: 'dns-doh-enrichment',
          label: 'DoH second opinion',
          detail,
          state: 'collapsed',
          vantage: 'dns',
        });
        outcome.vantage.meta = {
          ...outcome.vantage.meta,
          doh: doh.map((d) => ({
            provider: d.provider,
            a: d.aRecords,
            error: d.error,
          })),
        };
      } catch {
        notices.push('DoH enrichment zlyhalo (ignorované — dig/mock ostáva primárny).');
      }
    }

    // Update mode.dnsProvider on the scan record
    const scanRec = this.store.get(scanId);
    if (scanRec?.mode) {
      scanRec.mode.dnsProvider = outcome.provider;
      this.save(scanRec);
    }

    return { vantage: outcome.vantage, resolvedIps: outcome.resolvedIps };
  }

  private async scanUa(
    target: string,
    scanId: string,
    mock: boolean,
    resolvedIps: string[],
  ): Promise<VantageResult> {
    return probeUserAgents(target, {
      paths: this.flags.uaPaths,
      mock,
      connectHost: resolvedIps[0],
      onProgress: (current, total, label) => {
        this.emitProgress(scanId, { vantage: 'ua', label, current, total });
      },
    });
  }

  private async scanNetWeb(
    target: string,
    scanId: string,
    mock: boolean,
    resolvedIps: string[],
  ): Promise<VantageResult> {
    return probeNetWeb(target, {
      profile: this.flags.portProfile,
      paths: this.flags.uaPaths,
      mock,
      resolvedIps,
      onProgress: (current, total, label) => {
        this.emitProgress(scanId, { vantage: 'netweb', label, current, total });
      },
    });
  }

  private async scanTime(target: string, scanId: string, mock: boolean) {
    return scanTimeVantage(target, {
      mock,
      onProgress: (current, total, label) => {
        this.emitProgress(scanId, { vantage: 'time', label, current, total });
      },
      probeHttpPath: async (t, urlPath) => {
        // lightweight live probe for ghost re-check
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        try {
          for (const scheme of ['https', 'http'] as const) {
            try {
              const res = await fetch(`${scheme}://${t}${urlPath}`, {
                signal: controller.signal,
                redirect: 'manual',
              });
              return {
                status: res.status,
                server: res.headers.get('server') ?? 'unknown',
              };
            } catch {
              continue;
            }
          }
          return { status: 0, server: 'none' };
        } finally {
          clearTimeout(timeout);
        }
      },
    });
  }
}

// Fix accidental bogus method reference — remove scan.modeNeedsUpdate
// by rewriting scanDns cleanly in a patch after write if needed.

export const schrodingerScanner = new SchrodingerScannerService();
