import type { FindingState, VantageFinding, VantageResult } from '../types/schrodinger.js';

export function classifyMatrix(vantages: VantageResult[]): VantageFinding[] {
  const matrix: VantageFinding[] = [];

  const quantumFindings = vantages.flatMap((v) =>
    v.findings.filter((f) => f.state === 'quantum'),
  );
  for (const f of quantumFindings) {
    matrix.push({ ...f, id: `matrix-${f.id}` });
  }

  const collapsedCount = vantages.flatMap((v) =>
    v.findings.filter((f) => f.state === 'collapsed'),
  ).length;

  matrix.unshift({
    id: 'matrix-summary',
    label: 'Observation summary',
    detail: `${quantumFindings.length} quantum · ${collapsedCount} collapsed signals`,
    state: (quantumFindings.length > 0 ? 'quantum' : 'collapsed') as FindingState,
    vantage: 'dns',
  });

  if (quantumFindings.length === 0 && collapsedCount === 0) {
    matrix.push({
      id: 'matrix-absent',
      label: 'No observable signals',
      detail: 'Target may be down or heavily filtered',
      state: 'absent',
      vantage: 'dns',
    });
  }

  return matrix;
}
