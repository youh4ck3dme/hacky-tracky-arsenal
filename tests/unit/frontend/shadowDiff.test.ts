import { describe, expect, it } from 'vitest';
import {
  diffHeadline,
  diffScans,
  vantageHeadlineState,
  type ScanSnapshot,
} from '../../../frontend/src/lib/shadowDiff';
import type { VantageFinding, VantageResult } from '../../../frontend/src/types/schrodinger';

function matrixFinding(over: Partial<VantageFinding>): VantageFinding {
  return {
    id: over.id ?? 'matrix-x',
    label: over.label ?? 'X',
    detail: over.detail ?? '',
    state: over.state ?? 'quantum',
    vantage: over.vantage ?? 'dns',
  };
}

function snapshot(over: Partial<ScanSnapshot>): ScanSnapshot {
  return {
    target: over.target ?? 'example.com',
    savedAt: over.savedAt ?? '2026-06-08T00:00:00.000Z',
    vantages: over.vantages ?? [],
    matrix: over.matrix ?? [],
  };
}

describe('vantageHeadlineState', () => {
  it('prioritises quantum > temporal > collapsed > absent', () => {
    const v = (states: VantageFinding['state'][]): VantageResult => ({
      id: 'dns',
      name: 'DNS',
      summary: '',
      findings: states.map((s, i) => matrixFinding({ id: `f${i}`, state: s })),
    });
    expect(vantageHeadlineState(v(['collapsed', 'quantum']))).toBe('quantum');
    expect(vantageHeadlineState(v(['collapsed', 'temporal']))).toBe('temporal');
    expect(vantageHeadlineState(v(['collapsed', 'absent']))).toBe('collapsed');
    expect(vantageHeadlineState(v(['absent']))).toBe('absent');
  });
});

describe('diffScans', () => {
  it('marks the first scan as baseline with no changes', () => {
    const diff = diffScans(null, snapshot({ matrix: [matrixFinding({})] }));
    expect(diff.isFirstScan).toBe(true);
    expect(diff.hasChanges).toBe(false);
    expect(diff.prevAt).toBeNull();
  });

  it('detects an added quantum signal', () => {
    const prev = snapshot({ matrix: [] });
    const next = snapshot({
      savedAt: '2026-06-09T00:00:00.000Z',
      matrix: [
        matrixFinding({ id: 'matrix-dns-quantum-split', label: 'DNS split-horizon', state: 'quantum' }),
      ],
    });

    const diff = diffScans(prev, next);

    expect(diff.hasChanges).toBe(true);
    expect(diff.counts.added).toBe(1);
    expect(diff.counts.addedQuantum).toBe(1);
    expect(diff.signals[0]).toMatchObject({ kind: 'added', label: 'DNS split-horizon' });
  });

  it('ignores the synthetic summary/absent rows', () => {
    const prev = snapshot({ matrix: [] });
    const next = snapshot({
      matrix: [
        matrixFinding({ id: 'matrix-summary', label: 'Observation summary', state: 'collapsed' }),
        matrixFinding({ id: 'matrix-absent', label: 'No observable signals', state: 'absent' }),
      ],
    });

    expect(diffScans(prev, next).hasChanges).toBe(false);
  });

  it('detects a removed signal', () => {
    const prev = snapshot({
      matrix: [matrixFinding({ id: 'matrix-time-ghost-0', label: 'ghost /shared/', state: 'temporal', vantage: 'time' })],
    });
    const next = snapshot({ matrix: [] });

    const diff = diffScans(prev, next);
    expect(diff.counts.removed).toBe(1);
    expect(diff.signals[0]).toMatchObject({ kind: 'removed', label: 'ghost /shared/' });
  });

  it('detects a state change on the same signal', () => {
    const base = (state: VantageFinding['state']) =>
      matrixFinding({ id: 'm', label: 'UA response divergence', state, vantage: 'ua' });
    const diff = diffScans(snapshot({ matrix: [base('quantum')] }), snapshot({ matrix: [base('temporal')] }));

    expect(diff.counts.changed).toBe(1);
    expect(diff.signals[0]).toMatchObject({ kind: 'changed', prevState: 'quantum', state: 'temporal' });
  });

  it('detects a vantage headline flip (collapsed → quantum)', () => {
    const dns = (state: VantageFinding['state']): VantageResult => ({
      id: 'dns',
      name: 'DNS Resolvers (30)',
      summary: state,
      findings: [matrixFinding({ id: 'r', state, vantage: 'dns' })],
    });
    const diff = diffScans(
      snapshot({ vantages: [dns('collapsed')] }),
      snapshot({ vantages: [dns('quantum')] }),
    );

    expect(diff.counts.vantagesChanged).toBe(1);
    expect(diff.vantageChanges[0]).toMatchObject({ vantage: 'dns', from: 'collapsed', to: 'quantum' });
    expect(diff.hasChanges).toBe(true);
  });

  it('reports no changes when matrices match', () => {
    const m = [matrixFinding({ id: 'a', label: 'same', state: 'quantum' })];
    expect(diffScans(snapshot({ matrix: m }), snapshot({ matrix: m })).hasChanges).toBe(false);
  });
});

describe('diffHeadline', () => {
  it('summarises baseline and no-change states', () => {
    expect(diffHeadline(diffScans(null, snapshot({})))).toBe('baseline uložený');
    expect(diffHeadline(diffScans(snapshot({}), snapshot({})))).toBe('žiadne zmeny');
  });

  it('summarises counts compactly', () => {
    const prev = snapshot({ matrix: [matrixFinding({ id: 'old', label: 'old', state: 'collapsed' })] });
    const next = snapshot({
      matrix: [
        matrixFinding({ id: 'new1', label: 'new-a', state: 'quantum' }),
        matrixFinding({ id: 'new2', label: 'new-b', state: 'temporal' }),
      ],
    });
    const headline = diffHeadline(diffScans(prev, next));
    expect(headline).toContain('+2 nových signálov');
    expect(headline).toContain('−1 zaniknutých');
  });
});
