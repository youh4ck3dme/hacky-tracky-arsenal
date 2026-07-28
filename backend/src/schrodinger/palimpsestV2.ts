/**
 * Schrödinger P2 — Palimpsest v2 (Wayback CDX & Ghost Paths)
 *
 * Reconstructs temporal sediment from Wayback CDX API with lazy month granularity,
 * ghost path confidence scoring, and dynamic re-check triggers.
 */

export interface CdxSnapshot {
  timestamp: string;
  url: string;
  status: string;
  digest: string;
}

export interface GhostPath {
  path: string;
  lastSeen: string;
  historicalStatus: number;
  ghostConfidence: number; // 0-100: likelihood that endpoint was abandoned
  liveRecheckStatus?: number;
}

export interface PalimpsestV2Result {
  target: string;
  totalHistoricalPaths: number;
  ghostPaths: GhostPath[];
  timelineByYear: Record<string, number>;
}

/**
 * Calculate ghost confidence score (0–100) based on age and historical status.
 * Endpoints last seen > 2 years ago returning 200/403 have higher ghost probability.
 */
export function calculateGhostConfidence(lastSeenYear: number, historicalStatus: number): number {
  const currentYear = new Date().getFullYear();
  const ageYears = Math.max(0, currentYear - lastSeenYear);

  // Cap age contribution so very old endpoints can still reach 100 with status bonus
  let base = Math.min(75, ageYears * 15);
  if (historicalStatus === 200) base += 25;
  if (historicalStatus === 403 || historicalStatus === 401) base += 15;

  return Math.min(100, Math.max(0, base));
}

/**
 * Re-check a ghost path against live target using netweb probe logic.
 */
export async function recheckGhostPath(
  target: string,
  urlPath: string,
): Promise<{ status: number; active: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    for (const scheme of ['https', 'http'] as const) {
      try {
        const res = await fetch(`${scheme}://${target}${urlPath}`, {
          signal: controller.signal,
          redirect: 'manual',
        });
        return { status: res.status, active: res.status < 400 };
      } catch {
        continue;
      }
    }
    return { status: 0, active: false };
  } catch {
    return { status: 0, active: false };
  } finally {
    clearTimeout(timeout);
  }
}
