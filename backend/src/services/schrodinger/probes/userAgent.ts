import { createHash } from 'node:crypto';
import type { VantageFinding, VantageResult } from '../../../types/schrodinger.js';
import { countStates } from '../dns/types.js';

export interface UaClient {
  id: string;
  label: string;
  value: string;
}

export const DEFAULT_UA_CLIENTS: UaClient[] = [
  {
    id: 'chrome',
    label: 'Chrome',
    value:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  {
    id: 'chrome-mobile',
    label: 'Chrome mobile',
    value:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  },
  {
    id: 'googlebot',
    label: 'Googlebot',
    value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
  {
    id: 'curl',
    label: 'curl',
    value: 'curl/8.0',
  },
  {
    id: 'safari-ios',
    label: 'Safari iOS',
    value:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
];

export interface UaPathResult {
  path: string;
  status: number;
  redirects: number;
  server: string;
  length: number;
  title: string;
  /** Truncated body hash (sha256 first 16 hex) — never raw cookies. */
  bodyHash: string;
}

export interface UaClientResult {
  client: UaClient;
  paths: UaPathResult[];
}

export interface UaProbeOptions {
  paths: string[];
  mock: boolean;
  connectHost?: string;
  onProgress?: (current: number, total: number, label: string) => void;
}

const BODY_CAP = 64_000;

export async function probeUserAgents(
  target: string,
  options: UaProbeOptions,
): Promise<VantageResult> {
  const clients = DEFAULT_UA_CLIENTS;
  const paths = options.paths.length > 0 ? options.paths : ['/'];
  const total = clients.length * paths.length;
  let step = 0;
  const results: UaClientResult[] = [];
  const findings: VantageFinding[] = [];

  for (const client of clients) {
    const pathResults: UaPathResult[] = [];
    for (const path of paths) {
      step += 1;
      options.onProgress?.(step, total, `${client.label} ${path}`);
      const data = options.mock
        ? mockUaFetch(target, client.id, path)
        : await fetchWithUa(target, client.value, path, options.connectHost);
      pathResults.push(data);
      findings.push({
        id: `ua-${client.id}-${path.replace(/\W+/g, '_') || 'root'}`,
        label: `${client.label} ${path}`,
        detail: formatUaDetail(data),
        state: data.status > 0 ? 'collapsed' : 'absent',
        vantage: 'ua',
      });
    }
    results.push({ client, paths: pathResults });
  }

  // Divergence: status or body hash across clients on same path
  const quantumReasons: string[] = [];
  for (const path of paths) {
    const atPath = results.map((r) => ({
      id: r.client.id,
      row: r.paths.find((p) => p.path === path),
    }));
    const statuses = new Set(
      atPath.map((x) => x.row?.status ?? 0).filter((s) => s > 0),
    );
    const hashes = new Set(
      atPath.map((x) => x.row?.bodyHash ?? '').filter((h) => h && h !== 'empty'),
    );
    if (statuses.size > 1) {
      quantumReasons.push(`${path}: ${statuses.size} status codes`);
    }
    if (hashes.size > 1) {
      quantumReasons.push(`${path}: ${hashes.size} body hashes`);
    }
  }

  const isQuantum = quantumReasons.length > 0;
  if (isQuantum) {
    findings.unshift({
      id: 'ua-quantum-diff',
      label: 'UA response divergence',
      detail: quantumReasons.join(' · '),
      state: 'quantum',
      vantage: 'ua',
      severity: 'high',
    });
  }

  const anyOk = results.some((r) => r.paths.some((p) => p.status > 0));
  const summary = isQuantum
    ? 'Quantum UA: different responses per User-Agent'
    : anyOk
      ? 'Collapsed UA: consistent HTTP fingerprint'
      : 'No HTTP response from any User-Agent';

  const score = isQuantum ? 40 : anyOk ? 90 : 0;

  return {
    id: 'ua',
    name: `User-Agent HTTP (${clients.length})`,
    findings,
    summary,
    counts: countStates(findings),
    score,
    meta: {
      clients: clients.map((c) => c.id),
      paths,
      quantum: isQuantum,
    },
  };
}

function formatUaDetail(data: UaPathResult): string {
  if (data.status <= 0) return 'no response';
  const title = data.title ? ` · "${truncate(data.title, 40)}"` : '';
  const redir = data.redirects > 0 ? ` · ${data.redirects} redir` : '';
  return `HTTP ${data.status}${redir} · ${data.server} · ${data.length}B · hash ${data.bodyHash}${title}`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

function hashBody(text: string): string {
  if (!text) return 'empty';
  return createHash('sha256').update(text.slice(0, BODY_CAP)).digest('hex').slice(0, 16);
}

async function fetchWithUa(
  target: string,
  ua: string,
  urlPath: string,
  connectHost?: string,
): Promise<UaPathResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const hostHeader = target;
  const connect = connectHost ?? target;

  try {
    for (const scheme of ['https', 'http'] as const) {
      try {
        let redirects = 0;
        let url = `${scheme}://${connect}${urlPath}`;
        // Manual redirect follow (cap) so we can count hops without leaking Set-Cookie values.
        for (let hop = 0; hop < 5; hop++) {
          const res = await fetch(url, {
            headers: {
              'User-Agent': ua,
              Host: hostHeader,
            },
            signal: controller.signal,
            redirect: 'manual',
          });
          // Never surface raw cookie values — only note presence.
          const hasSetCookie = res.headers.has('set-cookie');
          if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get('location');
            if (!loc) {
              return {
                path: urlPath,
                status: res.status,
                redirects,
                server: res.headers.get('server') ?? 'unknown',
                length: 0,
                title: '',
                bodyHash: hasSetCookie ? 'set-cookie' : 'empty',
              };
            }
            redirects += 1;
            url = new URL(loc, url).toString();
            continue;
          }
          const text = await res.text();
          const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
          return {
            path: urlPath,
            status: res.status,
            redirects,
            server: res.headers.get('server') ?? 'unknown',
            length: text.length,
            title: titleMatch?.[1]?.trim() ?? '',
            bodyHash: hashBody(text),
          };
        }
        return {
          path: urlPath,
          status: 0,
          redirects,
          server: 'redirect-loop',
          length: 0,
          title: '',
          bodyHash: 'empty',
        };
      } catch {
        continue;
      }
    }
    return {
      path: urlPath,
      status: 0,
      redirects: 0,
      server: 'none',
      length: 0,
      title: '',
      bodyHash: 'empty',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function mockUaFetch(target: string, clientId: string, path: string): UaPathResult {
  // Fixture: quantum.example.com / split targets diverge for googlebot on /
  const quantum =
    target.includes('quantum') ||
    target.startsWith('split.') ||
    target === 'bot-diff.example.com';

  if (path === '/robots.txt') {
    return {
      path,
      status: 200,
      redirects: 0,
      server: 'mock',
      length: 40,
      title: '',
      bodyHash: hashBody('User-agent: *\nDisallow: /wp-admin\n'),
    };
  }

  if (path === '/.well-known/security.txt') {
    return {
      path,
      status: clientId === 'curl' ? 404 : 200,
      redirects: 0,
      server: 'mock',
      length: clientId === 'curl' ? 0 : 80,
      title: '',
      bodyHash:
        clientId === 'curl'
          ? 'empty'
          : hashBody('Contact: mailto:security@example.com\n'),
    };
  }

  if (path === '/wp-admin') {
    return {
      path,
      status: 302,
      redirects: 1,
      server: 'mock',
      length: 0,
      title: '',
      bodyHash: 'empty',
    };
  }

  // path /
  if (quantum && clientId === 'googlebot') {
    return {
      path,
      status: 200,
      redirects: 0,
      server: 'mock-bot',
      length: 1200,
      title: 'Bot index',
      bodyHash: hashBody('bot-only-content'),
    };
  }

  return {
    path,
    status: 200,
    redirects: 0,
    server: 'mock',
    length: 800,
    title: `Example Domain (${target})`,
    bodyHash: hashBody('standard-content'),
  };
}
