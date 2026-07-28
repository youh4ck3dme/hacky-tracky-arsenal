import type {
  TimelineSnapshot,
  VantageFinding,
  VantageResult,
} from '../../types/schrodinger.js';
import {
  buildCdxUrl,
  buildTimeline,
  historical200Paths,
  parseCdx,
  pickAcrossSpan,
} from '../palimpsest.js';
import { countStates } from './dns/types.js';

export async function scanTimeVantage(
  target: string,
  opts: {
    mock: boolean;
    onProgress?: (current: number, total: number, label: string) => void;
    probeHttpPath: (
      target: string,
      urlPath: string,
    ) => Promise<{ status: number; server: string }>;
  },
): Promise<{ vantage: VantageResult; timeline: TimelineSnapshot[] }> {
  if (opts.mock) {
    return mockTime(target);
  }

  const findings: VantageFinding[] = [];

  try {
    opts.onProgress?.(1, 3, 'querying Wayback archive');
    const rows = await fetchCdxRows(target);

    if (rows.length === 0) {
      findings.push({
        id: 'time-no-history',
        label: 'No archival history',
        detail: 'Wayback Machine has no snapshots (or was unreachable)',
        state: 'absent',
        vantage: 'time',
      });
      return {
        vantage: {
          id: 'time',
          name: 'Time · Palimpsest',
          findings,
          summary: 'No temporal data available',
          counts: countStates(findings),
          score: 0,
        },
        timeline: [],
      };
    }

    opts.onProgress?.(2, 3, 'reconstructing timeline');
    const timeline = buildTimeline(rows);
    const firstYear = timeline[0]?.period ?? '?';
    const lastYear = timeline[timeline.length - 1]?.period ?? '?';

    const candidates = pickAcrossSpan(
      [...historical200Paths(rows).entries()].sort((a, b) => a[1].localeCompare(b[1])),
      8,
    );

    let ghostCount = 0;
    let persistentCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      const [p, year] = candidates[i];
      const urlPath = p.startsWith('/') ? p : `/${p}`;
      opts.onProgress?.(3, 3, `re-check ${urlPath}`);

      const live = await opts.probeHttpPath(target, urlPath);
      const alive = live.status >= 200 && live.status < 400;
      if (alive) {
        persistentCount++;
        findings.push({
          id: `time-persist-${i}`,
          label: `persistent ${urlPath}`,
          detail: `HTTP 200 in ${year}, still HTTP ${live.status} today`,
          state: 'collapsed',
          vantage: 'time',
        });
      } else {
        ghostCount++;
        findings.push({
          id: `time-ghost-${i}`,
          label: `ghost ${urlPath}`,
          detail: `HTTP 200 in ${year}, now ${
            live.status === 0 ? 'unreachable' : `HTTP ${live.status}`
          } — temporal superposition`,
          state: 'temporal',
          vantage: 'time',
        });
      }
    }

    if (ghostCount > 0) {
      findings.unshift({
        id: 'time-temporal-summary',
        label: 'Ghost surface detected',
        detail: `${ghostCount} path(s) public in the past, absent today · archive span ${firstYear}–${lastYear}`,
        state: 'temporal',
        vantage: 'time',
        severity: 'medium',
      });
    }

    const summary =
      ghostCount > 0
        ? `Temporal: ${ghostCount} ghost · ${persistentCount} persistent paths across ${timeline.length} year(s) (${firstYear}–${lastYear})`
        : `Collapsed in time: ${persistentCount} persistent paths, archive ${firstYear}–${lastYear}`;

    return {
      vantage: {
        id: 'time',
        name: `Time · Palimpsest (${firstYear}–${lastYear})`,
        findings,
        summary,
        counts: countStates(findings),
        score: ghostCount > 0 ? 50 : 80,
      },
      timeline,
    };
  } catch {
    return {
      vantage: {
        id: 'time',
        name: 'Time · Palimpsest',
        findings: [
          {
            id: 'time-error',
            label: 'Temporal scan degraded',
            detail: 'Could not reconstruct archival history',
            state: 'absent',
            vantage: 'time',
          },
        ],
        summary: 'Temporal scan unavailable',
        counts: { collapsed: 0, quantum: 0, temporal: 0, absent: 1 },
        score: 0,
      },
      timeline: [],
    };
  }
}

function mockTime(target: string): {
  vantage: VantageResult;
  timeline: TimelineSnapshot[];
} {
  if (target === 'silent.example.com') {
    const findings: VantageFinding[] = [
      {
        id: 'time-no-history',
        label: 'No archival history',
        detail: 'mock: no snapshots',
        state: 'absent',
        vantage: 'time',
      },
    ];
    return {
      vantage: {
        id: 'time',
        name: 'Time · Palimpsest',
        findings,
        summary: 'No temporal data available (mock)',
        counts: countStates(findings),
        score: 0,
      },
      timeline: [],
    };
  }

  const timeline: TimelineSnapshot[] = [
    {
      period: '2019',
      totalSnapshots: 12,
      uniquePaths: 4,
      samplePaths: ['/', '/old-admin', '/robots.txt'],
      statuses: { '200': 10, '404': 2 },
    },
    {
      period: '2024',
      totalSnapshots: 20,
      uniquePaths: 3,
      samplePaths: ['/', '/robots.txt'],
      statuses: { '200': 18, '301': 2 },
    },
  ];

  const findings: VantageFinding[] = [
    {
      id: 'time-temporal-summary',
      label: 'Ghost surface detected',
      detail: '1 path(s) public in the past, absent today · archive span 2019–2024 (mock)',
      state: 'temporal',
      vantage: 'time',
      severity: 'medium',
    },
    {
      id: 'time-ghost-0',
      label: 'ghost /old-admin',
      detail: 'HTTP 200 in 2019, now HTTP 404 — temporal superposition (mock)',
      state: 'temporal',
      vantage: 'time',
    },
    {
      id: 'time-persist-0',
      label: 'persistent /',
      detail: 'HTTP 200 in 2019, still HTTP 200 today (mock)',
      state: 'collapsed',
      vantage: 'time',
    },
  ];

  return {
    vantage: {
      id: 'time',
      name: 'Time · Palimpsest (2019–2024)',
      findings,
      summary: 'Temporal: 1 ghost · 1 persistent paths across 2 year(s) (2019–2024) (mock)',
      counts: countStates(findings),
      score: 50,
      meta: { mock: true },
    },
    timeline,
  };
}

async function fetchCdxRows(target: string): Promise<ReturnType<typeof parseCdx>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(buildCdxUrl(target, 1000), {
      signal: controller.signal,
      headers: { 'User-Agent': 'arsenal-pwa-palimpsest/1.0' },
    });
    if (!res.ok) return [];
    return parseCdx(await res.json());
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
