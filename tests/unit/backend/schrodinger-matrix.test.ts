import { describe, expect, it } from 'vitest';
import { classifyMatrix } from '../../../backend/src/services/schrodingerMatrix.js';
import type { VantageResult } from '../../../backend/src/types/schrodinger.js';

describe('classifyMatrix', () => {
  it('includes absent signal when no findings', () => {
    const vantages: VantageResult[] = [
      { id: 'dns', name: 'DNS', findings: [], summary: 'empty' },
    ];

    const matrix = classifyMatrix(vantages);

    expect(matrix.some((f) => f.id === 'matrix-absent')).toBe(true);
    expect(matrix[0].id).toBe('matrix-summary');
    expect(matrix[0].state).toBe('collapsed');
  });

  it('surfaces quantum findings in matrix', () => {
    const vantages: VantageResult[] = [
      {
        id: 'dns',
        name: 'DNS',
        findings: [
          {
            id: 'dns-quantum-1',
            label: 'Split DNS',
            detail: '2 distinct A-record sets',
            state: 'quantum',
            vantage: 'dns',
          },
        ],
        summary: 'Quantum DNS',
      },
    ];

    const matrix = classifyMatrix(vantages);

    expect(matrix[0].state).toBe('quantum');
    expect(matrix.some((f) => f.id === 'matrix-dns-quantum-1')).toBe(true);
    expect(matrix.some((f) => f.id === 'matrix-absent')).toBe(false);
  });

  it('surfaces temporal (Palimpsest) findings and counts them', () => {
    const vantages: VantageResult[] = [
      {
        id: 'time',
        name: 'Time · Palimpsest',
        findings: [
          {
            id: 'time-ghost-0',
            label: 'ghost /old-admin',
            detail: 'HTTP 200 in 2019, now HTTP 404 — temporal superposition',
            state: 'temporal',
            vantage: 'time',
          },
        ],
        summary: 'Temporal: 1 ghost',
      },
    ];

    const matrix = classifyMatrix(vantages);

    expect(matrix[0].state).toBe('temporal');
    expect(matrix[0].detail).toContain('1 temporal');
    expect(matrix.some((f) => f.id === 'matrix-time-ghost-0')).toBe(true);
    expect(matrix.some((f) => f.id === 'matrix-absent')).toBe(false);
  });

  it('counts collapsed signals in summary', () => {
    const vantages: VantageResult[] = [
      {
        id: 'ua',
        name: 'User-Agent',
        findings: [
          {
            id: 'ua-chrome',
            label: 'Chrome',
            detail: 'HTTP 200',
            state: 'collapsed',
            vantage: 'ua',
          },
        ],
        summary: 'ok',
      },
    ];

    const matrix = classifyMatrix(vantages);

    expect(matrix[0].detail).toContain('1 collapsed');
    expect(matrix[0].state).toBe('collapsed');
  });
});
