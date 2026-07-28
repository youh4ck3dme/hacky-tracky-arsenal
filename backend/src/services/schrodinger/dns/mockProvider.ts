import type { VantageFinding } from '../../../types/schrodinger.js';
import { computeConsistencyScore, isSplitHorizon } from './consistency.js';
import { loadResolverList } from './loadResolvers.js';
import { sampleResolvers } from './pool.js';
import type {
  DnsProvider,
  DnsScanOptions,
  DnsScanOutcome,
  ResolverAnswer,
} from './types.js';
import { countStates } from './types.js';

/**
 * Deterministic DNS vantage for CI / dig-missing / SCHRODINGER_DNS_MODE=mock.
 * Known lab fixtures:
 *  - example.com → consistent public A
 *  - split.lab.local / quantum.example.com → split-horizon
 *  - silent.example.com → no answers
 */
export class MockDnsProvider implements DnsProvider {
  readonly id = 'mock' as const;

  async scan(target: string, options: DnsScanOptions): Promise<DnsScanOutcome> {
    const all = loadResolverList(options.resolversPath);
    const resolvers = sampleResolvers(
      all.length > 0 ? all : ['1.1.1.1', '8.8.8.8', '9.9.9.9'],
      Math.min(options.sampleSize, Math.max(all.length, 3)),
    );

    const answers = buildMockAnswers(target, resolvers);
    for (let i = 0; i < answers.length; i++) {
      options.onProgress?.(i + 1, answers.length, answers[i].resolver);
    }

    return toOutcome(target, resolvers, answers);
  }
}

function buildMockAnswers(target: string, resolvers: string[]): ResolverAnswer[] {
  const t = target.toLowerCase();

  if (t === 'silent.example.com' || t === 'down.lab.local') {
    return resolvers.map((resolver) => ({
      resolver,
      ok: false,
      records: [],
      aRecords: [],
      error: 'timeout / no answer',
      latencyMs: 1,
    }));
  }

  if (
    t === 'split.lab.local' ||
    t === 'quantum.example.com' ||
    t.startsWith('split.')
  ) {
    return resolvers.map((resolver, i) => {
      const a = i % 2 === 0 ? ['93.184.216.34'] : ['104.16.1.1'];
      return {
        resolver,
        ok: true,
        aRecords: a,
        records: [
          { type: 'A' as const, values: a },
          { type: 'AAAA' as const, values: i % 2 === 0 ? ['2606:2800:220:1:248:1893:25c8:1946'] : [] },
          { type: 'NS' as const, values: ['a.iana-servers.net', 'b.iana-servers.net'] },
          { type: 'MX' as const, values: ['0 .'] },
          { type: 'TXT' as const, values: ['v=spf1 -all'] },
        ],
        latencyMs: 1,
      };
    });
  }

  // Default: consistent example.com-like answers
  const a = t === 'scanme.nmap.org' ? ['45.33.32.156'] : ['93.184.216.34'];
  return resolvers.map((resolver) => ({
    resolver,
    ok: true,
    aRecords: a,
    records: [
      { type: 'A' as const, values: a },
      { type: 'AAAA' as const, values: ['2606:2800:220:1:248:1893:25c8:1946'] },
      { type: 'NS' as const, values: ['a.iana-servers.net', 'b.iana-servers.net'] },
      { type: 'MX' as const, values: ['0 .'] },
      { type: 'TXT' as const, values: ['v=spf1 -all'] },
      { type: 'CNAME' as const, values: [] },
    ],
    latencyMs: 1,
  }));
}

function toOutcome(
  target: string,
  resolvers: string[],
  answers: ResolverAnswer[],
): DnsScanOutcome {
  const findings: VantageFinding[] = [];
  const { score, uniqueASets, successCount } = computeConsistencyScore(
    answers,
    resolvers.length,
  );

  findings.push({
    id: 'dns-consistency',
    label: 'Consistency score',
    detail: `${score}/100 · ${successCount}/${resolvers.length} odpovedí · ${uniqueASets} distinct A-set(s) · mock`,
    state: score >= 70 ? 'collapsed' : score > 0 ? 'quantum' : 'absent',
    vantage: 'dns',
  });

  if (isSplitHorizon(uniqueASets, successCount)) {
    findings.push({
      id: 'dns-quantum-split',
      label: 'DNS split-horizon',
      detail: `${uniqueASets} rôzne A-record sety naprieč ${successCount} resolvermi (mock)`,
      state: 'quantum',
      vantage: 'dns',
      severity: 'high',
    });
  }

  const multi = 'AAAA · NS · MX · TXT (mock multi-record)';
  findings.push({
    id: 'dns-multi-records',
    label: 'Multi-record (best-effort)',
    detail: multi,
    state: 'collapsed',
    vantage: 'dns',
  });

  for (const a of answers) {
    if (a.ok && a.aRecords.length > 0) {
      findings.push({
        id: `dns-${a.resolver}`,
        label: a.resolver,
        detail: a.aRecords.join(', '),
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

  const resolvedIps = [
    ...new Set(answers.flatMap((a) => a.aRecords)),
  ];

  const summary =
    uniqueASets >= 2
      ? `Quantum DNS (mock): ${uniqueASets} distinct A-sets · consistency ${score}/100`
      : successCount > 0
        ? `Collapsed DNS (mock): consistency ${score}/100`
        : 'No DNS answers (mock silent target)';

  return {
    provider: 'mock',
    resolvedIps,
    notices: ['DNS beží v mock režime (dig chýba alebo SCHRODINGER_DNS_MODE/SCAN_MODE=mock).'],
    vantage: {
      id: 'dns',
      name: `DNS Resolvers (${resolvers.length})`,
      findings,
      summary,
      counts: countStates(findings),
      score,
      meta: {
        provider: 'mock',
        target,
        sampleSize: resolvers.length,
        consistencyScore: score,
        uniqueASets,
        successCount,
      },
    },
  };
}
