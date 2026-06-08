import type { FindingState, VantageFinding, VantageResult } from '../types/schrodinger.js';

export function classifyMatrix(vantages: VantageResult[]): VantageFinding[] {
  const matrix: VantageFinding[] = [];

  const specialFindings = vantages.flatMap((v) =>
    v.findings.filter((f) => f.state === 'quantum' || f.state === 'temporal'),
  );
  for (const f of specialFindings) {
    matrix.push({ ...f, id: `matrix-${f.id}` });
  }

  const quantumCount = specialFindings.filter((f) => f.state === 'quantum').length;
  const temporalCount = specialFindings.filter((f) => f.state === 'temporal').length;
  const collapsedCount = vantages.flatMap((v) =>
    v.findings.filter((f) => f.state === 'collapsed'),
  ).length;

  const summaryState: FindingState =
    quantumCount > 0 ? 'quantum' : temporalCount > 0 ? 'temporal' : 'collapsed';

  matrix.unshift({
    id: 'matrix-summary',
    label: 'Observation summary',
    detail: `${quantumCount} quantum · ${temporalCount} temporal · ${collapsedCount} collapsed signals`,
    state: summaryState,
    vantage: 'dns',
  });

  if (specialFindings.length === 0 && collapsedCount === 0) {
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
