import fs from 'node:fs';
import path from 'node:path';
import type {
  FindingSeverity,
  FindingState,
  MatrixClassification,
  VantageFinding,
  VantageId,
  VantageResult,
} from '../../../types/schrodinger.js';

export interface RuleMatchAnyFinding {
  vantage?: VantageId;
  idEquals?: string;
  idPrefix?: string;
  state?: FindingState;
}

export interface RuleMatchVantageMeta {
  vantage: VantageId;
  key: string;
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  eq?: number | string | boolean;
}

export interface SchrodingerRule {
  id: string;
  name: string;
  description?: string;
  match: {
    anyFinding?: RuleMatchAnyFinding;
    vantageMeta?: RuleMatchVantageMeta;
    allSilent?: boolean;
  };
  state: FindingState;
  severity: FindingSeverity;
  riskWeight: number;
  next_actions: string[];
}

export interface RulesDocument {
  version: number;
  rules: SchrodingerRule[];
}

export function loadRules(rulesPath: string): RulesDocument {
  const raw = fs.readFileSync(rulesPath, 'utf-8');
  const doc = JSON.parse(raw) as RulesDocument;
  if (!doc.rules || !Array.isArray(doc.rules)) {
    throw new Error(`Invalid rules file: ${rulesPath}`);
  }
  return doc;
}

export function defaultRulesPath(arsenalRoot: string): string {
  return path.join(arsenalRoot, 'shared/schrodinger-rules.json');
}

function findingMatches(f: VantageFinding, m: RuleMatchAnyFinding): boolean {
  if (m.vantage && f.vantage !== m.vantage) return false;
  if (m.state && f.state !== m.state) return false;
  if (m.idEquals && f.id !== m.idEquals) return false;
  if (m.idPrefix && !f.id.startsWith(m.idPrefix)) return false;
  return true;
}

function metaMatches(vantages: VantageResult[], m: RuleMatchVantageMeta): boolean {
  const v = vantages.find((x) => x.id === m.vantage);
  if (!v?.meta) return false;
  const val = v.meta[m.key];
  if (val === undefined || val === null) return false;
  if (m.eq !== undefined && val !== m.eq) return false;
  if (typeof val === 'number') {
    if (m.lt !== undefined && !(val < m.lt)) return false;
    if (m.lte !== undefined && !(val <= m.lte)) return false;
    if (m.gt !== undefined && !(val > m.gt)) return false;
    if (m.gte !== undefined && !(val >= m.gte)) return false;
  }
  return true;
}

function isAllSilent(vantages: VantageResult[]): boolean {
  const all = vantages.flatMap((v) => v.findings);
  if (all.length === 0) return true;
  return !all.some(
    (f) => f.state === 'collapsed' || f.state === 'quantum' || f.state === 'temporal',
  );
}

export function ruleFires(rule: SchrodingerRule, vantages: VantageResult[]): boolean {
  const { match } = rule;
  if (match.allSilent) return isAllSilent(vantages);
  if (match.anyFinding) {
    const flat = vantages.flatMap((v) => v.findings);
    if (!flat.some((f) => findingMatches(f, match.anyFinding!))) return false;
  }
  if (match.vantageMeta) {
    if (!metaMatches(vantages, match.vantageMeta)) return false;
  }
  // If only empty match object — never fire
  if (!match.anyFinding && !match.vantageMeta && !match.allSilent) return false;
  return true;
}

/**
 * Quantum Matrix rule engine — rules as data.
 * Produces classified findings with risk_score 0–100 and next_actions.
 */
export function classifyMatrixWithRules(
  vantages: VantageResult[],
  rules: SchrodingerRule[],
): MatrixClassification {
  const findings: VantageFinding[] = [];
  let risk = 0;
  const fired: SchrodingerRule[] = [];

  for (const rule of rules) {
    if (!ruleFires(rule, vantages)) continue;
    fired.push(rule);
    risk += Math.max(0, rule.riskWeight);
    findings.push({
      id: `matrix-${rule.id}`,
      label: rule.name,
      detail: rule.description ?? rule.name,
      state: rule.state,
      vantage: rule.match.anyFinding?.vantage ?? rule.match.vantageMeta?.vantage ?? 'dns',
      severity: rule.severity,
      risk_score: rule.riskWeight,
      next_actions: [...rule.next_actions],
    });
  }

  // Also surface raw quantum/temporal signals not covered by rules (pass-through)
  const coveredIds = new Set(
    fired
      .map((r) => r.match.anyFinding?.idEquals)
      .filter(Boolean) as string[],
  );
  for (const v of vantages) {
    for (const f of v.findings) {
      if (f.state !== 'quantum' && f.state !== 'temporal') continue;
      if (coveredIds.has(f.id)) continue;
      if (findings.some((x) => x.id === `matrix-${f.id}`)) continue;
      findings.push({
        ...f,
        id: `matrix-${f.id}`,
        next_actions: f.next_actions ?? [],
      });
      if (f.state === 'quantum') risk += 10;
      if (f.state === 'temporal') risk += 8;
    }
  }

  risk = Math.max(0, Math.min(100, risk));

  const quantumCount = findings.filter((f) => f.state === 'quantum').length;
  const temporalCount = findings.filter((f) => f.state === 'temporal').length;
  const collapsedCount = vantages.flatMap((v) =>
    v.findings.filter((f) => f.state === 'collapsed'),
  ).length;

  const summaryState: FindingState =
    quantumCount > 0 ? 'quantum' : temporalCount > 0 ? 'temporal' : risk === 0 && collapsedCount === 0 ? 'absent' : 'collapsed';

  findings.unshift({
    id: 'matrix-summary',
    label: 'Observation summary',
    detail: `${quantumCount} quantum · ${temporalCount} temporal · ${collapsedCount} collapsed · risk ${risk}/100`,
    state: summaryState,
    vantage: 'dns',
    risk_score: risk,
    severity: risk >= 60 ? 'high' : risk >= 30 ? 'medium' : 'info',
    next_actions:
      risk > 0
        ? ['Prioritizuj quantum/temporal findingy pre manuálnu verifikáciu']
        : ['Baseline OK — zváž Shadow Diff pri ďalšom scane'],
  });

  if (findings.length === 1 && collapsedCount === 0) {
    findings.push({
      id: 'matrix-absent',
      label: 'No observable signals',
      detail: 'Target may be down, filtered, or allowlist/SSRF blocked probes',
      state: 'absent',
      vantage: 'dns',
      risk_score: 0,
      next_actions: ['Over sieť, dig, a SCHRODINGER_ALLOWLIST'],
    });
  }

  return { findings, risk_score: risk };
}

/** Back-compat helper used by existing unit tests. */
export function classifyMatrix(vantages: VantageResult[]): VantageFinding[] {
  // Minimal built-in rules when file not loaded — mirror previous behavior + risk
  const builtin: SchrodingerRule[] = [
    {
      id: 'pass-quantum',
      name: 'quantum-pass',
      match: { anyFinding: { state: 'quantum' } },
      state: 'quantum',
      severity: 'high',
      riskWeight: 0,
      next_actions: [],
    },
  ];
  // Prefer pass-through of special findings without double-counting risk via fake rules
  const special = vantages.flatMap((v) =>
    v.findings.filter((f) => f.state === 'quantum' || f.state === 'temporal'),
  );
  const matrix: VantageFinding[] = special.map((f) => ({ ...f, id: `matrix-${f.id}` }));

  const quantumCount = special.filter((f) => f.state === 'quantum').length;
  const temporalCount = special.filter((f) => f.state === 'temporal').length;
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

  if (special.length === 0 && collapsedCount === 0) {
    matrix.push({
      id: 'matrix-absent',
      label: 'No observable signals',
      detail: 'Target may be down or heavily filtered',
      state: 'absent',
      vantage: 'dns',
    });
  }

  void builtin;
  return matrix;
}
