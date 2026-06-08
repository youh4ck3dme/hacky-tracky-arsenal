import type {
  FindingState,
  VantageFinding,
  VantageId,
  VantageResult,
} from '../types/schrodinger';

/**
 * Shadow Diff — `git diff` for attack surface, not files.
 *
 * Compares the last cached Schrödinger scan of a target (stored in IndexedDB)
 * with a fresh scan, and reports how the *uncertainty* moved:
 *   +  a new quantum/temporal signal appeared
 *   −  a signal that was there before is gone
 *   ~  a signal flipped state, or a whole vantage changed its headline state
 *
 * Defensive monitoring without SIEM pricing.
 */

export interface ScanSnapshot {
  target: string;
  savedAt: string;
  vantages: VantageResult[];
  matrix: VantageFinding[];
}

export type SignalChangeKind = 'added' | 'removed' | 'changed';

export interface SignalChange {
  kind: SignalChangeKind;
  key: string;
  vantage: VantageId;
  label: string;
  detail: string;
  /** Current state for added/changed; previous state for removed. */
  state: FindingState;
  /** Previous state — only set for `changed`. */
  prevState?: FindingState;
}

export interface VantageChange {
  vantage: VantageId;
  name: string;
  from: FindingState;
  to: FindingState;
  fromSummary: string;
  toSummary: string;
}

export interface ShadowDiff {
  target: string;
  prevAt: string | null;
  nextAt: string;
  isFirstScan: boolean;
  signals: SignalChange[];
  vantageChanges: VantageChange[];
  counts: {
    added: number;
    addedQuantum: number;
    addedTemporal: number;
    removed: number;
    changed: number;
    vantagesChanged: number;
  };
  hasChanges: boolean;
}

/**
 * Stable identity for a cross-vantage signal. We diff the classified matrix
 * (not every raw probe) keyed by vantage + human label, so that randomly
 * sampled DNS resolvers don't generate diff noise.
 */
function signalKey(f: VantageFinding): string {
  return `${f.vantage}|${f.label}`;
}

function signalEntries(matrix: VantageFinding[]): Map<string, VantageFinding> {
  const map = new Map<string, VantageFinding>();
  for (const f of matrix) {
    if (f.id === 'matrix-summary' || f.id === 'matrix-absent') continue;
    map.set(signalKey(f), f);
  }
  return map;
}

/** Collapse a vantage's findings into a single headline state. */
export function vantageHeadlineState(v: VantageResult): FindingState {
  const states = new Set(v.findings.map((f) => f.state));
  if (states.has('quantum')) return 'quantum';
  if (states.has('temporal')) return 'temporal';
  if (states.has('collapsed')) return 'collapsed';
  return 'absent';
}

export function diffScans(prev: ScanSnapshot | null, next: ScanSnapshot): ShadowDiff {
  const nextAt = next.savedAt;

  if (!prev) {
    return {
      target: next.target,
      prevAt: null,
      nextAt,
      isFirstScan: true,
      signals: [],
      vantageChanges: [],
      counts: {
        added: 0,
        addedQuantum: 0,
        addedTemporal: 0,
        removed: 0,
        changed: 0,
        vantagesChanged: 0,
      },
      hasChanges: false,
    };
  }

  const prevSignals = signalEntries(prev.matrix);
  const nextSignals = signalEntries(next.matrix);
  const signals: SignalChange[] = [];

  for (const [key, f] of nextSignals) {
    const before = prevSignals.get(key);
    if (!before) {
      signals.push({
        kind: 'added',
        key,
        vantage: f.vantage,
        label: f.label,
        detail: f.detail,
        state: f.state,
      });
    } else if (before.state !== f.state) {
      signals.push({
        kind: 'changed',
        key,
        vantage: f.vantage,
        label: f.label,
        detail: f.detail,
        state: f.state,
        prevState: before.state,
      });
    }
  }

  for (const [key, f] of prevSignals) {
    if (!nextSignals.has(key)) {
      signals.push({
        kind: 'removed',
        key,
        vantage: f.vantage,
        label: f.label,
        detail: f.detail,
        state: f.state,
      });
    }
  }

  const vantageChanges: VantageChange[] = [];
  const prevByVantage = new Map(prev.vantages.map((v) => [v.id, v]));
  for (const v of next.vantages) {
    const pv = prevByVantage.get(v.id);
    if (!pv) continue;
    const from = vantageHeadlineState(pv);
    const to = vantageHeadlineState(v);
    if (from !== to) {
      vantageChanges.push({
        vantage: v.id,
        name: v.name,
        from,
        to,
        fromSummary: pv.summary,
        toSummary: v.summary,
      });
    }
  }

  const added = signals.filter((s) => s.kind === 'added');
  const counts = {
    added: added.length,
    addedQuantum: added.filter((s) => s.state === 'quantum').length,
    addedTemporal: added.filter((s) => s.state === 'temporal').length,
    removed: signals.filter((s) => s.kind === 'removed').length,
    changed: signals.filter((s) => s.kind === 'changed').length,
    vantagesChanged: vantageChanges.length,
  };

  return {
    target: next.target,
    prevAt: prev.savedAt,
    nextAt,
    isFirstScan: false,
    signals,
    vantageChanges,
    counts,
    hasChanges: signals.length > 0 || vantageChanges.length > 0,
  };
}

/** Short, notification-friendly summary of a diff (e.g. "+2 nové · ~1 zmenený"). */
export function diffHeadline(diff: ShadowDiff): string {
  if (diff.isFirstScan) return 'baseline uložený';
  if (!diff.hasChanges) return 'žiadne zmeny';

  const parts: string[] = [];
  if (diff.counts.added > 0) parts.push(`+${diff.counts.added} nových signálov`);
  if (diff.counts.removed > 0) parts.push(`−${diff.counts.removed} zaniknutých`);
  if (diff.counts.changed > 0) parts.push(`~${diff.counts.changed} zmenených`);
  if (diff.counts.vantagesChanged > 0) {
    parts.push(`${diff.counts.vantagesChanged}× zmena vantage`);
  }
  return parts.join(' · ');
}
