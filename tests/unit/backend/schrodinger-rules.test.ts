import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  classifyMatrixWithRules,
  loadRules,
  ruleFires,
  type SchrodingerRule,
} from '../../../backend/src/services/schrodinger/rules/engine.js';
import type { VantageResult } from '../../../backend/src/types/schrodinger.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const rulesPath = path.join(root, 'shared/schrodinger-rules.json');
const rules = loadRules(rulesPath).rules;

function ruleById(id: string): SchrodingerRule {
  const r = rules.find((x) => x.id === id);
  if (!r) throw new Error(`missing rule ${id}`);
  return r;
}

describe('schrodinger rules (shared/schrodinger-rules.json)', () => {
  it('loads all P1 rules', () => {
    expect(rules.length).toBeGreaterThanOrEqual(6);
    for (const r of rules) {
      expect(r.id).toBeTruthy();
      expect(r.riskWeight).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(r.next_actions)).toBe(true);
    }
  });

  it('dns-split-horizon fires on quantum split finding', () => {
    const vantages: VantageResult[] = [
      {
        id: 'dns',
        name: 'DNS',
        summary: 'q',
        findings: [
          {
            id: 'dns-quantum-split',
            label: 'split',
            detail: '2 sets',
            state: 'quantum',
            vantage: 'dns',
          },
        ],
        meta: { consistencyScore: 40 },
      },
    ];
    expect(ruleFires(ruleById('dns-split-horizon'), vantages)).toBe(true);
    const { findings, risk_score } = classifyMatrixWithRules(vantages, rules);
    expect(findings.some((f) => f.id === 'matrix-dns-split-horizon')).toBe(true);
    expect(risk_score).toBeGreaterThanOrEqual(35);
  });

  it('dns-low-consistency fires when meta.consistencyScore < 70', () => {
    const vantages: VantageResult[] = [
      {
        id: 'dns',
        name: 'DNS',
        summary: 'low',
        findings: [],
        meta: { consistencyScore: 40 },
      },
    ];
    expect(ruleFires(ruleById('dns-low-consistency'), vantages)).toBe(true);
    expect(
      ruleFires(ruleById('dns-low-consistency'), [
        { id: 'dns', name: 'DNS', summary: 'ok', findings: [], meta: { consistencyScore: 90 } },
      ]),
    ).toBe(false);
  });

  it('ua-status-divergence fires on ua-quantum-diff', () => {
    const vantages: VantageResult[] = [
      {
        id: 'ua',
        name: 'UA',
        summary: 'q',
        findings: [
          {
            id: 'ua-quantum-diff',
            label: 'div',
            detail: '2 statuses',
            state: 'quantum',
            vantage: 'ua',
          },
        ],
      },
    ];
    expect(ruleFires(ruleById('ua-status-divergence'), vantages)).toBe(true);
  });

  it('netweb-open-no-http fires on port/http quantum', () => {
    const vantages: VantageResult[] = [
      {
        id: 'netweb',
        name: 'Net',
        summary: 'q',
        findings: [
          {
            id: 'netweb-quantum-port-http',
            label: 'open silent',
            detail: 'ports open',
            state: 'quantum',
            vantage: 'netweb',
          },
        ],
      },
    ];
    expect(ruleFires(ruleById('netweb-open-no-http'), vantages)).toBe(true);
  });

  it('netweb-http-ports-filtered fires', () => {
    const vantages: VantageResult[] = [
      {
        id: 'netweb',
        name: 'Net',
        summary: 'q',
        findings: [
          {
            id: 'netweb-quantum-http-port',
            label: 'http filtered',
            detail: 'x',
            state: 'quantum',
            vantage: 'netweb',
          },
        ],
      },
    ];
    expect(ruleFires(ruleById('netweb-http-ports-filtered'), vantages)).toBe(true);
  });

  it('temporal-ghost-surface fires on time summary', () => {
    const vantages: VantageResult[] = [
      {
        id: 'time',
        name: 'Time',
        summary: 't',
        findings: [
          {
            id: 'time-temporal-summary',
            label: 'ghost',
            detail: '1 ghost',
            state: 'temporal',
            vantage: 'time',
          },
        ],
      },
    ];
    expect(ruleFires(ruleById('temporal-ghost-surface'), vantages)).toBe(true);
    const { findings } = classifyMatrixWithRules(vantages, rules);
    const ghost = findings.find((f) => f.id === 'matrix-temporal-ghost-surface');
    expect(ghost?.next_actions?.length).toBeGreaterThan(0);
  });

  it('all-vantages-silent fires only when no signals', () => {
    expect(
      ruleFires(ruleById('all-vantages-silent'), [
        { id: 'dns', name: 'DNS', summary: '', findings: [] },
      ]),
    ).toBe(true);

    expect(
      ruleFires(ruleById('all-vantages-silent'), [
        {
          id: 'dns',
          name: 'DNS',
          summary: '',
          findings: [
            {
              id: 'x',
              label: 'ok',
              detail: '',
              state: 'collapsed',
              vantage: 'dns',
            },
          ],
        },
      ]),
    ).toBe(false);
  });

  it('fixture pack files exist', () => {
    const dir = path.join(root, 'tests/fixtures/schrodinger');
    for (const f of [
      'dns-consistent.json',
      'dns-split-horizon.json',
      'ua-divergence.json',
      'netweb-open-no-http.json',
      'CHANGELOG-UI.md',
    ]) {
      expect(fs.existsSync(path.join(dir, f))).toBe(true);
    }
  });
});
