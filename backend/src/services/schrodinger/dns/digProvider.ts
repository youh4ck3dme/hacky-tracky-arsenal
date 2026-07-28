import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { VantageFinding } from '../../../types/schrodinger.js';
import { computeConsistencyScore, isSplitHorizon } from './consistency.js';
import { loadResolverList } from './loadResolvers.js';
import { mapPool, sampleResolvers, sleep } from './pool.js';
import type {
  DnsProvider,
  DnsRecordSet,
  DnsRecordType,
  DnsScanOptions,
  DnsScanOutcome,
  ResolverAnswer,
} from './types.js';
import { countStates } from './types.js';

const execFileAsync = promisify(execFile);

const MULTI_TYPES: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];

export class DigDnsProvider implements DnsProvider {
  readonly id = 'dig' as const;

  async scan(target: string, options: DnsScanOptions): Promise<DnsScanOutcome> {
    const all = loadResolverList(options.resolversPath);
    const resolvers = sampleResolvers(all, options.sampleSize);
    const total = resolvers.length;
    let done = 0;

    // Multi-record (best-effort) from the first few resolvers only — keeps wall time down.
    const multiResolvers = new Set(resolvers.slice(0, Math.min(3, resolvers.length)));

    const answers = await mapPool(
      resolvers,
      options.concurrency,
      async (resolver) => {
        const answer = await this.queryResolver(
          target,
          resolver,
          options,
          multiResolvers.has(resolver),
        );
        done += 1;
        options.onProgress?.(done, total, resolver);
        return answer;
      },
      { jitterMs: 40 },
    );

    return this.toOutcome(target, resolvers, answers);
  }

  private async queryResolver(
    target: string,
    resolver: string,
    options: DnsScanOptions,
    multi: boolean,
  ): Promise<ResolverAnswer> {
    const types: DnsRecordType[] = multi ? MULTI_TYPES : ['A'];
    const records: DnsRecordSet[] = [];
    let anyOk = false;
    let lastError: string | undefined;
    const started = Date.now();

    for (const type of types) {
      try {
        const values = await this.digWithRetry(target, resolver, type, options);
        if (values.length > 0) {
          records.push({ type, values });
          anyOk = true;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'dig failed';
      }
    }

    // CNAME chain best-effort: if CNAME present, resolve A via dig once more (already in multi)
    const aRecords = extractA(records);
    return {
      resolver,
      ok: anyOk || aRecords.length > 0,
      records,
      aRecords,
      error: anyOk ? undefined : lastError ?? 'timeout / no answer',
      latencyMs: Date.now() - started,
    };
  }

  private async digWithRetry(
    target: string,
    resolver: string,
    type: DnsRecordType,
    options: DnsScanOptions,
  ): Promise<string[]> {
    let lastErr: unknown;
    const tries = 1 + options.retries;
    for (let attempt = 0; attempt < tries; attempt++) {
      if (attempt > 0) {
        await sleep(50 + Math.floor(Math.random() * 100));
      }
      try {
        return await this.digOnce(target, resolver, type, options.timeoutMs);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('dig failed');
  }

  private async digOnce(
    target: string,
    resolver: string,
    type: DnsRecordType,
    timeoutMs: number,
  ): Promise<string[]> {
    const timeSec = Math.max(1, Math.ceil(timeoutMs / 1000));
    const { stdout } = await execFileAsync(
      'dig',
      [`@${resolver}`, target, type, '+short', `+time=${timeSec}`, '+tries=1'],
      { timeout: timeoutMs + 500 },
    );
    return parseDigShort(stdout, type);
  }

  private toOutcome(
    target: string,
    resolvers: string[],
    answers: ResolverAnswer[],
  ): DnsScanOutcome {
    const findings: VantageFinding[] = [];
    const { score, uniqueASets, successCount } = computeConsistencyScore(
      answers,
      resolvers.length,
    );

    for (const a of answers) {
      if (a.ok && a.aRecords.length > 0) {
        const extra = a.records
          .filter((r) => r.type !== 'A')
          .map((r) => `${r.type}=${r.values.slice(0, 3).join('|')}`)
          .join(' · ');
        findings.push({
          id: `dns-${a.resolver}`,
          label: a.resolver,
          detail: extra
            ? `A ${a.aRecords.join(', ')}${extra ? ` · ${extra}` : ''}`
            : a.aRecords.join(', '),
          state: 'collapsed',
          vantage: 'dns',
        });
      } else {
        findings.push({
          id: `dns-${a.resolver}-timeout`,
          label: a.resolver,
          detail: a.error ?? 'timeout / no answer',
          state: 'absent',
          vantage: 'dns',
        });
      }
    }

    // Aggregate multi-record summary from successful multi queries
    const multiSummary = summarizeMultiRecords(answers);
    if (multiSummary) {
      findings.unshift({
        id: 'dns-multi-records',
        label: 'Multi-record (best-effort)',
        detail: multiSummary,
        state: 'collapsed',
        vantage: 'dns',
      });
    }

    findings.unshift({
      id: 'dns-consistency',
      label: 'Consistency score',
      detail: `${score}/100 · ${successCount}/${resolvers.length} odpovedí · ${uniqueASets} distinct A-set(s)`,
      state: score >= 70 ? 'collapsed' : score > 0 ? 'quantum' : 'absent',
      vantage: 'dns',
      risk_score: score < 70 ? 100 - score : 0,
    });

    if (isSplitHorizon(uniqueASets, successCount)) {
      findings.unshift({
        id: 'dns-quantum-split',
        label: 'DNS split-horizon',
        detail: `${uniqueASets} rôzne A-record sety naprieč ${successCount} resolvermi`,
        state: 'quantum',
        vantage: 'dns',
        severity: 'high',
      });
    }

    const resolvedIps = uniquePublicCandidates(answers);
    const summary =
      uniqueASets >= 2
        ? `Quantum DNS: ${uniqueASets} distinct A-record sets · consistency ${score}/100`
        : successCount > 0
          ? `Collapsed DNS: consistency ${score}/100 (${[...new Set(answers.flatMap((a) => a.aRecords))].slice(0, 4).join(', ') || 'n/a'})`
          : 'No DNS answers from sampled resolvers';

    return {
      provider: 'dig',
      resolvedIps,
      notices: [],
      vantage: {
        id: 'dns',
        name: `DNS Resolvers (${resolvers.length})`,
        findings,
        summary,
        counts: countStates(findings),
        score,
        meta: {
          provider: 'dig',
          target,
          sampleSize: resolvers.length,
          consistencyScore: score,
          uniqueASets,
          successCount,
        },
      },
    };
  }
}

function parseDigShort(stdout: string, type: DnsRecordType): string[] {
  const lines = stdout
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  if (type === 'A') {
    return lines.filter((l) => /^\d{1,3}(\.\d{1,3}){3}$/.test(l));
  }
  if (type === 'AAAA') {
    return lines.filter((l) => l.includes(':'));
  }
  if (type === 'MX') {
    return lines.map((l) => l.replace(/^\d+\s+/, '').replace(/\.$/, ''));
  }
  // CNAME / TXT / NS — strip trailing dots, unquote TXT lightly
  return lines.map((l) => l.replace(/\.$/, '').replace(/^"|"$/g, ''));
}

function extractA(records: DnsRecordSet[]): string[] {
  const a = records.find((r) => r.type === 'A');
  return a ? [...a.values].sort() : [];
}

function summarizeMultiRecords(answers: ResolverAnswer[]): string | null {
  const bag = new Map<string, Set<string>>();
  for (const a of answers) {
    for (const r of a.records) {
      if (r.type === 'A') continue;
      if (!bag.has(r.type)) bag.set(r.type, new Set());
      for (const v of r.values.slice(0, 5)) bag.get(r.type)!.add(v);
    }
  }
  if (bag.size === 0) return null;
  return [...bag.entries()]
    .map(([t, vals]) => `${t}: ${[...vals].slice(0, 4).join(', ')}`)
    .join(' · ');
}

function uniquePublicCandidates(answers: ResolverAnswer[]): string[] {
  const set = new Set<string>();
  for (const a of answers) {
    for (const ip of a.aRecords) set.add(ip);
    for (const r of a.records) {
      if (r.type === 'AAAA') {
        for (const ip of r.values) set.add(ip);
      }
    }
  }
  return [...set];
}

/** True if `dig` binary is available on PATH. */
export async function isDigAvailable(): Promise<boolean> {
  try {
    await execFileAsync('dig', ['-v'], { timeout: 2000 });
    return true;
  } catch (err) {
    // dig -v writes version to stderr and may exit non-zero on some builds;
    // treat "ENOENT" as missing, anything else as present.
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return false;
    // If dig exists, -v often exits 0; if it ran at all without ENOENT, OK.
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('ENOENT')) return false;
    return true;
  }
}
