import type { TimelineSnapshot } from '../types/schrodinger.js';

/**
 * Palimpsest — the 4th vantage point of the Schrödinger scan: *time*.
 *
 * The other three vantages ask "where do I observe from?" (DNS, User-Agent,
 * network vs web). Palimpsest asks "*when*?". Attack surface is not a snapshot,
 * it is a sediment: paths that were once public leave ghosts in the archive.
 *
 * Source of truth is the public, key-free Wayback Machine CDX API. Everything
 * in this module is a pure function so it can be unit-tested without network.
 */

const WAYBACK_CDX = 'http://web.archive.org/cdx/search/cdx';

export interface CdxRow {
  timestamp: string;
  original: string;
  status: string;
  mime: string;
}

/**
 * Build the Wayback CDX query URL for every archived path on a host.
 * `matchType=host` keeps the scope to the exact host (no subdomains), which is
 * both correct for path-level recon and dramatically faster than `domain`.
 */
export function buildCdxUrl(target: string, limit = 1000): string {
  const params = new URLSearchParams({
    url: target,
    matchType: 'host',
    output: 'json',
    fl: 'timestamp,original,statuscode,mimetype',
    collapse: 'urlkey',
    limit: String(limit),
  });
  return `${WAYBACK_CDX}?${params.toString()}`;
}

/** Normalize a Wayback CDX JSON payload (array-of-arrays, first row = header). */
export function parseCdx(json: unknown): CdxRow[] {
  if (!Array.isArray(json) || json.length < 2) return [];
  const out: CdxRow[] = [];
  for (const r of json.slice(1)) {
    if (!Array.isArray(r) || r.length < 4) continue;
    const [timestamp, original, status, mime] = r as unknown[];
    if (typeof timestamp !== 'string' || timestamp.length < 4) continue;
    if (typeof original !== 'string') continue;
    out.push({
      timestamp,
      original,
      status: String(status ?? ''),
      mime: String(mime ?? ''),
    });
  }
  return out;
}

/** Extract the path (+ query) component from an archived absolute URL. */
export function pathOf(originalUrl: string): string {
  try {
    const u = new URL(originalUrl);
    return (u.pathname || '/') + (u.search || '');
  } catch {
    return originalUrl;
  }
}

/** Bucket CDX rows into per-year timeline snapshots, oldest first. */
export function buildTimeline(rows: CdxRow[]): TimelineSnapshot[] {
  const byYear = new Map<string, CdxRow[]>();
  for (const row of rows) {
    const year = row.timestamp.slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(row);
  }

  const buckets: TimelineSnapshot[] = [];
  for (const [year, yearRows] of [...byYear.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const paths = new Set<string>();
    const statuses: Record<string, number> = {};
    for (const row of yearRows) {
      paths.add(pathOf(row.original));
      const code = row.status || '—';
      statuses[code] = (statuses[code] ?? 0) + 1;
    }
    buckets.push({
      period: year,
      totalSnapshots: yearRows.length,
      uniquePaths: paths.size,
      samplePaths: [...paths].slice(0, 12),
      statuses,
    });
  }
  return buckets;
}

/**
 * Map every path that ever returned HTTP 200 to the most recent year it did so.
 * These are the candidates for "ghost" detection: public in the past, maybe
 * absent today.
 */
export function historical200Paths(rows: CdxRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.status !== '200') continue;
    const path = pathOf(row.original);
    const year = row.timestamp.slice(0, 4);
    const existing = map.get(path);
    if (!existing || year > existing) map.set(path, year);
  }
  return map;
}

/**
 * Evenly sample `count` items across an ordered list. With the list sorted
 * oldest-first, this picks a spread from the dawn of the archive to today —
 * old picks are the likely "ghosts", recent picks the likely "persistent",
 * which is exactly the then-vs-now superposition we want to surface.
 */
export function pickAcrossSpan<T>(items: T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const out: T[] = [];
  const seen = new Set<number>();
  const stride = (items.length - 1) / (count - 1);
  for (let k = 0; k < count; k++) {
    const idx = Math.round(k * stride);
    if (!seen.has(idx)) {
      seen.add(idx);
      out.push(items[idx]);
    }
  }
  return out;
}
